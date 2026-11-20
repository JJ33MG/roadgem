import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { sendSuggestion } from '@/lib/community';
import { whereAmI } from '@/lib/geo';
import { shrinkPhoto } from '@/lib/photo';

const head = { fontWeight: 400, letterSpacing: '-0.03em' } as const;
const KINDS: [string, string][] = [
  ['viewpoint', 'Viewpoint'], ['nature', 'Nature'], ['historic', 'Old town or monument'], ['culture', 'Museum or culture'],
  ['restaurant', 'Place to eat'], ['café', 'Café'], ['other', 'Something else'],
];

/** A traveller pins a new gem where they stand, with a photo. Others visiting and liking it make it official. */
export function SuggestGemPage() {
  const ids = { name: useId(), about: useId(), kind: useId(), photo: useId() };
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [kind, setKind] = useState('viewpoint');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPhoto(await shrinkPhoto(file));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function send() {
    if (name.trim().length < 3) return setError('Give the gem a name.');
    if (about.trim().length < 15) return setError('Say in a sentence what makes it special.');
    if (!photo) return setError('Add a photo taken here.');
    setError(null);
    setBusy(true);
    try {
      const here = await whereAmI();
      await sendSuggestion({ name: name.trim(), description: about.trim(), category: kind, at: { lat: here.lat, lng: here.lng }, photo });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <section className="mx-auto max-w-[640px] px-16 py-[64px]">
        <h1 className="font-display text-[40px] text-ink" style={head}>Your gem is pinned</h1>
        <p className="mt-12 text-[19px]">After a quick check it shows in the feed. When 10 travellers have posted a photo there and it has 20 likes, it turns official with your name on it, and you get 200 points.</p>
        <Link to="/community" className="btn-primary mt-24 no-underline">Open the feed</Link>
      </section>
    );
  }

  const field = 'w-full rounded-input border border-rule bg-paper px-16 text-[19px] text-ink';
  const label = 'flex flex-col gap-[6px] text-[16px] text-muted';
  return (
    <section className="mx-auto max-w-[640px] px-16 py-40 md:py-[64px]">
      <h1 className="font-display text-[40px] leading-[1.06] text-ink md:text-[52px]" style={head}>Suggest a new gem</h1>
      <p className="mt-12 text-[19px]">Stand at the place. The pin goes where you are now.</p>
      <div className="mt-24 grid gap-16">
        <label htmlFor={ids.name} className={label} style={{ fontWeight: 500 }}>
          Name of the place
          <input id={ids.name} className={`${field} h-[56px]`} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label htmlFor={ids.about} className={label} style={{ fontWeight: 500 }}>
          What makes it special
          <textarea id={ids.about} className={`${field} py-12`} rows={3} maxLength={400} value={about} onChange={(e) => setAbout(e.target.value)} />
        </label>
        <label htmlFor={ids.kind} className={label} style={{ fontWeight: 500 }}>
          Kind of place
          <select id={ids.kind} className={`${field} h-[56px]`} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label htmlFor={ids.photo} className="btn-header min-h-[56px] cursor-pointer justify-center text-[18px]">{photo ? 'Take another photo' : 'Take a photo here'}</label>
        <input id={ids.photo} aria-label="Take the photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        {photo && <img src={photo} alt="Your photo of the new gem" className="w-full rounded-card border border-rule" />}
        <Button variant="primary" className="w-full" onClick={send} disabled={busy}>{busy ? 'Checking your location' : 'Send the gem'}</Button>
        {error && <p className="text-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
