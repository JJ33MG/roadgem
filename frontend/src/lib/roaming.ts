// EU roaming ("roam like at home") covers the EU plus Norway, Iceland and Liechtenstein.
// These European countries on a road trip are outside it, so a phone plan from home can cost extra there.
const OUTSIDE: Record<string, string> = {
  CH: 'Switzerland', GB: 'the United Kingdom', AD: 'Andorra', MC: 'Monaco', SM: 'San Marino', VA: 'Vatican City',
  BA: 'Bosnia and Herzegovina', RS: 'Serbia', ME: 'Montenegro', AL: 'Albania', MK: 'North Macedonia', XK: 'Kosovo',
  TR: 'Turkey', MD: 'Moldova', UA: 'Ukraine', GI: 'Gibraltar',
};

/** The countries on the road (by legs) where EU roaming does not apply, in travel order, each once. */
export function outsideRoaming(legs: { countries: { code: string }[] }[] | undefined): string[] {
  const names = (legs ?? []).flatMap((l) => l.countries.map((c) => OUTSIDE[c.code.toUpperCase()])).filter(Boolean);
  return [...new Set(names)];
}
