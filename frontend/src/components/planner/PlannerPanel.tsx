import { useId, useState } from 'react';
import { Button, Panel, SliderField, Switch, Toggle } from '@/components/ui';
import {
  DEFAULT_PLAN,
  FILTER_GROUPS,
  GEMS_PER_DAY,
  KM_PER_DAY,
  QUICK_FILTERS,
  STAY_LABELS,
  suggestedDays,
  type StayType,
  type TripPlan,
} from '@/lib/tripPlan';
import { FiltersSheet } from './FiltersSheet';

type Props = {
  initial?: TripPlan;
  /** The route's driving distance when known (e.g. a re-plan), for the "about N days" note. */
  routeKm?: number;
  busy?: boolean;
  onSubmit: (plan: TripPlan) => void;
  /** Rough driving distance for a route, checked before planning; null when unknown. */
  estimateKm?: (from: string, to: string) => Promise<number | null>;
};

const LABEL_OF = new Map(FILTER_GROUPS.flatMap((g) => g.options.map((o) => [o.id, o.label] as const)));
const STAYS: StayType[] = ['campsite', 'hotel', 'holiday_home'];

/** The trip, set like an instrument: route, days, daily distance, gems and where to sleep. */
export function PlannerPanel({ initial = DEFAULT_PLAN, routeKm, busy, onSubmit, estimateKm }: Props) {
  const [plan, setPlan] = useState<TripPlan>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  const [estimated, setEstimated] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [checking, setChecking] = useState(false);
  const ids = { from: useId(), to: useId(), days: useId() };
  const set = <K extends keyof TripPlan>(key: K, value: TripPlan[K]) => setPlan((p) => ({ ...p, [key]: value }));

  const knownKm = routeKm ?? estimated;
  const needed = knownKm ? suggestedDays(knownKm, plan.kmPerDay) : 0;
  const tooShort = needed > plan.days;
  const toggleStay = (s: StayType) => {
    const next = plan.stayTypes.includes(s) ? plan.stayTypes.filter((x) => x !== s) : [...plan.stayTypes, s];
    set('stayTypes', next.length ? next : plan.stayTypes);
  };
  const toggleFilter = (id: string) => set('filters', plan.filters.includes(id) ? plan.filters.filter((f) => f !== id) : [...plan.filters, id]);
  const extraFilters = plan.filters.filter((f) => !QUICK_FILTERS.includes(f)).length;

  async function check() {
    if (!estimateKm) return onSubmit(plan);
    setChecking(true);
    const km = await estimateKm(plan.from.trim(), plan.to.trim()).catch(() => null);
    setChecking(false);
    if (km && suggestedDays(km, plan.kmPerDay) > plan.days) {
      setEstimated(km);
      setAsking(true);
      return;
    }
    onSubmit(plan);
  }
  const finish = (days: number) => {
    setAsking(false);
    onSubmit({ ...plan, days });
  };

  const inputClass = 'h-[56px] w-full rounded-input border border-rule bg-paper px-16 text-[19px] text-ink';
  const labelClass = 'flex flex-col gap-[6px] text-[16px] text-muted';

  return (
    <Panel>
      <form
        aria-label="Plan a trip"
        onSubmit={(e) => {
          e.preventDefault();
          if (!plan.from.trim() || !plan.to.trim()) {
            setMissing(true);
            return;
          }
          setMissing(false);
          void check();
        }}
      >
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px]">
          <label htmlFor={ids.from} className={labelClass} style={{ fontWeight: 500 }}>
            From
            <input id={ids.from} className={inputClass} value={plan.from} placeholder="Madrid" autoComplete="off" onChange={(e) => set('from', e.target.value)} />
          </label>
          <label htmlFor={ids.to} className={labelClass} style={{ fontWeight: 500 }}>
            To
            <input id={ids.to} className={inputClass} value={plan.to} placeholder="Brussels" autoComplete="off" onChange={(e) => set('to', e.target.value)} />
          </label>
          <label htmlFor={ids.days} className={labelClass} style={{ fontWeight: 500 }}>
            Days
            <input id={ids.days} className={inputClass} type="number" min={1} max={30} value={plan.days} onChange={(e) => set('days', Math.min(30, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        </div>
        {missing && <p className="mt-8 text-error" role="alert">Add where you start and where you end.</p>}

        <div className="mt-20 grid gap-16">
          <SliderField label="Kilometres a day" unit="km" value={plan.kmPerDay} min={KM_PER_DAY.min} max={KM_PER_DAY.max} step={KM_PER_DAY.step} onChange={(v) => set('kmPerDay', v)} />
          {tooShort && (
            <p className="text-[16px] text-ink-2" role="status">
              {`About ${needed} days at ${plan.kmPerDay} km a day`}
            </p>
          )}
          {plan.gemsEnabled && (
            <SliderField label="Gems a day" value={plan.gemsPerDay} min={GEMS_PER_DAY.min} max={GEMS_PER_DAY.max} onChange={(v) => set('gemsPerDay', v)} />
          )}
        </div>

        <div className="mt-16 flex items-center justify-between gap-12 rounded-input border border-rule bg-paper px-16 py-12">
          <span className="text-ink" style={{ fontWeight: 500 }}>Road gems on the way</span>
          <Switch checked={plan.gemsEnabled} label="Road gems on the way" onChange={(v) => set('gemsEnabled', v)} />
        </div>
        {!plan.gemsEnabled && <p className="mt-[6px] text-[15px] text-muted">Just the route and the stays.</p>}

        <p className="mt-16 text-[16px] text-muted" style={{ fontWeight: 500 }}>Sleep in</p>
        <div role="group" aria-label="Where to sleep" className="mt-8 flex flex-wrap gap-8">
          {STAYS.map((s) => (
            <Toggle key={s} pressed={plan.stayTypes.includes(s)} onChange={() => toggleStay(s)}>{STAY_LABELS[s]}</Toggle>
          ))}
        </div>

        <div role="group" aria-label="Filters" className="mt-12 flex flex-wrap gap-8">
          {QUICK_FILTERS.map((id) => (
            <Toggle key={id} pressed={plan.filters.includes(id)} onChange={() => toggleFilter(id)}>{LABEL_OF.get(id)}</Toggle>
          ))}
          <button type="button" onClick={() => setSheetOpen(true)} className="min-h-[48px] rounded-btn border border-ink px-16 text-[17px] text-ink" style={{ fontWeight: 500 }}>
            {extraFilters ? `All filters, ${extraFilters} on` : 'All filters'}
          </button>
        </div>

        {asking && tooShort ? (
          <div className="mt-20 grid gap-8 sm:grid-cols-2">
            <Button type="button" variant="primary" className="w-full" disabled={busy} onClick={() => finish(Math.min(30, needed))}>
              {`Plan it in ${Math.min(30, needed)} days`}
            </Button>
            <Button type="button" className="w-full" disabled={busy} onClick={() => finish(plan.days)}>
              {`Keep ${plan.days} days`}
            </Button>
          </div>
        ) : (
          <Button type="submit" variant="primary" className="mt-20 w-full" disabled={busy || checking}>
            {busy ? 'Planning your trip' : checking ? 'Checking the distance' : 'Plan my trip'}
          </Button>
        )}
      </form>
      <FiltersSheet open={sheetOpen} selected={plan.filters} onChange={(f) => set('filters', f)} onClose={() => setSheetOpen(false)} />
    </Panel>
  );
}
