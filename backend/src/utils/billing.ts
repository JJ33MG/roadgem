// Plus (monthly or yearly subscription) and the Trip pass (one-off, one trip): checkout sessions,
// who has what, and what Stripe's events change. Stripe itself only runs once the keys are set.
import type Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';

export const TRIP_PASS_CENTS = 499;
/** A renewal can arrive a little late: Plus stays on for a few days after the paid period. */
const GRACE_DAYS = 3;

export function hasPlus(user: { subscriptionTier: string; subscriptionExpires: Date | null } | null, now = new Date()): boolean {
  if (!user || user.subscriptionTier !== 'premium') return false;
  if (!user.subscriptionExpires) return true; // set by hand (testing): no end date
  return user.subscriptionExpires.getTime() + GRACE_DAYS * 86_400_000 > now.getTime();
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
          product_data: { name: 'Routify Trip pass', description: 'Every gem, the cheapest route and the printable PDF for one trip.' },
        },
      },
    ],
    success_url: `${i.frontendUrl}/trips/${i.tripId}?pass=ok`,
    cancel_url: `${i.frontendUrl}/trips/${i.tripId}`,
    metadata: { type: 'trip_pass', tripId: i.tripId, ...(i.userId ? { userId: i.userId } : {}) },
  };
}

type Db = { user: Pick<PrismaClient['user'], 'update'>; trip: Pick<PrismaClient['trip'], 'findUnique' | 'update'> };

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
      await db.user.update({ where: { id: meta.userId }, data: { subscriptionTier: 'premium', subscriptionExpires: expires } });
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
    if (userId) await db.user.update({ where: { id: userId }, data: { subscriptionTier: 'free', subscriptionExpires: null } });
  }
}
