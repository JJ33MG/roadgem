import { usePageTitle } from '@/hooks/usePageTitle';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Panel } from '@/components/ui';
import { board as loadBoard, feed as loadFeed, like, mine, photoSrc, type BoardRow, type FeedItem, type MyPosts, monthly, gemsOfTheWeek, type WeekGem } from '@/lib/community';

const head = { fontWeight: 400, letterSpacing: '-0.035em' } as const;
type Tab = 'feed' | 'board';

/** The community: photos from gems with likes, and the explorers board. */
export function CommunityPage() {
  usePageTitle('Explorers');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('feed');
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [me, setMe] = useState<MyPosts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [week, setWeek] = useState<WeekGem[]>([]);

  useEffect(() => {
    loadFeed().then(setItems).catch((e: Error) => setError(e.message));
    monthly().then((m) => setMonth(m.challenge)).catch(() => undefined);
    gemsOfTheWeek().then(setWeek).catch(() => setWeek([]));
  }, []);
  useEffect(() => {
    if (tab === 'board' && !rows) loadBoard().then(setRows).catch((e: Error) => setError(e.message));
  }, [tab, rows]);
  useEffect(() => {
    if (user) mine().then(setMe).catch(() => setMe(null));
  }, [user]);

  async function toggle(item: FeedItem) {
    if (!user) return navigate('/login?next=/community');
    try {
      const r = await like(item.id);
      setItems((all) => all?.map((x) => (x.id === item.id ? { ...x, likedByMe: r.liked, likes: r.likes } : x)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const tabClass = (t: Tab) =>
    `min-h-[48px] rounded-btn border px-20 text-[17px] ${tab === t ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink'}`;

  return (
    <section className="mx-auto max-w-[1040px] px-16 py-40 md:px-40 md:py-[64px]">
      <div className="flex flex-wrap items-end justify-between gap-16">
        <div>
          <h1 className="font-display text-[44px] leading-[1.04] text-ink md:text-[60px]" style={head}>Explorers</h1>
          <p className="mt-12 max-w-[46ch] text-[19px]">Photos from gems on the road. Take one on the spot, do the challenge, climb the board.</p>
        </div>
        <Link to="/community/suggest" className="btn-primary no-underline">Suggest a new gem</Link>
      </div>

      {week.length > 0 && (
        <section aria-labelledby="week-head" className="mt-32">
          <h2 id="week-head" className="font-display text-[28px] text-ink" style={head}>Gems of the week</h2>
          <p className="mt-6 text-[17px] text-muted">Real places from Routify's gem library, each with its Google rating.</p>
          <ul className="mt-16 grid gap-12 p-0 sm:grid-cols-2 lg:grid-cols-4" style={{ listStyle: 'none' }}>
            {week.map((g) => (
              <li key={g.placeId} className="grid gap-4 rounded-part border border-rule bg-paper p-16">
                {g.photoUrl && <img src={photoSrc(g.photoUrl)} alt={g.name} loading="lazy" width={480} height={300} className="mb-8 aspect-[16/10] w-full rounded-part object-cover" />}
                <span className="text-ink" style={{ fontWeight: 500 }}>{g.name}</span>
                <span className="text-[16px] text-muted">{g.address}</span>
                <span className="text-[16px]">{`Rated ${g.rating.toFixed(1)} by ${g.reviews.toLocaleString('en')} Google reviewers`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {month && (
        <Panel className="mt-24">
          <h2 className="font-display text-[26px] text-ink" style={head}>Challenge of the month</h2>
          <p className="mt-6 text-[19px] text-ink">{month}</p>
          <p className="mt-6 text-[16px] text-muted">For Plus members: the best photo of the month wins a prize.</p>
        </Panel>
      )}

      {me && (
        <Panel className="mt-24 flex flex-wrap items-center justify-between gap-12">
          <p className="text-[19px] text-ink" style={{ fontWeight: 500 }}>
            {`You have ${me.points} points${me.rank ? `, place ${me.rank}` : ''}.`}
          </p>
          <span className="flex flex-wrap gap-12">
            {me.posts.some((p) => p.status === 'pending') && <span className="text-[16px] text-muted">{`${me.posts.filter((p) => p.status === 'pending').length} photo waiting for a check`}</span>}
            {me.moderator && <Link to="/community/moderate" className="text-ink">Check new photos</Link>}
          </span>
        </Panel>
      )}

      <div role="tablist" aria-label="Community" className="mt-32 flex gap-8">
        <button role="tab" type="button" aria-selected={tab === 'feed'} className={tabClass('feed')} onClick={() => setTab('feed')}>Feed</button>
        <button role="tab" type="button" aria-selected={tab === 'board'} className={tabClass('board')} onClick={() => setTab('board')}>Explorers board</button>
      </div>
      {error && <p className="mt-16 text-error" role="alert">{error}</p>}

      {tab === 'feed' && (
        <div role="tabpanel" aria-label="Feed" className="mt-24">
          {items === null && !error && <p role="status">Loading the feed</p>}
          {items?.length === 0 && (
            <p className="text-[19px]">No photos yet. Open a trip, stop at a gem and be the first to post one.</p>
          )}
          <ul className="grid gap-24 p-0 md:grid-cols-2" style={{ listStyle: 'none' }}>
            {items?.map((item) => (
              <li key={item.id} className="card overflow-hidden p-0">
                <img src={photoSrc(item.photoUrl)} alt={`${item.gem.name}, photo by ${item.by}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <div className="grid gap-6 p-16">
                  <h2 className="font-display text-[24px] text-ink" style={head}>{item.gem.name}</h2>
                  {item.team ? (
                    <p className="text-[16px] text-accent" style={{ fontWeight: 500 }}>Routify team</p>
                  ) : (
                    <p className="text-[16px] text-muted">{`By ${item.by}${item.gem.address ? `, ${item.gem.address}` : ''}`}</p>
                  )}
                  {item.caption && <p>{item.caption}</p>}
                  <div className="mt-6 flex items-center justify-between gap-12">
                    <span className="text-[16px] text-ink" style={{ fontWeight: 500 }}>{item.challenge ? 'Challenge done' : `${item.points} points`}</span>
                    <button
                      type="button"
                      aria-pressed={item.likedByMe}
                      aria-label={`${item.likedByMe ? 'Unlike' : 'Like'}, ${item.likes} likes`}
                      onClick={() => toggle(item)}
                      className={`min-h-[48px] rounded-btn border px-16 text-[17px] ${item.likedByMe ? 'border-accent bg-accent text-paper' : 'border-rule bg-paper text-ink'}`}
                    >
                      {`${item.likedByMe ? 'Liked' : 'Like'} ${item.likes}`}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'board' && (
        <div role="tabpanel" aria-label="Explorers board" className="mt-24">
          {rows === null && !error && <p role="status">Loading the board</p>}
          {rows?.length === 0 && <p className="text-[19px]">Nobody on the board yet. The first approved photo puts you on it.</p>}
          <ol className="m-0 p-0" style={{ listStyle: 'none' }}>
            {rows?.map((r) => (
              <li key={r.userId} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-baseline gap-16 border-t border-rule py-16">
                <span className="num font-display text-[28px] text-ink" style={head}>{r.rank}</span>
                <span>
                  <span className="block text-[20px] text-ink" style={{ fontWeight: 500 }}>{r.name}</span>
                  <span className="block text-[16px] text-muted">{`${r.photos} photos${r.gems ? `, ${r.gems} gems found` : ''}`}</span>
                </span>
                <span className="num text-[20px] text-ink" style={{ fontWeight: 500 }}>{`${r.points} points`}</span>
              </li>
            ))}
          </ol>
          <p className="mt-16 text-[16px] text-muted">Photo at a gem 10 points, done challenge 50, a gem you found that turns official 200.</p>
        </div>
      )}
    </section>
  );
}
