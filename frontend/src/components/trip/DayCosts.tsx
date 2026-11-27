import { dayCost, euros } from '@/lib/costs';
import type { TripCosts } from '@/types';
import { DayBlock } from './DayBlock';
import { formatDate } from '@/i18n/format';
import { useTranslation } from 'react-i18next';

const FUELS = new Set(['car', 'ev', 'campervan', 'caravan']);
const NIGHTS = new Set(['campsite', 'hotel', 'holiday_home']);

type Props = { day: number; costs: TripCosts; fromLeg: number; toLeg: number; withNight: boolean; vehicle?: string; stay?: string };

/** What one day costs: fuel or charging, tolls, vignettes, the night, and what to arrange before a border. */
export function DayCosts({ day, costs, fromLeg, toLeg, withNight, vehicle = 'car', stay = 'hotel' }: Props) {
  const { t } = useTranslation();
  const c = dayCost(costs, fromLeg, toLeg, withNight);
  const row = (label: string, value: number) => (
    <div key={label} className="flex items-baseline justify-between gap-12 border-t border-rule py-8 first:border-t-0">
      <span>{label}</span>
      <span className="num text-ink" style={{ fontWeight: 500 }}>{euros(value)}</span>
    </div>
  );
  return (
    <DayBlock kind="cost" id="day-cost" title={t('costs.title')} label={t('costs.label', { n: day })} meta={t('costs.estimate')}>
      <div>
        {c.fuel > 0 && row(t(FUELS.has(vehicle) ? `costs.fuel.${vehicle}` : 'costs.fuel.other'), c.fuel)}
        {c.tolls > 0 && row(t('costs.tolls'), c.tolls)}
        {c.vignettes.map((v) => row(t(`vignette.${v.country}`, { defaultValue: v.label }), v.price))}
        {c.overnight > 0 && row(t(NIGHTS.has(stay) ? `costs.night.${stay}` : 'costs.night.other'), c.overnight)}
        <div className="flex items-baseline justify-between gap-12 border-t border-ink py-8">
          <span className="text-ink" style={{ fontWeight: 500 }}>{t('costs.dayTotal')}</span>
          <span className="num text-[20px] text-ink" style={{ fontWeight: 500 }}>{euros(c.total)}</span>
        </div>
      </div>
      {c.warnings.length > 0 && (
        <ul className="grid gap-8 p-0" style={{ listStyle: 'none' }}>
          {c.warnings.map((w) => <li key={w.text} className="rounded-part bg-paper-2 px-12 py-8 text-[16px] text-ink-2">{w.country ? t(`costWarning.${w.country}`, { defaultValue: w.text }) : w.text}</li>)}
        </ul>
      )}
      <p className="text-[15px] text-muted">{t('costs.pricesOf', { date: formatDate(costs.updated) })}</p>
    </DayBlock>
  );
}
