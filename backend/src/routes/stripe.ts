import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_YOUR')) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key);
}

// POST /api/stripe/create-checkout-session
router.post(
  '/create-checkout-session',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stripe = getStripe();
      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId || priceId.startsWith('price_YOUR')) {
        return res.status(500).json({ error: 'Stripe is not configured yet. Add your keys to .env.' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}/dashboard?upgraded=true`,
        cancel_url: `${frontendUrl}/pricing`,
        metadata: { userId: user.id },
        subscription_data: { metadata: { userId: user.id } },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      if (err.message?.includes('not configured')) {
        return res.status(503).json({ error: err.message });
      }
      next(err);
    }
  }
);

// POST /api/stripe/buy-template — one-time €4.99 purchase for a single template
router.post(
  '/buy-template',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stripe = getStripe();
      const { templateId } = req.body as { templateId: string };
      if (!templateId) return res.status(400).json({ error: 'templateId required' });

      const template = await prisma.tripTemplate.findUnique({ where: { id: templateId } });
      if (!template) return res.status(404).json({ error: 'Template not found' });

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Already purchased?
      const existing = await prisma.templatePurchase.findUnique({
        where: { userId_templateId: { userId: user.id, templateId } },
      });
      if (existing) return res.json({ alreadyOwned: true });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: template.title,
              description: `Routify kant-en-klare trip: ${template.description.slice(0, 100)}`,
              images: [],
            },
            unit_amount: Math.round(template.priceEur * 100),
          },
          quantity: 1,
        }],
        success_url: `${frontendUrl}/templates?purchased=${templateId}`,
        cancel_url: `${frontendUrl}/templates`,
        metadata: { userId: user.id, templateId, type: 'template_purchase' },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      if (err.message?.includes('not configured')) {
        return res.status(503).json({ error: err.message });
      }
      next(err);
    }
  }
);

// POST /api/stripe/webhook  — registered with express.raw() in server.ts
router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret || secret.startsWith('whsec_YOUR')) {
      return res.status(200).json({ received: true }); // silently skip if not configured
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
    } catch {
      return res.status(400).send('Webhook signature verification failed');
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const type = session.metadata?.type;

        if (type === 'template_purchase' && userId && session.metadata?.templateId) {
          await prisma.templatePurchase.upsert({
            where: { userId_templateId: { userId, templateId: session.metadata.templateId } },
            update: { stripeId: session.id },
            create: { id: `tp_${Date.now()}`, userId, templateId: session.metadata.templateId, stripeId: session.id },
          });
        } else if (userId && session.mode === 'subscription') {
          const expires = new Date();
          expires.setMonth(expires.getMonth() + 1);
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionTier: 'premium', subscriptionExpires: expires },
          });
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionTier: 'free', subscriptionExpires: null },
          });
        }
      }

      if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        const subMeta = (invoice as any).subscription_details?.metadata;
        const userId = subMeta?.userId;
        if (userId) {
          const expires = new Date();
          expires.setMonth(expires.getMonth() + 1);
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionExpires: expires },
          });
        }
      }
    } catch (err) {
      console.error('Webhook handler error:', err);
    }

    res.json({ received: true });
  }
);

export default router;
