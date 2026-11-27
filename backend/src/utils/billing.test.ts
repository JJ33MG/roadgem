import { describe, expect, it, vi } from 'vitest';
import { applyStripeEvent, checkoutParams, hasPlus, tripUnlocked } from './billing';

const now = new Date('2026-12-01T12:00:00Z');

describe('who has Plus', () => {
  it('has Plus while the paid period runs, and a few days of grace for a late renewal', () => {
    expect(hasPlus({ subscriptionTier: 'premium', subscriptionExpires: new Date('2026-12-10') }, now)).toBe(true);
    expect(hasPlus({ subscriptionTier: 'premium', subscriptionExpires: new Date('2026-11-29') }, now)).toBe(true);
    expect(hasPlus({ subscriptionTier: 'premium', subscriptionExpires: new Date('2026-11-20') }, now)).toBe(false);
    expect(hasPlus({ subscriptionTier: 'free', subscriptionExpires: null }, now)).toBe(false);
    expect(hasPlus(null, now)).toBe(false);
  });

  it('counts bonus days (from invites) after the paid period', () => {
    expect(hasPlus({ subscriptionTier: 'premium', subscriptionExpires: new Date('2026-11-20'), plusBonusDays: 14 }, now)).toBe(true);
    expect(hasPlus({ subscriptionTier: 'premium', subscriptionExpires: new Date('2026-11-01'), plusBonusDays: 7 }, now)).toBe(false);
  });

  it('a trip with a Trip pass is unlocked for everyone who opens it', () => {
    expect(tripUnlocked({ pass: true })).toBe(true);
    expect(tripUnlocked({})).toBe(false);
  });
});

describe('checkout', () => {
  const base = { frontendUrl: 'https://routify.test', email: 'a@b.c', userId: 'u1' };
  it('Plus monthly or yearly is a subscription on its own Stripe price', () => {
    const m = checkoutParams({ kind: 'plus', plan: 'monthly', ...base }, { monthly: 'price_m', yearly: 'price_y' });
    expect(m).toMatchObject({ mode: 'subscription', line_items: [{ price: 'price_m', quantity: 1 }], metadata: { userId: 'u1', type: 'plus' } });
    const y = checkoutParams({ kind: 'plus', plan: 'yearly', ...base }, { monthly: 'price_m', yearly: 'price_y' });
    expect(y.line_items![0]).toEqual({ price: 'price_y', quantity: 1 });
  });

  it('a Trip pass is a one-off €4.99 payment for one trip, returning to that trip', () => {
    const p = checkoutParams({ kind: 'pass', tripId: 't1', frontendUrl: 'https://routify.test' }, { monthly: 'price_m' });
    expect(p).toMatchObject({ mode: 'payment', metadata: { type: 'trip_pass', tripId: 't1' }, success_url: 'https://routify.test/trips/t1?pass=ok' });
    expect(p.line_items![0]!.price_data).toMatchObject({ currency: 'eur', unit_amount: 499 });
  });
});

describe('Stripe events', () => {
  function db() {
    return {
      user: { update: vi.fn(async (_a: any) => ({})), updateMany: vi.fn(async () => ({ count: 1 })), findUnique: vi.fn(async (_a: any) => ({ id: 'u1', plusBonusDays: 0 })) },
      trip: {
        findUnique: vi.fn(async () => ({ id: 't1', planner: JSON.stringify({ vehicle: 'car' }) })),
        update: vi.fn(async (_a: any) => ({})),
      },
    };
  }
  it('a paid Trip pass unlocks its trip', async () => {
    const d = db();
    await applyStripeEvent(d as never, { type: 'checkout.session.completed', data: { object: { mode: 'payment', metadata: { type: 'trip_pass', tripId: 't1' } } } } as never, now);
    expect(JSON.parse(d.trip.update.mock.calls[0][0].data.planner)).toEqual({ vehicle: 'car', pass: true });
  });

  it('a Plus payment sets Plus until the end of the paid period; a cancelled subscription ends it', async () => {
    const d = db();
    await applyStripeEvent(d as never, { type: 'checkout.session.completed', data: { object: { mode: 'subscription', metadata: { type: 'plus', userId: 'u1' } } } } as never, now);
    expect(d.user.update.mock.calls[0][0]).toMatchObject({ where: { id: 'u1' }, data: { subscriptionTier: 'premium' } });
    await applyStripeEvent(d as never, { type: 'customer.subscription.deleted', data: { object: { metadata: { userId: 'u1' } } } } as never, now);
    expect(d.user.update.mock.calls[1][0]).toMatchObject({ where: { id: 'u1' }, data: { subscriptionTier: 'free', subscriptionExpires: null } });
  });

  it('remembers the Stripe subscription, and a member with bonus days keeps Plus for them after cancelling', async () => {
    const d = db();
    await applyStripeEvent(d as never, { type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_9', metadata: { type: 'plus', userId: 'u1' } } } } as never, now);
    expect(d.user.update.mock.calls[0][0].data.stripeSubscriptionId).toBe('sub_9');
    d.user.findUnique = vi.fn(async () => ({ id: 'u1', plusBonusDays: 7 })) as never;
    await applyStripeEvent(d as never, { type: 'customer.subscription.deleted', data: { object: { metadata: { userId: 'u1' } } } } as never, now);
    expect(d.user.update.mock.calls[1][0].data).toMatchObject({ subscriptionTier: 'premium', plusBonusDays: 0, stripeSubscriptionId: null });
    expect(d.user.update.mock.calls[1][0].data.subscriptionExpires.toISOString()).toBe('2026-12-08T12:00:00.000Z');
  });

  it('a renewal moves the end of the period to what Stripe says', async () => {
    const d = db();
    const end = Math.floor(new Date('2027-01-01T12:00:00Z').getTime() / 1000);
    await applyStripeEvent(d as never, { type: 'invoice.payment_succeeded', data: { object: { lines: { data: [{ period: { end } }] }, subscription_details: { metadata: { userId: 'u1' } } } } } as never, now);
    expect(d.user.update.mock.calls[0][0].data.subscriptionExpires.toISOString()).toBe('2027-01-01T12:00:00.000Z');
  });
});

describe('hasPlus on the preview: everyone has Plus there (Jarne, 26 Nov: the preview shows everything)', () => {
  it('opens Plus for every visitor, also without an account, only when PREVIEW_PLUS_FOR_ALL is true', () => {
    process.env.PREVIEW_PLUS_FOR_ALL = 'true';
    expect(hasPlus(null)).toBe(true);
    expect(hasPlus({ subscriptionTier: 'free', subscriptionExpires: null })).toBe(true);
    process.env.PREVIEW_PLUS_FOR_ALL = 'false';
    expect(hasPlus(null)).toBe(false);
    delete process.env.PREVIEW_PLUS_FOR_ALL;
    expect(hasPlus({ subscriptionTier: 'free', subscriptionExpires: null })).toBe(false);
  });
});

import { planPricesFrom } from './billing';

describe('planPricesFrom: Plus prices found from Stripe products (27 Nov: product IDs are easier to find)', () => {
  it('picks the monthly and the yearly price by their interval, whichever product holds them', () => {
    const prices = [
      { id: 'price_y', active: true, recurring: { interval: 'year' } },
      { id: 'price_old', active: false, recurring: { interval: 'month' } },
      { id: 'price_m', active: true, recurring: { interval: 'month' } },
    ];
    expect(planPricesFrom(prices as never)).toEqual({ monthly: 'price_m', yearly: 'price_y' });
    expect(planPricesFrom([])).toEqual({ monthly: undefined, yearly: undefined });
  });
});

describe('checkoutParams: the Trip pass carries a tax code (Stripe Managed Payments needs one, 27 Nov)', () => {
  it('sells the pass as SaaS for private customers, VAT included', () => {
    const p = checkoutParams({ kind: 'pass', tripId: 't1', frontendUrl: 'https://x' }, {});
    const pd = p.line_items![0].price_data!;
    expect(pd.product_data!.tax_code).toBe('txcd_10103000');
    expect(pd.tax_behavior).toBe('inclusive');
  });
});
