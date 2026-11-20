import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Panel } from '@/components/ui';
import { challenge as loadChallenge, sendPost, type GemChallenge, type GemRef } from '@/lib/community';
import { whereAmI } from '@/lib/geo';
import { shrinkPhoto } from '@/lib/photo';

const head = { fontWeight: 400, letterSpacing: '-0.03em' } as const;

function refFrom(q: URLSearchParams): GemRef | null {
  if (q.get('gemId')) return { gemId: q.get('gemId')! };
  const lat = Number(q.get('lat'));
  const lng = Number(q.get('lng'));
  const placeId = q.get('placeId');
  const name = q.get('name');
  if (!placeId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { placeId, name, lat, lng, address: q.get('address') ?? '' };
}

/** At a gem: take the photo, do the challenge if you like, send. Location is checked when it is sent. */
export function PostPhotoPage() {
  const [q] = useSearchParams();
  const ids = { photo: useId(), caption: useId(), done: useId() };
  const [gem, setGem] = useState<GemChallenge | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [didChallenge, setDidChallenge] = useState(false);
  const [busy, setBusy] = useState<'' | 'photo' | 'sending'>('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const ref = refFrom(q);
    if (!ref) {
      setError('This link is missing its gem. Open a gem from a trip or the feed.');
      return;
    }
    loadChallenge(ref).then(setGem).catch((e: Error) => setError(e.message));
  }, [q]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy('photo');
    try {
      setPhoto(await shrinkPhoto(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function send() {
    if (!gem || !photo) return;
    setError(null);
    setBusy('sending');
    try {
      const here = await whereAmI();
      await sendPost({ gem: { gemId: gem.gemId }, at: { lat: here.lat, lng: here.lng }, photo, caption: caption.trim(), challenge: didChallenge });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  if (sent) {
    return (
      <section className="mx-auto max-w-[640px] px-16 py-[64px]">
        <h1 className="font-display text-[40px] text-ink" style={head}>Thank you</h1>
        <p className="mt-12 text-[19px]">Your photo appears in the feed after a quick check. Your points count from then on.</p>
        <div className="mt-24 flex flex-wrap gap-12">
          <Link to="/community" className="btn-primary no-underline">Open the feed</Link>
          <Button onClick={() => { setSent(false); setPhoto(null); setCaption(''); setDidChallenge(false); }}>Post another photo</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[640px] px-16 py-40 md:py-[64px]">
      <h1 className="font-display text-[40px] leading-[1.06] text-ink md:text-[52px]" style={head}>{gem?.name ?? 'Post a photo'}</h1>
      {gem && (
        <Panel className="mt-24">
          <h2 className="text-[19px] text-ink" style={{ fontWeight: 500 }}>Photo challenge, 50 points</h2>
          <p className="mt-6 text-[20px] text-ink">{gem.challenge}</p>
          <p className="mt-8 text-[16px] text-muted">A normal photo here is 10 points. Both count only when you are at the gem.</p>
        </Panel>
      )}

      {gem && (
        <div className="mt-24 grid gap-16">
          <label htmlFor={ids.photo} className="btn-header min-h-[56px] cursor-pointer justify-center text-[18px]">
            {photo ? 'Take another photo' : 'Take the photo'}
          </label>
          <input id={ids.photo} aria-label="Take the photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          {busy === 'photo' && <p role="status">Preparing the photo</p>}
          {photo && <img src={photo} alt="Your photo, ready to send" className="w-full rounded-card border border-rule" />}

          {photo && (
            <>
              <label htmlFor={ids.done} className="flex min-h-[48px] items-center gap-12 text-[18px] text-ink">
                <input id={ids.done} type="checkbox" className="h-[24px] w-[24px]" checked={didChallenge} onChange={(e) => setDidChallenge(e.target.checked)} />
                This photo does the challenge
              </label>
              <label htmlFor={ids.caption} className="flex flex-col gap-[6px] text-[16px] text-muted" style={{ fontWeight: 500 }}>
                A line about it (optional)
                <textarea id={ids.caption} maxLength={280} rows={3} className="rounded-input border border-rule bg-paper p-12 text-[18px] text-ink" value={caption} onChange={(e) => setCaption(e.target.value)} />
              </label>
              <Button variant="primary" className="w-full" onClick={send} disabled={busy !== ''}>
                {busy === 'sending' ? 'Checking your location' : 'Send the photo'}
              </Button>
              <p className="text-[15px] text-muted">The app asks for your location once, to check you are at the gem. It is not shared with anyone.</p>
            </>
          )}
        </div>
      )}
      {error && <p className="mt-16 text-error" role="alert">{error}</p>}
    </section>
  );
}
