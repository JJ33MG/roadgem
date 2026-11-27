// Estimated costs of a trip per leg (between two stops): fuel or charging, motorway tolls and vignettes,
// plus warnings to arrange before a country. The trip page sums legs into days.
import { TABLES } from './tables';

export type Vehicle = 'car' | 'ev' | 'campervan' | 'caravan';
export interface LegInput { km: number; hours: number; countries: { code: string; km: number }[] }
/** warningCountries: the country of each warning, so the app can show it in the traveller's language. */
export interface LegCost { fuel: number; tolls: number; vignettes: { country: string; label: string; price: number }[]; warnings: string[]; warningCountries: string[]; total: number }
/** The toll-free route against the fastest: what it saves on the trip and what it costs in time. */
export interface CheaperRoute { tollFree: true; using: boolean; saves: number; extraHours: number; extraKm: number }
export interface TripCosts { legs: LegCost[]; overnight: number; updated: string; cheaper?: CheaperRoute | null }

const round = (n: number) => Math.round(n * 100) / 100;

export function costsForLegs({ vehicle, legs, stayTypes, tollFree = false }: { vehicle: Vehicle; legs: LegInput[]; stayTypes: string[]; tollFree?: boolean }): TripCosts {
  const bought = new Set<string>();
  const warned = new Set<string>();
  const out = legs.map((leg) => {
    let fuel = 0;
    let tolls = 0;
    const vignettes: LegCost['vignettes'] = [];
    const warnings: string[] = [];
    const warningCountries: string[] = [];
    for (const { code, km } of leg.countries) {
      const price = TABLES.fuel[code] ?? TABLES.fuel.default;
      const perKm = (TABLES.use[vehicle] / 100) * (vehicle === 'ev' ? price.kwh : vehicle === 'car' ? price.petrol : price.diesel);
      fuel += km * perKm;
      if (!tollFree) tolls += km * (TABLES.tollPerKm[code] ?? 0) * TABLES.tollFactor[vehicle];
      const v = TABLES.vignettes[code];
      if (v && !bought.has(code)) {
        bought.add(code);
        vignettes.push({ country: code, label: v.label, price: v.price });
      }
      const w = TABLES.warnings[code];
      if (w && !warned.has(code)) {
        warned.add(code);
        warnings.push(w);
        warningCountries.push(code);
      }
    }
    const total = fuel + tolls + vignettes.reduce((n, v) => n + v.price, 0);
    return { fuel: round(fuel), tolls: round(tolls), vignettes, warnings, warningCountries, total: round(total) };
  });
  const firstStay = stayTypes.find((s) => TABLES.overnight[s] !== undefined);
  return { legs: out, overnight: firstStay ? TABLES.overnight[firstStay] : TABLES.overnight.hotel, updated: TABLES.updated };
}

const VEHICLES: Vehicle[] = ['car', 'ev', 'campervan', 'caravan'];

type Alt = { legs?: unknown; tollFree?: unknown };
const driving = (c: TripCosts) => c.legs.reduce((n, l) => n + l.total, 0);
const sum = (legs: LegInput[], k: 'km' | 'hours') => legs.reduce((n, l) => n + (Number(l[k]) || 0), 0);

/** Costs for a saved trip's planner data; null when the trip has no road legs (made before costs existed). */
export function costsOfPlanner(planner: { vehicle?: unknown; stayTypes?: unknown; legs?: unknown; tollFree?: unknown; alt?: Alt | null }): TripCosts | null {
  if (!Array.isArray(planner.legs) || planner.legs.length === 0) return null;
  const vehicle = VEHICLES.includes(planner.vehicle as Vehicle) ? (planner.vehicle as Vehicle) : 'car';
  const stayTypes = Array.isArray(planner.stayTypes) ? (planner.stayTypes as string[]) : ['hotel'];
  const legs = planner.legs as LegInput[];
  const using = planner.tollFree === true;
  const costs = costsForLegs({ vehicle, legs, stayTypes, tollFree: using });
  let cheaper: CheaperRoute | null = null;
  const alt = planner.alt;
  if (alt && Array.isArray(alt.legs) && alt.legs.length) {
    const altLegs = alt.legs as LegInput[];
    const altCosts = costsForLegs({ vehicle, legs: altLegs, stayTypes, tollFree: alt.tollFree === true });
    const [free, fast, freeLegs, fastLegs] = using ? [costs, altCosts, legs, altLegs] : [altCosts, costs, altLegs, legs];
    const saves = Math.round(driving(fast) - driving(free));
    // Worth showing only when it saves real money (at least €5).
    if (saves >= 5) {
      cheaper = {
        tollFree: true,
        using,
        saves,
        extraHours: Math.round((sum(freeLegs, 'hours') - sum(fastLegs, 'hours')) * 10) / 10,
        extraKm: Math.round(sum(freeLegs, 'km') - sum(fastLegs, 'km')),
      };
    }
  }
  return { ...costs, cheaper };
}
