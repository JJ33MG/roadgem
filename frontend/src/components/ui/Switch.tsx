import clsx from 'clsx';

type Props = { checked: boolean; onChange: (checked: boolean) => void; label: string };

/** A pill track with a metal knob that lights the accent when on. */
export function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={clsx('relative h-[34px] w-[60px] shrink-0 rounded-btn border transition-colors duration-150', checked ? 'border-accent bg-accent' : 'border-rule bg-paper-3')}
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] h-[26px] w-[26px] rounded-btn shadow-part transition-transform duration-150"
        style={{ left: 3, transform: checked ? 'translateX(26px)' : 'none', background: 'linear-gradient(to bottom, var(--metal-hi), var(--metal-lo))' }}
      />
    </button>
  );
}
