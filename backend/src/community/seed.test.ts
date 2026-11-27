// Runs against Postgres when TEST_DATABASE_URL is set.
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
    const pause = vi.fn(async () => undefined);
    expect(await seedTeamMoments(db, { fetchPhoto: photo, pause })).toEqual({ created: 3 });
    // Wikimedia throttles bursts: a pause between places.
    expect(pause).toHaveBeenCalledTimes(3);
    expect(await seedTeamMoments(db, { fetchPhoto: photo, pause })).toEqual({ created: 0 });
    const posts = await db.post.findMany({ include: { user: true } });
    expect(posts).toHaveLength(3);
    expect(posts.every((p) => p.status === 'public' && p.credit !== '' && p.user.isTeam)).toBe(true);
  });

  it('replaces a team moment whose credit is an author\'s whole note', async () => {
    await place(1, 'Italy');
    await seedTeamMoments(db, { fetchPhoto: async () => ({ ...(await photo()), credit: `Photo: ${'I would appreciate being notified '.repeat(4)}, CC BY-SA 3.0, via Wikimedia Commons` }), pause: async () => undefined });
    await seedTeamMoments(db, { fetchPhoto: photo, pause: async () => undefined });
    const posts = await db.post.findMany();
    expect(posts.map((p) => p.credit)).toEqual(['Photo: Wikimedia Commons']);
  });

  it('skips a gem without a usable photo and stops at the target', async () => {
    for (let i = 1; i <= 4; i++) await place(i, i % 2 ? 'Italy' : 'Austria');
    const someMissing = async (g: { placeId: string }) => (g.placeId === 'seed-1' ? null : photo());
    expect(await seedTeamMoments(db, { fetchPhoto: someMissing, target: 2, pause: async () => undefined })).toEqual({ created: 2 });
    expect(await db.post.count({ where: { gem: { placeId: 'seed-1' } } })).toBe(0);
  });
});

describe('Wikimedia credits', () => {
  it('finds the file behind a thumbnail or a full upload', async () => {
    const { fileOf } = await import('./seed');
    expect(fileOf('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lago_di_Braies.jpg/800px-Lago_di_Braies.jpg')).toEqual({ wiki: 'commons', file: 'Lago_di_Braies.jpg' });
    expect(fileOf('https://upload.wikimedia.org/wikipedia/en/c/cd/Castle%20view.jpg')).toEqual({ wiki: 'en', file: 'Castle view.jpg' });
    // Since late 2026 thumbnails come from thumb.wikimedia.org.
    expect(fileOf('https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Luxembourg_City_3_rue_du_Cur%C3%A9.jpg/960px-Luxembourg_City_3_rue_du_Cur%C3%A9.jpg')).toEqual({ wiki: 'commons', file: 'Luxembourg_City_3_rue_du_Curé.jpg' });
    expect(fileOf('https://example.com/x.jpg')).toBeNull();
  });

  it('credits the author and licence, and refuses a photo without them', async () => {
    const { creditFrom } = await import('./seed');
    expect(creditFrom({ Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Anna">Anna Rossi</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } })).toBe('Photo: Anna Rossi, CC BY-SA 4.0, via Wikimedia Commons');
    // Some authors put a whole note in the field: keep only their name.
    expect(creditFrom({ Artist: { value: 'I would appreciate being notified if you use my work outside Wikimedia. More of <a href="//commons.wikimedia.org/wiki/User:Ben_Skala">Ben Skála</a>\'s work' }, LicenseShortName: { value: 'CC BY-SA 3.0' } })).toBe('Photo: Ben Skála, CC BY-SA 3.0, via Wikimedia Commons');
    expect(creditFrom({ Artist: { value: 'A very long note without any link that goes on and on about how to credit this photo properly' }, LicenseShortName: { value: 'CC BY 4.0' } })).toBeNull();
    expect(creditFrom({ LicenseShortName: { value: 'CC BY 2.0' } })).toBeNull();
    expect(creditFrom({ Artist: { value: 'Anna' } })).toBeNull();
  });
});
