import { describe, expect, it, vi } from 'vitest';
import { checkIn, passport, CHECKIN_POINTS } from './road';

const gems = [
  { placeId: 'p1', name: 'Lerma', latitude: 42.0, longitude: -3.75 },
  { placeId: 'p2', name: 'Covarrubias', latitude: 42.06, longitude: -3.52 },
];

function fakeDb(existing: { placeId: string; name: string; createdAt: Date }[] = []) {
  const stamps = [...existing];
  return {
    trip: { findUnique: vi.fn(async ({ where }: any) => (where.id === 't1' ? { id: 't1', hiddenGems: JSON.stringify(gems) } : null)) },
    checkIn: {
      findUnique: vi.fn(async ({ where }: any) => stamps.find((s) => s.placeId === where.userId_tripId_placeId.placeId) ?? null),
      create: vi.fn(async ({ data }: any) => { stamps.push({ ...data, createdAt: new Date('2027-05-01T10:00:00Z') }); return data; }),
      count: vi.fn(async () => stamps.length),
      findMany: vi.fn(async () => stamps),
    },
  };
}

// About 250 m north of Lerma, and about 400 m north of it.
const near = { lat: 42.00225, lng: -3.75 };
const far = { lat: 42.0036, lng: -3.75 };

describe('checking in at a gem', () => {
  it('stamps the passport and gives points within 300 m, double with Plus', async () => {
    const free = await checkIn(fakeDb() as never, { userId: 'u1', tripId: 't1', placeId: 'p1', at: near, plus: false });
    expect(free).toEqual({ points: CHECKIN_POINTS, stamps: 1, total: 2 });
    const plus = await checkIn(fakeDb() as never, { userId: 'u1', tripId: 't1', placeId: 'p1', at: near, plus: true });
    expect(plus.points).toBe(CHECKIN_POINTS * 2);
  });

  it('refuses from further than 300 m', async () => {
    await expect(checkIn(fakeDb() as never, { userId: 'u1', tripId: 't1', placeId: 'p1', at: far, plus: false })).rejects.toMatchObject({
      status: 400,
      message: 'Check-ins count only within 300 m of the gem.',
    });
  });

  it('refuses a gem that is not on the trip, and a second check-in at the same gem', async () => {
    await expect(checkIn(fakeDb() as never, { userId: 'u1', tripId: 't1', placeId: 'nope', at: near, plus: false })).rejects.toMatchObject({ status: 404 });
    const db = fakeDb([{ placeId: 'p1', name: 'Lerma', createdAt: new Date() }]);
    await expect(checkIn(db as never, { userId: 'u1', tripId: 't1', placeId: 'p1', at: near, plus: false })).rejects.toMatchObject({ status: 409, message: 'Already collected' });
  });

  it('the passport lists the stamps against all gems of the trip', async () => {
    const db = fakeDb([{ placeId: 'p2', name: 'Covarrubias', createdAt: new Date('2027-05-01T12:00:00Z') }]);
    expect(await passport(db as never, 'u1', 't1')).toEqual({ total: 2, stamps: [{ placeId: 'p2', name: 'Covarrubias', at: '2027-05-01T12:00:00.000Z' }] });
  });
});
