// Plus (monthly or yearly subscription) and the Trip pass (one-off, one trip): checkout sessions,
// who has what, and what Stripe's events change. Stripe itself only runs once the keys are set.
import type Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';

export const TRIP_PASS_CENTS = 499;
/** A renewal can arrive a little late: Plus stays on for a few days after the paid period. */
const GRACE_DAYS = 3;

/** Plus while the paid period runs, plus bonus days from invites (kept apart so a renewal does not wipe them). */
/** Only on the preview (Railway variable on routify-preview, never on the live site): everyone has Plus. */
export const previewPlusForAll = () => process.env.PREVIEW_PLUS_FOR_ALL === 'true';

export function hasPlus(user: { subscriptionTier: string; subscriptionExpires: Date | null; plusBonusDays?: number | null } | null, now = new Date()): boolean {
  if (previewPlusForAll()) return true;
  if (!user || user.subscriptionTier !== 'premium') return false;
  if (!user.subscriptionExpires) return true; // set by hand (testing): no end date
  const bonus = (user.plusBonusDays ?? 0) * 86_400_000;
  return user.subscriptionExpires.getTime() + bonus + GRACE_DAYS * 86_400_000 > now.getTime();
}

/** A Trip pass opens everything Plus gives for that one trip, to whoever opens it. */
export const tripUnlocked = (planner: Record<string, unknown> | null | undefined) => planner?.pass === true;

type CheckoutInput =
  | { kind: 'plus'; plan: 'monthly' | 'yearly'; frontendUrl: string; email: string; userId: string }
  | { kind: 'pass'; tripId: string; frontendUrl: string; email?: string; userId?: string };

export function checkoutParams(i: CheckoutInput, prices: { monthly?: string; yearly?: string }): Stripe.Checkout.SessionCreateParams {
  if (i.kind === 'plus') {
    const price = i.plan === 'yearly' ? prices.yearly : prices.monthly;
    if (!price) throw new Error(`No Stripe price for Plus ${i.plan}`);
    return {
      mode: 'subscription',
      customer_email: i.email,
      line_items: [{ price, quantity: 1 }],
      success_url: `${i.frontendUrl}/dashboard?upgraded=true`,
      cancel_url: `${i.frontendUrl}/pricing`,
      metadata: { userId: i.userId, type: 'plus' },
      subscription_data: { metadata: { userId: i.userId } },
    };
  }
  return {
    mode: 'payment',
    ...(i.email ? { customer_email: i.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: TRIP_PASS_CENTS,
          // €4.99 includes VAT; the tax code (SaaS for private customers) is required by Stripe Managed Payments.
          tax_behavior: 'inclusive',
          product_data: { name: 'Routify Trip pass', description: 'Every gem, the cheapest route and the printable PDF for one trip.', tax_code: 'txcd_10103000' },
        },
      },
    ],
    success_url: `${i.frontendUrl}/trips/${i.tripId}?pass=ok`,
    cancel_url: `${i.frontendUrl}/trips/${i.tripId}`,
    metadata: { type: 'trip_pass', tripId: i.tripId, ...(i.userId ? { userId: i.userId } : {}) },
  };
}

type Db = { user: Pick<PrismaClient['user'], 'update' | 'findUnique'>; trip: Pick<PrismaClient['trip'], 'findUnique' | 'update'> };

/** What a Stripe event changes in Routify. Safe to receive twice (Stripe retries). */
export async function applyStripeEvent(db: Db, event: Stripe.Event, now = new Date()): Promise<void> {
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const meta = s.metadata ?? {};
    if (meta.type === 'trip_pass' && meta.tripId) {
      const trip = await db.trip.findUnique({ where: { id: meta.tripId } });
      if (!trip) return;
      const planner = JSON.parse(trip.planner || '{}');
      await db.trip.update({ where: { id: trip.id }, data: { planner: JSON.stringify({ ...planner, pass: true }) } });
      return;
    }
    if (s.mode === 'subscription' && meta.userId) {
      // Until the first invoice tells the real end: a month from now.
      const expires = new Date(now);
      expires.setMonth(expires.getMonth() + 1);
      const subscription = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
      await db.user.update({
        where: { id: meta.userId },
        data: { subscriptionTier: 'premium', subscriptionExpires: expires, ...(subscription ? { stripeSubscriptionId: subscription } : {}) },
      });
    }
    return;
  }
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice & { subscription_details?: { metadata?: Record<string, string> } };
    const userId = invoice.subscription_details?.metadata?.userId;
    const end = invoice.lines?.data?.[0]?.period?.end;
    if (userId && end) {
      await db.user.update({ where: { id: userId }, data: { subscriptionTier: 'premium', subscriptionExpires: new Date(end * 1000) } });
    }
    return;
  }
  if (event.type === 'customer.subscription.deleted') {
    const userId = (event.data.object as Stripe.Subscription).metadata?.userId;
    if (!userId) return;
    // Bonus days earned with invites still count after the paid subscription ends.
    const u = await db.user.findUnique({ where: { id: userId } });
    const bonus = u?.plusBonusDays ?? 0;
    await db.user.update({
      where: { id: userId },
      data: bonus > 0
        ? { subscriptionTier: 'premium', subscriptionExpires: new Date(now.getTime() + bonus * 86_400_000), plusBonusDays: 0, stripeSubscriptionId: null }
        : { subscriptionTier: 'free', subscriptionExpires: null, stripeSubscriptionId: null },
    });
  }
}

/** The active monthly and yearly Plus prices among a product's prices (Stripe products hold them). */
export function planPricesFrom(prices: { id: string; active: boolean; recurring?: { interval?: string } | null }[]): { monthly?: string; yearly?: string } {
  const active = prices.filter((p) => p.active);
  return {
    monthly: active.find((p) => p.recurring?.interval === 'month')?.id,
    yearly: active.find((p) => p.recurring?.interval === 'year')?.id,
  };
}
