// The line that makes the AI write a trip in the traveller's language (27 Nov). JSON keys stay English.
import type { Lang } from './lang';

const NAME: Record<Exclude<Lang, 'en'>, string> = {
  nl: 'Dutch (informal: je/jij)',
  fr: 'French (informal: tu)',
  de: 'German (informal: du)',
  es: 'Spanish (informal: tú)',
  it: 'Italian (informal: tu)',
};

export function languageLine(lang: Lang | undefined): string {
  if (!lang || lang === 'en') return '';
  return ` Write every text for the traveller in ${NAME[lang]}. Keep place names, addresses and brand names exactly as they are, and keep the JSON keys in English. Keep the values of "kind", "for" and "mode" exactly as listed, in English.`;
}
