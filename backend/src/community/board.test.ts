// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { board, myStanding } from './service';

const url = process.env.TEST_DATABASE_URL;
const DAY = 86_400_000;
const NOW = new Date('2026-11-27T12:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

describe.skipIf(!url)('explorers board', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (undefined as unknown as PrismaClient);
  let n = 0;
  const user = async (name = `b${++n}`, isTeam = false) => db.user.create({ data: { email: `${name}-${Date.now()}-${n}@test.local`, password: 'x', name, isTeam } });
  const gem = (country: string) => db.gem.create({ data: { name: `Gem ${++n}`, lat: 47, lng: 13, address: `Somewhere, ${country}` } });
  const post = (userId: string, gemId: string, at: Date, points = 10) =>
    db.post.create({ data: { userId, gemId, photo: Buffer.from([1]), photoType: 'image/jpeg', distanceM: 10, status: 'public', points, createdAt: at } });
  const like = async (postId: string, at: Date) => db.like.create({ data: { postId, userId: (await user()).id, createdAt: at } });
  const add = async (gemId: string, postId: string, at: Date) => db.gemAdd.create({ data: { userId: (await user()).id, gemId, postId, createdAt: at } });

  beforeEach(async () => {
    await db.gemAdd.deleteMany();
    await db.like.deleteMany();
    await db.checkIn.deleteMany();
    await db.post.deleteMany();
    await db.gem.deleteMany();
  });
  afterAll(() => db?.$disconnect());

  it('one moment, 3 likes and 2 adds this week make 63 points; last week does not count', async () => {
    const u = await user('anna');
    const g = await gem('Austria');
    const p = await post(u.id, g.id, ago(2));
    for (let i = 0; i < 3; i++) await like(p.id, ago(1));
    await like(p.id, ago(9));
    await add(g.id, p.id, ago(1));
    await add(g.id, p.id, ago(1));
    const [row] = await board(db, { period: 'week', now: NOW });
    expect(row).toMatchObject({ name: 'anna', points: 63, moments: 1, likes: 3, inTrips: 2 });
  });

  it('filters by country and leaves the team out', async () => {
    const hr = await user('marie');
    const at = await user('lukas');
    const team = await user('team', true);
    await post(hr.id, (await gem('Croatia')).id, ago(1));
    await post(at.id, (await gem('Austria')).id, ago(1));
    await post(team.id, (await gem('Croatia')).id, ago(1));
    expect((await board(db, { period: 'week', country: 'croatia', now: NOW })).map((r) => r.name)).toEqual(['marie']);
    expect((await board(db, { period: 'all', now: NOW })).map((r) => r.name).sort()).toEqual(['lukas', 'marie']);
  });

  it('my standing says how far I am from the top 10', async () => {
    const people = await Promise.all(Array.from({ length: 11 }, (_, i) => user(`p${i}`)));
    const g = await gem('Italy');
    for (const [i, p] of people.entries()) await post(p.id, g.id, ago(1), 100 - i * 5);
    const last = await myStanding(db, people[10].id, { period: 'week', now: NOW });
    expect(last).toMatchObject({ rank: 11, points: 50, toTop10: 5 });
    expect((await myStanding(db, people[0].id, { period: 'week', now: NOW })).toTop10).toBe(0);
  });
});
