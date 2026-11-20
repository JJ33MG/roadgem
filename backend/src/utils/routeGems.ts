// Real gems along the real road: the driving route is sampled about every 75 km (plus the start
// and the end), Google Places is asked what is nearby, and only well-rated places that are not
// mass-tourism hotspots are kept. Every gem is a real Google place with its own coordinates,
// rating and Maps link, so a traveller can check it.
import axios from 'axios';

export type LatLng = { lat: number; lng: number };

export interface PlaceCandidate {
  placeId: string;
  name: string;
  rating: number;
  reviews: number;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  photoRef: string | null;
}

export interface RouteGem {
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  photoUrl?: string;
  placeId: string;
  rating: number;
  reviews: number;
  mapsUrl: string;
}

const MIN_RATING = 4.3;
const MIN_REVIEWS = 30; // enough visitors to trust the rating
const MAX_REVIEWS = 15000; // more than this is a famous sight, not a gem
const ALLOWED = new Set([
  'tourist_attraction', 'park', 'museum', 'natural_feature', 'church', 'place_of_worship', 'art_gallery',
  'zoo', 'aquarium', 'campground', 'library', 'town_square',
]);
const BLOCKED = new Set(['lodging', 'gas_station', 'car_rental', 'store', 'shopping_mall', 'supermarket', 'travel_agency', 'parking', 'bank', 'real_estate_agency']);

const rad = (d: number) => (d * Math.PI) / 180;
export function kmBetween(a: LatLng, b: LatLng): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Distance from a point to the segment a–b, in km (flat projection; fine at these scales). */
function kmToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const kx = 111.32 * Math.cos(rad(p.lat));
  const ky = 110.57;
  const [ax, ay, bx, by, px, py] = [a.lng * kx, a.lat * ky, b.lng * kx, b.lat * ky, p.lng * kx, p.lat * ky];
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Only places within `maxKm` of the road itself. */
export function nearLine<T extends { lat: number; lng: number }>(cands: T[], line: LatLng[], maxKm = 20): T[] {
  if (line.length < 2) return cands.filter((c) => line.some((l) => kmBetween(l, c) <= maxKm));
  return cands.filter((c) => line.some((a, i) => i > 0 && kmToSegment(c, line[i - 1], a) <= maxKm));
}

/** Each day's overnight town as the itinerary names it ('' when missing), one entry per day. */
export function overnightsFrom(itinerary: { overnight?: unknown }[] | undefined, days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const o = itinerary?.[i]?.overnight;
    return typeof o === 'string' ? o.trim().slice(0, 80) : '';
  });
}

/** Google's encoded polyline format (precision 5). */
export function decodePolyline(encoded: string): LatLng[] {
  const out: LatLng[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = encoded.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    out.push({ lat: Math.round(lat) / 1e5, lng: Math.round(lng) / 1e5 });
  }
  return out;
}

/** The start, a point about every `everyKm` along the line, and the end; at most `cap` points. */
export function samplePoints(line: LatLng[], everyKm = 75, cap = 16): LatLng[] {
  if (line.length === 0) return [];
  const pts: LatLng[] = [line[0]];
  let run = 0;
  for (let i = 1; i < line.length; i++) {
    run += kmBetween(line[i - 1], line[i]);
    if (run >= everyKm && i < line.length - 1) {
      pts.push(line[i]);
      run = 0;
    }
  }
  if (line.length > 1) pts.push(line[line.length - 1]);
  if (pts.length <= cap) return pts;
  // Too many: keep the ends and spread the rest evenly.
  return Array.from({ length: cap }, (_, k) => pts[Math.round((k * (pts.length - 1)) / (cap - 1))]);
}

/** Proven but quiet places, best first, one per place, at most `limit`. */
export function pickGems(cands: PlaceCandidate[], limit: number): PlaceCandidate[] {
  const seen = new Set<string>();
  return cands
    .filter((c) => {
      if (seen.has(c.placeId)) return false;
      seen.add(c.placeId);
      return (
        c.rating >= MIN_RATING &&
        c.reviews >= MIN_REVIEWS &&
        c.reviews <= MAX_REVIEWS &&
        c.types.some((t) => ALLOWED.has(t)) &&
        !c.types.some((t) => BLOCKED.has(t))
      );
    })
    .sort((a, b) => Math.round(b.rating * 10) - Math.round(a.rating * 10) || b.reviews - a.reviews)
    .slice(0, limit);
}

const CATEGORY: [string, string][] = [
  ['natural_feature', 'nature'], ['park', 'nature'], ['campground', 'nature'], ['museum', 'culture'],
  ['art_gallery', 'culture'], ['church', 'historic'], ['place_of_worship', 'historic'], ['tourist_attraction', 'viewpoint'],
];
const categoryOf = (types: string[]) => CATEGORY.find(([t]) => types.includes(t))?.[1] ?? 'other';

export function toGem(c: PlaceCandidate): RouteGem {
  return {
    name: c.name,
    description: `Rated ${c.rating.toFixed(1)} by ${c.reviews.toLocaleString('en')} Google reviewers.`,
    address: c.address,
    latitude: c.lat,
    longitude: c.lng,
    category: categoryOf(c.types),
    photoUrl: c.photoRef ? `/api/photos/image/${encodeURIComponent(c.photoRef)}` : undefined,
    placeId: c.placeId,
    rating: c.rating,
    reviews: c.reviews,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name)}&query_place_id=${c.placeId}`,
  };
}

const nearbyCache = new Map<string, { at: number; cands: PlaceCandidate[] }>();
const DAY_MS = 86_400_000;

async function nearby(p: LatLng, key: string): Promise<PlaceCandidate[]> {
  const cacheKey = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
  const hit = nearbyCache.get(cacheKey);
  if (hit && Date.now() - hit.at < 7 * DAY_MS) return hit.cands;
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
    params: { location: `${p.lat},${p.lng}`, radius: 15000, type: 'tourist_attraction', key },
    timeout: 8000,
  });
  const cands: PlaceCandidate[] = (res.data?.results ?? [])
    .filter((r: any) => r?.business_status === undefined || r.business_status === 'OPERATIONAL')
    .map((r: any) => ({
      placeId: r.place_id,
      name: r.name,
      rating: Number(r.rating ?? 0),
      reviews: Number(r.user_ratings_total ?? 0),
      address: r.vicinity ?? '',
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      types: r.types ?? [],
      photoRef: r.photos?.[0]?.photo_reference ?? null,
    }));
  // Never cache an empty answer (project rule).
  if (cands.length) {
    if (nearbyCache.size > 5000) nearbyCache.clear();
    nearbyCache.set(cacheKey, { at: Date.now(), cands });
  }
  return cands;
}

export interface RoadLine {
  points: LatLng[];
  /** Google's encoded polyline of the road; '' when only the stops are known. */
  encoded: string;
}

/** The driving road through the stops (Google Directions), or straight lines between them. */
export async function routeLine(stops: LatLng[]): Promise<RoadLine> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const clean = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (!key || clean.length < 2) return { points: clean, encoded: '' };
  return directions(clean, key);
}

async function directions(stops: LatLng[], key: string): Promise<RoadLine> {
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${stops[0].lat},${stops[0].lng}`,
        destination: `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`,
        waypoints: stops.slice(1, -1).map((s) => `${s.lat},${s.lng}`).join('|') || undefined,
        key,
      },
      timeout: 10000,
    });
    const poly = res.data?.routes?.[0]?.overview_polyline?.points;
    if (poly) return { points: decodePolyline(poly), encoded: poly };
  } catch {
    // Fall back to the stops themselves.
  }
  return { points: stops, encoded: '' };
}

/** Real gems for a route: about `perPoint` per sampled point, `total` at most. */
export async function findRouteGems(road: RoadLine, total: number, perPoint = 2): Promise<RouteGem[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const line = road.points;
  if (!key || line.length === 0 || total <= 0) return [];
  const points = samplePoints(line, 75, 16);
  const perPointCands = await Promise.all(points.map((p) => nearby(p, key).catch(() => [] as PlaceCandidate[])));
  // Take the best few per point so gems spread over the whole road, then cap the total.
  const seen = new Set<string>();
  const spread: PlaceCandidate[] = [];
  for (const cands of perPointCands) {
    for (const c of pickGems(nearLine(cands, line, 20).filter((x) => !seen.has(x.placeId)), perPoint)) {
      seen.add(c.placeId);
      spread.push(c);
    }
  }
  if (spread.length > total) {
    const step = spread.length / total;
    return Array.from({ length: total }, (_, k) => toGem(spread[Math.floor(k * step)]));
  }
  return spread.map(toGem);
}
