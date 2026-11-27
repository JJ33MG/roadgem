import { useEffect, useId, useState } from 'react';
import { addToTrip, myTrips, type FeedItem, type MyTrip } from '@/lib/community';

/** A sheet to put a moment's gem into a day of one of my trips, or save it for the next trip. */
export function AddToTrip({ item, onClose, onAdded }: { item: FeedItem; onClose: () => void; onAdded: (inTrips: number) => void }) {
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
      setDone(r.added === 'trip' ? `Added to day ${day} of ${trip?.title ?? 'your trip'}.` : 'Saved. We add it when you plan a trip that passes by.');
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
            <button type="button" className="btn-primary" onClick={onClose}>Done</button>
          </>
        ) : trips === null ? (
          <p role="status">Loading your trips</p>
        ) : trips.length > 0 ? (
          <>
            <label htmlFor={ids.trip} className="grid gap-[6px] text-[15px] text-muted" style={{ fontWeight: 500 }}>
              Trip
              <select id={ids.trip} className="min-h-[48px] rounded-input border border-rule bg-paper px-12 text-[17px] text-ink" value={tripId} onChange={(e) => { setTripId(e.target.value); setDay(1); }}>
                {trips.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
            <label htmlFor={ids.day} className="grid gap-[6px] text-[15px] text-muted" style={{ fontWeight: 500 }}>
              Day
              <select id={ids.day} className="min-h-[48px] rounded-input border border-rule bg-paper px-12 text-[17px] text-ink" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {Array.from({ length: trip?.days ?? 1 }, (_, i) => <option key={i + 1} value={i + 1}>{`Day ${i + 1}`}</option>)}
              </select>
            </label>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => add(true)}>Add to this day</button>
            <button type="button" className="btn-header" disabled={busy} onClick={() => add(false)}>Save for my next trip</button>
          </>
        ) : (
          <>
            <p className="text-[17px] text-ink">You have no trip yet. Save the gem and we put it in the first trip you plan that passes within 15 km.</p>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => add(false)}>Save for my next trip</button>
          </>
        )}
        {error && <p className="text-error" role="alert">{error}</p>}
        {!done && <button type="button" className="btn-header" onClick={onClose}>Cancel</button>}
      </div>
    </div>
  );
}
