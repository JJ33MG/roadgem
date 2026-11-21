import { describe, expect, it } from 'vitest';
import { cityPairs } from './seedRun';

describe('seed routes', () => {
  it('links each city to its nearest neighbours once, never across the continent', () => {
    const pts = [{ lat: 50.85, lng: 4.35 }, { lat: 51.22, lng: 4.4 }, { lat: 52.37, lng: 4.9 }, { lat: 48.86, lng: 2.35 }, { lat: 38.72, lng: -9.14 }];
    const pairs = cityPairs(pts, 2, 700);
    const keys = pairs.map(([a, b]) => [pts.indexOf(a), pts.indexOf(b)].sort().join('-'));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('0-1');
    expect(keys.some((k) => k.includes('4'))).toBe(false); // Lisbon is over 700 km from all
  });
});
