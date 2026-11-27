// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { MAX_CHECKS, sweepOnce } from './autoReview';

const url = process.env.TEST_DATABASE_URL;
const failing = async () => ({ reject: false, challengeMet: false, failed: true, note: 'down' });
const fine = async () => ({ reject: false, challengeMet: false, failed: false, note: 'ok' });

describe.skipIf(!url)('the photo check sweep', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (undefined as unknown as PrismaClient);
  let n = 0;
  const pending = async (attempts = 0) => {
    const u = await db.user.create({ data: { email: `s${++n}-${Date.now()}@test.local`, password: 'x', name: `s${n}` } });
    const g = await db.gem.create({ data: { name: `G${n}`, lat: 47, lng: 13 } });
    return db.post.create({ data: { userId: u.id, gemId: g.id, photo: Buffer.from([1]), photoType: 'image/jpeg', distanceM: 1, checkAttempts: attempts, createdAt: new Date(Date.now() - 20 * 60_000) } });
  };

  beforeEach(async () => {
    await db.gemAdd.deleteMany();
    await db.like.deleteMany();
    await db.post.deleteMany();
    await db.gem.deleteMany();
  });
  afterAll(() => db?.$disconnect());

  it('counts failed checks and rejects a photo that can never be checked', async () => {
    const p = await pending(MAX_CHECKS - 1);
    await sweepOnce(db, new Date(), failing);
    const after = await db.post.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.status).toBe('rejected');
    expect(after.checkAttempts).toBe(MAX_CHECKS);
  });

  it('checks the posts with the fewest tries first, so stuck ones cannot block new ones', async () => {
    for (let i = 0; i < 20; i++) await pending(5);
    const fresh = await pending(0);
    await sweepOnce(db, new Date(), fine);
    expect((await db.post.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe('public');
  });
});
