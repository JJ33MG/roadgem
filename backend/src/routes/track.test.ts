import { describe, expect, it } from 'vitest';
import { isKnownPartner, rateLimiter } from './track';

describe('click tracking guards', () => {
  it('only counts the partners the site links to', () => {
    for (const p of ['booking', 'airbnb', 'rentalcars', 'autoeurope', 'viator', 'getyourguide']) expect(isKnownPartner(p)).toBe(true);
    expect(isKnownPartner('evil')).toBe(false);
    expect(isKnownPartner(42)).toBe(false);
  });

  it('allows 30 clicks a minute per visitor, then refuses until the minute is over', () => {
    const allow = rateLimiter(30, 60_000);
    const t = 1_000_000;
    for (let i = 0; i < 30; i++) expect(allow('1.2.3.4', t)).toBe(true);
    expect(allow('1.2.3.4', t + 1)).toBe(false);
    expect(allow('5.6.7.8', t + 1)).toBe(true);
    expect(allow('1.2.3.4', t + 60_001)).toBe(true);
  });
});
