import { describe, expect, it } from 'vitest';
import { explorerGemsNear, monthlyChallenge } from './explorer';

const line = [{ lat: 50.0, lng: 4.0 }, { lat: 50.0, lng: 5.0 }];

describe('Explorer gems', () => {
  it('are official gems found by travellers, within 20 km of the road', () => {
    const rows = [
      { id: 'a', name: 'Near', lat: 50.1, lng: 4.5, status: 'official', finderId: 'u1' }, // ~11 km
      { id: 'b', name: 'Far', lat: 50.5, lng: 4.5, status: 'official', finderId: 'u1' }, // ~55 km
      { id: 'c', name: 'Not found by a traveller', lat: 50.0, lng: 4.5, status: 'official', finderId: null },
      { id: 'd', name: 'Still a suggestion', lat: 50.0, lng: 4.5, status: 'suggested', finderId: 'u2' },
    ];
    expect(explorerGemsNear(rows as never, line).map((g) => g.id)).toEqual(['a']);
  });

  it('has a challenge for every month', () => {
    expect(monthlyChallenge(new Date('2027-07-10')).length).toBeGreaterThan(10);
    expect(monthlyChallenge(new Date('2027-07-10'))).not.toBe(monthlyChallenge(new Date('2027-08-10')));
  });
});
