// On the road: check in at a gem of your trip (on the spot) for a stamp in the trip passport and points.
// Accepted risk: the location comes from the phone and could be faked. Stamps only count on your own
// trips, once per gem, and check-ins are rate-limited, so faking buys at most a trip's worth of points.
import type { PrismaClient } from '@prisma/client';
import { metresBetween, SPOT_METRES, type Point } from './rules';
import { CommunityError } from './service';
import { editKeyMatches } from '../utils/edits';

export const CHECKIN_POINTS = 20;

type Db = Pick<PrismaClient, 'trip' | 'checkIn'>;
type TripGem = { placeId?: string; name: string; latitude: number; longitude: number };

const fail = (msg: string, status: number) => Object.assign(new CommunityError(msg), { status });

async function tripGems(db: Db, tripId: string, owner?: { userId: string; editKey?: string }): Promise<TripGem[]> {
  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw fail('Trip not found', 404);
  // Stamps count only on your own trip: saved to your account, or planned on this device (its edit key).
  if (owner) {
    const planner = JSON.parse(trip.planner || '{}') as { editKeyHash?: string };
    const mine = trip.userId ? trip.userId === owner.userId : editKeyMatches(planner.editKeyHash, owner.editKey);
    if (!mine) throw fail('Collect gems on your own trips.', 403);
  }
  const gems = JSON.parse(trip.hiddenGems || '[]') as TripGem[];
  return gems.filter((g) => g.placeId);
}

export async function checkIn(db: Db, i: { userId: string; tripId: string; placeId: string; at: Point; plus: boolean; editKey?: string }) {
  if (!Number.isFinite(i.at?.lat) || !Number.isFinite(i.at?.lng)) throw fail('Your location is needed to check in.', 400);
  const gems = await tripGems(db, i.tripId, { userId: i.userId, editKey: i.editKey });
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
