import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GeneratedTrip } from '@/types';
import { TripResultsPage } from './TripResultsPage';

const sub = vi.hoisted(() => ({ isPremium: false }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: sub.isPremium }) }));
vi.mock('@/components/map/GlobeMap', () => ({ GlobeMap: () => <div role="region" aria-label="Map of the route, the nights and the gems" /> }));
const edits = vi.hoisted(() => ({ key: null as string | null, sendEdit: vi.fn() }));
vi.mock('@/lib/tripEdits', () => ({ editKeyFor: () => edits.key, sendEdit: edits.sendEdit }));
const stays = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock('@/hooks/useAccommodations', () => ({ useAccommodations: () => ({ accommodations: stays.list, isLoading: false }) }));

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

  it('shows what each day costs and the estimated total of the trip', () => {
    const t = trip({ ...base, vehicle: 'campervan' } as never);
    t.costs = {
      updated: '2026-11-22',
      overnight: 35,
      legs: [
        { fuel: 41, tolls: 0, vignettes: [], warnings: [], total: 41 },
        { fuel: 80, tolls: 22, vignettes: [{ country: 'AT', label: 'Austrian 10-day vignette', price: 12.8 }], warnings: ['France: many cities need a Crit’Air sticker.'], total: 114.8 },
      ],
    };
    renderTrip(t);
    const day = screen.getByRole('region', { name: 'Costs of day 1' });
    expect(within(day).getByText('Diesel')).toBeInTheDocument();
    expect(within(day).getByText('€41')).toBeInTheDocument();
    expect(within(day).getByText('Campsite tonight')).toBeInTheDocument();
    expect(within(day).getByText('Estimate, prices of 22 Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('About €191 for the trip')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    const day2 = screen.getByRole('region', { name: 'Costs of day 2' });
    expect(within(day2).getByText('Austrian 10-day vignette')).toBeInTheDocument();
    expect(within(day2).getByText('France: many cities need a Crit’Air sticker.')).toBeInTheDocument();
  });

  it('lets the planner of the trip hide a gem and add a rest day, without planning again', async () => {
    edits.key = 'k';
    const t = trip({ ...base });
    t.hiddenGems = [{ name: 'Lerma', description: 'Ducal square.', address: 'Lerma', latitude: 42.02, longitude: -3.75, category: 'historic', placeId: 'pl1' }];
    edits.sendEdit.mockResolvedValueOnce({ ...t, planner: { ...t.planner, hiddenGems: ['pl1'] } });
    renderTrip(t);
    fireEvent.click(screen.getByRole('button', { name: 'Hide Lerma' }));
    await waitFor(() => expect(edits.sendEdit).toHaveBeenCalledWith('t1', { type: 'hideGem', placeId: 'pl1' }));
    expect(await screen.findByRole('button', { name: 'Show 1 hidden gem' })).toBeInTheDocument();
    edits.sendEdit.mockResolvedValueOnce(t);
    fireEvent.click(screen.getByRole('button', { name: 'Add a rest day here' }));
    await waitFor(() => expect(edits.sendEdit).toHaveBeenCalledWith('t1', { type: 'restDay', afterDay: 1 }));
    edits.key = null;
  });

  it('shows each real gem with its Google rating as proof', () => {
    const t = trip({ ...base });
    t.hiddenGems = [{ name: 'Lerma', description: 'Ducal square.', address: 'Lerma', latitude: 42.02, longitude: -3.75, category: 'historic', placeId: 'pl1', rating: 4.7, reviews: 622 }];
    renderTrip(t);
    expect(screen.getByText('Real place, rated 4.7 by 622 Google reviewers')).toBeInTheDocument();
  });

  it('lets the signed-in owner change the trip on another device (no edit key here)', () => {
    edits.key = null;
    renderTrip({ ...trip({ ...base }), yours: true });
    expect(screen.getByRole('button', { name: 'Add a rest day here' })).toBeInTheDocument();
  });

  it('shows tonight\'s stays with their price a night and a link to book, without opening anything', () => {
    stays.list = [
      { id: 'c1', name: 'Camping Lerma', type: 'campsite', rating: 4.2, pricePerNight: 22, imageUrl: null, address: 'Lerma', latitude: 42, longitude: -3.7, affiliateUrl: 'https://www.booking.com/x?aid=1' },
      { id: 'c2', name: 'Camping Burgos', type: 'campsite', rating: 4.6, pricePerNight: 32, imageUrl: null, address: 'Burgos', latitude: 42.3, longitude: -3.7, affiliateUrl: 'https://www.booking.com/y?aid=1' },
    ];
    renderTrip(trip({ ...base }));
    const tonight = screen.getByRole('list', { name: 'Stays tonight' });
    const first = within(tonight).getAllByRole('listitem')[0];
    expect(first).toHaveTextContent('Camping Burgos');
    expect(first).toHaveTextContent('About €32 a night');
    // Through Routify's server, which adds the affiliate id and counts the click.
    const href = within(first).getByRole('link', { name: 'Check prices for Camping Burgos' }).getAttribute('href')!;
    expect(href).toMatch(/\/track\/go\/booking\?/);
    expect(new URLSearchParams(href.split('?')[1]).get('to')).toBe('https://www.booking.com/y?aid=1');
    stays.list = [];
  });

  it('offers campsites on Pitchup in tonight\'s country, and a campervan to rent for a campervan trip', () => {
    const t = trip({ ...base, vehicle: 'campervan', legs: [{ km: 245, hours: 2.5, countries: [{ code: 'ES', km: 245 }] }] } as never);
    renderTrip(t);
    const pitchup = screen.getByRole('link', { name: 'Campsites in Spain on Pitchup' }).getAttribute('href')!;
    expect(new URLSearchParams(pitchup.split('?')[1]).get('to')).toBe('https://www.pitchup.com/campsites/spain/');
    expect(screen.getByRole('heading', { name: 'Rent a campervan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Roadsurfer' }).getAttribute('href')).toMatch(/\/track\/go\/roadsurfer\?/);
    expect(screen.queryByRole('heading', { name: 'Rental car' })).toBeNull();
  });

  it('links things to do in tonight\'s town on GetYourGuide', () => {
    renderTrip(trip({ ...base }));
    const gyg = screen.getByRole('link', { name: 'Things to do in Burgos' }).getAttribute('href')!;
    expect(new URLSearchParams(gyg.split('?')[1]).get('to')).toBe('https://www.getyourguide.com/s/?q=Burgos');
  });

  it('shows what the toll-free route saves; Plus switches to it in one tap', async () => {
    const t = trip({ ...base });
    t.costs = { updated: '2026-11-22', overnight: 35, legs: [{ fuel: 41, tolls: 30, vignettes: [], warnings: [], total: 71 }], cheaper: { tollFree: true, using: false, saves: 58, extraHours: 1.7, extraKm: 40 } };
    const { unmount } = renderTrip(t);
    let box = screen.getByRole('region', { name: 'Cheapest route' });
    expect(within(box).getByText('Skip the toll roads and save about €58')).toBeInTheDocument();
    expect(within(box).getByText('About 1 h 40 min longer, 40 km more.')).toBeInTheDocument();
    expect(within(box).getByRole('link', { name: 'See Plus' })).toBeInTheDocument();
    expect(within(box).queryByRole('button')).toBeNull();
    unmount();

    sub.isPremium = true;
    edits.key = 'k';
    edits.sendEdit.mockResolvedValueOnce(t);
    renderTrip(t);
    box = screen.getByRole('region', { name: 'Cheapest route' });
    fireEvent.click(within(box).getByRole('button', { name: 'Use the toll-free route' }));
    await waitFor(() => expect(edits.sendEdit).toHaveBeenCalledWith('t1', { type: 'route' }));
    sub.isPremium = false;
    edits.key = null;
  });

  it('keeps the printable PDF for Plus', () => {
    renderTrip(trip({ ...base }));
    expect(screen.queryByRole('button', { name: 'Download PDF' })).toBeNull();
    expect(screen.getByRole('link', { name: 'PDF with Plus' })).toHaveAttribute('href', '/pricing');
  });

  it('shows no change buttons to someone who did not plan the trip', () => {
    edits.key = null;
    renderTrip(trip({ ...base }));
    expect(screen.queryByRole('button', { name: 'Add a rest day here' })).toBeNull();
  });

  it('shows no gems and no Plus prompt when gems are switched off', () => {
    renderTrip(trip({ ...base, gemsEnabled: false, stayTypes: ['hotel'] }));
    expect(screen.queryByText(/gem/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Every gem with Plus' })).toBeNull();
  });

  it('offers one booking button per chosen stay type', () => {
    renderTrip(trip({ ...base, stayTypes: ['holiday_home'] }));
    expect(screen.getByRole('link', { name: 'Holiday homes' }).getAttribute('href')).toMatch(/\/track\/go\/vrbo\?/);
    expect(screen.queryByRole('link', { name: /^Hotels/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Campsites/ })).toBeNull();
  });
});

describe('TripResultsPage booking clicks', () => {
  it('sends a booking click through the server, which counts it and adds the affiliate id', () => {
    renderTrip(trip({ ...base, stayTypes: ['hotel'] }));
    const href = screen.getByRole('link', { name: 'Hotels' }).getAttribute('href')!;
    expect(href).toMatch(/\/track\/go\/booking\?/);
    expect(new URLSearchParams(href.split('?')[1]).get('trip')).toBe('t1');
  });
});
