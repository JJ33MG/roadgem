import { describe, expect, it } from 'vitest';
import { decodePolyline, nearLine, overnightsFrom, pickGems, samplePoints, type PlaceCandidate } from './routeGems';

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

describe('nearLine', () => {
  it('drops places more than 20 km from the road', () => {
    const line = Array.from({ length: 11 }, (_, i) => ({ lat: 40 + i * 0.1, lng: -3 }));
    const near = cand({ placeId: 'n', lat: 40.5, lng: -3.1 }); // about 8 km
    const far = cand({ placeId: 'f', lat: 40.5, lng: -3.5 }); // about 42 km
    expect(nearLine([near, far], line, 20).map((c) => c.placeId)).toEqual(['n']);
  });
});

describe('overnightsFrom', () => {
  it('reads each day\'s overnight town, trimmed, one per day', () => {
    expect(overnightsFrom([{ overnight: ' Burgos ' }, { overnight: 'San Sebastián' }, {}], 3)).toEqual(['Burgos', 'San Sebastián', '']);
    expect(overnightsFrom(undefined, 2)).toEqual(['', '']);
  });
});

import { countriesFromSteps, countryOfAddress } from './routeGems';

describe('countries along a leg', () => {
  it('splits the kilometres where Google says Entering <country>', () => {
    const steps = [
      { distanceKm: 120, instruction: 'Head north on <b>A-1</b>' },
      { distanceKm: 30, instruction: 'Continue on AP-8<div style="font-size:0.9em">Entering France</div>' },
      { distanceKm: 200, instruction: 'Keep left onto <b>A63</b>' },
    ];
    expect(countriesFromSteps(steps, 'ES')).toEqual([{ code: 'ES', km: 120 }, { code: 'FR', km: 230 }]);
  });

  it('counts the whole leg for the start country when no border is crossed', () => {
    expect(countriesFromSteps([{ distanceKm: 80, instruction: 'Head east' }], 'BE')).toEqual([{ code: 'BE', km: 80 }]);
  });

  it('knows the country of an address and the usual country names', () => {
    expect(countryOfAddress('Grand-Place, 1000 Brussels, Belgium')).toBe('BE');
    expect(countryOfAddress('Prague, Czechia')).toBe('CZ');
    expect(countryOfAddress('Somewhere, Atlantis')).toBeNull();
    const names: [string, string][] = [['Netherlands', 'NL'], ['Germany', 'DE'], ['Italy', 'IT'], ['Austria', 'AT'], ['Switzerland', 'CH'], ['Slovenia', 'SI'], ['Slovakia', 'SK'], ['Hungary', 'HU'], ['Poland', 'PL'], ['Portugal', 'PT'], ['Croatia', 'HR'], ['Luxembourg', 'LU'], ['Denmark', 'DK']];
    for (const [n, c] of names) expect(countryOfAddress(`X, ${n}`)).toBe(c);
  });
});

import { qualifies as q2 } from './routeGems';
describe('qualifies: sports halls and venues are not gems (26 Nov)', () => {
  it('skips a well-rated arena tagged as an attraction', () => {
    const arena = { placeId: 'a', name: 'Tachyon Sport Arena', rating: 4.6, reviews: 400, address: '', lat: 0, lng: 0, types: ['tourist_attraction', 'sports_complex'], photoRef: null };
    expect(q2(arena)).toBe(false);
    expect(q2({ ...arena, types: ['tourist_attraction'] })).toBe(true);
  });
});
