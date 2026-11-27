// Gems near where a traveller posts from: official community gems and checked library gems within 5 km.
import type { PrismaClient } from '@prisma/client';
import { metresBetween, NEAR_GEM_METRES, type Point } from './rules';

export type NearbyGem = { gemId?: string; placeId?: string; name: string; lat: number; lng: number; address: string; distanceKm: number };

export async function nearbyGems(db: PrismaClient, at: Point, limit = 8): Promise<NearbyGem[]> {
  // A box a little larger than 5 km first, then the real distance.
  const dLat = NEAR_GEM_METRES / 111_000 + 0.01;
  const dLng = dLat / Math.max(Math.cos((at.lat * Math.PI) / 180), 0.2);
  const box = { lat: { gte: at.lat - dLat, lte: at.lat + dLat }, lng: { gte: at.lng - dLng, lte: at.lng + dLng } };
  const [gems, places] = await Promise.all([
    db.gem.findMany({ where: { ...box, status: 'official' }, take: 200, select: { id: true, placeId: true, name: true, lat: true, lng: true, address: true } }),
    db.placeGem.findMany({ where: { ...box, rating: { gte: 4.2 }, reviews: { gte: 20 } }, take: 300, select: { placeId: true, name: true, lat: true, lng: true, address: true } }),
  ]);
  const known = new Set(gems.map((g) => g.placeId).filter(Boolean));
  const all: NearbyGem[] = [
    ...gems.map((g) => ({ gemId: g.id, ...(g.placeId ? { placeId: g.placeId } : {}), name: g.name, lat: g.lat, lng: g.lng, address: g.address, distanceKm: 0 })),
    ...places.filter((p) => !known.has(p.placeId)).map((p) => ({ placeId: p.placeId, name: p.name, lat: p.lat, lng: p.lng, address: p.address, distanceKm: 0 })),
  ];
  return all
    .map((g) => ({ g, m: metresBetween(g, at) }))
    .filter((x) => x.m <= NEAR_GEM_METRES)
    .sort((a, b) => a.m - b.m)
    .slice(0, limit)
    .map(({ g, m }) => ({ ...g, distanceKm: Math.round(m / 100) / 10 }));
}
