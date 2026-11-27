import { describe, expect, it } from 'vitest';
import { experiencePrompt, parseExperiences, verifiedExperience } from './experiences';

// Jarne, 26 Nov: gems are also things to do (a beer spa in Prague), for families, couples or friends.
describe('experiencePrompt', () => {
  it('asks for real, named places in the town, for families, couples and friends', () => {
    const p = experiencePrompt('Prague, Czech Republic', 'balanced');
    expect(p).toContain('Prague, Czech Republic');
    expect(p).toMatch(/family/i);
    expect(p).toMatch(/couples/i);
    expect(p).toMatch(/friends/i);
    expect(p).toMatch(/exact name/i);
  });
});

describe('parseExperiences', () => {
  it('keeps name, what you do, the kind and who it is for (only known kinds and audiences)', () => {
    const text = 'Sure: {"experiences":[{"name":"Beer Spa Bernard","what":"Bathe in warm beer","kind":"experience","for":["couples","friends","pets"]},{"name":"","what":"x","kind":"food","for":[]}]}';
    expect(parseExperiences(text)).toEqual([{ name: 'Beer Spa Bernard', what: 'Bathe in warm beer', kind: 'experience', for: ['couples', 'friends'] }]);
  });
  it('returns nothing for an answer without JSON', () => {
    expect(parseExperiences('sorry')).toEqual([]);
  });
});

describe('verifiedExperience: RoamGem checks what the AI suggests', () => {
  const town = { lat: 50.08, lng: 14.43 };
  const exp = { name: 'Beer Spa Bernard', what: 'Bathe in warm beer', kind: 'experience' as const, for: ['couples' as const] };
  const real = { id: 'p1', name: 'Beer Spa Bernard', rating: 4.7, reviews: 3100, address: 'Dlouhá 727', lat: 50.09, lng: 14.43, types: ['spa'], photo: 'places/p1/photos/a', open: true, priceLevel: null };

  it('turns a real, well-rated place near the town into a gem with its labels', () => {
    const g = verifiedExperience(exp, [real], town, 3)!;
    expect(g).toMatchObject({ name: 'Beer Spa Bernard', placeId: 'p1', day: 3, category: 'experience', audience: ['couples'], description: 'Bathe in warm beer' });
  });
  it('drops a suggestion Google does not know, a far place, a closed or a poorly rated one', () => {
    expect(verifiedExperience(exp, [], town, 1)).toBeNull();
    expect(verifiedExperience(exp, [{ ...real, lat: 48.2 }], town, 1)).toBeNull();
    expect(verifiedExperience(exp, [{ ...real, open: false }], town, 1)).toBeNull();
    expect(verifiedExperience(exp, [{ ...real, rating: 3.6 }], town, 1)).toBeNull();
  });
});
