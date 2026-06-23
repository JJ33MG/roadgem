import axios from 'axios';
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
    const findRes = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
      params: { input: query, inputtype: 'textquery', fields: 'place_id,photos', key: apiKey },
    });

    const candidate = findRes.data?.candidates?.[0];
    let photoRefs: string[] = candidate?.photos?.map((p: any) => p.photo_reference) ?? [];

    if (photoRefs.length === 0 && candidate?.place_id) {
      const detailsRes = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: { place_id: candidate.place_id, fields: 'photos', key: apiKey },
      });
      photoRefs = detailsRes.data?.result?.photos?.map((p: any) => p.photo_reference) ?? [];
    }

    if (photoRefs.length > 0) {
      cache.set(cacheKey, { photoRefs, expires: Date.now() + CACHE_TTL_MS });
    }
    return photoRefs.slice(0, maxResults);
  } catch {
    return [];
  }
}

export function buildPlacePhotoUrl(photoReference: string, maxWidth = 800): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
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
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: { location: `${lat},${lng}`, radius, type: placeType, key: apiKey },
    });

    const places: NearbyPlace[] = (res.data?.results ?? []).map((p: any) => ({
      placeId: p.place_id,
      name: p.name,
      rating: p.rating ?? 0,
      priceLevel: p.price_level ?? null,
      address: p.vicinity ?? '',
      latitude: p.geometry?.location?.lat,
      longitude: p.geometry?.location?.lng,
      photoRef: p.photos?.[0]?.photo_reference ?? null,
    }));

    nearbyCache.set(cacheKey, { places, expires: Date.now() + CACHE_TTL_MS });
    return places;
  } catch {
    nearbyCache.set(cacheKey, { places: [], expires: Date.now() + CACHE_TTL_MS });
    return [];
  }
}
