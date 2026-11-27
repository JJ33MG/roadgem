import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Panel } from '@/components/ui';
import { challenge as loadChallenge, nearby as loadNearby, sendPost, type GemChallenge, type GemRef, type NearbyGem } from '@/lib/community';
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

/** Post a moment: from a gem in a trip (with its challenge), or from anywhere, tagged to a gem nearby. */
export function PostPhotoPage() {
  const [q] = useSearchParams();
  return refFrom(q) || q.get('gemId') ? <PostAtGem /> : <PostMoment />;
}

const nearRef = (g: NearbyGem): GemRef => (g.gemId ? { gemId: g.gemId } : { placeId: g.placeId!, name: g.name, lat: g.lat, lng: g.lng, address: g.address });

function Thanks({ again }: { again: () => void }) {
  return (
    <section className="mx-auto max-w-[640px] px-16 py-[64px]">
      <h1 className="font-display text-[40px] text-ink" style={head}>Thank you</h1>
      <p className="mt-12 text-[19px]">We are checking your photo. It appears in the feed in a minute, and your points count from then on.</p>
      <div className="mt-24 flex flex-wrap gap-12">
        <Link to="/community" className="btn-primary no-underline">Open the feed</Link>
        <Button onClick={again}>Post another moment</Button>
      </div>
    </section>
  );
}

/** Anywhere on the road: a photo, a line, and the gem it is near (within 5 km). */
function PostMoment() {
  const ids = { photo: useId(), caption: useId(), near: useId() };
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [gems, setGems] = useState<NearbyGem[] | null>(null);
  const [chosen, setChosen] = useState(0);
  const [busy, setBusy] = useState<'' | 'photo' | 'where' | 'sending'>('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy('photo');
    try {
      setPhoto(await shrinkPhoto(file));
      setBusy('where');
      const at = await whereAmI();
      setHere({ lat: at.lat, lng: at.lng });
      setGems(await loadNearby({ lat: at.lat, lng: at.lng }));
      setChosen(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function send() {
    const gem = gems?.[chosen];
    if (!photo || !here || !gem) return;
    setError(null);
    setBusy('sending');
    try {
      await sendPost({ gem: nearRef(gem), at: here, photo, caption: caption.trim(), challenge: false });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  if (sent) return <Thanks again={() => { setSent(false); setPhoto(null); setCaption(''); setGems(null); }} />;

  return (
    <section className="mx-auto max-w-[560px] px-16 py-40 md:py-[64px]">
      <Link to="/community" className="text-[16px]">Back to the community</Link>
      <h1 className="mt-12 font-display text-[40px] leading-[1.06] text-ink md:text-[52px]" style={head}>Post a moment</h1>
      <p className="mt-8 text-[18px]">The view, your group at the lake, your camper at the camping nearby: any photo, tagged to a gem within 5 km.</p>
      <div className="mt-24 grid gap-16">
        <label htmlFor={ids.photo} className="btn-header min-h-[56px] cursor-pointer justify-center text-[18px]">
          {photo ? 'Choose another photo' : 'Choose a photo'}
        </label>
        <input id={ids.photo} aria-label="Choose a photo" type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        {busy === 'photo' && <p role="status">Preparing the photo</p>}
        {busy === 'where' && <p role="status">Finding gems near you</p>}
        {photo && <img src={photo} alt="Your photo, ready to post" className="aspect-[4/3] w-full rounded-card object-cover" />}

        {photo && (
          <label htmlFor={ids.caption} className="flex flex-col gap-[6px] text-[15px] text-ink" style={{ fontWeight: 600 }}>
            Say something
            <textarea id={ids.caption} maxLength={280} rows={2} className="rounded-input border border-rule bg-paper p-12 text-[17px] text-ink" style={{ fontWeight: 400 }} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>
        )}

        {gems && (
          <fieldset className="grid gap-8 border-0 p-0">
            <legend className="mb-8 text-[15px] text-ink" style={{ fontWeight: 600 }}>Which gem is this near?</legend>
            {gems.length === 0 && <p className="text-[16px]">No checked gem within 5 km of here.</p>}
            <div className="cm-opts">
              {gems.map((g, i) => (
                <label key={g.gemId ?? g.placeId} className="cm-opt">
                  <input type="radio" name={ids.near} checked={chosen === i} onChange={() => setChosen(i)} />
                  <span className="min-w-0">{g.name}</span>
                  <span className="cm-opt-km">{`${g.distanceKm.toFixed(1)} km`}</span>
                </label>
              ))}
              <Link to="/community/suggest" className="cm-opt no-underline">A new place, not on RoamGem yet</Link>
            </div>
          </fieldset>
        )}

        {gems && gems.length > 0 && (
          <>
            <p className="text-[15px] text-muted">We use your location only to find gems nearby; it is never shown. Every photo gets a quick automatic check.</p>
            <Button variant="primary" className="w-full" onClick={send} disabled={busy !== ''}>
              {busy === 'sending' ? 'Posting' : 'Post to the community'}
            </Button>
          </>
        )}
      </div>
      {error && <p className="mt-16 text-error" role="alert">{error}</p>}
    </section>
  );
}

/** At a gem from a trip: the photo, the challenge if you like, send. Location is checked when it is sent. */
function PostAtGem() {
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

  if (sent) return <Thanks again={() => { setSent(false); setPhoto(null); setCaption(''); setDidChallenge(false); }} />;

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
