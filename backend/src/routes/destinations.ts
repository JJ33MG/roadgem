import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { prisma } from '../utils/prisma';

dotenv.config();

const router = Router();

const EUROPE_BOUNDS = {
  south: 34.5,
  west: -25,
  north: 71,
  east: 45,
};

router.get('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query) {
      return res.json([]);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.json([]);
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input: query,
        types: '(cities)',
        locationbias: `rectangle:${EUROPE_BOUNDS.south},${EUROPE_BOUNDS.west}|${EUROPE_BOUNDS.north},${EUROPE_BOUNDS.east}`,
        key: apiKey,
      },
    });

    const suggestions: string[] = (response.data?.predictions ?? [])
      .map((p: any) => p.description as string)
      .filter(Boolean)
      .slice(0, 5);

    res.json(suggestions);
  } catch (err) {
    next(err);
  }
});

// GET /api/destinations/seo — list all destinations with SEO content
router.get('/seo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const destinations = await (prisma as any).destinationSeo.findMany({
      select: { slug: true, destination: true, title: true, metaDescription: true, h1: true, updatedAt: true },
      orderBy: { destination: 'asc' },
    });

    // Also attach gem count per destination
    const gems = await prisma.destinationGem.groupBy({
      by: ['destination'],
      _count: { id: true },
    });
    const gemMap = Object.fromEntries(gems.map((g) => [g.destination, g._count.id]));

    const result = destinations.map((d: any) => ({
      ...d,
      gemCount: gemMap[d.destination] ?? 0,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/destinations/seo/:slug — full SEO content for one destination
router.get('/seo/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const seo = await (prisma as any).destinationSeo.findUnique({ where: { slug } });
    if (!seo) return res.status(404).json({ error: 'Destination not found' });

    const gems = await prisma.destinationGem.findMany({
      where: { destination: seo.destination },
      take: 6,
    });

    res.json({
      ...seo,
      topKeywords: JSON.parse(seo.topKeywords || '[]'),
      faq: JSON.parse(seo.faq || '[]'),
      internalLinkSuggestions: JSON.parse(seo.internalLinkSuggestions || '[]'),
      gems,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
