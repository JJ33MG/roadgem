import { describe, expect, it } from 'vitest';
import { inEurope, roadKm } from './route';

describe('roadKm', () => {
  it('estimates Madrid to Brussels at roughly the real driving distance', () => {
    const km = roadKm({ lat: 40.4168, lng: -3.7038 }, { lat: 50.8503, lng: 4.3517 });
    expect(km).toBeGreaterThan(1450);
    expect(km).toBeLessThan(1750);
  });

  it('is zero for the same place', () => {
    expect(roadKm({ lat: 40, lng: -3 }, { lat: 40, lng: -3 })).toBe(0);
  });
});

describe('inEurope', () => {
  it('tells the Spanish Toledo from the one in Ohio', () => {
    expect(inEurope({ lat: 39.86, lng: -4.02 })).toBe(true);
    expect(inEurope({ lat: 41.65, lng: -83.54 })).toBe(false);
  });
});

import { estimateBody } from './route';

describe('estimateBody', () => {
  it('gives the distance and both ends, so the globe can draw the arc while planning', () => {
    const a = { lat: 52.37, lng: 4.9 };
    const b = { lat: 45.6, lng: 10.7 };
    const body = estimateBody(a, b);
    expect(body.km).toBeGreaterThan(900);
    expect(body.from).toEqual(a);
    expect(body.to).toEqual(b);
    expect(estimateBody(null, b)).toEqual({ km: null });
  });
});
