// "Add to my trip": a community gem goes into a day of the traveller's trip, or onto their saved list when
// they have no trip yet. One add per traveller and gem; each add gives the post's author 25 points.
import type { PrismaClient } from '@prisma/client';
import { CommunityError } from './service';
import { editKeyMatches } from '../utils/edits';
import { kmBetween, nearLine, type LatLng } from '../utils/routeGems';

const fail = (msg: string, status = 400) => Object.assign(new CommunityError(msg), { status });

const PLANNING_STALE_MS = 5 * 60_000;

/** Saved gems this close to a new trip's road are put into it. */
export const SAVED_NEAR_KM = 15;

/** The shape every trip gem has (routeGems toGem): the trip page, map and links read these fields. */
type TripGem = { placeId?: string; name: string; latitude?: number; longitude?: number; day?: number; added?: boolean; [k: string]: unknown };

const CATEGORIES = new Set(['restaurant', 'café', 'viewpoint', 'activity', 'market', 'bar', 'nature', 'culture', 'historic', 'other']);

const asTripGem = (
  gem: { id: string; placeId: string | null; name: string; lat: number; lng: number; address: string; description: string; category: string },
  extra: Record<string, unknown>,
): TripGem => ({
  placeId: gem.placeId ?? `gem:${gem.id}`,
  name: gem.name,
  description: gem.description || 'Shared by a traveller in the RoamGem community.',
  address: gem.address,
  latitude: gem.lat,
  longitude: gem.lng,
  category: CATEGORIES.has(gem.category) ? gem.category : 'other',
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${gem.lat},${gem.lng}`,
  added: true,
  ...extra,
});

export async function addGemToTrip(
  db: PrismaClient,
  input: { userId: string; gemId: string; postId?: string; tripId?: string; day?: number; key?: string },
): Promise<{ added: 'trip' | 'saved'; inTrips: number }> {
  const gem = await db.gem.findUnique({ where: { id: input.gemId } });
  if (!gem || gem.status === 'rejected') throw fail('This gem is not available.', 404);
  const post = input.postId ? await db.post.findUnique({ where: { id: input.postId }, select: { id: true, gemId: true, status: true, userId: true, user: { select: { name: true } } } }) : null;
  // The post's author earns the credit, never for adding their own gem.
  const fromPost = post && post.gemId === gem.id && post.status === 'public' && post.userId !== input.userId ? post : null;

  if (input.tripId) {
    const trip = await db.trip.findUnique({ where: { id: input.tripId } });
    if (!trip) throw fail('Trip not found.', 404);
    const planner = JSON.parse(trip.planner || '{}') as { editKeyHash?: string; planning?: boolean };
    const owner = Boolean(trip.userId && trip.userId === input.userId);
    if (!owner && !editKeyMatches(planner.editKeyHash, input.key)) throw fail('You can only add gems to your own trips.', 403);
    // Same rule as the trip page: planning that started over 5 minutes ago was cut off (a restart), not busy.
    if (planner.planning === true && Date.now() - trip.createdAt.getTime() < PLANNING_STALE_MS) throw fail('Your days are still being written. Try again in a few seconds.', 409);
    const day = Number.isInteger(input.day) && input.day! >= 1 && input.day! <= (trip.days ?? 1) ? input.day! : 1;
    const gems = JSON.parse(trip.hiddenGems || '[]') as TripGem[];
    const id = gem.placeId ?? `gem:${gem.id}`;
    if (!gems.some((g) => g.placeId === id)) {
      const extra = { day, ...(fromPost ? { photoUrl: `/api/community/posts/${fromPost.id}/photo`, by: fromPost.user.name } : {}) };
      const { count } = await db.trip.updateMany({ where: { id: trip.id, hiddenGems: trip.hiddenGems }, data: { hiddenGems: JSON.stringify([...gems, asTripGem(gem, extra)]) } });
      if (count !== 1) throw fail('This trip just changed elsewhere. Reload the page and try again.', 409);
    }
  } else {
    await db.savedGem.upsert({ where: { userId_gemId: { userId: input.userId, gemId: gem.id } }, create: { userId: input.userId, gemId: gem.id }, update: {} });
  }

  await db.gemAdd.upsert({
    where: { userId_gemId: { userId: input.userId, gemId: gem.id } },
    create: { userId: input.userId, gemId: gem.id, postId: fromPost?.id ?? null, tripId: input.tripId ?? null },
    // A gem saved earlier now lands in a trip: from here it counts.
    update: input.tripId ? { tripId: input.tripId } : {},
  });
  const inTrips = await db.gemAdd.count({ where: { gemId: gem.id, tripId: { not: null } } });
  return { added: input.tripId ? 'trip' : 'saved', inTrips };
}

/** On a new trip (its id made up front): saved gems within 15 km of the road join the day of the nearest planned gem, count as in that trip, and leave the saved list. */
export async function placeSavedGems<T extends TripGem>(db: PrismaClient, userId: string, road: LatLng[], dayGems: T[], tripId: string): Promise<(T | TripGem)[]> {
  if (road.length < 2) return dayGems;
  const saved = await db.savedGem.findMany({ where: { userId }, include: { gem: true } });
  const near = nearLine(saved.map((s) => s.gem), road, SAVED_NEAR_KM);
  if (!near.length) return dayGems;
  const dated = dayGems.filter((g) => typeof g.latitude === 'number' && typeof g.longitude === 'number' && typeof g.day === 'number');
  const at = (g: TripGem): LatLng => ({ lat: g.latitude as number, lng: g.longitude as number });
  const taken = new Set(dayGems.map((g) => g.placeId));
  const extra = near
    .filter((g) => !taken.has(g.placeId ?? `gem:${g.id}`))
    .map((g) => {
      const nearest = dated.reduce<T | null>((best, d) => (!best || kmBetween(g, at(d)) < kmBetween(g, at(best)) ? d : best), null);
      return asTripGem(g, { day: nearest?.day ?? 1 });
    });
  const ids = near.map((g) => g.id);
  await db.gemAdd.updateMany({ where: { userId, gemId: { in: ids } }, data: { tripId } });
  await db.savedGem.deleteMany({ where: { userId, gemId: { in: ids } } });
  return [...dayGems, ...extra];
}
