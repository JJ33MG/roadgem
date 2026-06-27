import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/templates — list all templates
router.get('/', async (_req: Request, res: Response) => {
  try {
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
    res.json({ templates });
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

// POST /api/templates/:id/use — clone template into user's trips (requires auth or free preview)
router.post('/:id/use', optionalAuth, async (req: Request, res: Response) => {
  try {
    const template = await prisma.tripTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: 'Not found' });

    const userId = (req as any).userId ?? null;

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
