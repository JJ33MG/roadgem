import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

/** A machined panel lit from above (Ribbon § Surfaces). */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-card border border-rule p-24 shadow-panel', className)} style={{ background: 'linear-gradient(to bottom, var(--metal-hi), var(--color-paper-2))' }} {...rest} />;
}
