import type { ReactNode } from 'react';
import clsx from 'clsx';

type Props = { pressed: boolean; onChange: (pressed: boolean) => void; children: ReactNode; className?: string };

/** A filter pill: pressed lights it with the soft accent. */
export function Toggle({ pressed, onChange, children, className }: Props) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={clsx(
        'min-h-[48px] rounded-btn border px-16 text-[17px] font-body transition-colors duration-150',
        pressed ? 'border-accent bg-accent-soft text-ink' : 'border-rule bg-paper text-ink-2 hover:border-rule-2',
        className,
      )}
      style={{ fontWeight: 500 }}
    >
      {children}
    </button>
  );
}
