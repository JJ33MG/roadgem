import { useState } from 'react';
import { Button } from '@/components/ui';
import { cardFile } from '@/lib/shareCard';
import { getPassport } from '@/lib/road';
import { myInvite } from '@/lib/community';
import { useTranslation } from 'react-i18next';

type Props = { tripId: string; from: string; to: string; km: number; countries: string[]; totalGems: number; signedIn: boolean };

/** A story card of the trip (gems collected, km, countries, your invite link) for the share sheet. */
export function ShareTrip({ tripId, from, to, km, countries, totalGems, signedIn }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // The finished card, kept for a second tap when the browser wants the share sheet straight after a tap (Safari).
  const [ready, setReady] = useState<File | null>(null);

  async function open(file: File) {
    await navigator.share({ files: [file], title: `${from} to ${to}` });
  }

  async function share() {
    setBusy(true);
    setNote(null);
    try {
      const [pass, invite] = signedIn
        ? await Promise.all([getPassport(tripId).catch(() => null), myInvite().catch(() => null)])
        : [null, null];
      const file = await cardFile({ from, to, done: pass?.stamps.length ?? 0, total: pass?.total || totalGems, km, countries, inviteUrl: invite?.url });
      if (navigator.canShare?.({ files: [file] }) && typeof navigator.share === "function") {
        try {
          await open(file);
        } catch (err) {
          if ((err as Error)?.name !== 'NotAllowedError') throw err;
          setReady(file);
          setNote(t('share.ready'));
        }
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setNote(t('share.saved'));
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') setNote(t('share.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {ready ? (
        <Button
          variant="primary"
          onClick={() => {
            // Called straight from the tap, as Safari requires.
            open(ready).then(() => setReady(null)).catch(() => undefined);
          }}
        >
          {t('share.shareCard')}
        </Button>
      ) : (
        <Button onClick={() => void share()} disabled={busy}>{busy ? t('share.making') : t('share.button')}</Button>
      )}
      {note && <span className="text-[16px] text-muted" role="status">{note}</span>}
    </>
  );
}
