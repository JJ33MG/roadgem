import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { applyStripeEvent, checkoutParams, planPricesFrom } from '../utils/billing';

const frontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';
const set = (v?: string) => (v && !/YOUR/.test(v) ? v : undefined);
const configured = () => ({ monthly: set(process.env.STRIPE_PRICE_ID), yearly: set(process.env.STRIPE_PRICE_ID_YEARLY) });

// The variables may hold price IDs (price_…) or the products (prod_…) that hold them: then the monthly and the
// yearly price are looked up once by their interval (27 Nov: Stripe shows product IDs more readily).
let resolved: { monthly?: string; yearly?: string } | null = null;
async function prices(stripe: Stripe): Promise<{ monthly?: string; yearly?: string }> {
  const c = configured();
  const ids = [c.monthly, c.yearly].filter((x): x is string => !!x);
  if (!ids.some((id) => id.startsWith('prod_'))) return c;
  if (resolved?.monthly && resolved?.yearly) return resolved;
  const found = await Promise.all(ids.filter((id) => id.startsWith('prod_')).map((product) => stripe.prices.list({ product, active: true, limit: 20 }).then((r) => r.data)));
  const fromProducts = planPricesFrom(found.flat());
  resolved = {
    monthly: c.monthly?.startsWith('price_') ? c.monthly : fromProducts.monthly,
    yearly: c.yearly?.startsWith('price_') ? c.yearly : fromProducts.yearly,
  };
  return resolved;
}

const router = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_YOUR')) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  // Managed Payments (Stripe sells and handles VAT) needs API version 2025-03-31.basil or newer.
  return new Stripe(key, { apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion });
}

// POST /api/stripe/create-checkout-session  { plan: "monthly" | "yearly" }
router.post('/create-checkout-session', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripe();
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const plan = req.body?.plan === 'yearly' ? 'yearly' : 'monthly';
    const session = await stripe.checkout.sessions.create(
      checkoutParams({ kind: 'plus', plan, frontendUrl: frontendUrl(), email: user.email, userId: user.id }, await prices(stripe)),
    );
    res.json({ url: session.url });
  } catch (err: any) {
    if (/not configured|No Stripe price/.test(err.message ?? '')) return res.status(503).json({ error: 'Payments are not open yet.' });
    next(err);
  }
});

// POST /api/stripe/trip-pass  { tripId }: one trip, everything Plus gives; no account needed.
router.post('/trip-pass', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripe();
    const trip = await prisma.trip.findUnique({ where: { id: String(req.body?.tripId ?? '') } });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const user = req.userId ? await prisma.user.findUnique({ where: { id: req.userId } }) : null;
    const session = await stripe.checkout.sessions.create(
      checkoutParams({ kind: 'pass', tripId: trip.id, frontendUrl: frontendUrl(), email: user?.email, userId: user?.id }, configured()),
    );
    res.json({ url: session.url });
  } catch (err: any) {
    if (/not configured/.test(err.message ?? '')) return res.status(503).json({ error: 'Payments are not open yet.' });
    next(err);
  }
});

// POST /api/stripe/webhook  — registered with express.raw() in server.ts
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.startsWith('whsec_YOUR')) return res.status(200).json({ received: true }); // not set up yet
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch {
    return res.status(400).send('Webhook signature verification failed');
  }
  try {
    await applyStripeEvent(prisma, event);
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook failed' }); // Stripe retries
  }
  res.json({ received: true });
});

export default router;
