import { describe, expect, it } from 'vitest';
import en from './en.json';
import nl from './nl.json';
import fr from './fr.json';
import de from './de.json';
import es from './es.json';
import it_ from './it.json';
import { LANGUAGES, pickLanguage } from './index';

type Tree = { [k: string]: string | Tree };
const flat = (t: Tree, pre = ''): Record<string, string> =>
  Object.entries(t).reduce((o, [k, v]) => (typeof v === 'string' ? { ...o, [pre + k]: v } : { ...o, ...flat(v, `${pre}${k}.`) }), {} as Record<string, string>);

describe('choosing the language', () => {
  it('uses the phone language when it is one of ours, else English', () => {
    expect(pickLanguage(null, ['nl-BE', 'en'])).toBe('nl');
    expect(pickLanguage(null, ['cs-CZ'])).toBe('en');
    expect(pickLanguage(null, [])).toBe('en');
  });
  it('keeps a choice the traveller made, if it is valid', () => {
    expect(pickLanguage('de', ['nl'])).toBe('de');
    expect(pickLanguage('xx', [])).toBe('en');
  });
  it('lists the six languages in their own names', () => {
    expect(LANGUAGES.map((l) => l.name)).toEqual(['English', 'Nederlands', 'Français', 'Deutsch', 'Español', 'Italiano']);
  });
});

describe('translations', () => {
  const base = flat(en as Tree);
  for (const [code, file] of Object.entries({ nl, fr, de, es, it: it_ })) {
    it(`${code} has every English text, none empty, nothing extra`, () => {
      const other = flat(file as Tree);
      expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort());
      expect(Object.entries(other).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
    });
    it(`${code} keeps every {{placeholder}}`, () => {
      const other = flat(file as Tree);
      const bad = Object.keys(base).filter((k) => {
        const need = (base[k].match(/{{\w+}}/g) ?? []).sort().join();
        return (other[k]?.match(/{{\w+}}/g) ?? []).sort().join() !== need;
      });
      expect(bad).toEqual([]);
    });
  }
});

describe('planner choices', () => {
  it('has a text for every vehicle, stay type, filter group and filter', async () => {
    const { FILTER_GROUPS, VEHICLES, STAY_LABELS } = await import('@/lib/tripPlan');
    const keys = flat(en as Tree);
    const need = [
      ...VEHICLES.map((v) => `vehicle.${v}`),
      ...Object.keys(STAY_LABELS).map((s) => `stay.${s}`),
      ...FILTER_GROUPS.flatMap((g) => [`filterGroup.${g.id}`, ...g.options.map((o) => `filter.${o.id}`)]),
    ];
    expect(need.filter((k) => !keys[k])).toEqual([]);
  });
});
