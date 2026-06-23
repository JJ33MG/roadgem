import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-16 sm:grid-cols-2">
      <div>
        <label className="mb-8 block text-body-sm text-silver">Start date</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => onChange({ startDate: date, endDate })}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          minDate={new Date()}
          placeholderText="Select start date"
          className="input-field w-full"
        />
      </div>

      <div>
        <label className="mb-8 block text-body-sm text-silver">End date</label>
        <DatePicker
          selected={endDate}
          onChange={(date) => onChange({ startDate, endDate: date })}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate ?? new Date()}
          placeholderText="Select end date"
          className="input-field w-full"
        />
      </div>
    </div>
  );
}
