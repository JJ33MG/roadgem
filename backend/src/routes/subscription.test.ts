import { describe, expect, it } from 'vitest';
import { directUpgradeAllowed } from './subscription';

describe('Plus without paying', () => {
  it('is only possible when the test switch is on (never on the live site)', () => {
    expect(directUpgradeAllowed({})).toBe(false);
    expect(directUpgradeAllowed({ ALLOW_DIRECT_UPGRADE: 'false' })).toBe(false);
    expect(directUpgradeAllowed({ ALLOW_DIRECT_UPGRADE: 'true' })).toBe(true);
  });
});
