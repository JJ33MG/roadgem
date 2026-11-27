// RoamGem in six languages (27 Nov). English is the source; every text lives in <lang>.json.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import nl from './nl.json';
import fr from './fr.json';
import de from './de.json';
import es from './es.json';
import it from './it.json';

export type Lang = 'en' | 'nl' | 'fr' | 'de' | 'es' | 'it';
export const LANGUAGES: { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
];
const CODES = new Set<string>(LANGUAGES.map((l) => l.code));
export const STORAGE_KEY = 'roamgem_lang';

export const isLang = (x: unknown): x is Lang => typeof x === 'string' && CODES.has(x);

/** A choice the traveller made wins; else the first phone language we speak; else English. */
export function pickLanguage(stored: string | null, browser: readonly string[]): Lang {
  if (isLang(stored)) return stored;
  for (const b of browser) {
    const code = b.slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return 'en';
}

const stored = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const start = typeof navigator === 'undefined' ? 'en' : pickLanguage(stored(), navigator.languages ?? [navigator.language]);

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, nl: { translation: nl }, fr: { translation: fr }, de: { translation: de }, es: { translation: es }, it: { translation: it } },
  lng: start,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});
if (typeof document !== 'undefined') document.documentElement.lang = start;

export const currentLang = (): Lang => (isLang(i18n.language) ? i18n.language : 'en');

/** Listeners (the account) that want to know about a new choice. */
const listeners = new Set<(lang: Lang) => void>();
export const onLanguageChosen = (fn: (lang: Lang) => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** The traveller picks a language: switch now, remember it here and on the account. */
export function setLanguage(lang: Lang): void {
  void i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode: the choice lasts this visit */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((fn) => fn(lang));
}

/** On sign-in: the account's language, unless this browser already has a choice. */
export function applyAccountLanguage(lang: unknown): void {
  if (!stored() && isLang(lang) && lang !== currentLang()) {
    void i18n.changeLanguage(lang);
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }
}

export default i18n;
