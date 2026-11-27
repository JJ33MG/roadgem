import { usePageTitle } from '@/hooks/usePageTitle';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { feed as loadFeed, like, type FeedItem, type FeedPeriod } from '@/lib/community';
import { MomentCard } from '@/components/community/MomentCard';
import { AddToTrip } from '@/components/community/AddToTrip';
import { useTranslation } from 'react-i18next';

const head = { fontWeight: 400, letterSpacing: '-0.035em' } as const;
const TABS: { id: FeedPeriod; label: string }[] = [
  { id: 'today', label: 'cm.today' },
  { id: 'week', label: 'cm.week' },
  { id: 'route', label: 'cm.route' },
];

/** The community feed: moments travellers posted near gems, the most liked first. */
export function CommunityPage() {
  const { t } = useTranslation();
  usePageTitle(t('cm.title'));
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<FeedPeriod>('week');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<FeedItem | null>(null);

  useEffect(() => {
    if (period === 'route' && !user) {
      setItems([]);
      return;
    }
    let live = true;
    setError(null);
    loadFeed({ period, page })
      .then((got) => {
        if (!live) return;
        setItems((all) => (page === 0 ? got : [...(all ?? []), ...got]));
        setMore(got.length === 20);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [period, page, user]);

  function choose(p: FeedPeriod) {
    setPeriod(p);
    setPage(0);
    setItems(null);
  }

  async function toggle(item: FeedItem) {
    if (!user) return navigate('/login?next=/community');
    try {
      const r = await like(item.id);
      setItems((all) => all?.map((x) => (x.id === item.id ? { ...x, likedByMe: r.liked, likes: r.likes } : x)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const add = useCallback((item: FeedItem) => {
    if (!user) return navigate('/login?next=/community');
    setAdding(item);
  }, [user, navigate]);

  return (
    <section className="mx-auto max-w-[1120px] px-16 py-40 md:px-40 md:py-[64px]">
      <div className="flex flex-wrap items-end justify-between gap-16">
        <div>
          <h1 className="font-display text-[44px] leading-[1.04] text-ink md:text-[60px]" style={head}>{t('cm.title')}</h1>
          <p className="mt-12 max-w-[46ch] text-[19px]">{t('cm.lead')}</p>
        </div>
        <div className="flex flex-wrap gap-12">
          <Link to="/community/explorers" className="btn-header no-underline">{t('cm.topExplorers')}</Link>
          <Link to={user ? '/community/post' : '/login?next=/community/post'} className="btn-primary no-underline">{t('cm.post')}</Link>
        </div>
      </div>

      <div role="tablist" aria-label={t('cm.moments')} className="cm-tabs mt-32">
        {TABS.map((tab) => (
          <button key={tab.id} role="tab" type="button" className="cm-tab" aria-selected={period === tab.id} onClick={() => choose(tab.id)}>{t(tab.label)}</button>
        ))}
      </div>
      {error && <p className="mt-16 text-error" role="alert">{error}</p>}

      <div role="tabpanel" aria-label={t(TABS.find((tab) => tab.id === period)?.label ?? 'cm.week')} className="mt-24">
        {period === 'route' && !user && (
          <p className="text-[19px]"><Link to="/login?next=/community">{t('cm.signIn')}</Link> {t('cm.signInRest')}</p>
        )}
        {items === null && !error && <p role="status">{t('cm.loading')}</p>}
        {items?.length === 0 && (period !== 'route' || user) && <p className="text-[19px]">{t(`cm.empty.${period}`)}</p>}
        <ul className="cm-feed">
          {items?.map((item) => (
            <li key={item.id}><MomentCard item={item} onLike={toggle} onAdd={add} /></li>
          ))}
        </ul>
        {more && <button type="button" className="btn-header mt-32" onClick={() => setPage((p) => p + 1)}>{t('cm.more')}</button>}
      </div>

      {adding && (
        <AddToTrip
          item={adding}
          onClose={() => setAdding(null)}
          onAdded={(inTrips) => setItems((all) => all?.map((x) => (x.gem.id === adding.gem.id ? { ...x, inTrips } : x)) ?? null)}
        />
      )}
    </section>
  );
}
