import { useCallback, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useDestinationSuggestions } from '@/hooks/useDestinationSuggestions';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';

interface DestinationInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  placeholder?: string;
}

export function DestinationInput({
  value,
  onChange,
  id = 'destination',
  label = 'Destination',
  placeholder = 'Where are you heading?',
}: DestinationInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [invalidSelection, setInvalidSelection] = useState(false);
  const { suggestions } = useDestinationSuggestions(value);

  const handlePlaceSelected = useCallback(
    (description: string) => {
      setInvalidSelection(false);
      onChange(description);
    },
    [onChange]
  );
  const handleInvalidSelection = useCallback(() => setInvalidSelection(true), []);
  const { inputRef } = usePlacesAutocomplete({
    onPlaceSelected: handlePlaceSelected,
    onInvalidSelection: handleInvalidSelection,
  });

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-8 block text-body-sm text-silver">
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-24 top-1/2 -translate-y-1/2 text-lead" size={18} />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="input-field w-full pl-56"
          autoComplete="off"
        />
      </div>

      {invalidSelection && (
        <p className="mt-8 text-caption text-[#ffb648]">
          We currently only support destinations in Europe. Please pick another place.
        </p>
      )}

      {isFocused && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-8 w-full overflow-hidden rounded-container border border-lead bg-graphite">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="w-full px-24 py-12 text-left text-body-sm text-starlight hover:bg-mercury-blue/20"
                onMouseDown={() => onChange(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
