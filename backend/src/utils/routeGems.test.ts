import { describe, expect, it } from 'vitest';
import { decodePolyline, pickGems, samplePoints, type PlaceCandidate } from './routeGems';

describe('decodePolyline', () => {
  it('decodes Google’s example polyline', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });
});

describe('samplePoints', () => {
  it('keeps the start and the end and a point about every 75 km in between', () => {
    // A straight line north of about 333 km (3 degrees of latitude).
    const line = Array.from({ length: 31 }, (_, i) => ({ lat: 40 + i * 0.1, lng: -3 }));
    const pts = samplePoints(line, 75);
    expect(pts[0]).toEqual(line[0]);
    expect(pts[pts.length - 1]).toEqual(line[30]);
    expect(pts.length).toBeGreaterThanOrEqual(5);
    expect(pts.length).toBeLessThanOrEqual(6);
  });

  it('never returns more than the cap', () => {
    const line = Array.from({ length: 301 }, (_, i) => ({ lat: 35 + i * 0.1, lng: 0 }));
    expect(samplePoints(line, 75, 16)).toHaveLength(16);
  });
});

const cand = (p: Partial<PlaceCandidate>): PlaceCandidate => ({
  placeId: 'x', name: 'X', rating: 4.6, reviews: 300, address: 'Somewhere', lat: 41, lng: -3, types: ['tourist_attraction'], photoRef: null, ...p,
});

describe('pickGems', () => {
  it('keeps proven but quiet places and drops the crowded, the unproven and the closed', () => {
    const picked = pickGems([
      cand({ placeId: 'a', name: 'Quiet castle', rating: 4.7, reviews: 420 }),
      cand({ placeId: 'b', name: 'Famous cathedral', rating: 4.8, reviews: 90000 }),
      cand({ placeId: 'c', name: 'Unknown shed', rating: 4.9, reviews: 6 }),
      cand({ placeId: 'd', name: 'So-so view', rating: 3.9, reviews: 500 }),
      cand({ placeId: 'e', name: 'Hotel', types: ['lodging'] }),
      cand({ placeId: 'a', name: 'Quiet castle', rating: 4.7, reviews: 420 }),
    ], 5);
    expect(picked.map((g) => g.name)).toEqual(['Quiet castle']);
  });

  it('ranks the best rated with enough reviews first and stops at the limit', () => {
    const picked = pickGems([
      cand({ placeId: 'a', name: 'Good', rating: 4.4, reviews: 200 }),
      cand({ placeId: 'b', name: 'Great', rating: 4.8, reviews: 800 }),
      cand({ placeId: 'c', name: 'Fine', rating: 4.5, reviews: 100 }),
    ], 2);
    expect(picked.map((g) => g.name)).toEqual(['Great', 'Fine']);
  });
});
