import { describe, expect, it } from 'vitest';
import { FREE_GEMS, gemsFor } from './gems';

const gems = Array.from({ length: 7 }, (_, i) => ({ name: `Gem ${i}` }));

describe('gemsFor', () => {
  it('gives the free plan its first three gems and counts the rest as locked', () => {
    expect(FREE_GEMS).toBe(3);
    expect(gemsFor(gems, false)).toEqual({ hiddenGems: gems.slice(0, 3), lockedGems: 4 });
  });

  it('gives Plus every gem', () => {
    expect(gemsFor(gems, true)).toEqual({ hiddenGems: gems, lockedGems: 0 });
  });
});
