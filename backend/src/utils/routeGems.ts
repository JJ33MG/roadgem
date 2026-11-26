// Real gems along the real road: the driving route is sampled about every 75 km (plus the start
// and the end), Google Places is asked what is nearby, and only well-rated places that are not
// mass-tourism hotspots are kept. Every gem is a real Google place with its own coordinates,
// rating and Maps link, so a traveller can check it.
import { computeRoute, searchNearby } from './google';

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
  /** The trip day this gem belongs to (since 26 Nov). */
  day?: number;
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
  // Places (New) kinds (26 Nov: more than sights: views, hikes, nature, days out)
  'national_park', 'hiking_area', 'historical_landmark', 'observation_deck', 'botanical_garden', 'beach', 'amusement_park',
]);
/** What Routify asks Google for along the road: sights, views, hikes, nature and days out. */
export const GEM_TYPES = ['tourist_attraction', 'park', 'national_park', 'hiking_area', 'museum', 'historical_landmark', 'observation_deck', 'botanical_garden', 'beach', 'zoo', 'aquarium', 'amusement_park'];
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
/** A real, proven but quiet place of a kind worth a stop. */
export function qualifies(c: PlaceCandidate): boolean {
  return (
    c.rating >= MIN_RATING &&
    c.reviews >= MIN_REVIEWS &&
    c.reviews <= MAX_REVIEWS &&
    c.types.some((t) => ALLOWED.has(t)) &&
    !c.types.some((t) => BLOCKED.has(t))
  );
}

export function pickGems(cands: PlaceCandidate[], limit: number): PlaceCandidate[] {
  const seen = new Set<string>();
  return cands
    .filter((c) => {
      if (seen.has(c.placeId)) return false;
      seen.add(c.placeId);
      return qualifies(c);
    })
    .sort((a, b) => Math.round(b.rating * 10) - Math.round(a.rating * 10) || b.reviews - a.reviews)
    .slice(0, limit);
}

const CATEGORY: [string, string][] = [
  ['hiking_area', 'hike'], ['national_park', 'nature'], ['observation_deck', 'viewpoint'], ['beach', 'nature'], ['botanical_garden', 'nature'],
  ['amusement_park', 'family'], ['zoo', 'family'], ['aquarium', 'family'], ['historical_landmark', 'historic'],
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
    // New photo names stream directly; older saved references are looked up again by place (Places New).
    photoUrl: c.photoRef?.startsWith('places/') ? `/api/photos/image/${encodeURIComponent(c.photoRef)}` : c.photoRef ? `/api/photos/place/${encodeURIComponent(c.placeId)}` : undefined,
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
  const cands: PlaceCandidate[] = (await searchNearby(p, 15000, GEM_TYPES, key))
    .filter((r) => r.open)
    .map((r) => ({ placeId: r.id, name: r.name, rating: r.rating, reviews: r.reviews, address: r.address, lat: r.lat, lng: r.lng, types: r.types, photoRef: r.photo }));
  // Never cache an empty answer (project rule).
  if (cands.length) {
    if (nearbyCache.size > 5000) nearbyCache.clear();
    nearbyCache.set(cacheKey, { at: Date.now(), cands });
  }
  return cands;
}

export interface RoadLeg {
  km: number;
  hours: number;
  /** Kilometres per country on this leg, in driving order. */
  countries: { code: string; km: number }[];
}

export interface RoadLine {
  points: LatLng[];
  /** Google's encoded polyline of the road; '' when only the stops are known. */
  encoded: string;
  /** One per pair of stops (empty when Directions did not answer). */
  legs: RoadLeg[];
}

const COUNTRY_CODES: Record<string, string> = {
  belgium: 'BE', netherlands: 'NL', 'the netherlands': 'NL', germany: 'DE', france: 'FR', spain: 'ES', italy: 'IT',
  austria: 'AT', switzerland: 'CH', czechia: 'CZ', 'czech republic': 'CZ', slovenia: 'SI', slovakia: 'SK', hungary: 'HU',
  poland: 'PL', portugal: 'PT', croatia: 'HR', luxembourg: 'LU', denmark: 'DK', norway: 'NO', sweden: 'SE', finland: 'FI',
  greece: 'GR', romania: 'RO', bulgaria: 'BG', 'united kingdom': 'GB', uk: 'GB', ireland: 'IE', andorra: 'AD', monaco: 'MC',
  liechtenstein: 'LI', 'bosnia and herzegovina': 'BA', serbia: 'RS', montenegro: 'ME', albania: 'AL', 'north macedonia': 'MK',
  estonia: 'EE', latvia: 'LV', lithuania: 'LT',
};
const codeOf = (name: string) => COUNTRY_CODES[name.trim().toLowerCase()] ?? null;

/** The country of a Google address ("…, Brussels, Belgium" → BE); null when unknown. */
export function countryOfAddress(address: string): string | null {
  const parts = address.split(',');
  return codeOf(parts[parts.length - 1] ?? '');
}

/** Kilometres per country along one leg, split where Google's step says "Entering <country>". */
export function countriesFromSteps(steps: { distanceKm: number; instruction: string }[], startCode: string): { code: string; km: number }[] {
  const out: { code: string; km: number }[] = [];
  let current = startCode;
  const add = (code: string, km: number) => {
    const last = out[out.length - 1];
    if (last && last.code === code) last.km += km;
    else out.push({ code, km });
  };
  for (const st of steps) {
    const m = /Entering ([A-Za-z .'-]+?)\s*(?:<|$)/.exec(st.instruction);
    const entered = m ? codeOf(m[1]) : null;
    // The step that crosses the border is mostly driven in the new country.
    if (entered) current = entered;
    add(current, st.distanceKm);
  }
  return out.map((c) => ({ code: c.code, km: Math.round(c.km) }));
}

/** The driving road through the stops (Google Routes API), or straight lines between them. */
/** A stop on the road; `label` ("Kotor, Montenegro") tells the country a leg starts in. */
export type Stop = LatLng & { label?: string };

export async function routeLine(stops: Stop[], opts: { avoidTolls?: boolean } = {}): Promise<RoadLine> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const clean = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (!key || clean.length < 2) return { points: clean, encoded: '', legs: [] };
  return directions(clean, key, opts.avoidTolls === true);
}

async function directions(stops: Stop[], key: string, avoidTolls = false): Promise<RoadLine> {
  try {
    const route = await computeRoute(stops, key, avoidTolls);
    if (route) {
      let lastCode = 'XX';
      const legs: RoadLeg[] = route.legs.map((leg, i) => {
        // The new Routes API gives no addresses: the stop's own name ("Kotor, Montenegro") says where a leg starts.
        const start = countryOfAddress(stops[i]?.label ?? '') ?? lastCode;
        const countries = countriesFromSteps(leg.steps.map((st) => ({ distanceKm: st.meters / 1000, instruction: st.instruction })), start);
        lastCode = countries[countries.length - 1]?.code ?? start;
        return { km: Math.round(leg.meters / 1000), hours: Math.round((leg.seconds / 3600) * 10) / 10, countries };
      });
      return { points: decodePolyline(route.encoded), encoded: route.encoded, legs };
    }
  } catch {
    // Fall back to the stops themselves.
  }
  return { points: stops, encoded: '', legs: [] };
}

/** Real gems for a route: about `perPoint` per sampled point, `total` at most. */
/** Google's places around a point (about 15 km), cached in memory for a week. */
export function googleNearby(p: LatLng): Promise<PlaceCandidate[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return key ? nearby(p, key) : Promise.resolve([]);
}

/**
 * `at` gives the places around a point: by default straight from Google; trips pass the gem
 * library, which asks Google only for places it has not searched yet.
 */
export async function findRouteGems(road: RoadLine, total: number, perPoint = 2, at: (p: LatLng) => Promise<PlaceCandidate[]> = googleNearby): Promise<RouteGem[]> {
  const line = road.points;
  if (!process.env.GOOGLE_MAPS_API_KEY || line.length === 0 || total <= 0) return [];
  // Denser than before (every 50 km): the library makes repeat searches free.
  const points = samplePoints(line, 50, 24);
  const perPointCands = await Promise.all(points.map((p) => at(p).catch(() => [] as PlaceCandidate[])));
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
