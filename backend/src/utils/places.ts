import { photoMediaUrl, placePhotos, searchNearby, searchText } from './google';
import dotenv from 'dotenv';

dotenv.config();

interface CacheEntry {
  photoRefs: string[];
  expires: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export async function findPlacePhotoRefs(query: string, maxResults = 1): Promise<string[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !query) return [];

  const cacheKey = query.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.photoRefs.slice(0, maxResults);
  }

  try {
    const [place] = await searchText(query, apiKey, { max: 1 });
    let photoRefs: string[] = place?.photo ? [place.photo] : [];
    if (place && maxResults > 1) photoRefs = (await placePhotos(place.id, apiKey)).slice(0, maxResults);
    if (photoRefs.length > 0) {
      cache.set(cacheKey, { photoRefs, expires: Date.now() + CACHE_TTL_MS });
    }
    return photoRefs.slice(0, maxResults);
  } catch {
    return [];
  }
}

/** New photo names ("places/…/photos/…") use Places (New); older saved references the old photo service. */
export function buildPlacePhotoUrl(photoReference: string, maxWidth = 800): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (photoReference.startsWith('places/')) return photoMediaUrl(photoReference, maxWidth, apiKey ?? '');
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  rating: number;
  priceLevel: number | null;
  address: string;
  latitude: number;
  longitude: number;
  photoRef: string | null;
}

interface NearbyCacheEntry {
  places: NearbyPlace[];
  expires: number;
}

const nearbyCache = new Map<string, NearbyCacheEntry>();

export async function findNearbyPlaces(
  lat: number,
  lng: number,
  placeType: string,
  radius = 8000
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}::${placeType}::${radius}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.places;
  }

  try {
    const places: NearbyPlace[] = (await searchNearby({ lat, lng }, radius, [placeType], apiKey)).filter((p) => p.open).map((p) => ({
      placeId: p.id,
      name: p.name,
      rating: p.rating,
      priceLevel: p.priceLevel,
      address: p.address,
      latitude: p.lat,
      longitude: p.lng,
      photoRef: p.photo,
    }));
    // Never cache an empty answer (project rule): a refused key must not hide stays for a day.
    if (places.length) nearbyCache.set(cacheKey, { places, expires: Date.now() + CACHE_TTL_MS });
    return places;
  } catch {
    return [];
  }
}
