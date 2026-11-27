import { photoSrc, type FeedItem } from '@/lib/community';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();
const ago = (iso: string, now = Date.now()) => {
  const h = Math.max(0, Math.round((now - new Date(iso).getTime()) / 3_600_000));
  if (h < 1) return i18n.t('cm.justNow');
  if (h < 24) return i18n.t('cm.hoursAgo', { count: h });
  const d = Math.round(h / 24);
  return d === 1 ? i18n.t('cm.yesterday') : i18n.t('cm.daysAgo', { count: d });
};

/** One moment in the feed: who, the photo with the gem it is near, likes and "Add to my trip". */
export function MomentCard({ item, onLike, onAdd }: { item: FeedItem; onLike: (item: FeedItem) => void; onAdd: (item: FeedItem) => void }) {
  const { t } = useTranslation();
  return (
    <article className="cm-moment">
      <div className="cm-who">
        <span className={`cm-avatar${item.team ? ' is-team' : ''}`} aria-hidden="true">{item.team ? 'R' : initial(item.by)}</span>
        <span>
          <span className="cm-who-name">{item.team ? t('cm.team') : item.by}</span>
          <span className="cm-who-meta" style={{ display: 'block' }}>
            {item.team && item.rating ? t('cm.teamRated', { rating: item.rating.toFixed(1) }) : ago(item.createdAt)}
          </span>
        </span>
        {item.rank && !item.team ? <span className="cm-rank">{t('cm.rank', { rank: item.rank })}</span> : null}
      </div>
      <div className="cm-photo">
        <img src={photoSrc(item.photoUrl)} alt={t('cm.photoAlt', { gem: item.gem.name, by: item.team ? t('cm.team') : item.by })} loading="lazy" width={600} height={600} />
        <span className="cm-pin">{item.distanceKm >= 0.1 ? t('cm.near', { gem: item.gem.name, km: item.distanceKm.toLocaleString(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) : item.gem.name}</span>
      </div>
      {item.credit && <span className="cm-credit">{item.credit}</span>}
      {item.caption && <p className="cm-caption">{item.caption}</p>}
      <div className="cm-acts">
        <button
          type="button"
          className="cm-like"
          aria-pressed={item.likedByMe}
          aria-label={item.likedByMe ? t('cm.unlike', { count: item.likes }) : t('cm.like', { count: item.likes })}
          onClick={() => onLike(item)}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill={item.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
          </svg>
          <span className="num">{item.likes}</span>
        </button>
        <span className="num">{t('cm.inTrips', { count: item.inTrips })}</span>
        <button type="button" className="cm-add" aria-label={t('cm.addTo', { gem: item.gem.name })} onClick={() => onAdd(item)}>{t('cm.addButton')}</button>
      </div>
    </article>
  );
}
