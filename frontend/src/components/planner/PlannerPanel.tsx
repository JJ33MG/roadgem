import { useId, useState } from 'react';
import { Button, Panel, SliderField, Switch, Toggle } from '@/components/ui';
import {
  DEFAULT_PLAN,
  GEMS_PER_DAY,
  KM_PER_DAY,
  QUICK_FILTERS,
  defaultStartDate,
  notInPast,
  suggestedDays,
  TRAVELLERS,
  VEHICLES,
  withVehicle,
  type StayType,
  type TripPlan,
} from '@/lib/tripPlan';
import { CityField } from './CityField';
import { FiltersSheet } from './FiltersSheet';
import { useTranslation } from 'react-i18next';

type Props = {
  initial?: TripPlan;
  /** The route's driving distance when known (e.g. a re-plan), for the "about N days" note. */
  routeKm?: number;
  busy?: boolean;
  onSubmit: (plan: TripPlan) => void;
  /** Rough driving distance for a route, checked before planning; null when unknown. */
  estimateKm?: (from: string, to: string) => Promise<number | null>;
};

const STAYS: StayType[] = ['campsite', 'hotel', 'holiday_home'];

/** The trip, set like an instrument: route, days, daily distance, gems and where to sleep. */
export function PlannerPanel({ initial = DEFAULT_PLAN, routeKm, busy, onSubmit, estimateKm }: Props) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<TripPlan>({ ...initial, startDate: initial.startDate || defaultStartDate() });
  const [pastDate, setPastDate] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  const [estimated, setEstimated] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [checking, setChecking] = useState(false);
  const ids = { from: useId(), to: useId(), days: useId(), date: useId(), people: useId() };
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
        aria-label={t('planner.form')}
        onSubmit={(e) => {
          e.preventDefault();
          if (!plan.from.trim() || !plan.to.trim()) {
            setMissing(true);
            return;
          }
          setMissing(false);
          if (!notInPast(plan.startDate)) {
            setPastDate(true);
            return;
          }
          setPastDate(false);
          void check();
        }}
      >
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px]">
          <CityField id={ids.from} label={t('planner.from')} value={plan.from} placeholder="Madrid" onChange={(v) => set('from', v)} />
          <CityField id={ids.to} label={t('planner.to')} value={plan.to} placeholder="Brussels" onChange={(v) => set('to', v)} />
          <label htmlFor={ids.days} className={labelClass} style={{ fontWeight: 500 }}>
            {t('planner.days')}
            <input id={ids.days} className={inputClass} type="number" min={1} max={30} value={plan.days} onChange={(e) => set('days', Math.min(30, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        </div>
        <div className="mt-12 grid grid-cols-[minmax(0,1fr)_120px] gap-12">
          <label htmlFor={ids.date} className={labelClass} style={{ fontWeight: 500 }}>
            {t('planner.leaving')}
            <input id={ids.date} className={inputClass} type="date" value={plan.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </label>
          <label htmlFor={ids.people} className={labelClass} style={{ fontWeight: 500 }}>
            {t('planner.travellers')}
            <input
              id={ids.people}
              className={inputClass}
              type="number"
              min={TRAVELLERS.min}
              max={TRAVELLERS.max}
              value={plan.travellers}
              onChange={(e) => set('travellers', Math.min(TRAVELLERS.max, Math.max(TRAVELLERS.min, Number(e.target.value) || 1)))}
            />
          </label>
        </div>
        {missing && <p className="mt-8 text-error" role="alert">{t('planner.missing')}</p>}
        {pastDate && <p className="mt-8 text-error" role="alert">{t('planner.pastDate')}</p>}

        <p className="mt-20 text-[16px] text-muted" style={{ fontWeight: 500 }}>{t('planner.travellingBy')}</p>
        <div role="radiogroup" aria-label={t('planner.travellingBy')} className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {VEHICLES.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={plan.vehicle === v}
              onClick={() => setPlan((p) => withVehicle(p, v))}
              className={`min-h-[52px] rounded-btn border px-12 text-[17px] ${plan.vehicle === v ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink'}`}
              style={{ fontWeight: 500 }}
            >
              {t(`vehicle.${v}`)}
            </button>
          ))}
        </div>
        {tooShort && (
          <p className="mt-12 text-[16px] text-ink-2" role="status">
            {t('planner.aboutDays', { days: needed, km: plan.kmPerDay })}
          </p>
        )}

        <details className="mt-16 rounded-input border border-rule bg-paper px-16 py-12">
          <summary className="min-h-[32px] cursor-pointer text-[17px] text-ink" style={{ fontWeight: 500 }}>
            <span>{t('planner.adjust')}</span>
            <span className="ml-8 text-[16px] text-muted" style={{ fontWeight: 400 }}>
              {t('planner.summary', { km: plan.kmPerDay, gems: plan.gemsEnabled ? t('planner.gemsADay', { count: plan.gemsPerDay }) : t('planner.noGems'), stays: plan.stayTypes.map((s) => t(`stay.${s}`).toLowerCase()).join(` ${t('planner.or')} `) })}
            </span>
          </summary>
        <div className="mt-16 grid gap-16">
          <SliderField label={t('planner.kmADay')} unit="km" value={plan.kmPerDay} min={KM_PER_DAY.min} max={KM_PER_DAY.max} step={KM_PER_DAY.step} onChange={(v) => set('kmPerDay', v)} />
          {plan.gemsEnabled && (
            <SliderField label={t('planner.gemsADayLabel')} value={plan.gemsPerDay} min={GEMS_PER_DAY.min} max={GEMS_PER_DAY.max} onChange={(v) => set('gemsPerDay', v)} />
          )}
        </div>

        <div className="mt-16 flex items-center justify-between gap-12 rounded-input border border-rule bg-paper px-16 py-12">
          <span className="text-ink" style={{ fontWeight: 500 }}>{t('planner.roadGems')}</span>
          <Switch checked={plan.gemsEnabled} label={t('planner.roadGems')} onChange={(v) => set('gemsEnabled', v)} />
        </div>
        {!plan.gemsEnabled && <p className="mt-[6px] text-[15px] text-muted">{t('planner.justRoute')}</p>}

        <p className="mt-16 text-[16px] text-muted" style={{ fontWeight: 500 }}>{t('planner.sleepIn')}</p>
        <div role="group" aria-label={t('planner.whereSleep')} className="mt-8 flex flex-wrap gap-8">
          {STAYS.map((s) => (
            <Toggle key={s} pressed={plan.stayTypes.includes(s)} onChange={() => toggleStay(s)}>{t(`stay.${s}`)}</Toggle>
          ))}
        </div>

        <div role="group" aria-label={t('planner.filters')} className="mt-12 flex flex-wrap gap-8">
          {QUICK_FILTERS.map((id) => (
            <Toggle key={id} pressed={plan.filters.includes(id)} onChange={() => toggleFilter(id)}>{t(`filter.${id}`)}</Toggle>
          ))}
          <button type="button" onClick={() => setSheetOpen(true)} className="min-h-[48px] rounded-btn border border-ink px-16 text-[17px] text-ink" style={{ fontWeight: 500 }}>
            {extraFilters ? t('planner.allFiltersOn', { count: extraFilters }) : t('planner.allFilters')}
          </button>
        </div>
        </details>

        {asking && tooShort ? (
          <div className="mt-20 grid gap-8 sm:grid-cols-2">
            <Button type="button" variant="primary" className="w-full" disabled={busy} onClick={() => finish(Math.min(30, needed))}>
              {t('planner.planInDays', { days: Math.min(30, needed) })}
            </Button>
            <Button type="button" className="w-full" disabled={busy} onClick={() => finish(plan.days)}>
              {t('planner.keepDays', { days: plan.days })}
            </Button>
          </div>
        ) : (
          <Button type="submit" variant="primary" className="mt-20 w-full" disabled={busy || checking}>
            {busy ? t('planner.planning') : checking ? t('planner.checking') : t('planner.planMyTrip')}
          </Button>
        )}
      </form>
      <FiltersSheet open={sheetOpen} selected={plan.filters} onChange={(f) => set('filters', f)} onClose={() => setSheetOpen(false)} />
    </Panel>
  );
}
