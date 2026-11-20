// A quick distance check before planning: locate both ends, straight line × 1.25 for the road.
import axios from 'axios';
import { Router, Request, Response } from 'express';

type LatLng = { lat: number; lng: number };
const ROAD_FACTOR = 1.25;

export function roadKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * ROAD_FACTOR);
}

const cache = new Map<string, LatLng>();

async function geocode(place: string): Promise<LatLng | null> {
  const key = place.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  // Places (already enabled for photos) instead of the Geocoding API, which this key does not have.
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
    params: { input: place, inputtype: 'textquery', fields: 'geometry', key: apiKey },
    timeout: 8000,
  });
  const loc = res.data?.candidates?.[0]?.geometry?.location;
  if (!loc) return null;
  const point = { lat: Number(loc.lat), lng: Number(loc.lng) };
  if (cache.size > 2000) cache.clear();
  cache.set(key, point);
  return point;
}

export const routeRouter = Router();

routeRouter.get('/estimate', async (req: Request, res: Response) => {
  const from = String(req.query.from ?? '').slice(0, 120);
  const to = String(req.query.to ?? '').slice(0, 120);
  if (!from.trim() || !to.trim()) return res.status(400).json({ error: 'Add where you start and where you end.' });
  try {
    const [a, b] = await Promise.all([geocode(from), geocode(to)]);
    res.json({ km: a && b ? roadKm(a, b) : null });
  } catch {
    res.json({ km: null });
  }
});
