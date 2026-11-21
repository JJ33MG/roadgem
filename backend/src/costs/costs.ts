// Estimated costs of a trip per leg (between two stops): fuel or charging, motorway tolls and vignettes,
// plus warnings to arrange before a country. The trip page sums legs into days.
import { TABLES } from './tables';

export type Vehicle = 'car' | 'ev' | 'campervan' | 'caravan';
export interface LegInput { km: number; hours: number; countries: { code: string; km: number }[] }
export interface LegCost { fuel: number; tolls: number; vignettes: { country: string; label: string; price: number }[]; warnings: string[]; total: number }
export interface TripCosts { legs: LegCost[]; overnight: number; updated: string }

const round = (n: number) => Math.round(n * 100) / 100;

export function costsForLegs({ vehicle, legs, stayTypes }: { vehicle: Vehicle; legs: LegInput[]; stayTypes: string[] }): TripCosts {
  const bought = new Set<string>();
  const warned = new Set<string>();
  const out = legs.map((leg) => {
    let fuel = 0;
    let tolls = 0;
    const vignettes: LegCost['vignettes'] = [];
    const warnings: string[] = [];
    for (const { code, km } of leg.countries) {
      const price = TABLES.fuel[code] ?? TABLES.fuel.default;
      const perKm = (TABLES.use[vehicle] / 100) * (vehicle === 'ev' ? price.kwh : vehicle === 'car' ? price.petrol : price.diesel);
      fuel += km * perKm;
      tolls += km * (TABLES.tollPerKm[code] ?? 0) * TABLES.tollFactor[vehicle];
      const v = TABLES.vignettes[code];
      if (v && !bought.has(code)) {
        bought.add(code);
        vignettes.push({ country: code, label: v.label, price: v.price });
      }
      const w = TABLES.warnings[code];
      if (w && !warned.has(code)) {
        warned.add(code);
        warnings.push(w);
      }
    }
    const total = fuel + tolls + vignettes.reduce((n, v) => n + v.price, 0);
    return { fuel: round(fuel), tolls: round(tolls), vignettes, warnings, total: round(total) };
  });
  const firstStay = stayTypes.find((s) => TABLES.overnight[s] !== undefined);
  return { legs: out, overnight: firstStay ? TABLES.overnight[firstStay] : TABLES.overnight.hotel, updated: TABLES.updated };
}

const VEHICLES: Vehicle[] = ['car', 'ev', 'campervan', 'caravan'];

/** Costs for a saved trip's planner data; null when the trip has no road legs (made before costs existed). */
export function costsOfPlanner(planner: { vehicle?: unknown; stayTypes?: unknown; legs?: unknown }): TripCosts | null {
  if (!Array.isArray(planner.legs) || planner.legs.length === 0) return null;
  const vehicle = VEHICLES.includes(planner.vehicle as Vehicle) ? (planner.vehicle as Vehicle) : 'car';
  const stayTypes = Array.isArray(planner.stayTypes) ? (planner.stayTypes as string[]) : ['hotel'];
  return costsForLegs({ vehicle, legs: planner.legs as LegInput[], stayTypes });
}
