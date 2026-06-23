interface BudgetSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function BudgetSlider({ value, onChange, min = 500, max = 5000, step = 50 }: BudgetSliderProps) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <label htmlFor="budget" className="text-body-sm text-silver">
          Budget
        </label>
        <span className="text-body-sm font-w480 text-starlight">&euro;{value.toLocaleString()}</span>
      </div>

      <input
        id="budget"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-graphite accent-mercury-blue"
      />

      <div className="mt-8 flex justify-between text-caption text-lead">
        <span>&euro;{min.toLocaleString()}</span>
        <span>&euro;{max.toLocaleString()}</span>
      </div>
    </div>
  );
}
