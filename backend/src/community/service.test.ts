// Runs against Postgres when TEST_DATABASE_URL is set:
//   TEST_DATABASE_URL=postgresql://postgres@localhost:5433/roadgem_test npx vitest run src/community
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { board, createPost, feed, review, suggestGem, toggleLike } from './service';

const url = process.env.TEST_DATABASE_URL;
const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]).toString('base64')}`;
const GEM = { placeId: 'place-grand-place', name: 'Grand-Place', lat: 50.8467, lng: 4.3525, address: 'Brussels' };
const HERE = { lat: 50.8469, lng: 4.3527 }; // ~25 m away
const FAR = { lat: 50.9, lng: 4.4 };

describe.skipIf(!url)('community service', () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  let n = 0;
  const user = async (name = `u${++n}`) => db.user.create({ data: { email: `${name}-${Date.now()}-${n}@test.local`, password: 'x', name } });

  beforeEach(async () => {
    await db.like.deleteMany();
    await db.post.deleteMany();
    await db.gem.deleteMany();
  });
  afterAll(() => db.$disconnect());

  it('refuses a photo taken away from the gem, so no points from home', async () => {
    const u = await user();
    await expect(createPost(db, { userId: u.id, gem: GEM, at: FAR, photo: JPEG, caption: '', challenge: false })).rejects.toThrow(/at the gem/);
    expect(await db.post.count()).toBe(0);
  });

  it('stores a photo at the gem as pending, one gem per Google place', async () => {
    const u = await user();
    const a = await createPost(db, { userId: u.id, gem: GEM, at: HERE, photo: JPEG, caption: 'Lovely', challenge: false });
    await createPost(db, { userId: u.id, gem: GEM, at: HERE, photo: JPEG, caption: '', challenge: true });
    expect(a.status).toBe('pending');
    expect(a.distanceM).toBeLessThan(50);
    expect(await db.gem.count()).toBe(1);
    expect(await feed(db, null)).toEqual([]);
  });

  it('makes a post public with its points after approval: 10 for a photo, 50 for a challenge', async () => {
    const u = await user();
    const p1 = await createPost(db, { userId: u.id, gem: GEM, at: HERE, photo: JPEG, caption: '', challenge: false });
    const p2 = await createPost(db, { userId: u.id, gem: GEM, at: HERE, photo: JPEG, caption: '', challenge: true });
    await review(db, p1.id, 'approve');
    await review(db, p2.id, 'approve');
    const items = await feed(db, null);
    expect(items.map((i) => i.points).sort()).toEqual([10, 50]);
    expect(items[0]).not.toHaveProperty('photo');
    expect((await board(db))[0]).toMatchObject({ name: u.name, points: 60 });
  });

  it('can approve a challenge post as a plain photo when the challenge is not done', async () => {
    const u = await user();
    const p = await createPost(db, { userId: u.id, gem: GEM, at: HERE, photo: JPEG, caption: '', challenge: true });
    expect(await review(db, p.id, 'approve_photo')).toMatchObject({ status: 'public', points: 10 });
  });

  it('lets others like a public post once, never their own', async () => {
    const [owner, fan] = [await user(), await user()];
    const p = await createPost(db, { userId: owner.id, gem: GEM, at: HERE, photo: JPEG, caption: '', challenge: false });
    await expect(toggleLike(db, p.id, fan.id)).rejects.toThrow(/not public/);
    await review(db, p.id, 'approve');
    await expect(toggleLike(db, p.id, owner.id)).rejects.toThrow(/own/);
    expect(await toggleLike(db, p.id, fan.id)).toEqual({ liked: true, likes: 1 });
    expect((await feed(db, fan.id))[0]).toMatchObject({ likes: 1, likedByMe: true });
    expect(await toggleLike(db, p.id, fan.id)).toEqual({ liked: false, likes: 0 });
  });

  it('turns a suggested gem official at 10 visitors and 20 likes, and gives its finder 200 points', async () => {
    const finder = await user('finder');
    const { gem } = await suggestGem(db, { userId: finder.id, name: 'Secret viewpoint', description: 'A quiet bench above the river.', category: 'viewpoint', at: HERE, photo: JPEG });
    expect(gem.status).toBe('suggested');
    const visitors = await Promise.all(Array.from({ length: 10 }, () => user()));
    const fans = await Promise.all(Array.from({ length: 2 }, () => user()));
    const posts = [];
    for (const v of visitors) {
      const p = await createPost(db, { userId: v.id, gem: { gemId: gem.id }, at: HERE, photo: JPEG, caption: '', challenge: false });
      await review(db, p.id, 'approve');
      posts.push(p);
    }
    for (const p of posts) for (const f of fans) await toggleLike(db, p.id, f.id);
    const after = await db.gem.findUniqueOrThrow({ where: { id: gem.id } });
    expect(after.status).toBe('official');
    expect((await board(db)).find((r) => r.name === 'finder')?.points).toBe(200);
  });
});
