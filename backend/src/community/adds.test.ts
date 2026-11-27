// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { addGemToTrip, placeSavedGems } from './adds';
import { nearbyGems } from './nearby';
import { createPost } from './service';

const url = process.env.TEST_DATABASE_URL;
const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]).toString('base64')}`;
const LAKE = { lat: 46.6943, lng: 12.0857 }; // Lago di Braies
const kmNorth = (km: number) => ({ lat: LAKE.lat + km / 111.2, lng: LAKE.lng });

describe.skipIf(!url)('moments near a gem, add to trip, saved gems', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (undefined as unknown as PrismaClient);
  let n = 0;
  const user = async () => db.user.create({ data: { email: `a${++n}-${Date.now()}@test.local`, password: 'x', name: `a${n}` } });
  const place = (placeId: string, name: string, at: { lat: number; lng: number }) =>
    db.placeGem.create({ data: { placeId, name, lat: at.lat, lng: at.lng, rating: 4.7, reviews: 300, address: `${name}, Italy` } });
  const trip = (userId: string | null, gems: unknown[] = [], planner: Record<string, unknown> = {}) =>
    db.trip.create({ data: { userId, startLocation: 'A', destination: 'B', startDate: '2026-12-01', endDate: '2026-12-03', days: 3, budget: 0, travelStyle: 'balanced', priorities: '[]', totalCost: 0, totalDistance: 0, stops: '[]', highlights: '[]', tips: '[]', weather: '[]', hiddenGems: JSON.stringify(gems), planner: JSON.stringify(planner) } as never });

  beforeEach(async () => {
    await db.savedGem.deleteMany();
    await db.gemAdd.deleteMany();
    await db.like.deleteMany();
    await db.post.deleteMany();
    await db.gem.deleteMany();
    await db.placeGem.deleteMany();
  });
  afterAll(() => db?.$disconnect());

  it('lists checked gems within 5 km, nearest first', async () => {
    await place('p-near', 'Near lake', kmNorth(1.2));
    await place('p-mid', 'Viewpoint', kmNorth(4.6));
    await place('p-far', 'Far hut', kmNorth(6));
    const found = await nearbyGems(db, LAKE);
    expect(found.map((g) => g.name)).toEqual(['Near lake', 'Viewpoint']);
    expect(found[0].distanceKm).toBe(1.2);
  });

  it('a moment may tag a gem 4 km away; a challenge still needs the spot', async () => {
    const u = await user();
    const gem = { placeId: 'p-lake', name: 'Lago di Braies', lat: LAKE.lat, lng: LAKE.lng };
    await expect(createPost(db, { userId: u.id, gem, at: kmNorth(4), photo: JPEG, caption: '', challenge: false, plus: true })).resolves.toMatchObject({ status: 'pending' });
    await expect(createPost(db, { userId: u.id, gem, at: kmNorth(4), photo: JPEG, caption: '', challenge: true, plus: true })).rejects.toThrow(/300 m/);
    await expect(createPost(db, { userId: u.id, gem, at: kmNorth(6), photo: JPEG, caption: '', challenge: false, plus: true })).rejects.toThrow('Tag a gem within 5 km of where you are.');
  });

  it('without a trip the gem is saved, once', async () => {
    const u = await user();
    const g = await db.gem.create({ data: { name: 'Lake', lat: LAKE.lat, lng: LAKE.lng } });
    expect(await addGemToTrip(db, { userId: u.id, gemId: g.id })).toEqual({ added: 'saved', inTrips: 1 });
    expect(await addGemToTrip(db, { userId: u.id, gemId: g.id })).toEqual({ added: 'saved', inTrips: 1 });
    expect(await db.gemAdd.count()).toBe(1);
    expect(await db.savedGem.count()).toBe(1);
  });

  it('adds the gem to a day of my own trip, and refuses someone else\'s trip', async () => {
    const me = await user();
    const other = await user();
    const g = await db.gem.create({ data: { name: 'Lake', lat: LAKE.lat, lng: LAKE.lng } });
    const mine = await trip(me.id, [{ placeId: 'x', name: 'Old', day: 1 }]);
    expect(await addGemToTrip(db, { userId: me.id, gemId: g.id, tripId: mine.id, day: 2 })).toEqual({ added: 'trip', inTrips: 1 });
    const gems = JSON.parse((await db.trip.findUniqueOrThrow({ where: { id: mine.id } })).hiddenGems!) as { name: string; day: number; added?: boolean }[];
    expect(gems.at(-1)).toMatchObject({ name: 'Lake', day: 2, added: true });
    const theirs = await trip(other.id);
    await expect(addGemToTrip(db, { userId: me.id, gemId: g.id, tripId: theirs.id, day: 1 })).rejects.toMatchObject({ status: 403 });
  });

  it('puts saved gems near the new road into the trip, on the day of the nearest gem, and clears them', async () => {
    const u = await user();
    const g = await db.gem.create({ data: { name: 'Saved lake', lat: LAKE.lat, lng: LAKE.lng } });
    await db.savedGem.create({ data: { userId: u.id, gemId: g.id } });
    const road = [{ lat: LAKE.lat - 0.05, lng: LAKE.lng }, { lat: LAKE.lat + 0.05, lng: LAKE.lng }];
    const dayGems = [{ placeId: 'a', name: 'Day 1', lat: 46.0, lng: 11.0, day: 1 }, { placeId: 'b', name: 'Day 2', lat: LAKE.lat + 0.02, lng: LAKE.lng, day: 2 }];
    const out = await placeSavedGems(db, u.id, road, dayGems);
    expect(out.at(-1)).toMatchObject({ name: 'Saved lake', day: 2, added: true });
    expect(await db.savedGem.count()).toBe(0);
  });
});
