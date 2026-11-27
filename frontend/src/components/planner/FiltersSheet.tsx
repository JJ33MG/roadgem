import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button, Toggle } from '@/components/ui';
import { FILTER_GROUPS } from '@/lib/tripPlan';
import { useTranslation } from 'react-i18next';

type Props = { open: boolean; selected: string[]; onChange: (ids: string[]) => void; onClose: () => void };

/** Every filter, grouped, in a dialog: the planner stays small, the choice stays complete. */
export function FiltersSheet({ open, selected, onChange, onClose }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('button')?.focus();
  }, [open]);
  if (!open) return null;

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('planner.allFilters')}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab' && ref.current) {
            const items = ref.current.querySelectorAll<HTMLElement>('button');
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
        className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-t-card border border-rule bg-paper p-24 shadow-panel sm:rounded-card"
      >
        <div className="flex items-center justify-between gap-16">
          <h2 className="font-display text-[28px] text-ink" style={{ fontWeight: 400 }}>{t('planner.allFilters')}</h2>
          <button type="button" aria-label="Close filters" onClick={onClose} className="flex h-[48px] w-[48px] items-center justify-center rounded-btn border border-rule">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {FILTER_GROUPS.map((g) => (
          <section key={g.id} className="mt-24 border-t border-rule pt-16">
            <h3 className="text-[17px] text-muted" style={{ fontWeight: 500 }}>{t(`filterGroup.${g.id}`)}</h3>
            <div className="mt-12 flex flex-wrap gap-8">
              {g.options.map((o) => (
                <Toggle key={o.id} pressed={selected.includes(o.id)} onChange={() => toggle(o.id)}>
                  {t(`filter.${o.id}`)}
                </Toggle>
              ))}
            </div>
          </section>
        ))}
        <div className="sticky bottom-0 -mx-24 -mb-24 mt-24 flex items-center justify-between gap-12 border-t border-rule bg-paper px-24 py-16">
          <Button onClick={() => onChange([])}>{t('planner.clearAll')}</Button>
          <Button variant="primary" onClick={onClose}>{t('planner.showTrips')}</Button>
        </div>
      </div>
    </div>
  );
}
