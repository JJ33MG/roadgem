import clsx from 'clsx';
import type { Priority } from '@/types';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'hidden_gems', label: 'Hidden gems' },
  { value: 'budget_friendly', label: 'Budget-friendly' },
  { value: 'scenic', label: 'Scenic' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'local_culture', label: 'Local culture' },
  { value: 'photography', label: 'Photography' },
];

interface PrioritiesCheckboxGroupProps {
  value: Priority[];
  onChange: (value: Priority[]) => void;
}

export function PrioritiesCheckboxGroup({ value, onChange }: PrioritiesCheckboxGroupProps) {
  function toggle(priority: Priority) {
    if (value.includes(priority)) {
      onChange(value.filter((p) => p !== priority));
    } else {
      onChange([...value, priority]);
    }
  }

  return (
    <div>
      <p className="mb-8 text-body-sm text-silver">Priorities</p>
      <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
        {PRIORITIES.map((priority) => {
          const isChecked = value.includes(priority.value);
          return (
            <label
              key={priority.value}
              className={clsx(
                'flex cursor-pointer items-center gap-8 rounded-container border px-16 py-12 text-body-sm transition-colors',
                isChecked ? 'border-mercury-blue text-starlight' : 'border-lead text-silver',
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(priority.value)}
                className="accent-mercury-blue"
              />
              {priority.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
