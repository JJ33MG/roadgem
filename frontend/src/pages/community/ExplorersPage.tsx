import { usePageTitle } from '@/hooks/usePageTitle';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { board as loadBoard, mine, type BoardPeriod, type BoardRow, type MyPosts } from '@/lib/community';

const head = { fontWeight: 400, letterSpacing: '-0.035em' } as const;
const TABS: { id: BoardPeriod; label: string; word: string }[] = [
  { id: 'week', label: 'This week', word: 'this week' },
  { id: 'month', label: 'This month', word: 'this month' },
  { id: 'all', label: 'All time', word: 'of all time' },
];
const COUNTRIES = ['Austria', 'Belgium', 'Croatia', 'Czechia', 'France', 'Germany', 'Greece', 'Italy', 'Netherlands', 'Norway', 'Portugal', 'Slovenia', 'Spain', 'Switzerland'];
const n = (x: number) => x.toLocaleString('en');

/** The explorers board: who posts the moments travellers like and put in their trips. */
export function ExplorersPage() {
  usePageTitle('Top explorers');
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

  const word = TABS.find((t) => t.id === period)!.word;

  return (
    <section className="mx-auto max-w-[720px] px-16 py-40 md:py-[64px]">
      <Link to="/community" className="text-[16px]">Back to the community</Link>
      <h1 className="mt-12 font-display text-[44px] leading-[1.04] text-ink md:text-[56px]" style={head}>Top explorers</h1>

      <div className="mt-24 flex flex-wrap items-center justify-between gap-12">
        <div role="tablist" aria-label="Period" className="cm-tabs">
          {TABS.map((t) => (
            <button key={t.id} role="tab" type="button" className="cm-tab" aria-selected={period === t.id} onClick={() => setPeriod(t.id)}>{t.label}</button>
          ))}
        </div>
        <label htmlFor={countryId} className="flex items-center gap-8 text-[15px] text-muted">
          Where
          <select id={countryId} className="min-h-[40px] rounded-input border border-rule bg-paper px-12 text-[16px] text-ink" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All of Europe</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {me && (
        <div className="cm-me mt-24">
          <div className="flex items-center gap-12">
            <span className="cm-avatar" aria-hidden="true">{(me.name.trim()[0] ?? 'Y').toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block text-ink" style={{ fontWeight: 600 }}>You</span>
              <span className="block text-[15px] text-muted">
                {me.rank ? `#${me.rank} ${word}${me.toTop10 > 0 ? ` · ${n(me.toTop10)} points to #10` : ' · in the top 10'}` : `Post a moment to join the board ${word}.`}
              </span>
            </span>
            <span className="ml-auto font-display text-[32px] text-ink num" style={head}>{n(me.points)}</span>
          </div>
          <div className="cm-me-stats">
            <div><b>{n(me.moments)}</b><span>moments</span></div>
            <div><b>{n(me.likes)}</b><span>likes</span></div>
            <div><b>{n(me.inTrips)}</b><span>trips use your gems</span></div>
          </div>
        </div>
      )}

      {error && <p className="mt-16 text-error" role="alert">{error}</p>}
      {rows === null && !error && <p className="mt-24" role="status">Loading the board</p>}
      {rows?.length === 0 && <p className="mt-24 text-[19px]">{`Nobody on the board ${word} yet. Your first moment puts you on it.`}</p>}
      <ol className="cm-board mt-24">
        {rows?.map((r) => (
          <li key={r.userId} className={`cm-row${r.rank <= 3 ? ' is-top' : ''}`}>
            <span className="cm-row-n">{r.rank}</span>
            <span className="cm-avatar" aria-hidden="true">{(r.name.trim()[0] ?? '?').toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block text-ink" style={{ fontWeight: 500 }}>{r.name}</span>
              <span className="block text-[14px] text-muted">{`${r.moments} ${r.moments === 1 ? 'moment' : 'moments'} · in ${r.inTrips} ${r.inTrips === 1 ? 'trip' : 'trips'}`}</span>
            </span>
            <span className="cm-row-pts">{n(r.points)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-24 text-[15px] text-muted">Points: 10 for a moment, 1 for every like, 25 each time someone puts your gem in their trip. A photo challenge at the gem is 50, a new gem that turns official 200.</p>
      <p className="mt-8 text-[15px] text-ink" style={{ fontWeight: 500 }}>The best explorer of each month wins a year of RoamGem Plus.</p>
    </section>
  );
}
