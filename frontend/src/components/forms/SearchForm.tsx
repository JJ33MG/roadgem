import { useState } from 'react';
import { MapPin, Calendar, Wallet, Compass, Star, BedDouble } from 'lucide-react';
import { DestinationInput } from './DestinationInput';
import { DateRangePicker } from './DateRangePicker';
import { BudgetSlider } from './BudgetSlider';
import { TravelStyleSelector } from './TravelStyleSelector';
import { PrioritiesCheckboxGroup } from './PrioritiesCheckboxGroup';
import { AccommodationTypeSelector } from './AccommodationTypeSelector';
import { LoadingSpinner } from '../utility/LoadingSpinner';
import type { AccommodationType, Priority, TravelStyle, TripSearchParams } from '@/types';

interface SearchFormProps {
  isLoading: boolean;
  onSubmit: (params: TripSearchParams) => void;
}

function SectionLabel({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  return (
    <div className="flex items-center gap-10 border-b border-starlight/10 pb-16">
      <Icon size={16} className="text-mercury-blue" />
      <span className="text-caption font-w480 uppercase tracking-wide text-silver">{label}</span>
    </div>
  );
}

export function SearchForm({ isLoading, onSubmit }: SearchFormProps) {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [budget, setBudget] = useState(1500);
  const [travelStyle, setTravelStyle] = useState<TravelStyle | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [accommodationTypes, setAccommodationTypes] = useState<AccommodationType[]>([
    'hotel',
    'hostel',
    'campsite',
    'airbnb',
  ]);

  const isValid =
    startLocation.trim().length > 0 && destination.trim().length > 0 && startDate && endDate && travelStyle;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !startDate || !endDate || !travelStyle) return;

    onSubmit({
      startLocation,
      destination,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      budget,
      travelStyle,
      priorities,
      accommodationTypes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-32">
      {/* Route */}
      <div className="flex flex-col gap-16">
        <SectionLabel icon={MapPin} label="Route" />
        <DestinationInput
          id="startLocation"
          label="Starting from"
          placeholder="Where are you departing from?"
          value={startLocation}
          onChange={setStartLocation}
        />
        <DestinationInput value={destination} onChange={setDestination} />
      </div>

      {/* Dates */}
      <div className="flex flex-col gap-16">
        <SectionLabel icon={Calendar} label="Dates" />
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
      </div>

      {/* Budget */}
      <div className="flex flex-col gap-16">
        <SectionLabel icon={Wallet} label="Budget" />
        <BudgetSlider value={budget} onChange={setBudget} />
      </div>

      {/* Travel style */}
      <div className="flex flex-col gap-16">
        <SectionLabel icon={Compass} label="Travel style" />
        <TravelStyleSelector value={travelStyle} onChange={setTravelStyle} />
      </div>

      {/* Priorities */}
      <div className="flex flex-col gap-16">
        <SectionLabel icon={Star} label="Priorities" />
        <PrioritiesCheckboxGroup value={priorities} onChange={setPriorities} />
      </div>

      {/* Accommodation */}
      <div className="flex flex-col gap-16">
        <SectionLabel icon={BedDouble} label="Accommodation" />
        <AccommodationTypeSelector value={accommodationTypes} onChange={setAccommodationTypes} />
      </div>

      <button type="submit" disabled={!isValid || isLoading} className="btn-primary w-full">
        {isLoading ? (
          <span className="flex items-center justify-center gap-12">
            <LoadingSpinner size={18} />
            Building your itinerary...
          </span>
        ) : (
          'Generate My Trip'
        )}
      </button>
    </form>
  );
}
