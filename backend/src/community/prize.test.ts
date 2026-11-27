// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { grantYear, monthRange, monthWinner } from './prize';

const url = process.env.TEST_DATABASE_URL;

describe('monthRange', () => {
  it('is the calendar month in UTC', () => {
    const r = monthRange('2026-11');
    expect(r.from.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-11-30T23:59:59.999Z');
    expect(() => monthRange('nov')).toThrow();
  });
});

describe.skipIf(!url)('monthly explorer prize', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (undefined as unknown as PrismaClient);
  let n = 0;
  const user = async (name: string, extra: Record<string, unknown> = {}) => db.user.create({ data: { email: `${name}-${Date.now()}-${++n}@test.local`, password: 'x', name, ...extra } });
  const post = async (userId: string, at: string, points: number) => {
    const gem = await db.gem.create({ data: { name: `G${++n}`, lat: 47, lng: 13, address: 'X, Austria' } });
    return db.post.create({ data: { userId, gemId: gem.id, photo: Buffer.from([1]), photoType: 'image/jpeg', distanceM: 1, status: 'public', points, createdAt: new Date(at) } });
  };

  beforeEach(async () => {
    await db.prizeGrant.deleteMany();
    await db.gemAdd.deleteMany();
    await db.like.deleteMany();
    await db.post.deleteMany();
    await db.gem.deleteMany();
  });
  afterAll(() => db?.$disconnect());

  it('the winner of November is whoever scored most in November only', async () => {
    const nov = await user('nov');
    const oct = await user('oct');
    await post(nov.id, '2026-11-15T10:00:00Z', 30);
    await post(oct.id, '2026-10-30T10:00:00Z', 500);
    expect(await monthWinner(db, '2026-11')).toMatchObject({ userId: nov.id, name: 'nov', points: 30 });
    expect(await monthWinner(db, '2026-09')).toBeNull();
  });

  it('grants a year of Plus once per month; a paying member gets it as bonus days', async () => {
    const free = await user('free');
    const payer = await user('payer', { subscriptionTier: 'premium', stripeSubscriptionId: 'sub_1', subscriptionExpires: new Date('2026-12-20T00:00:00Z') });
    const now = new Date('2026-12-01T09:00:00Z');
    expect(await grantYear(db, free.id, '2026-11', now)).toEqual({ granted: true });
    expect(await grantYear(db, free.id, '2026-11', now)).toEqual({ granted: false });
    const f = await db.user.findUniqueOrThrow({ where: { id: free.id } });
    expect(f.subscriptionTier).toBe('premium');
    expect(f.subscriptionExpires?.toISOString()).toBe('2027-12-01T09:00:00.000Z');
    await grantYear(db, payer.id, '2026-10', now);
    expect((await db.user.findUniqueOrThrow({ where: { id: payer.id } })).plusBonusDays).toBe(365);
  });
});
