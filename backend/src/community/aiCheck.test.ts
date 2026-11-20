import { describe, expect, it } from 'vitest';
import { fallbackChallenge, parseVerdict } from './aiCheck';

describe('AI photo check', () => {
  it('reads the verdict from the model reply', () => {
    expect(parseVerdict('{"safe": true, "showsPlace": true, "challengeMet": false, "note": "Clear photo of the square."}')).toEqual({
      reject: false, challengeMet: false, note: 'Clear photo of the square.',
    });
    expect(parseVerdict('Sure: {"safe": false, "showsPlace": true, "challengeMet": false, "note": "Nudity"}')).toMatchObject({ reject: true });
  });

  it('leaves the decision to the admin when the reply cannot be read', () => {
    expect(parseVerdict('no json here')).toEqual({ reject: false, challengeMet: false, note: 'AI check unreadable; please look yourself.' });
  });

  it('has a plain challenge when none was written yet', () => {
    expect(fallbackChallenge('Grand-Place')).toBe('Grand-Place in one shot, with something that shows you were there today.');
  });
});
