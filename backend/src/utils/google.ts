// Google's new Places and Routes services. New Google Cloud projects cannot switch on the old Places
// and Directions services any more (26 Nov 2026: "You're calling a legacy API"), and Google is phasing
// them out, so every Google call of RoamGem goes through here.
import axios from 'axios';

export type LatLng = { lat: number; lng: number };

export interface GPlace {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  /** Photo name for photoMediaUrl ("places/…/photos/…"), or null. */
  photo: string | null;
  /** False when Google says the place closed. */
  open: boolean;
  /** 0 (free) to 4 (very expensive), null when unknown. */
  priceLevel: number | null;
}

const PLACES = 'https://places.googleapis.com/v1';
const PLACE_FIELDS = ['id', 'displayName', 'rating', 'userRatingCount', 'shortFormattedAddress', 'formattedAddress', 'location', 'types', 'photos', 'businessStatus', 'priceLevel'];
const PRICE: Record<string, number> = { PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

const headers = (key: string, fields: string) => ({ 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fields, 'Content-Type': 'application/json' });

export function parsePlaces(data: unknown): GPlace[] {
  const list = ((data ?? {}) as { places?: any[] }).places ?? [];
  return list
    .filter((p) => p?.id && p?.location)
    .map((p) => ({
      id: String(p.id),
      name: String(p.displayName?.text ?? ''),
      rating: Number(p.rating ?? 0),
      reviews: Number(p.userRatingCount ?? 0),
      address: String(p.shortFormattedAddress ?? p.formattedAddress ?? ''),
      lat: Number(p.location.latitude),
      lng: Number(p.location.longitude),
      types: Array.isArray(p.types) ? p.types.map(String) : [],
      photo: p.photos?.[0]?.name ?? null,
      open: p.businessStatus === undefined || p.businessStatus === 'OPERATIONAL',
      priceLevel: p.priceLevel in PRICE ? PRICE[p.priceLevel] : null,
    }));
}

/** Places of these types within `radius` metres of a point, most popular first (at most 20). */
export async function searchNearby(p: LatLng, radius: number, types: string[], key: string): Promise<GPlace[]> {
  const res = await axios.post(
    `${PLACES}/places:searchNearby`,
    { includedTypes: types, maxResultCount: 20, rankPreference: 'POPULARITY', languageCode: 'en', locationRestriction: { circle: { center: { latitude: p.lat, longitude: p.lng }, radius: Math.min(radius, 50000) } } },
    { headers: headers(key, PLACE_FIELDS.map((f) => `places.${f}`).join(',')), timeout: 8000 },
  );
  return parsePlaces(res.data);
}

/** Places matching a text ("Brussels", "Eiffel Tower Paris"), Europe first when `europe` is set. */
export async function searchText(query: string, key: string, opts: { europe?: boolean; max?: number } = {}): Promise<GPlace[]> {
  const res = await axios.post(
    `${PLACES}/places:searchText`,
    {
      textQuery: query,
      languageCode: 'en',
      pageSize: opts.max ?? 5,
      ...(opts.europe ? { locationBias: { rectangle: { low: { latitude: 34, longitude: -25 }, high: { latitude: 72, longitude: 45 } } } } : {}),
    },
    { headers: headers(key, PLACE_FIELDS.map((f) => `places.${f}`).join(',')), timeout: 8000 },
  );
  return parsePlaces(res.data);
}

/** All photo names of one place. */
export async function placePhotos(id: string, key: string): Promise<string[]> {
  const res = await axios.get(`${PLACES}/places/${encodeURIComponent(id)}`, { headers: headers(key, 'photos'), timeout: 8000 });
  const names = ((res.data?.photos ?? []) as { name?: string }[]).map((p) => p.name).filter((n): n is string => !!n);
  if (!names.length) console.warn(`[google] no photos for ${id}: ${JSON.stringify(res.data).slice(0, 300)}`);
  return names;
}

/** City suggestions while typing, Europe first. */
export async function autocompleteCities(input: string, key: string): Promise<string[]> {
  const res = await axios.post(
    `${PLACES}/places:autocomplete`,
    { input, includedPrimaryTypes: ['(cities)'], languageCode: 'en', locationBias: { rectangle: { low: { latitude: 34, longitude: -25 }, high: { latitude: 72, longitude: 45 } } } },
    { headers: { 'X-Goog-Api-Key': key, 'Content-Type': 'application/json' }, timeout: 6000 },
  );
  return ((res.data?.suggestions ?? []) as any[]).map((s) => s?.placePrediction?.text?.text).filter((t): t is string => !!t);
}

export function photoMediaUrl(name: string, maxWidth: number, key: string): string {
  return `${PLACES}/${name}/media?maxWidthPx=${maxWidth}&key=${key}`;
}

// --- Routes API ---

type RouteStop = LatLng & { label?: string };
/** A stop by its coordinates, or by its name (Google then picks the nearest road; 27 Nov: Plitvice Lakes). */
const point = (byName: boolean) => (p: RouteStop) =>
  byName && p.label ? { address: p.label } : { location: { latLng: { latitude: p.lat, longitude: p.lng } } };

export function routeBody(stops: RouteStop[], avoidTolls: boolean, byName = false) {
  const at = point(byName);
  return {
    origin: at(stops[0]),
    destination: at(stops[stops.length - 1]),
    intermediates: stops.slice(1, -1).map(at),
    travelMode: 'DRIVE',
    languageCode: 'en',
    units: 'METRIC',
    routeModifiers: { avoidTolls },
  };
}

export interface GRoute {
  encoded: string;
  legs: { meters: number; seconds: number; steps: { meters: number; instruction: string }[] }[];
}

export function parseRoute(data: unknown): GRoute | null {
  const r = ((data ?? {}) as { routes?: any[] }).routes?.[0];
  const encoded = r?.polyline?.encodedPolyline;
  if (!encoded) return null;
  return {
    encoded,
    legs: ((r.legs ?? []) as any[]).map((l) => ({
      meters: Number(l.distanceMeters ?? 0),
      seconds: Number(String(l.duration ?? '0s').replace('s', '')) || 0,
      steps: ((l.steps ?? []) as any[]).map((s) => ({ meters: Number(s.distanceMeters ?? 0), instruction: String(s.navigationInstruction?.instructions ?? '') })),
    })),
  };
}

const ROUTE_FIELDS = 'routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction.instructions';

/** The driving road through the stops (at most 25 in between), or null when Google has none. */
export async function computeRoute(stops: RouteStop[], key: string, avoidTolls = false): Promise<GRoute | null> {
  const ask = async (byName: boolean) =>
    parseRoute((await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', routeBody(stops, avoidTolls, byName), { headers: headers(key, ROUTE_FIELDS), timeout: 12000 })).data);
  const route = await ask(false);
  // No road at a stop's exact coordinates (inside a park, on a lake): ask again by the stops' names.
  if (!route && stops.every((s) => s.label)) return ask(true);
  return route;
}
