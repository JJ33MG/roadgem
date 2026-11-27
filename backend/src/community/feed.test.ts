// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { feed } from './service';
import { periodStart } from './rules';

const url = process.env.TEST_DATABASE_URL;
const DAY = 86_400_000;

describe('periodStart', () => {
  it('today is the last 24 hours, a week 7 days', () => {
    const now = new Date('2026-11-27T12:00:00Z');
    expect(periodStart('today', now).toISOString()).toBe('2026-11-26T12:00:00.000Z');
    expect(periodStart('week', now).toISOString()).toBe('2026-11-20T12:00:00.000Z');
  });
});

describe.skipIf(!url)('community feed', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (undefined as unknown as PrismaClient);
  let n = 0;
  const user = async () => db.user.create({ data: { email: `f${++n}-${Date.now()}@test.local`, password: 'x', name: `f${n}` } });
  const gem = async (name: string, lat: number, lng: number) => db.gem.create({ data: { name, lat, lng, address: `${name}, Austria` } });
  const post = async (userId: string, gemId: string, ageDays: number, distanceM = 100) =>
    db.post.create({ data: { userId, gemId, photo: Buffer.from([1]), photoType: 'image/jpeg', distanceM, status: 'public', points: 10, createdAt: new Date(Date.now() - ageDays * DAY) } });
  const likes = async (postId: string, count: number) => {
    for (let i = 0; i < count; i++) await db.like.create({ data: { postId, userId: (await user()).id } });
  };

  beforeEach(async () => {
    await db.gemAdd.deleteMany();
    await db.like.deleteMany();
    await db.post.deleteMany();
    await db.gem.deleteMany();
  });
  afterAll(() => db?.$disconnect());

  it('this week leaves out older posts and puts the most liked first', async () => {
    const u = await user();
    const g = await gem('Lake', 47.5, 12.1);
    const old = await post(u.id, g.id, 9);
    const liked = await post(u.id, g.id, 3);
    const fresh = await post(u.id, g.id, 0.1);
    await likes(liked.id, 5);
    await likes(fresh.id, 1);
    const items = await feed(db, null, { period: 'week' });
    expect(items.map((i) => i.id)).toEqual([liked.id, fresh.id]);
    expect(items.map((i) => i.id)).not.toContain(old.id);
    expect(items[0].likes).toBe(5);
  });

  it('shows the distance to the gem rounded to 0.1 km, never the spot', async () => {
    const u = await user();
    const g = await gem('Pass', 46.5, 12.0);
    await post(u.id, g.id, 1, 1849);
    const [item] = await feed(db, null, { period: 'week' });
    expect(item.distanceKm).toBe(1.8);
    expect(item).not.toHaveProperty('distanceM');
  });

  it('along my route lists only posts whose gem is within 20 km of the road', async () => {
    const u = await user();
    const near = await gem('Near', 47.0, 13.05);
    const far = await gem('Far', 48.0, 15.0);
    const a = await post(u.id, near.id, 1);
    await post(u.id, far.id, 1);
    const line = [{ lat: 47.0, lng: 13.0 }, { lat: 47.0, lng: 13.5 }];
    const items = await feed(db, null, { period: 'route', routeLines: [line] });
    expect(items.map((i) => i.id)).toEqual([a.id]);
  });

  it('counts the trips a gem is in', async () => {
    const u = await user();
    const g = await gem('Viewpoint', 47.2, 11.4);
    const p = await post(u.id, g.id, 1);
    for (let i = 0; i < 3; i++) await db.gemAdd.create({ data: { userId: (await user()).id, gemId: g.id, postId: p.id } });
    const [item] = await feed(db, null, { period: 'week' });
    expect(item.inTrips).toBe(3);
  });
});
