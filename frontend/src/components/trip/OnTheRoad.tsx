import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui';
import { checkInAt, getPassport, here } from '@/lib/road';
import { useTranslation } from 'react-i18next';

type Gem = { placeId?: string; name: string; latitude: number; longitude: number };
type Props = { tripId: string; gems: Gem[]; signedIn: boolean };

/** At a gem of the day: one tap to collect it for the trip passport (checked on the spot). */
export function OnTheRoad({ tripId, gems, signedIn }: Props) {
  const { t } = useTranslation();
  const [stamps, setStamps] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ placeId: string; text: string } | null>(null);
  const collectable = gems.filter((g): g is Gem & { placeId: string } => !!g.placeId);

  useEffect(() => {
    if (!signedIn) return;
    getPassport(tripId)
      .then((p) => {
        setStamps(p.stamps.map((s) => s.placeId));
        setTotal(p.total);
      })
      .catch(() => undefined);
  }, [tripId, signedIn]);

  async function collect(g: Gem & { placeId: string }) {
    setBusy(g.placeId);
    setNote(null);
    let at;
    try {
      at = await here();
    } catch {
      setNote({ placeId: g.placeId, text: t('road.allowLocation') });
      setBusy(null);
      return;
    }
    try {
      const r = await checkInAt(tripId, g.placeId, at);
      setStamps((s) => [...s, g.placeId]);
      setTotal(r.total);
      setNote({ placeId: g.placeId, text: t('road.collectedPoints', { points: r.points }) });
    } catch (err) {
      setNote({ placeId: g.placeId, text: err instanceof Error ? err.message : t('road.checkinFailed') });
    } finally {
      setBusy(null);
    }
  }

  if (!collectable.length) return null;
  return (
    <Panel className="mt-24" role="region" aria-label={t('road.title')}>
      <h3 className="font-display text-[26px] text-ink" style={{ fontWeight: 400, letterSpacing: '-0.02em' }}>{t('road.title')}</h3>
      {signedIn ? (
        <>
          {total > 0 && (
            <div className="mt-8">
              <p className="text-ink" style={{ fontWeight: 500 }}>{t('road.progress', { done: stamps.length, total })}</p>
              <div className="mt-8 h-[8px] overflow-hidden rounded-pill bg-rule" aria-hidden="true">
                <div className="h-full bg-accent" style={{ width: `${Math.round((stamps.length / total) * 100)}%` }} />
              </div>
            </div>
          )}
          <ul className="mt-16 grid gap-12 p-0" style={{ listStyle: 'none' }}>
            {collectable.map((g) => {
              const done = stamps.includes(g.placeId);
              return (
                <li key={g.placeId} className="grid gap-8 border-t border-rule pt-12">
                  <span className="text-ink" style={{ fontWeight: 500 }}>{g.name}</span>
                  {done ? (
                    <span className="text-[16px] text-accent" style={{ fontWeight: 500 }}>{t('road.collected')}</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === g.placeId}
                      onClick={() => void collect(g)}
                      aria-label={t('road.imAt', { name: g.name })}
                      className="min-h-[48px] justify-self-start rounded-btn border border-ink px-16 text-[17px] text-ink"
                      style={{ fontWeight: 500 }}
                    >
                      {busy === g.placeId ? t('road.checking') : t('road.imHere')}
                    </button>
                  )}
                  {note?.placeId === g.placeId && <span className="text-[16px] text-muted" role="status">{note.text}</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-12 text-[15px] text-muted">{t('road.howTo')}</p>
        </>
      ) : (
        <p className="mt-8">
          {t('road.collectAll')}{' '}
          <Link to="/login" className="text-ink">{t('road.loginToCollect')}</Link>
        </p>
      )}
    </Panel>
  );
}
