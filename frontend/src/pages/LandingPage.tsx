import { usePageTitle } from '@/hooks/usePageTitle';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';

/** The example route on the homepage: real places, example distances. */
const EXAMPLE_DAYS = [
  { from: 'Madrid', to: 'Burgos', km: 245, note: 'landing.day1' },
  { from: 'Burgos', to: 'San Sebastián', km: 240, note: 'landing.day2' },
  { from: 'San Sebastián', to: 'Bordeaux', km: 235, note: 'landing.day3' },
  { from: 'Bordeaux', to: 'Tours', km: 345, note: 'landing.day4' },
  { from: 'Tours', to: 'Brussels', km: 515, note: 'landing.day5' },
];

/** What every gem passes before it shows up on a trip. */
const CHECKS = [1, 2, 3].map((n) => ({ title: `landing.check${n}Title`, body: `landing.check${n}Body` }));

const wrap = 'mx-auto max-w-[1240px] px-16 md:px-40';

export function LandingPage() {
  usePageTitle();
  const { t } = useTranslation();
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
                {t('landing.title')}
              </h1>
              <p className="mt-20 max-w-[34ch] text-[20px] leading-[1.45] text-band-ink md:text-[22px]" style={{ opacity: 0.88 }}>
                {t('landing.lead')}
              </p>
              <Link to="/plan" className="btn-primary mt-[32px] min-h-[56px] px-[32px] text-[19px] no-underline">
                {t('landing.cta')}
              </Link>
              <p className="mt-12 text-[16px] text-band-ink" style={{ opacity: 0.75 }}>{t('landing.ctaNote')}</p>
            </div>
            <img
              src="/photos/road.jpg"
              alt={t('landing.heroAlt')}
              width={1280}
              height={851}
              className="aspect-[4/3] w-full rounded-card object-cover"
              style={{ filter: 'sepia(0.1) saturate(0.92)' }}
            />
          </div>
        </div>
      </section>

      <section className={`${wrap} grid gap-[48px] py-80 lg:grid-cols-2`}>
        <div>
          <h2 className="font-display text-[36px] leading-[1.08] text-ink md:text-[52px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>
            {t('landing.daysTitle')}
          </h2>
          <p className="mt-16 max-w-[38ch] text-[19px]">
            {t('landing.daysLead')}
          </p>
          <img src="/photos/burgos.jpg" alt={t('landing.burgosAlt')} width={1280} height={1280} loading="lazy" className="mt-[28px] aspect-[4/3] w-full rounded-card object-cover" style={{ filter: 'sepia(0.14) saturate(0.9)' }} />
        </div>
        <ol className="m-0 list-none p-0">
          {EXAMPLE_DAYS.map((d, i) => (
            <li key={d.from} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-24 gap-y-4 border-t border-rule py-20 ${i === EXAMPLE_DAYS.length - 1 ? 'border-b' : ''}`}>
              <span className="font-display text-[24px] text-ink md:text-[28px]" style={{ fontWeight: 400, letterSpacing: '-0.02em' }}>{t('landing.routeTo', { from: d.from, to: d.to })}</span>
              <span className="num font-display text-[24px] text-ink md:text-[28px]" style={{ fontWeight: 400 }}>{formatNumber(d.km)} km</span>
              <span className="text-[18px]">{t(d.note)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${wrap} pb-80`}>
        <h2 className="max-w-[20ch] font-display text-[36px] leading-[1.08] text-ink md:text-[52px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>
          {t('landing.checksTitle')}
        </h2>
        <p className="mt-16 max-w-[52ch] text-[19px]">
          {t('landing.checksLead')}
        </p>
        <ol className="mt-[36px] grid list-none gap-24 p-0 md:grid-cols-3">
          {CHECKS.map((c, i) => (
            <li key={c.title} className="border-t border-ink pt-16">
              <span className="num font-display text-[28px] text-ink" style={{ fontWeight: 400 }}>{i + 1}</span>
              <h3 className="mt-8 font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>{t(c.title)}</h3>
              <p className="mt-[6px]">{t(c.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${wrap} pb-[96px]`}>
        <h2 className="max-w-[18ch] font-display text-[36px] leading-[1.08] text-ink md:text-[52px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>
          {t('landing.challengeTitle')}
        </h2>
        <p className="mt-16 max-w-[52ch] text-[19px]">{t('landing.challengeLead')}</p>
        <div className="mt-[36px] grid gap-24 md:grid-cols-3">
          <article className="card">
            <img src="/photos/sansebastian.jpg" alt={t('landing.sanSebAlt')} width={960} height={674} loading="lazy" className="aspect-[4/3] w-full rounded-part object-cover" />
            <h3 className="mt-16 font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>{t('landing.challengeCardTitle')}</h3>
            <p className="mt-[6px]">{t('landing.challengeCardBody')}</p>
          </article>
          <article className="card">
            <img src="/photos/amboise.jpg" alt={t('landing.amboiseAlt')} width={1280} height={975} loading="lazy" className="aspect-[4/3] w-full rounded-part object-cover" />
            <h3 className="mt-16 font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>{t('landing.postedTitle')}</h3>
            <p className="mt-[6px]">{t('landing.postedBody')}</p>
          </article>
          <article className="card flex flex-col justify-between gap-20">
            <div>
              <h3 className="font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>{t('landing.newGemTitle')}</h3>
              <p className="mt-8">{t('landing.newGemBody')}</p>
            </div>
            <Link to="/community/suggest" className="btn-primary no-underline">{t('landing.newGemCta')}</Link>
          </article>
        </div>
      </section>
    </>
  );
}
