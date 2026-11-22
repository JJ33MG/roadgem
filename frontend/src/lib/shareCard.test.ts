import { describe, expect, it } from 'vitest';
import { cardText } from './shareCard';

describe('share card text', () => {
  it('sums up the trip: route, gems collected, distance, countries and the invite link', () => {
    const t = cardText({ from: 'Amsterdam', to: 'Lake Garda', done: 9, total: 9, km: 1240.4, countries: ['NL', 'DE', 'CH', 'IT'], inviteUrl: 'https://routify.app/signup?invite=ABCD2345' });
    expect(t.title).toBe('Amsterdam to Lake Garda');
    expect(t.stats).toEqual(['9 of 9 gems collected', '1,240 km', '4 countries']);
    expect(t.footer).toBe('routify.app/signup?invite=ABCD2345');
  });
  it('works for a trip without check-ins, distance or invite', () => {
    const t = cardText({ from: 'Lyon', to: 'Nice', done: 0, total: 9, km: 0, countries: [] });
    expect(t.stats).toEqual(['0 of 9 gems collected']);
    expect(t.footer).toBe('Planned with Routify');
  });
});
