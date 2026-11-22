import { useEffect, useState } from 'react';
import { Button, Panel } from '@/components/ui';
import { myInvite } from '@/lib/community';

/** Your invite link: a friend who signs up through it gets 2 weeks of Plus, you 1 week. */
export function InvitePanel() {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    myInvite().then((r) => setUrl(r.url)).catch(() => setUrl(null));
  }, []);
  if (!url) return null;
  return (
    <Panel>
      <h2 className="font-display text-[26px] text-ink" style={{ fontWeight: 400, letterSpacing: '-0.02em' }}>Invite a friend</h2>
      <p className="mt-6">A friend who signs up through your link gets 2 weeks of Plus. You get 1 week for every friend.</p>
      <p className="mt-12 break-all rounded-input border border-rule bg-paper px-12 py-8 text-[16px] text-ink">{url}</p>
      <Button
        className="mt-12"
        onClick={() => {
          void navigator.clipboard?.writeText(url);
          setCopied(true);
        }}
      >
        {copied ? 'Link copied' : 'Copy link'}
      </Button>
    </Panel>
  );
}
