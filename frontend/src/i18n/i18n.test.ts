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

describe('real translations', () => {
  // Words that stay the same in every language: brand and product names, and the handful of words that really are equal.
  const SAME = /^(RoamGem( team)?|Plus|Trip pass|Google Maps|Waze|Roadsurfer|Indie Campers|Localrent|Hotel|Hotels|Camping|Campings|Community|Feedback|Bug|Idea|Comfort|Wellness|Diesel|Hostel|Café|Privacy|Start|Home|Filters|Luxe|Culture|Nature|Couple|Familie|Famille|Auto|Ok|OK|Plus|\{\{.*)$/;
  const base = flat(en as Tree);
  for (const [code, file] of Object.entries({ nl, fr, de, es, it: it_ })) {
    it(`${code} is translated, not copied from English`, () => {
      const other = flat(file as Tree);
      const same = Object.keys(base).filter((k) => other[k] === base[k] && !SAME.test(base[k].trim()));
      expect(same.length / Object.keys(base).length).toBeLessThan(0.05);
    });
  }
});

describe('the account language', () => {
  it('keeps the phone language when the account never chose one', async () => {
    const { default: i18n, applyAccountLanguage } = await import('./index');
    await i18n.changeLanguage('nl');
    applyAccountLanguage(null);
    expect(i18n.language).toBe('nl');
    applyAccountLanguage('de');
    expect(i18n.language).toBe('de');
    await i18n.changeLanguage('en');
  });
});

describe('weather in every language', () => {
  it('has a word for every weather OpenWeather reports', () => {
    const keys = flat(en as Tree);
    const need = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm', 'Snow', 'Mist', 'Fog', 'Haze'].map((w) => `weather.${w}`);
    expect(need.filter((k) => !keys[k])).toEqual([]);
  });
});
