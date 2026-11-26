// Experiences in the town where the traveller sleeps (Jarne, 26 Nov: "a beer spa in Prague", things to do
// with family, a partner or friends). Claude suggests them by exact name; Routify checks each one on
// Google (a real, open, well-rated place near the town) and finds a photo before it becomes a gem.
import { kmBetween, type LatLng, type RouteGem } from './routeGems';
import type { GPlace } from './google';

export const EXPERIENCE_KINDS = ['experience', 'food', 'nightlife', 'nature', 'culture', 'wellness'] as const;
export const AUDIENCES = ['family', 'couples', 'friends'] as const;
export type ExperienceKind = (typeof EXPERIENCE_KINDS)[number];
export type Audience = (typeof AUDIENCES)[number];
export interface Experience { name: string; what: string; kind: ExperienceKind; for: Audience[] }

export function experiencePrompt(town: string, style: string): string {
  return (
    `List 6 memorable things to do in or right around ${town} for road trippers (travel style: ${style}). ` +
    'Mix them: unusual local experiences (a beer spa, a cooking class, a boat trip, thermal baths), food and drink spots locals love, ' +
    'a view or short walk, and something for children. Each must be one real place you can find on Google Maps: give its exact name as Google lists it. ' +
    'For each say in one short sentence (under 15 words) what you do there, its kind (experience, food, nightlife, nature, culture or wellness) ' +
    'and who it suits best: family, couples and/or friends. ' +
    'Respond with ONLY JSON: {"experiences":[{"name":string,"what":string,"kind":string,"for":[string]}]}'
  );
}

export function parseExperiences(text: string): Experience[] {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const list = (JSON.parse(m[0]).experiences ?? []) as any[];
    return list
      .map((e) => ({
        name: String(e?.name ?? '').trim().slice(0, 100),
        what: String(e?.what ?? '').trim().slice(0, 140),
        kind: (EXPERIENCE_KINDS as readonly string[]).includes(e?.kind) ? (e.kind as ExperienceKind) : 'experience',
        for: (Array.isArray(e?.for) ? e.for : []).filter((a: unknown): a is Audience => (AUDIENCES as readonly string[]).includes(a as string)),
      }))
      .filter((e) => e.name);
  } catch {
    return [];
  }
}

const MIN_RATING = 4.2;
const MIN_REVIEWS = 20;
const MAX_KM = 20;

export type ExperienceGem = RouteGem & { day: number; audience: Audience[] };

/** The first Google match that is real, open, well rated and near the town; null when none is. */
export function verifiedExperience(e: Experience, found: GPlace[], town: LatLng, day: number): ExperienceGem | null {
  const p = found.find((f) => f.open && f.rating >= MIN_RATING && f.reviews >= MIN_REVIEWS && kmBetween(town, f) <= MAX_KM);
  if (!p) return null;
  return {
    name: p.name,
    description: e.what,
    address: p.address,
    latitude: p.lat,
    longitude: p.lng,
    category: e.kind,
    photoUrl: p.photo ? `/api/photos/image/${encodeURIComponent(p.photo)}` : undefined,
    placeId: p.id,
    rating: p.rating,
    reviews: p.reviews,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.id}`,
    day,
    audience: e.for,
  };
}
