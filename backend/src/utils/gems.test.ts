import { describe, expect, it } from 'vitest';
import { FREE_GEMS, gemsFor } from './gems';

const gems = Array.from({ length: 7 }, (_, i) => ({ name: `Gem ${i}` }));

describe('gemsFor', () => {
  it('gives the free plan three gems spread over the route (start, middle, end) and counts the rest as locked', () => {
    expect(FREE_GEMS).toBe(3);
    expect(gemsFor(gems, false)).toEqual({ hiddenGems: [gems[0], gems[3], gems[6]], lockedGems: 4 });
  });

  it('gives Plus every gem', () => {
    expect(gemsFor(gems, true)).toEqual({ hiddenGems: gems, lockedGems: 0 });
  });
});

describe('gemsFor with gems a traveller added from the community', () => {
  it('keeps an added gem visible on the free plan, next to the best gem of its day', () => {
    const day = [{ name: 'Best', day: 1 }, { name: 'Second', day: 1 }, { name: 'Added', day: 1, added: true }];
    expect(gemsFor(day, false)).toEqual({ hiddenGems: [day[0], day[2]], lockedGems: 1 });
  });
});
