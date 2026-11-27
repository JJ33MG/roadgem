// A quick distance check before planning: locate both ends, straight line × 1.25 for the road.
import { searchText } from '../utils/google';
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

export const inEurope = (p: LatLng) => p.lat >= 34 && p.lat <= 72 && p.lng >= -25 && p.lng <= 45;

export async function geocode(place: string): Promise<LatLng | null> {
  const key = place.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  // Places text search (new service) instead of the Geocoding API, which this key does not have.
  // Text search returns several matches: RoamGem plans European trips, so the first one in Europe wins.
  // The server runs in the US, so Google leans American: hint Europe, and ask again with ", Europe" if needed.
  const search = async (query: string): Promise<LatLng[]> =>
    (await searchText(query, apiKey, { europe: true, max: 5 })).map((r) => ({ lat: r.lat, lng: r.lng }));
  const found = await search(place);
  const loc = found.find(inEurope) ?? (await search(`${place}, Europe`)).find(inEurope) ?? found[0];
  if (!loc) return null;
  const point = { lat: Number(loc.lat), lng: Number(loc.lng) };
  if (cache.size > 2000) cache.clear();
  cache.set(key, point);
  return point;
}

/** The estimate's answer: the rough road distance and both ends (the globe draws the arc between them). */
export function estimateBody(a: LatLng | null, b: LatLng | null): { km: number | null; from?: LatLng; to?: LatLng } {
  return a && b ? { km: roadKm(a, b), from: a, to: b } : { km: null };
}

export const routeRouter = Router();

routeRouter.get('/estimate', async (req: Request, res: Response) => {
  const from = String(req.query.from ?? '').slice(0, 120);
  const to = String(req.query.to ?? '').slice(0, 120);
  if (!from.trim() || !to.trim()) return res.status(400).json({ error: 'Add where you start and where you end.' });
  try {
    const [a, b] = await Promise.all([geocode(from), geocode(to)]);
    res.json(estimateBody(a, b));
  } catch {
    res.json({ km: null });
  }
});
