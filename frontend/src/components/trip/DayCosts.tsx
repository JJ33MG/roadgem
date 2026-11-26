import { dayCost, euros } from '@/lib/costs';
import type { TripCosts } from '@/types';
import { DayBlock } from './DayBlock';

const FUEL_LABEL: Record<string, string> = { car: 'Petrol', ev: 'Charging', campervan: 'Diesel', caravan: 'Diesel' };
const NIGHT_LABEL: Record<string, string> = { campsite: 'Campsite tonight', hotel: 'Hotel tonight', holiday_home: 'Holiday home tonight' };

const dateLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type Props = { day: number; costs: TripCosts; fromLeg: number; toLeg: number; withNight: boolean; vehicle?: string; stay?: string };

/** What one day costs: fuel or charging, tolls, vignettes, the night, and what to arrange before a border. */
export function DayCosts({ day, costs, fromLeg, toLeg, withNight, vehicle = 'car', stay = 'hotel' }: Props) {
  const c = dayCost(costs, fromLeg, toLeg, withNight);
  const row = (label: string, value: number) => (
    <div key={label} className="flex items-baseline justify-between gap-12 border-t border-rule py-8 first:border-t-0">
      <span>{label}</span>
      <span className="num text-ink" style={{ fontWeight: 500 }}>{euros(value)}</span>
    </div>
  );
  return (
    <DayBlock kind="cost" id="day-cost" title="Costs today" label={`Costs of day ${day}`} meta="Estimate">
      <div>
        {c.fuel > 0 && row(FUEL_LABEL[vehicle] ?? 'Fuel', c.fuel)}
        {c.tolls > 0 && row('Tolls', c.tolls)}
        {c.vignettes.map((v) => row(v.label, v.price))}
        {c.overnight > 0 && row(NIGHT_LABEL[stay] ?? 'Tonight', c.overnight)}
        <div className="flex items-baseline justify-between gap-12 border-t border-ink py-8">
          <span className="text-ink" style={{ fontWeight: 500 }}>Day total</span>
          <span className="num text-[20px] text-ink" style={{ fontWeight: 500 }}>{euros(c.total)}</span>
        </div>
      </div>
      {c.warnings.length > 0 && (
        <ul className="grid gap-8 p-0" style={{ listStyle: 'none' }}>
          {c.warnings.map((w) => <li key={w} className="rounded-part bg-paper-2 px-12 py-8 text-[16px] text-ink-2">{w}</li>)}
        </ul>
      )}
      <p className="text-[15px] text-muted">{`Estimate, prices of ${dateLabel(costs.updated)}`}</p>
    </DayBlock>
  );
}
