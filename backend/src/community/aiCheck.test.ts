import { describe, expect, it } from 'vitest';
import { fallbackChallenge, parseVerdict } from './aiCheck';

describe('AI photo check', () => {
  it('reads the verdict from the model reply', () => {
    expect(parseVerdict('{"safe": true, "showsPlace": true, "challengeMet": false, "note": "Clear photo of the square."}')).toEqual({
      reject: false, challengeMet: false, failed: false, note: 'Clear photo of the square.',
    });
    expect(parseVerdict('Sure: {"safe": false, "showsPlace": true, "challengeMet": false, "note": "Nudity"}')).toMatchObject({ reject: true });
  });

  it('marks the check as failed when the reply cannot be read, so it is tried again', () => {
    expect(parseVerdict('no json here')).toMatchObject({ reject: false, failed: true });
  });

  it('has a plain challenge when none was written yet', () => {
    expect(fallbackChallenge('Grand-Place')).toBe('Grand-Place in one shot, with something that shows you were there today.');
  });
});
