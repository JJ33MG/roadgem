import { useEffect, useId, useState } from 'react';
import { addToTrip, myTrips, type FeedItem, type MyTrip } from '@/lib/community';
import { useTranslation } from 'react-i18next';

/** A sheet to put a moment's gem into a day of one of my trips, or save it for the next trip. */
export function AddToTrip({ item, onClose, onAdded }: { item: FeedItem; onClose: () => void; onAdded: (inTrips: number) => void }) {
  const { t } = useTranslation();
  const ids = { trip: useId(), day: useId(), title: useId() };
  const [trips, setTrips] = useState<MyTrip[] | null>(null);
  const [tripId, setTripId] = useState('');
  const [day, setDay] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    myTrips().then((t) => { setTrips(t); setTripId(t[0]?.id ?? ''); }).catch(() => setTrips([]));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trip = trips?.find((t) => t.id === tripId);

  async function add(toTrip: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await addToTrip(item.gem.id, toTrip && tripId ? { postId: item.id, tripId, day } : { postId: item.id });
      onAdded(r.inTrips);
      setDone(r.added === 'trip' ? t('add.added', { day, trip: trip?.title ?? t('add.yourTrip') }) : t('add.saved'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cm-sheet" role="dialog" aria-modal="true" aria-labelledby={ids.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-sheet-card">
        <h2 id={ids.title} className="font-display text-[24px] text-ink" style={{ fontWeight: 500 }}>{item.gem.name}</h2>
        {done ? (
          <>
            <p className="text-[17px] text-ink" role="status">{done}</p>
            <button type="button" className="btn-primary" onClick={onClose}>{t('add.done')}</button>
          </>
        ) : trips === null ? (
          <p role="status">{t('add.loadingTrips')}</p>
        ) : trips.length > 0 ? (
          <>
            <label htmlFor={ids.trip} className="grid gap-[6px] text-[15px] text-muted" style={{ fontWeight: 500 }}>
              {t('add.trip')}
              <select id={ids.trip} className="min-h-[48px] rounded-input border border-rule bg-paper px-12 text-[17px] text-ink" value={tripId} onChange={(e) => { setTripId(e.target.value); setDay(1); }}>
                {trips.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
            <label htmlFor={ids.day} className="grid gap-[6px] text-[15px] text-muted" style={{ fontWeight: 500 }}>
              {t('add.day')}
              <select id={ids.day} className="min-h-[48px] rounded-input border border-rule bg-paper px-12 text-[17px] text-ink" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {Array.from({ length: trip?.days ?? 1 }, (_, i) => <option key={i + 1} value={i + 1}>{t('trip.day', { n: i + 1 })}</option>)}
              </select>
            </label>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => add(true)}>{t('add.toDay')}</button>
            <button type="button" className="btn-header" disabled={busy} onClick={() => add(false)}>{t('add.save')}</button>
          </>
        ) : (
          <>
            <p className="text-[17px] text-ink">{t('add.noTrip')}</p>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => add(false)}>{t('add.save')}</button>
          </>
        )}
        {error && <p className="text-error" role="alert">{error}</p>}
        {!done && <button type="button" className="btn-header" onClick={onClose}>{t('add.cancel')}</button>}
      </div>
    </div>
  );
}
