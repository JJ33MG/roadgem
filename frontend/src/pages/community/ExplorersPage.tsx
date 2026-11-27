import { usePageTitle } from '@/hooks/usePageTitle';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { board as loadBoard, mine, type BoardPeriod, type BoardRow, type MyPosts } from '@/lib/community';
import { useTranslation } from 'react-i18next';
import { countryName, formatNumber } from '@/i18n/format';

const head = { fontWeight: 400, letterSpacing: '-0.035em' } as const;
const TABS: { id: BoardPeriod; label: string; word: string }[] = [
  { id: 'week', label: 'cm.week', word: 'ex.wordWeek' },
  { id: 'month', label: 'ex.month', word: 'ex.wordMonth' },
  { id: 'all', label: 'ex.all', word: 'ex.wordAll' },
];
/** Countries to filter on: the English name is what the server matches; the list shows it in the traveller's language. */
const COUNTRIES = [['AT', 'Austria'], ['BE', 'Belgium'], ['HR', 'Croatia'], ['CZ', 'Czechia'], ['FR', 'France'], ['DE', 'Germany'], ['GR', 'Greece'], ['IT', 'Italy'], ['NL', 'Netherlands'], ['NO', 'Norway'], ['PT', 'Portugal'], ['SI', 'Slovenia'], ['ES', 'Spain'], ['CH', 'Switzerland']].map(([code, name]) => ({ code, name }));
const n = (x: number) => formatNumber(x);

/** The explorers board: who posts the moments travellers like and put in their trips. */
export function ExplorersPage() {
  const { t } = useTranslation();
  usePageTitle(t('cm.topExplorers'));
  const { user } = useAuth();
  const countryId = useId();
  const [period, setPeriod] = useState<BoardPeriod>('week');
  const [country, setCountry] = useState('');
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [me, setMe] = useState<MyPosts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    loadBoard({ period, country }).then(setRows).catch((e: Error) => setError(e.message));
  }, [period, country]);
  useEffect(() => {
    if (user) mine(period).then(setMe).catch(() => setMe(null));
  }, [user, period]);

  const word = t(TABS.find((tab) => tab.id === period)!.word);

  return (
    <section className="mx-auto max-w-[720px] px-16 py-40 md:py-[64px]">
      <Link to="/community" className="text-[16px]">{t('ex.back')}</Link>
      <h1 className="mt-12 font-display text-[44px] leading-[1.04] text-ink md:text-[56px]" style={head}>{t('cm.topExplorers')}</h1>

      <div className="mt-24 flex flex-wrap items-center justify-between gap-12">
        <div role="tablist" aria-label={t('ex.period')} className="cm-tabs">
          {TABS.map((tab) => (
            <button key={tab.id} role="tab" type="button" className="cm-tab" aria-selected={period === tab.id} onClick={() => setPeriod(tab.id)}>{t(tab.label)}</button>
          ))}
        </div>
        <label htmlFor={countryId} className="flex items-center gap-8 text-[15px] text-muted">
          {t('ex.where')}
          <select id={countryId} className="min-h-[40px] rounded-input border border-rule bg-paper px-12 text-[16px] text-ink" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t('ex.allEurope')}</option>
            {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{countryName(c.code)}</option>)}
          </select>
        </label>
      </div>

      {me && (
        <div className="cm-me mt-24">
          <div className="flex items-center gap-12">
            <span className="cm-avatar" aria-hidden="true">{(me.name.trim()[0] ?? 'Y').toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block text-ink" style={{ fontWeight: 600 }}>{t('ex.you')}</span>
              <span className="block text-[15px] text-muted">
                {me.rank ? (me.toTop10 > 0 ? t('ex.rankLine', { rank: me.rank, period: word, points: n(me.toTop10) }) : t('ex.inTop10', { rank: me.rank, period: word })) : t('ex.join', { period: word })}
              </span>
            </span>
            <span className="ml-auto font-display text-[32px] text-ink num" style={head}>{n(me.points)}</span>
          </div>
          <div className="cm-me-stats">
            <div><b>{n(me.moments)}</b><span>{t('ex.moments')}</span></div>
            <div><b>{n(me.likes)}</b><span>{t('ex.likes')}</span></div>
            <div><b>{n(me.inTrips)}</b><span>{t('ex.tripsUse')}</span></div>
          </div>
        </div>
      )}

      {error && <p className="mt-16 text-error" role="alert">{error}</p>}
      {rows === null && !error && <p className="mt-24" role="status">{t('ex.loading')}</p>}
      {rows?.length === 0 && <p className="mt-24 text-[19px]">{t('ex.nobody', { period: word })}</p>}
      <ol className="cm-board mt-24">
        {rows?.map((r) => (
          <li key={r.userId} className={`cm-row${r.rank <= 3 ? ' is-top' : ''}`}>
            <span className="cm-row-n">{r.rank}</span>
            <span className="cm-avatar" aria-hidden="true">{(r.name.trim()[0] ?? '?').toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block text-ink" style={{ fontWeight: 500 }}>{r.name}</span>
              <span className="block text-[14px] text-muted">{t('ex.row', { count: r.moments, trips: r.inTrips })}</span>
            </span>
            <span className="cm-row-pts">{n(r.points)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-24 text-[15px] text-muted">{t('ex.points')}</p>
      <p className="mt-8 text-[15px] text-ink" style={{ fontWeight: 500 }}>{t('ex.prize')}</p>
    </section>
  );
}
