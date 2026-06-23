import { useCallback, useEffect, useState } from 'react';
import { DirectionsRenderer, GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import type { AccommodationOption, FuelStation, HiddenGem } from '@/types';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';
import { LoadingSpinner } from '../utility/LoadingSpinner';

interface MapStop {
  location: string;
  latitude: number;
  longitude: number;
}

interface TripMapProps {
  stops: MapStop[];
  fuelStations?: FuelStation[];
  hiddenGems?: HiddenGem[];
  accommodations?: AccommodationOption[];
  className?: string;
}

const ACCOMMODATION_COLORS: Record<AccommodationOption['type'], string> = {
  hotel: '#4dd0e1',
  hostel: '#ffb648',
  campsite: '#7cd992',
  airbnb: '#ff6b9d',
};

const GEM_COLORS: Record<string, string> = {
  nature: '#af50ff',
  food: '#ffb648',
  culture: '#7f56d9',
  viewpoint: '#ffb648',
  historic: '#7f56d9',
  other: '#e1bdff',
};

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

// Void / Iris theme — dark map styling
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e1e2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c3c3cc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e1e2e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3a4a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#ededf3' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#ededf3' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#16161f' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e1e2e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2a1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3a3a50' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a3a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#4a4a60' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#6644aa' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#af50ff' }, { weight: 0.5 }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#828384' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a2a3a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a18' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a4a6a' }] },
];

export function TripMap({ stops, fuelStations = [], hiddenGems = [], accommodations = [], className }: TripMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    setDirections(null);
    if (!isLoaded || stops.length < 2) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: stops[0].latitude, lng: stops[0].longitude },
        destination: { lat: stops[stops.length - 1].latitude, lng: stops[stops.length - 1].longitude },
        waypoints: stops.slice(1, -1).map((stop) => ({
          location: { lat: stop.latitude, lng: stop.longitude },
          stopover: true,
        })),
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        }
      }
    );
  }, [isLoaded, stops]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      if (stops.length === 0) return;

      if (stops.length === 1) {
        map.setCenter({ lat: stops[0].latitude, lng: stops[0].longitude });
        map.setZoom(10);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      stops.forEach((stop) => bounds.extend({ lat: stop.latitude, lng: stop.longitude }));
      map.fitBounds(bounds, 48);
    },
    [stops]
  );

  if (loadError) {
    return (
      <div className={className ?? 'flex h-full items-center justify-center'}>
        <p className="p-16 text-center text-body-sm text-silver">
          Failed to load Google Maps: {loadError.message}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={className ?? 'flex h-full items-center justify-center'}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <div className={className ?? 'flex h-full items-center justify-center'}>
        <p className="p-16 text-center text-body-sm text-silver">No route data available.</p>
      </div>
    );
  }

  const center = { lat: stops[0].latitude, lng: stops[0].longitude };

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={6}
        onLoad={onLoad}
        options={{ styles: MAP_STYLES, disableDefaultUI: true, zoomControl: true }}
      >
        {directions ? (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: { strokeColor: '#af50ff', strokeWeight: 4 },
            }}
          />
        ) : (
          <Polyline
            path={stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }))}
            options={{ strokeColor: '#af50ff', strokeWeight: 4, strokeOpacity: 0.6 }}
          />
        )}

        {stops.map((stop, index) => (
          <Marker
            key={`${stop.location}-${index}`}
            position={{ lat: stop.latitude, lng: stop.longitude }}
            label={{ text: `${index + 1}`, color: '#ffffff' }}
            title={stop.location}
          />
        ))}

        {fuelStations.map((station) => (
          <Marker
            key={station.id}
            position={{ lat: station.latitude, lng: station.longitude }}
            title={`${station.brand} — ${station.price} ${station.currency}`}
            icon={{
              url: '/icons/fuel-pin.svg',
              scaledSize: new google.maps.Size(24, 24),
            }}
          />
        ))}

        {accommodations.map((acc) => (
          <Marker
            key={`accommodation-${acc.id}`}
            position={{ lat: acc.latitude, lng: acc.longitude }}
            title={`${acc.name} — €${acc.pricePerNight}/night`}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: ACCOMMODATION_COLORS[acc.type],
              fillOpacity: 1,
              strokeColor: '#090909',
              strokeWeight: 2,
            }}
          />
        ))}

        {hiddenGems.map((gem, index) => (
          <Marker
            key={`gem-${index}`}
            position={{ lat: gem.latitude, lng: gem.longitude }}
            title={`${gem.name} — ${gem.description}`}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: GEM_COLORS[gem.category] ?? '#ffd700',
              fillOpacity: 1,
              strokeColor: '#090909',
              strokeWeight: 2,
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
