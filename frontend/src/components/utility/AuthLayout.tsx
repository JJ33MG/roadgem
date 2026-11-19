import type { FormEvent, ReactNode } from 'react';
import { Button, Panel } from '@/components/ui';

type Field = { id: string; label: string; type: string; value: string; autoComplete: string; onChange: (v: string) => void; minLength?: number };

type Props = {
  title: string;
  intro: string;
  fields: Field[];
  submitLabel: string;
  busyLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
  footer: ReactNode;
};

/** The one form layout for logging in and signing up. */
export function AuthLayout({ title, intro, fields, submitLabel, busyLabel, busy, error, onSubmit, footer }: Props) {
  return (
    <section className="mx-auto max-w-[520px] px-16 py-40 md:py-80">
      <h1 className="font-display text-[44px] leading-[1.04] text-ink" style={{ fontWeight: 400, letterSpacing: '-0.035em' }}>{title}</h1>
      <p className="mt-12 text-[19px]">{intro}</p>
      <Panel className="mt-32">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit();
          }}
          className="grid gap-16"
        >
          {fields.map((f) => (
            <label key={f.id} htmlFor={f.id} className="grid gap-[6px] text-[16px] text-muted" style={{ fontWeight: 500 }}>
              {f.label}
              <input
                id={f.id}
                type={f.type}
                required
                minLength={f.minLength}
                autoComplete={f.autoComplete}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-[56px] w-full rounded-input border border-rule bg-paper px-16 text-[19px] text-ink"
              />
            </label>
          ))}
          {error && <p className="text-error" role="alert">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>{busy ? busyLabel : submitLabel}</Button>
        </form>
      </Panel>
      <p className="mt-24 text-[18px]">{footer}</p>
    </section>
  );
}
