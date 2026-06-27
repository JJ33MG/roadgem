import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

async function userOwnsTemplate(userId: string, templateId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.subscriptionTier === 'premium') return true;
  const purchase = await prisma.templatePurchase.findUnique({
    where: { userId_templateId: { userId, templateId } },
  });
  return !!purchase;
}

// GET /api/templates — list all templates, with owned flag if logged in
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId ?? null;

    const templates = await prisma.tripTemplate.findMany({
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        emoji: true,
        startLocation: true,
        destination: true,
        days: true,
        budget: true,
        travelStyle: true,
        highlights: true,
        totalCost: true,
        totalDistance: true,
        priceEur: true,
        featured: true,
      },
    });

    let ownedIds = new Set<string>();
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.subscriptionTier === 'premium') {
        ownedIds = new Set(templates.map((t) => t.id));
      } else {
        const purchases = await prisma.templatePurchase.findMany({ where: { userId } });
        ownedIds = new Set(purchases.map((p) => p.templateId));
      }
    }

    res.json({ templates: templates.map((t) => ({ ...t, owned: ownedIds.has(t.id) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/:slug — single template detail
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const template = await prisma.tripTemplate.findUnique({
      where: { slug: req.params.slug },
    });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json({ template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/templates/:id/use — clone template into user's trips (must own it)
router.post('/:id/use', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.tripTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: 'Not found' });

    const userId = req.userId!;

    const owned = await userOwnsTemplate(userId, template.id);
    if (!owned) return res.status(403).json({ error: 'not_purchased', message: 'Koop deze template eerst om hem te gebruiken.' });

    const trip = await prisma.trip.create({
      data: {
        userId,
        startLocation: template.startLocation,
        destination: template.destination,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + template.days * 86400000).toISOString().split('T')[0],
        days: template.days,
        budget: template.budget,
        travelStyle: template.travelStyle,
        priorities: template.highlights,
        stops: template.stops,
        highlights: template.highlights,
        tips: template.tips,
        totalCost: template.totalCost,
        totalDistance: template.totalDistance,
        weather: '[]',
      },
    });

    res.json({ tripId: trip.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to use template' });
  }
});

export default router;
