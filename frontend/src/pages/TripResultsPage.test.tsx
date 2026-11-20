import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GeneratedTrip } from '@/types';
import { TripResultsPage } from './TripResultsPage';

vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: false }) }));
vi.mock('@/components/map/TripMapView', () => ({ TripMapView: () => <div role="region" aria-label="Map of the route, the nights and the gems" /> }));
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

  it('keeps the nights in the last town when the trip has more days than legs', () => {
    const t = trip({ ...base });
    t.destination = 'Toledo';
    t.days = 3;
    t.stops = [stop('Madrid', 40.4, -3.7), stop('Toledo', 39.86, -4.02)];
    t.itinerary = [1, 2, 3].map((day) => ({ day, morning: slot('Walk', 'Toledo'), afternoon: slot('Museum', 'Toledo'), evening: slot('Dinner', 'Toledo') }));
    renderTrip(t);
    expect(screen.getByRole('heading', { name: 'Madrid to Toledo', level: 2 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    expect(screen.getByRole('heading', { name: 'A day in Toledo', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Sleep in Toledo')).toBeInTheDocument();
  });

  it('shows a free traveller three gems and says how many more Plus unlocks', () => {
    const t = trip({ ...base, gemsPerDay: 6 });
    t.hiddenGems = Array.from({ length: 6 }, (_, i) => ({ name: `Gem ${i}`, description: 'Nice.', address: 'Lerma', latitude: 42 + i / 100, longitude: -3.7, category: 'historic' }));
    t.lockedGems = 4;
    renderTrip(t);
    expect(screen.getAllByText(/^Gem \d$/).length).toBeLessThanOrEqual(3);
    expect(screen.getByText('4 more gems on this trip with Plus.')).toBeInTheDocument();
  });

  it('follows the overnight town of each day from the plan', () => {
    const t = trip({ ...base, overnights: ['San Sebastián', 'Bordeaux'] });
    t.stops = [stop('Madrid', 40.4, -3.7), stop('Burgos', 42.3, -3.7), stop('San Sebastián', 43.3, -1.98), stop('Bordeaux', 44.84, -0.58)];
    renderTrip(t);
    expect(screen.getByRole('heading', { level: 2, name: 'Madrid to San Sebastián' })).toBeInTheDocument();
    expect(screen.getByText('Sleep in San Sebastián')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    expect(screen.getByRole('heading', { level: 2, name: 'San Sebastián to Bordeaux' })).toBeInTheDocument();
  });

  it('shows no gems on a day whose road has none, instead of repeating others', () => {
    const t = trip({ ...base });
    t.hiddenGems = [{ name: 'Far gem', description: 'x', address: 'x', latitude: 60, longitude: 20, category: 'nature' }];
    renderTrip(t);
    expect(screen.queryByText('Far gem')).toBeNull();
  });

  it('shows a gem next to an overnight town on one day only', () => {
    const t = trip({ ...base });
    t.hiddenGems = [{ name: 'Burgos gem', description: 'x', address: 'x', latitude: 42.4, longitude: -3.65, category: 'nature' }];
    renderTrip(t);
    const day1 = screen.queryAllByText('Burgos gem').length;
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    const day2 = screen.queryAllByText('Burgos gem').length;
    expect(day1 + day2).toBe(1);
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

describe('TripResultsPage booking clicks', () => {
  it('counts a click on a booking link', async () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    renderTrip(trip({ ...base, stayTypes: ['hotel'] }));
    screen.getByRole('link', { name: 'Hotels' }).click();
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});
