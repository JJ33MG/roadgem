import type { TripCosts } from '@/types';

const round = (n: number) => Math.round(n * 100) / 100;

/** One day's costs: the legs it drives (fromLeg up to toLeg) and, unless it is the last day, the night. */
export function dayCost(costs: TripCosts, fromLeg: number, toLeg: number, withNight: boolean) {
  const legs = costs.legs.slice(fromLeg, Math.max(fromLeg, toLeg));
  const fuel = round(legs.reduce((n, l) => n + l.fuel, 0));
  const tolls = round(legs.reduce((n, l) => n + l.tolls, 0));
  const vignettes = legs.flatMap((l) => l.vignettes);
  const warnings = legs.flatMap((l) => l.warnings);
  const overnight = withNight ? costs.overnight : 0;
  const total = round(fuel + tolls + vignettes.reduce((n, v) => n + v.price, 0) + overnight);
  return { fuel, tolls, vignettes, warnings, overnight, total };
}

/** The whole trip: every leg once and a night after every day but the last. */
export const tripTotal = (costs: TripCosts, days: number) => round(costs.legs.reduce((n, l) => n + l.total, 0) + Math.max(0, days - 1) * costs.overnight);

export const euros = (n: number) => `€${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
