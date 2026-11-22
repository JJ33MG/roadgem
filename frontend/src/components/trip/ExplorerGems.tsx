import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui';
import { explorerGems, type ExplorerAnswer } from '@/lib/community';

/** Rare places travellers found near this road: listed for Plus, counted for everyone else. */
export function ExplorerGems({ tripId }: { tripId: string }) {
  const [answer, setAnswer] = useState<ExplorerAnswer | null>(null);
  useEffect(() => {
    explorerGems(tripId).then(setAnswer).catch(() => setAnswer(null));
  }, [tripId]);
  if (!answer) return null;
  if ('locked' in answer) {
    if (!answer.count) return null;
    return (
      <Panel>
        <h3 className="font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>Explorer gems</h3>
        <p className="mt-6">{`${answer.count} Explorer ${answer.count === 1 ? 'gem' : 'gems'} on this road, found by travellers. They come with Plus.`}</p>
        <Link to="/pricing" className="btn-header mt-16 no-underline">See Plus</Link>
      </Panel>
    );
  }
  if (!answer.gems.length) return null;
  return (
    <Panel>
      <h3 className="font-display text-[24px] text-ink" style={{ fontWeight: 400 }}>Explorer gems</h3>
      <ul className="mt-12 grid gap-12 p-0" style={{ listStyle: 'none' }}>
        {answer.gems.map((g) => (
          <li key={g.id} className="grid gap-4 border-t border-rule pt-12">
            <span className="text-ink" style={{ fontWeight: 500 }}>{g.name}</span>
            {g.description && <span className="text-[16px]">{g.description}</span>}
            <a className="text-[16px] text-ink" href={`https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
