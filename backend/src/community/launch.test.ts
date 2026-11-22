import { describe, expect, it } from 'vitest';
import { pickOfTheWeek, teamLabel } from './launch';

const rows = Array.from({ length: 40 }, (_, i) => ({
  placeId: `p${i}`, name: `Gem ${i}`, lat: 40 + i / 10, lng: 2, rating: 4.6 + (i % 4) / 10, reviews: 100 + i,
  address: `Town ${i}, ${['Spain', 'France', 'Italy', 'Germany', 'Belgium'][i % 5]}`, photoRef: null,
}));

describe('gems of the week', () => {
  it('picks 8 gems that stay the same all week and change the next week, spread over countries', () => {
    const mon = pickOfTheWeek(rows, new Date('2027-03-01T09:00:00Z'));
    const sun = pickOfTheWeek(rows, new Date('2027-03-07T20:00:00Z'));
    const next = pickOfTheWeek(rows, new Date('2027-03-08T09:00:00Z'));
    expect(mon).toHaveLength(8);
    expect(sun.map((g) => g.placeId)).toEqual(mon.map((g) => g.placeId));
    expect(next.map((g) => g.placeId)).not.toEqual(mon.map((g) => g.placeId));
    expect(new Set(mon.map((g) => g.address.split(', ').pop())).size).toBe(5);
  });
});

describe('the Routify team', () => {
  it('labels posts of the team account and of the moderators as the Routify team', () => {
    expect(teamLabel({ isTeam: true, email: 'x@y.z', name: 'Anna' }, '')).toEqual({ team: true, by: 'Routify team' });
    expect(teamLabel({ isTeam: false, email: 'boss@example.com', name: 'Jo' }, 'boss@example.com')).toEqual({ team: true, by: 'Routify team' });
    expect(teamLabel({ isTeam: false, email: 'a@b.c', name: 'Anna' }, 'boss@example.com')).toEqual({ team: false, by: 'Anna' });
  });
});
