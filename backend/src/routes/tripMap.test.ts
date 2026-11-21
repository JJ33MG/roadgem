import { describe, expect, it, vi } from 'vitest';
import { tripMapImage } from './tripMap';

const trip = {
  id: 't1',
  stops: JSON.stringify([{ location: 'Madrid', latitude: 40.4, longitude: -3.7 }, { location: 'Zaragoza', latitude: 41.6, longitude: -0.9 }]),
  hiddenGems: JSON.stringify([{ latitude: 41, longitude: -2 }]),
  planner: JSON.stringify({ route: '_p~iF~ps|U_ulLnnqC', hiddenGems: [] }),
};
const db = { trip: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === 't1' ? trip : null)) } };
const png = { ok: true, type: 'image/png', body: Buffer.from('png') };

describe('trip map image', () => {
  it('fetches the Google image once and serves the next request from memory', async () => {
    const fetchImage = vi.fn(async () => png);
    const a = await tripMapImage(db as never, fetchImage, { tripId: 't1', from: 0, to: 1, width: 640, height: 400, key: 'K' });
    const b = await tripMapImage(db as never, fetchImage, { tripId: 't1', from: 0, to: 1, width: 640, height: 400, key: 'K' });
    expect(a).toEqual({ status: 200, type: 'image/png', body: png.body });
    expect(b).toEqual(a);
    expect(fetchImage).toHaveBeenCalledTimes(1);
  });

  it('does not keep a failed Google answer, and says the map is unavailable', async () => {
    const fetchImage = vi.fn(async () => ({ ok: false, type: 'text/html', body: Buffer.from('denied') }));
    const r = await tripMapImage(db as never, fetchImage, { tripId: 't1', from: 1, to: 1, width: 300, height: 300, key: 'K' });
    expect(r.status).toBe(502);
    await tripMapImage(db as never, fetchImage, { tripId: 't1', from: 1, to: 1, width: 300, height: 300, key: 'K' });
    expect(fetchImage).toHaveBeenCalledTimes(2);
  });

  it('404 for an unknown trip, 503 without a key', async () => {
    expect((await tripMapImage(db as never, vi.fn(), { tripId: 'x', from: 0, to: 1, width: 640, height: 400, key: 'K' })).status).toBe(404);
    expect((await tripMapImage(db as never, vi.fn(), { tripId: 't1', from: 0, to: 1, width: 640, height: 400, key: '' })).status).toBe(503);
  });
});
