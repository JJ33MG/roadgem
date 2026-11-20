import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { decide, pending as loadPending, privatePhoto, type Pending } from '@/lib/community';

const head = { fontWeight: 400, letterSpacing: '-0.03em' } as const;

function Photo({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url = '';
    privatePhoto(path).then((u) => setSrc((url = u))).catch(() => setSrc(null));
    return () => { if (url) URL.revokeObjectURL?.(url); };
  }, [path]);
  return src ? <img src={src} alt={alt} className="w-full rounded-part object-cover" /> : <div className="aspect-[4/3] w-full rounded-part bg-paper-2" aria-hidden="true" />;
}

/** Nothing is public before a person looked at it: approve, approve without the challenge, or reject. */
export function ModeratePage() {
  const [list, setList] = useState<Pending[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPending().then(setList).catch((e: Error) => setError(e.message));
  }, []);

  async function act(id: string, d: 'approve' | 'approve_photo' | 'reject') {
    try {
      await decide(id, d);
      setList((l) => l?.filter((p) => p.id !== id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="mx-auto max-w-[1040px] px-16 py-40 md:px-40 md:py-[64px]">
      <h1 className="font-display text-[40px] text-ink md:text-[52px]" style={head}>New photos</h1>
      {error && <p className="mt-16 text-error" role="alert">{error}</p>}
      {list === null && !error && <p className="mt-16" role="status">Loading</p>}
      {list?.length === 0 && <p className="mt-16 text-[19px]">Nothing waiting. All photos are checked.</p>}
      <ul className="mt-24 grid gap-24 p-0 md:grid-cols-2" style={{ listStyle: 'none' }}>
        {list?.map((p) => (
          <li key={p.id} className="card grid gap-8">
            <Photo path={p.photoUrl} alt={`Photo by ${p.user.name} at ${p.gem.name}`} />
            <h2 className="font-display text-[24px] text-ink" style={head}>{p.gem.name}</h2>
            <p className="text-[16px] text-muted">{`By ${p.user.name}${p.gem.status === 'suggested' ? ', a new gem suggestion' : ''}`}</p>
            {p.gem.status === 'suggested' && p.gem.description && <p>{p.gem.description}</p>}
            {p.caption && p.gem.status !== 'suggested' && <p>{p.caption}</p>}
            <p className="text-[16px] text-ink">{`${p.distanceM} m from the gem`}</p>
            <p className="text-[16px] text-ink">{p.aiNote}</p>
            <div className="mt-8 grid gap-8">
              <Button variant="primary" onClick={() => act(p.id, 'approve')}>{p.challenge ? 'Approve with the challenge, 50 points' : 'Approve, 10 points'}</Button>
              {p.challenge && <Button onClick={() => act(p.id, 'approve_photo')}>Approve as a normal photo, 10 points</Button>}
              <Button onClick={() => act(p.id, 'reject')}>Reject</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
