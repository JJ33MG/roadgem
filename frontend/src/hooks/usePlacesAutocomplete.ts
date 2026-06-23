import { useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';

// Roughly covers continental Europe + UK/Ireland + Scandinavia.
// componentRestrictions.country only accepts up to 5 codes, which is far too few
// for a pan-European product, so we bias toward this region instead and validate
// the final selection against EU_COUNTRY_CODES below.
const EUROPE_BOUNDS = {
  south: 34.5,
  west: -25,
  north: 71,
  east: 45,
};

// Full set of countries we consider "Europe" for trip planning — used to reject
// selections outside this region.
const EU_COUNTRY_CODES = [
  'be', 'nl', 'de', 'fr', 'ch', 'at', 'cz', 'it', 'es', 'pt', 'gb', 'ie', 'lu',
  'pl', 'dk', 'se', 'no', 'fi', 'gr', 'hu', 'sk', 'si', 'hr', 'ro', 'bg', 'ee', 'lv', 'lt',
];

interface UsePlacesAutocompleteOptions {
  onPlaceSelected: (description: string) => void;
  onInvalidSelection?: () => void;
}

export function usePlacesAutocomplete({ onPlaceSelected, onInvalidSelection }: UsePlacesAutocompleteOptions) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      bounds: new google.maps.LatLngBounds(
        { lat: EUROPE_BOUNDS.south, lng: EUROPE_BOUNDS.west },
        { lat: EUROPE_BOUNDS.north, lng: EUROPE_BOUNDS.east }
      ),
      strictBounds: true,
      fields: ['formatted_address', 'name', 'address_components'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const description = place.formatted_address || place.name;
      if (!description) return;

      const countryComponent = place.address_components?.find((c) => c.types.includes('country'));
      const countryCode = countryComponent?.short_name?.toLowerCase();

      if (countryCode && !EU_COUNTRY_CODES.includes(countryCode)) {
        onInvalidSelection?.();
        return;
      }

      onPlaceSelected(description);
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded, onPlaceSelected, onInvalidSelection]);

  return { inputRef, isLoaded };
}
