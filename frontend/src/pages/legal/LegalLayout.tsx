import type { ReactNode } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';

/** Who runs Routify. Filled in before launch; until then the placeholders show plainly. */
export const OPERATOR = {
  name: '[Company name]',
  address: '[Registered address]',
  email: '[Contact email]',
  country: '[Country of registration]',
};

export const UPDATED = '22 November 2026';

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  usePageTitle(title);
  return (
    <article className="legal mx-auto max-w-[760px] px-16 py-40 md:px-40 md:py-[64px]">
      <h1 className="font-display text-[44px] leading-[1.04] text-ink md:text-[56px]" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>{title}</h1>
      <p className="mt-12 text-[16px] text-muted">{`Last updated ${UPDATED}`}</p>
      {children}
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-40">
      <h2 className="font-display text-[28px] text-ink" style={{ fontWeight: 400, letterSpacing: '-0.02em' }}>{title}</h2>
      <div className="mt-12 grid gap-12 text-[18px] leading-[1.55]">{children}</div>
    </section>
  );
}
