import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GeneratedTrip } from '@/types';
import { TripResultsPage } from './TripResultsPage';

vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: false }) }));
vi.mock('@/hooks/useAccommodations', () => ({ useAccommodations: () => ({ accommodations: [], isLoading: false }) }));

const slot = (activity: string, location: string) => ({ time: '10:00', activity, location, description: 'A short visit.', estimatedCost: 10, notes: '' });
const stop = (location: string, latitude: number, longitude: number) => ({
  location, latitude, longitude, reason: 'Night stop', description: 'A good town to sleep.', activities: [], bestTimeOfDay: 'Evening', estimatedDuration: '1 night', localSpecialties: [],
});

function trip(planner: GeneratedTrip['planner']): GeneratedTrip {
  return {
    tripId: 't1', destination: 'Brussels', startDate: '2026-06-04', endDate: '2026-06-06', days: 2,
    stops: [stop('Madrid', 40.4, -3.7), stop('Burgos', 42.3, -3.7), stop('Brussels', 50.8, 4.35)],
    itinerary: [
      { day: 1, morning: slot('Leave Madrid', 'Madrid'), afternoon: slot('Lerma old town', 'Lerma'), evening: slot('Dinner', 'Burgos') },
      { day: 2, morning: slot('Drive north', 'A-1'), afternoon: slot('Coffee stop', 'Vitoria'), evening: slot('Dinner', 'Brussels') },
    ],
    totalCost: 500, totalDistance: 1580, highlights: [], tips: [], weather: [],
    hiddenGems: [{ name: 'Lerma', description: 'Ducal square.', address: 'Lerma, Burgos', latitude: 42.02, longitude: -3.75, category: 'historic' }],
    planner,
  };
}

function renderTrip(t: GeneratedTrip) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/trips/t1', state: { trip: t } }]}>
      <Routes><Route path="/trips/:tripId" element={<TripResultsPage />} /></Routes>
    </MemoryRouter>,
  );
}

const base = { kmPerDay: 350, gemsPerDay: 3, gemsEnabled: true, stayTypes: ['campsite', 'hotel'] as const, filters: [] };

describe('TripResultsPage', () => {
  it('shows the route and the first day by its towns', () => {
    renderTrip(trip({ ...base, stayTypes: ['campsite', 'hotel'] }));
    expect(screen.getByRole('heading', { level: 1, name: 'Madrid to Brussels' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Madrid to Burgos' })).toBeInTheDocument();
    expect(screen.getByText('Sleep in Burgos')).toBeInTheDocument();
  });

  it('shows no gems and no Plus prompt when gems are switched off', () => {
    renderTrip(trip({ ...base, gemsEnabled: false, stayTypes: ['hotel'] }));
    expect(screen.queryByText(/gem/i)).toBeNull();
    expect(screen.queryByText(/Plus/)).toBeNull();
  });

  it('offers one booking button per chosen stay type', () => {
    renderTrip(trip({ ...base, stayTypes: ['holiday_home'] }));
    expect(screen.getByRole('link', { name: /Airbnb and holiday homes/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Hotels/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Campsites/ })).toBeNull();
  });
});
