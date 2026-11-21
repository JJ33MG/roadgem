import { describe, expect, it } from 'vitest';
import { dayCost, tripTotal } from './costs';

const costs = {
  updated: '2026-11-22',
  overnight: 35,
  legs: [
    { fuel: 30, tolls: 10, vignettes: [], warnings: ['France: many cities need a Crit’Air sticker.'], total: 40 },
    { fuel: 20, tolls: 0, vignettes: [{ country: 'AT', label: 'Austrian 10-day vignette', price: 12.8 }], warnings: [], total: 32.8 },
  ],
};

describe('day costs', () => {
  it('adds up the legs of a day and the night', () => {
    expect(dayCost(costs, 0, 2, true)).toEqual({
      fuel: 50, tolls: 10, vignettes: costs.legs[1].vignettes, warnings: costs.legs[0].warnings, overnight: 35, total: 107.8,
    });
  });

  it('a rest day costs only the night, the last day has no night', () => {
    expect(dayCost(costs, 2, 2, true).total).toBe(35);
    expect(dayCost(costs, 1, 2, false).overnight).toBe(0);
  });

  it('totals the trip: every leg once and a night for each day but the last', () => {
    expect(tripTotal(costs, 3)).toBe(40 + 32.8 + 2 * 35);
  });
});
