import { describe, expect, it, vi } from 'vitest';
import { candidatesAt, cellOf, seedGems, type LibraryDeps } from './library';
import type { PlaceCandidate } from '../utils/routeGems';

const good = (id: string, lat = 42, lng = -3): PlaceCandidate => ({ placeId: id, name: id, rating: 4.6, reviews: 120, address: '', lat, lng, types: ['tourist_attraction'], photoRef: null });
const bad = (id: string): PlaceCandidate => ({ ...good(id), rating: 3.1 });

function memory(google: (p: { lat: number; lng: number }) => PlaceCandidate[]) {
  const saved = new Map<string, PlaceCandidate>();
  const cells = new Map<string, string>();
  const deps: LibraryDeps = {
    searched: vi.fn(async (cell) => cells.has(cell)),
    markSearched: vi.fn(async (cell, source) => void cells.set(cell, source)),
    save: vi.fn(async (cs) => cs.forEach((c: PlaceCandidate) => saved.set(c.placeId, c))),
    near: vi.fn(async () => [...saved.values()]),
    google: vi.fn(async (p) => google(p)),
  };
  return { deps, saved, cells };
}

describe('gem library', () => {
  it('puts nearby points in the same cell and far ones in another', () => {
    expect(cellOf({ lat: 42.01, lng: -3.01 })).toBe(cellOf({ lat: 42.02, lng: -3.02 }));
    expect(cellOf({ lat: 42.0, lng: -3.0 })).not.toBe(cellOf({ lat: 42.3, lng: -3.0 }));
  });

  it('asks Google once per cell, keeps only checked places, then answers from the library', async () => {
    const { deps, saved } = memory(() => [good('a'), bad('b')]);
    const first = await candidatesAt(deps, { lat: 42, lng: -3 }, 'trip');
    expect(first.calledGoogle).toBe(true);
    expect([...saved.keys()]).toEqual(['a']);
    const again = await candidatesAt(deps, { lat: 42.01, lng: -3.01 }, 'trip');
    expect(again.calledGoogle).toBe(false);
    expect(again.cands.map((c) => c.placeId)).toEqual(['a']);
    expect(deps.google).toHaveBeenCalledTimes(1);
  });

  it('seeds along roads between cities and stops at the Google budget, counting earlier runs', async () => {
    const { deps, cells } = memory((p) => [good(`g${p.lat.toFixed(1)}`, p.lat, p.lng)]);
    // A straight road of ~1100 km north: about 37 points at 30 km.
    const road = Array.from({ length: 101 }, (_, i) => ({ lat: 40 + i * 0.1, lng: 0 }));
    const out = await seedGems(deps, { budget: 10, alreadySpent: 4, pairs: [[road[0], road[100]]], road: async () => road });
    expect(out.calls).toBe(6);
    expect([...cells.values()].every((s) => s === 'seed')).toBe(true);
  });
});
