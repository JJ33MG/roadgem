import { describe, expect, it } from 'vitest';
import { applyEdit, EditError, editKeyMatches, newEditKey } from './edits';

const stops = ['Madrid, Spain', 'Burgos, Spain', 'San Sebastián, Spain', 'Bordeaux, France'];
const base = { overnights: ['Burgos', 'San Sebastián', 'Bordeaux'], hiddenGems: [] as string[] };

describe('plan edits', () => {
  it('moves a night to another stop, and refuses a stop that does not exist', () => {
    expect(applyEdit(base, { type: 'night', day: 1, stopIndex: 2 }, stops).overnights).toEqual(['San Sebastián, Spain', 'San Sebastián', 'Bordeaux']);
    expect(() => applyEdit(base, { type: 'night', day: 1, stopIndex: 9 }, stops)).toThrow(EditError);
    expect(() => applyEdit(base, { type: 'night', day: 7, stopIndex: 1 }, stops)).toThrow(EditError);
  });

  it('hides and shows a gem', () => {
    const hidden = applyEdit(base, { type: 'hideGem', placeId: 'p1' }, stops);
    expect(hidden.hiddenGems).toEqual(['p1']);
    expect(applyEdit(hidden, { type: 'showGem', placeId: 'p1' }, stops).hiddenGems).toEqual([]);
  });

  it('adds a rest day: the same town for one more night', () => {
    expect(applyEdit(base, { type: 'restDay', afterDay: 1 }, stops).overnights).toEqual(['Burgos', 'Burgos', 'San Sebastián', 'Bordeaux']);
    expect(() => applyEdit(base, { type: 'restDay', afterDay: 0 }, stops)).toThrow(EditError);
  });

  it('refuses an unknown edit', () => {
    expect(() => applyEdit(base, { type: 'teleport' } as never, stops)).toThrow(EditError);
  });
});

describe('edit key', () => {
  it('matches only the key it was made from', () => {
    const { key, hash } = newEditKey();
    expect(key).toMatch(/^[0-9a-f]{48}$/);
    expect(editKeyMatches(hash, key)).toBe(true);
    expect(editKeyMatches(hash, 'wrong')).toBe(false);
    expect(editKeyMatches(undefined, key)).toBe(false);
    expect(editKeyMatches(hash, undefined)).toBe(false);
  });
});
