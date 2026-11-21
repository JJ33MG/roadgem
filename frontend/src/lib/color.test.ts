import { describe, expect, it } from 'vitest';
import { oklchToHex } from './color';

describe('oklchToHex', () => {
  it('turns the theme tokens into colours the map engine understands', () => {
    expect(oklchToHex('oklch(44% 0.075 190)')).toBe('#035f5c');
    expect(oklchToHex('oklch(100% 0 0)')).toBe('#ffffff');
    expect(oklchToHex('#123456')).toBe('#123456');
    expect(oklchToHex('nonsense')).toBeNull();
  });
});
