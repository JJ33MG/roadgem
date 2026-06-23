import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

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

export default router;
