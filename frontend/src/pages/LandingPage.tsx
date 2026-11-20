import { Link } from 'react-router-dom';
import { TripPlanner } from '@/components/planner/TripPlanner';

/** The example route on the homepage: real places, example distances. */
const EXAMPLE_DAYS = [
  { route: 'Madrid to Burgos', km: 245, note: 'Lerma and Covarrubias on the way' },
  { route: 'Burgos to San Sebastián', km: 240, note: 'Hondarribia harbour before dinner' },
  { route: 'San Sebastián to Bordeaux', km: 235, note: 'The water mirror at night' },
  { route: 'Bordeaux to Tours', km: 345, note: 'Amboise castle above the Loire' },
  { route: 'Tours to Brussels', km: 515, note: 'Arrive on the Grand-Place' },
];

const wrap = 'mx-auto max-w-[1240px] px-16 md:px-40';

export function LandingPage() {
  return (
    <>
      <section className="mx-auto mt-16 max-w-[1240px] px-16 md:px-24">
        <div className="relative overflow-hidden rounded-card bg-band">
          <svg aria-hidden="true" viewBox="0 0 1600 700" preserveAspectRatio="none" className="road-lines absolute inset-0 h-full w-[calc(100%+120px)]">
            <path d="M-40 560 C240 520 420 610 700 540 S1160 420 1640 470" stroke="var(--color-accent-soft)" strokeOpacity="0.35" strokeWidth="2" fill="none" />
            <path d="M-40 600 C260 560 460 640 760 580 S1200 470 1640 520" stroke="var(--color-accent-soft)" strokeOpacity="0.3" strokeWidth="1" fill="none" />
            <path d="M-40 640 C280 610 500 670 820 620 S1240 520 1640 570" stroke="var(--color-accent-soft)" strokeOpacity="0.25" strokeWidth="1" fill="none" />
          </svg>
          <div className="relative grid gap-40 px-16 py-40 md:px-40 md:py-[64px] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-center">
            <div>
              <h1 className="max-w-[12ch] font-display text-[44px] leading-[1.04] text-band-ink md:text-[76px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>
                Your road trip, set just right.
              </h1>
              <p className="mt-20 max-w-[34ch] text-[20px] leading-[1.45] text-band-ink md:text-[22px]" style={{ opacity: 0.88 }}>
                Set the pace and the detours. Routify plans the days, beds and gems.
              </p>
            </div>
            <div>
              <TripPlanner />
            </div>
          </div>
        </div>
      </section>

      <section className={`${wrap} grid gap-[48px] py-80 lg:grid-cols-2`}>
        <div>
          <h2 className="font-display text-[36px] leading-[1.08] text-ink md:text-[52px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>
            Five days, set by you
          </h2>
          <p className="mt-16 max-w-[38ch] text-[19px]">
            An example route from Madrid to Brussels at about 350 km a day, a bed waiting at the end of each one.
          </p>
          <img src="/photos/burgos.jpg" alt="The west front of Burgos Cathedral" width={1280} height={1280} loading="lazy" className="mt-[28px] aspect-[4/3] w-full rounded-card object-cover" style={{ filter: 'sepia(0.14) saturate(0.9)' }} />
        </div>
        <ol className="m-0 list-none p-0">
          {EXAMPLE_DAYS.map((d, i) => (
            <li key={d.route} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-24 gap-y-4 border-t border-rule py-20 ${i === EXAMPLE_DAYS.length - 1 ? 'border-b' : ''}`}>
              <span className="font-display text-[24px] text-ink md:text-[28px]" style={{ fontWeight: 400, letterSpacing: '-0.02em' }}>{d.route}</span>
              <span className="num font-display text-[24px] text-ink md:text-[28px]" style={{ fontWeight: 400 }}>{d.km} km</span>
              <span className="text-[18px]">{d.note}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${wrap} pb-[96px]`}>
        <h2 className="max-w-[18ch] font-display text-[36px] leading-[1.08] text-ink md:text-[52px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>
          Snap the challenge, earn your points.
        </h2>
        <p className="mt-16 max-w-[52ch] text-[19px]">Every gem has a photo challenge. Take it on the spot, post it, and climb the explorers board.</p>
        <div className="mt-[36px] grid gap-24 md:grid-cols-3">
          <article className="card">
            <img src="/photos/sansebastian.jpg" alt="San Sebastián city hall among palm trees" width={960} height={674} loading="lazy" className="aspect-[4/3] w-full rounded-part object-cover" />
            <h3 className="mt-16 font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>Challenge: the clock towers</h3>
            <p className="mt-[6px]">Both towers of the city hall in one shot. 50 points.</p>
          </article>
          <article className="card">
            <img src="/photos/amboise.jpg" alt="The royal castle of Amboise" width={1280} height={975} loading="lazy" className="aspect-[4/3] w-full rounded-part object-cover" />
            <h3 className="mt-16 font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>Posted by a traveller</h3>
            <p className="mt-[6px]">Amboise castle, checked in on the spot. Others can like it.</p>
          </article>
          <article className="card flex flex-col justify-between gap-20">
            <div>
              <h3 className="font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>Found a new gem?</h3>
              <p className="mt-8">Pin it with a photo. When enough travellers visit, it turns official with your name on it.</p>
            </div>
            <Link to="/community/suggest" className="btn-primary no-underline">Share a gem</Link>
          </article>
        </div>
      </section>
    </>
  );
}
