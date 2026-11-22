// On the road: check in at a gem of your trip (on the spot) for a stamp in the trip passport and points.
import type { PrismaClient } from '@prisma/client';
import { metresBetween, SPOT_METRES, type Point } from './rules';
import { CommunityError } from './service';

export const CHECKIN_POINTS = 20;

type Db = Pick<PrismaClient, 'trip' | 'checkIn'>;
type TripGem = { placeId?: string; name: string; latitude: number; longitude: number };

const fail = (msg: string, status: number) => Object.assign(new CommunityError(msg), { status });

async function tripGems(db: Db, tripId: string): Promise<TripGem[]> {
  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw fail('Trip not found', 404);
  const gems = JSON.parse(trip.hiddenGems || '[]') as TripGem[];
  return gems.filter((g) => g.placeId);
}

export async function checkIn(db: Db, i: { userId: string; tripId: string; placeId: string; at: Point; plus: boolean }) {
  if (!Number.isFinite(i.at?.lat) || !Number.isFinite(i.at?.lng)) throw fail('Your location is needed to check in.', 400);
  const gems = await tripGems(db, i.tripId);
  const gem = gems.find((g) => g.placeId === i.placeId);
  if (!gem) throw fail('That gem is not on this trip.', 404);
  const distance = metresBetween({ lat: gem.latitude, lng: gem.longitude }, i.at);
  if (distance > SPOT_METRES) throw fail(`Check-ins count only within ${SPOT_METRES} m of the gem.`, 400);
  const key = { userId: i.userId, tripId: i.tripId, placeId: i.placeId };
  if (await db.checkIn.findUnique({ where: { userId_tripId_placeId: key } })) throw fail('Already collected', 409);
  const points = CHECKIN_POINTS * (i.plus ? 2 : 1);
  await db.checkIn.create({ data: { ...key, name: gem.name, lat: gem.latitude, lng: gem.longitude, distanceM: Math.round(distance), points } });
  const stamps = await db.checkIn.count({ where: { userId: i.userId, tripId: i.tripId } });
  return { points, stamps, total: gems.length };
}

export async function passport(db: Db, userId: string, tripId: string) {
  const gems = await tripGems(db, tripId);
  const rows = await db.checkIn.findMany({ where: { userId, tripId }, orderBy: { createdAt: 'asc' } });
  return { total: gems.length, stamps: rows.map((r) => ({ placeId: r.placeId, name: r.name, at: r.createdAt.toISOString() })) };
}
