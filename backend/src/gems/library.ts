// The gem library: checked Google places kept in the database, so Europe's roads fill up with gems
// over time and a place is searched on Google once, not on every trip.
import type { PrismaClient } from '@prisma/client';
import { googleNearby, qualifies, samplePoints, type LatLng, type PlaceCandidate } from '../utils/routeGems';

export type LibraryDeps = {
  /** True when the cell was searched on Google recently. */
  searched(cell: string): Promise<boolean>;
  markSearched(cell: string, source: 'trip' | 'seed', found: number): Promise<void>;
  save(cands: PlaceCandidate[]): Promise<void>;
  /** Library places within `km` of a point. */
  near(p: LatLng, km: number): Promise<PlaceCandidate[]>;
  google(p: LatLng): Promise<PlaceCandidate[]>;
};

const RESEARCH_DAYS = 120;
const RADIUS_KM = 15; // Google's nearby search radius

/** A map cell of about 11 by 11 km. */
export const cellOf = (p: LatLng) => `${Math.round(p.lat * 10)}:${Math.round(p.lng * 10 * Math.cos((p.lat * Math.PI) / 180))}`;

/** Places around a point: from the library when this cell was searched, else from Google (and kept). */
export async function candidatesAt(deps: LibraryDeps, p: LatLng, source: 'trip' | 'seed'): Promise<{ cands: PlaceCandidate[]; calledGoogle: boolean }> {
  const cell = cellOf(p);
  if (await deps.searched(cell)) return { cands: await deps.near(p, RADIUS_KM), calledGoogle: false };
  const found = await deps.google(p);
  // Famous places too: a day spent in a town may show them (road gems still skip them when picking).
  const keep = found.filter((c) => qualifies(c, true));
  if (keep.length) await deps.save(keep);
  // Marked even when empty (sea, mountains); a Google error throws above and leaves the cell for later.
  await deps.markSearched(cell, source, keep.length);
  return { cands: found, calledGoogle: true };
}

/** Fills the library along the roads between city pairs until `budget` Google searches are used (over all runs). */
export async function seedGems(
  deps: LibraryDeps,
  o: { budget: number; alreadySpent: number; pairs: [LatLng, LatLng][]; road: (a: LatLng, b: LatLng) => Promise<LatLng[]>; log?: (m: string) => void },
): Promise<{ calls: number }> {
  let calls = 0;
  const left = () => o.budget - o.alreadySpent - calls;
  for (const [a, b] of o.pairs) {
    if (left() <= 0) break;
    const line = await o.road(a, b).catch(() => [] as LatLng[]);
    for (const p of samplePoints(line, 30, 400)) {
      if (left() <= 0) break;
      const r = await candidatesAt(deps, p, 'seed').catch(() => ({ calledGoogle: true }));
      if (r.calledGoogle) calls++;
    }
    o.log?.(`[gems] seeded ${calls} searches, ${Math.max(0, left())} left`);
  }
  return { calls };
}

/** The library in Postgres. */
export function libraryDeps(db: Pick<PrismaClient, 'placeGem' | 'gemSearch'>): LibraryDeps {
  return {
    async searched(cell) {
      const s = await db.gemSearch.findUnique({ where: { cell } });
      return !!s && Date.now() - s.at.getTime() < RESEARCH_DAYS * 86_400_000;
    },
    async markSearched(cell, source, found) {
      await db.gemSearch.upsert({ where: { cell }, create: { cell, source, found }, update: { found, at: new Date() } });
    },
    async save(cands) {
      for (const c of cands) {
        const data = { name: c.name, lat: c.lat, lng: c.lng, address: c.address, rating: c.rating, reviews: c.reviews, photoRef: c.photoRef, types: c.types.join(',') };
        await db.placeGem.upsert({ where: { placeId: c.placeId }, create: { placeId: c.placeId, ...data }, update: data });
      }
    },
    async near(p, km) {
      const dLat = km / 110.57;
      const dLng = km / (111.32 * Math.cos((p.lat * Math.PI) / 180));
      const rows = await db.placeGem.findMany({ where: { lat: { gte: p.lat - dLat, lte: p.lat + dLat }, lng: { gte: p.lng - dLng, lte: p.lng + dLng } }, take: 200 });
      return rows.map((r) => ({ placeId: r.placeId, name: r.name, rating: r.rating, reviews: r.reviews, address: r.address, lat: r.lat, lng: r.lng, types: r.types ? r.types.split(',') : [], photoRef: r.photoRef }));
    },
    google: googleNearby,
  };
}
