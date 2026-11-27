// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { captionFor, seedTeamMoments } from './seed';

const url = process.env.TEST_DATABASE_URL;

describe('team captions', () => {
  it('says what kind of place it is and how travellers rate it', () => {
    expect(captionFor({ types: 'observation_deck,tourist_attraction', rating: 4.7, reviews: 1240 })).toBe('A viewpoint rated 4.7 by 1,240 travellers on Google.');
    expect(captionFor({ types: '', rating: 4.5, reviews: 300 })).toBe('A gem rated 4.5 by 300 travellers on Google.');
  });
});

describe.skipIf(!url)('filling the feed with team moments', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (undefined as unknown as PrismaClient);
  const photo = async () => ({ bytes: Buffer.from([0xff, 0xd8, 0xff]), type: 'image/jpeg', credit: 'Photo: Wikimedia Commons' });
  const place = (i: number, country: string) =>
    db.placeGem.create({ data: { placeId: `seed-${i}`, name: `Place ${i}`, lat: 46 + i / 10, lng: 11, rating: 4.7, reviews: 500, address: `Road ${i}, ${country}`, types: 'park' } });

  beforeEach(async () => {
    await db.gemAdd.deleteMany();
    await db.like.deleteMany();
    await db.post.deleteMany();
    await db.gem.deleteMany();
    await db.placeGem.deleteMany();
  });
  afterAll(() => db?.$disconnect());

  it('posts one public team moment per gem, with a credit, and never twice', async () => {
    await place(1, 'Italy');
    await place(2, 'Austria');
    await place(3, 'Croatia');
    expect(await seedTeamMoments(db, { fetchPhoto: photo })).toEqual({ created: 3 });
    expect(await seedTeamMoments(db, { fetchPhoto: photo })).toEqual({ created: 0 });
    const posts = await db.post.findMany({ include: { user: true } });
    expect(posts).toHaveLength(3);
    expect(posts.every((p) => p.status === 'public' && p.credit !== '' && p.user.isTeam)).toBe(true);
  });

  it('skips a gem without a usable photo and stops at the target', async () => {
    for (let i = 1; i <= 4; i++) await place(i, i % 2 ? 'Italy' : 'Austria');
    const someMissing = async (g: { placeId: string }) => (g.placeId === 'seed-1' ? null : photo());
    expect(await seedTeamMoments(db, { fetchPhoto: someMissing, target: 2 })).toEqual({ created: 2 });
    expect(await db.post.count({ where: { gem: { placeId: 'seed-1' } } })).toBe(0);
  });
});

describe('Wikimedia credits', () => {
  it('finds the file behind a thumbnail or a full upload', async () => {
    const { fileOf } = await import('./seed');
    expect(fileOf('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lago_di_Braies.jpg/800px-Lago_di_Braies.jpg')).toEqual({ wiki: 'commons', file: 'Lago_di_Braies.jpg' });
    expect(fileOf('https://upload.wikimedia.org/wikipedia/en/c/cd/Castle%20view.jpg')).toEqual({ wiki: 'en', file: 'Castle view.jpg' });
    expect(fileOf('https://example.com/x.jpg')).toBeNull();
  });

  it('credits the author and licence, and refuses a photo without them', async () => {
    const { creditFrom } = await import('./seed');
    expect(creditFrom({ Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Anna">Anna Rossi</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } })).toBe('Photo: Anna Rossi, CC BY-SA 4.0, via Wikimedia Commons');
    expect(creditFrom({ LicenseShortName: { value: 'CC BY 2.0' } })).toBeNull();
    expect(creditFrom({ Artist: { value: 'Anna' } })).toBeNull();
  });
});
