import { useSubscription } from '@/hooks/useSubscription';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { sendSuggestion } from '@/lib/community';
import { whereAmI } from '@/lib/geo';
import { shrinkPhoto } from '@/lib/photo';
import { useTranslation } from 'react-i18next';

const head = { fontWeight: 400, letterSpacing: '-0.03em' } as const;
const KINDS: [string, string][] = [
  ['viewpoint', 'sg.kind.viewpoint'], ['nature', 'sg.kind.nature'], ['historic', 'sg.kind.historic'], ['culture', 'sg.kind.culture'],
  ['restaurant', 'sg.kind.restaurant'], ['café', 'sg.kind.café'], ['other', 'sg.kind.other'],
];

/** A traveller pins a new gem where they stand, with a photo. Others visiting and liking it make it official. */
export function SuggestGemPage() {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
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
    if (name.trim().length < 3) return setError(t('sg.needName'));
    if (about.trim().length < 15) return setError(t('sg.needAbout'));
    if (!photo) return setError(t('sg.needPhoto'));
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
        <h1 className="font-display text-[40px] text-ink" style={head}>{t('sg.pinned')}</h1>
        <p className="mt-12 text-[19px]">{t('sg.pinnedBody')}</p>
        <Link to="/community" className="btn-primary mt-24 no-underline">{t('pm.openFeed')}</Link>
      </section>
    );
  }

  const field = 'w-full rounded-input border border-rule bg-paper px-16 text-[19px] text-ink';
  const label = 'flex flex-col gap-[6px] text-[16px] text-muted';
  if (!isPremium) {
    return (
      <section className="mx-auto max-w-[640px] px-16 py-40 md:py-[64px]">
        <h1 className="font-display text-[40px] text-ink" style={head}>{t('sg.title')}</h1>
        <p className="mt-12 text-[19px]">{t('sg.plusOnly')}</p>
        <p className="mt-6">{t('sg.plusBody')}</p>
        <Link to="/pricing" className="btn-primary mt-24 no-underline">{t('trip.seePlus')}</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[640px] px-16 py-40 md:py-[64px]">
      <h1 className="font-display text-[40px] leading-[1.06] text-ink md:text-[52px]" style={head}>{t('sg.title')}</h1>
      <p className="mt-12 text-[19px]">{t('sg.stand')}</p>
      <div className="mt-24 grid gap-16">
        <label htmlFor={ids.name} className={label} style={{ fontWeight: 500 }}>
          {t('sg.name')}
          <input id={ids.name} className={`${field} h-[56px]`} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label htmlFor={ids.about} className={label} style={{ fontWeight: 500 }}>
          {t('sg.about')}
          <textarea id={ids.about} className={`${field} py-12`} rows={3} maxLength={400} value={about} onChange={(e) => setAbout(e.target.value)} />
        </label>
        <label htmlFor={ids.kind} className={label} style={{ fontWeight: 500 }}>
          {t('sg.kind')}
          <select id={ids.kind} className={`${field} h-[56px]`} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
          </select>
        </label>
        <label htmlFor={ids.photo} className="btn-header min-h-[56px] cursor-pointer justify-center text-[18px]">{photo ? t('pm.takeAnother') : t('sg.takeHere')}</label>
        <input id={ids.photo} aria-label={t('pm.take')} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        {photo && <img src={photo} alt={t('sg.photoAlt')} className="w-full rounded-card border border-rule" />}
        <Button variant="primary" className="w-full" onClick={send} disabled={busy}>{busy ? t('pm.checkingLoc') : t('sg.send')}</Button>
        {error && <p className="text-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
