import { useState } from 'react';
import { Button } from '@/components/ui';
import { cardFile } from '@/lib/shareCard';
import { getPassport } from '@/lib/road';
import { myInvite } from '@/lib/community';

type Props = { tripId: string; from: string; to: string; km: number; countries: string[]; totalGems: number; signedIn: boolean };

/** A story card of the trip (gems collected, km, countries, your invite link) for the share sheet. */
export function ShareTrip({ tripId, from, to, km, countries, totalGems, signedIn }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setNote(null);
    try {
      const [pass, invite] = signedIn
        ? await Promise.all([getPassport(tripId).catch(() => null), myInvite().catch(() => null)])
        : [null, null];
      const file = await cardFile({ from, to, done: pass?.stamps.length ?? 0, total: pass?.total || totalGems, km, countries, inviteUrl: invite?.url });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: `${from} to ${to}` });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setNote('The card is saved to your downloads.');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') setNote('The card could not be made. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => void share()} disabled={busy}>{busy ? 'Making your card' : 'Share your trip'}</Button>
      {note && <span className="text-[16px] text-muted" role="status">{note}</span>}
    </>
  );
}
