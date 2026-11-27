import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatNumber } from './format';

describe('money, dates and numbers per language', () => {
  it('writes euros the local way', () => {
    expect(formatMoney(9, 'en')).toBe('€9.00');
    expect(formatMoney(9, 'nl')).toMatch(/€\s?9,00/);
    expect(formatMoney(1234.5, 'de')).toMatch(/1\.234,50\s?€/);
    expect(formatMoney(12, 'en', { whole: true })).toBe('€12');
  });
  it('writes dates and numbers the local way', () => {
    expect(formatDate('2026-11-27', 'nl')).toContain('nov');
    expect(formatDate('2026-11-27', 'en')).toContain('Nov');
    expect(formatNumber(54724, 'en')).toBe('54,724');
    expect(formatNumber(54724, 'de')).toBe('54.724');
  });
});
