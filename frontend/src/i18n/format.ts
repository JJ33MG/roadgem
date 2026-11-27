// Money, dates and numbers in the traveller's language (Intl), so a Dutch page reads "€ 9,00" and "27 nov.".
import { currentLang, type Lang } from './index';

const LOCALE: Record<Lang, string> = { en: 'en-IE', nl: 'nl-NL', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
export const localeOf = (lang: Lang = currentLang()) => (lang === 'en' ? 'en-GB' : LOCALE[lang]);

export function formatMoney(eur: number, lang: Lang = currentLang(), opts: { whole?: boolean } = {}): string {
  const digits = opts.whole ? 0 : 2;
  return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(eur);
}

export function formatDate(iso: string, lang: Lang = currentLang(), opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(localeOf(lang), { timeZone: 'UTC', ...opts }).format(d);
}

export const formatNumber = (n: number, lang: Lang = currentLang()) => new Intl.NumberFormat(localeOf(lang)).format(n);
