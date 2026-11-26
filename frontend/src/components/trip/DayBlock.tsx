import type { ReactNode } from 'react';

// One part of a trip day (Jarne, 26 Nov: "this is a gem, this is a hotel, this is a cost" must be obvious):
// every kind has its own colour stripe and icon, in the same place on every day.
export type BlockKind = 'drive' | 'gems' | 'plan' | 'cost' | 'sleep';

const PATHS: Record<BlockKind, ReactNode> = {
  drive: <><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3 16h18v3H3z" /><circle cx="7.5" cy="16" r="1.5" /><circle cx="16.5" cy="16" r="1.5" /></>,
  gems: <><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l3 16 3-16" /></>,
  plan: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  cost: <><path d="M17 6a7 7 0 1 0 0 12" /><path d="M4 10h9M4 14h9" /></>,
  sleep: <><path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-8v5" /><circle cx="6.5" cy="10.5" r="1.5" /></>,
};

export function BlockIcon({ kind, size = 18 }: { kind: BlockKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[kind]}
    </svg>
  );
}

type Props = { kind: BlockKind; id: string; title: string; meta?: ReactNode; label?: string; children: ReactNode };

export function DayBlock({ kind, id, title, meta, label, children }: Props) {
  const headId = `${id}-head`;
  return (
    <section id={id} className={`day-block kind-${kind}`} aria-labelledby={label ? undefined : headId} aria-label={label}>
      <header className="day-block-head">
        <span className="day-block-icon"><BlockIcon kind={kind} /></span>
        <h3 id={headId} className="font-display text-[20px] text-ink">{title}</h3>
        {meta && <span className="day-block-meta">{meta}</span>}
      </header>
      <div className="day-block-body">{children}</div>
    </section>
  );
}
