// GET /api/trips/:tripId/map — a real Google map image of the trip, the day's drive drawn on top.
// The server holds the key; images are kept in memory (never failed answers).
import type { PrismaClient } from '@prisma/client';
import { decodePolyline } from '../utils/routeGems';
import { gemsFor } from '../utils/gems';
import { staticMapUrl } from '../utils/staticMap';

type Db = Pick<PrismaClient, 'trip'>;
export type Image = { ok: boolean; type: string; body: Buffer };
export type FetchImage = (url: string) => Promise<Image>;
type Result = { status: number; type?: string; body?: Buffer; error?: string };

const CACHE_MAX = 300;
const cache = new Map<string, { type: string; body: Buffer }>();

export async function tripMapImage(
  db: Db,
  fetchImage: FetchImage,
  q: { tripId: string; from: number; to: number; width: number; height: number; key: string; premium?: boolean },
): Promise<Result> {
  if (!q.key) return { status: 503, error: 'The map is not set up.' };
  const trip = await db.trip.findUnique({ where: { id: q.tripId } });
  if (!trip) return { status: 404, error: 'Trip not found' };
  const planner = JSON.parse(trip.planner || '{}') as { route?: string; hiddenGems?: string[] };
  const hidden = new Set(planner.hiddenGems ?? []);
  const all = (JSON.parse(trip.hiddenGems || '[]') as { latitude: number; longitude: number; placeId?: string }[]).filter((g) => !g.placeId || !hidden.has(g.placeId));
  const url = staticMapUrl(
    {
      line: planner.route ? decodePolyline(planner.route) : [],
      stops: JSON.parse(trip.stops || '[]'),
      gems: gemsFor(all, !!q.premium).hiddenGems,
      day: { from: q.from, to: q.to },
    },
    { width: q.width, height: q.height, key: q.key },
  );
  const hit = cache.get(url);
  if (hit) return { status: 200, ...hit };
  const img = await fetchImage(url).catch(() => null);
  if (!img || !img.ok || !img.type.startsWith('image/')) return { status: 502, error: 'The map is not available right now.' };
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(url, { type: img.type, body: img.body });
  return { status: 200, type: img.type, body: img.body };
}

/** The real fetch: Google answers 200 with an image, or an error page. */
export const fetchGoogleImage: FetchImage = async (url) => {
  const r = await fetch(url);
  return { ok: r.ok, type: r.headers.get('content-type') ?? '', body: Buffer.from(await r.arrayBuffer()) };
};
