import { describe, expect, it } from 'vitest';
import { isLang, langOf } from './lang';

describe('the language of a request', () => {
  it('reads one of the six languages from the header, else English', () => {
    expect(langOf('nl')).toBe('nl');
    expect(langOf('de')).toBe('de');
    expect(langOf('cs')).toBe('en');
    expect(langOf(undefined)).toBe('en');
    expect(langOf(['fr'])).toBe('en');
  });
  it('knows the six', () => {
    expect(['en', 'nl', 'fr', 'de', 'es', 'it'].every(isLang)).toBe(true);
    expect(isLang('EN')).toBe(false);
  });
});
