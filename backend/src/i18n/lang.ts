// The six languages of RoamGem (27 Nov). The app sends the chosen one as the x-lang header.
export type Lang = 'en' | 'nl' | 'fr' | 'de' | 'es' | 'it';
export const LANGS: readonly Lang[] = ['en', 'nl', 'fr', 'de', 'es', 'it'];

export const isLang = (x: unknown): x is Lang => typeof x === 'string' && (LANGS as readonly string[]).includes(x);

/** The language of a request: the x-lang header when it is one of the six, else English. */
export const langOf = (header: unknown): Lang => (isLang(header) ? header : 'en');
