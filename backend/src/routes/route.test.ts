import { describe, expect, it } from 'vitest';
import { roadKm } from './route';

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
