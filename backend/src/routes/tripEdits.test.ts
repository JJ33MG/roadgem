import { describe, expect, it, vi } from 'vitest';
import { editTrip } from './tripEdits';
import { newEditKey } from '../utils/edits';

function fakeDb(userId: string | null, hash: string, opts: { stale?: boolean } = {}) {
  const trip = {
    id: 't1', userId, days: 2, endDate: '2026-12-03',
    stops: JSON.stringify([{ location: 'Madrid, Spain' }, { location: 'Burgos, Spain' }, { location: 'Bordeaux, France' }]),
    planner: JSON.stringify({ overnights: ['Burgos', 'Bordeaux'], editKeyHash: hash }),
  };
  // The write only lands when the planner is still the one that was read (another edit did not slip in).
  const update = vi.fn(async ({ where, data }: { where: { planner: string }; data: Record<string, unknown> }) => ({ count: opts.stale || where.planner !== trip.planner ? 0 : 1, data }));
  const db = {
    trip: { findUnique: vi.fn(async () => trip), updateMany: update },
    tripDay: { updateMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
  };
  return { db, update };
}

describe('editTrip', () => {
  it('refuses a wrong or missing key with 403 and changes nothing', async () => {
    const { hash } = newEditKey();
    const { db, update } = fakeDb(null, hash);
    await expect(editTrip(db as never, { tripId: 't1', edit: { type: 'hideGem', placeId: 'p' }, key: 'nope' })).rejects.toMatchObject({ status: 403 });
    await expect(editTrip(db as never, { tripId: 't1', edit: { type: 'hideGem', placeId: 'p' } })).rejects.toMatchObject({ status: 403 });
    expect(update).not.toHaveBeenCalled();
  });

  it('applies the change with the right key, or for the signed-in owner', async () => {
    const { key, hash } = newEditKey();
    const a = fakeDb(null, hash);
    await editTrip(a.db as never, { tripId: 't1', edit: { type: 'night', day: 1, stopIndex: 2 }, key });
    expect(JSON.parse(String(a.update.mock.calls[0][0].data.planner)).overnights).toEqual(['Bordeaux, France', 'Bordeaux']);
    const b = fakeDb('u1', hash);
    await editTrip(b.db as never, { tripId: 't1', edit: { type: 'hideGem', placeId: 'p' }, userId: 'u1' });
    expect(JSON.parse(String(b.update.mock.calls[0][0].data.planner)).hiddenGems).toEqual(['p']);
  });

  it('a rest day adds one day to the trip and its end date', async () => {
    const { key, hash } = newEditKey();
    const { db, update } = fakeDb(null, hash);
    await editTrip(db as never, { tripId: 't1', edit: { type: 'restDay', afterDay: 1 }, key });
    expect(update.mock.calls[0][0].data).toMatchObject({ days: 3, endDate: '2026-12-04' });
    expect(db.tripDay.create).toHaveBeenCalled();
  });

  it('refuses a change made on an outdated plan (two tabs) and adds no day', async () => {
    const { key, hash } = newEditKey();
    const { db } = fakeDb(null, hash, { stale: true });
    await expect(editTrip(db as never, { tripId: 't1', edit: { type: 'restDay', afterDay: 1 }, key })).rejects.toMatchObject({ status: 409 });
    expect(db.tripDay.create).not.toHaveBeenCalled();
    expect(db.tripDay.updateMany).not.toHaveBeenCalled();
  });
});
