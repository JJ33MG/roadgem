import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GeneratedTrip } from '@/types';
import { TripResultsPage } from './TripResultsPage';

const sub = vi.hoisted(() => ({ isPremium: false }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: sub.isPremium }) }));
vi.mock('@/components/map/GlobeMap', () => ({ GlobeMap: () => <div role="region" aria-label="Map of the route, the nights and the gems" /> }));
const edits = vi.hoisted(() => ({ key: null as string | null, sendEdit: vi.fn() }));
vi.mock('@/lib/tripEdits', () => ({ editKeyFor: () => edits.key, sendEdit: edits.sendEdit, retryDays: vi.fn() }));
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

describe('TripResultsPage: each day in clear blocks (Jarne, 26 Nov: the day felt hectic)', () => {
  const costed = () => {
    const t = trip({ ...base, legs: [{ km: 245, hours: 2.6, countries: [{ code: 'ES', km: 245 }] }, { km: 600, hours: 6, countries: [{ code: 'FR', km: 600 }] }] } as never);
    t.weather = [{ day: 1, condition: 'Sunny', temp: 21 } as never];
    t.costs = { updated: '2026-11-22', overnight: 35, legs: [{ fuel: 41, tolls: 0, vignettes: [], warnings: [], total: 41 }, { fuel: 80, tolls: 22, vignettes: [], warnings: [], total: 102 }] };
    return t;
  };

  it('opens the day with a one-line summary: distance, time, weather and the cost of the day', () => {
    renderTrip(costed());
    const glance = screen.getByRole('region', { name: 'Day 1 at a glance' });
    expect(glance).toHaveTextContent('245 km');
    expect(glance).toHaveTextContent('2 h 36');
    expect(glance).toHaveTextContent('21°, Sunny');
    expect(glance).toHaveTextContent('€76');
  });

  it('splits the day into labelled blocks, each reachable from a jump link', () => {
    renderTrip(costed());
    for (const name of ['The drive', 'Gems on the way', 'The day', 'Costs today', 'Sleep in Burgos']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    const jump = screen.getByRole('navigation', { name: 'Jump to' });
    expect(within(jump).getByRole('link', { name: /Costs/ })).toHaveAttribute('href', '#day-cost');
    expect(within(jump).getByRole('link', { name: /1 gem/ })).toHaveAttribute('href', '#day-gems');
  });

  it('labels each place to sleep as hotel, campsite or holiday home', () => {
    stays.list = [{ id: 'c1', name: 'Camping Burgos', type: 'campsite', rating: 4.6, pricePerNight: 32, imageUrl: null, address: 'Burgos', latitude: 42.3, longitude: -3.7, affiliateUrl: 'https://www.booking.com/y?aid=1' }];
    renderTrip(costed());
    expect(within(screen.getByRole('list', { name: 'Stays tonight' })).getByText('Campsite')).toBeInTheDocument();
    stays.list = [];
  });
});

describe('TripResultsPage: gems for every day (26 Nov)', () => {
  it('shows the gems the server gave each day, also on a day spent in one town', () => {
    const t = trip({ ...base, overnights: ['Burgos', 'Burgos'] } as never);
    t.hiddenGems = [
      { name: 'Road gem', description: 'x', address: 'x', latitude: 41, longitude: -3.7, category: 'nature', day: 1 } as never,
      { name: 'Town gem', description: 'x', address: 'x', latitude: 42.34, longitude: -3.7, category: 'historic', day: 2 } as never,
    ];
    renderTrip(t);
    const gems = () => screen.queryByRole('region', { name: 'Gems on the way' });
    expect(within(gems()!).getByText('Road gem')).toBeInTheDocument();
    expect(within(gems()!).queryByText('Town gem')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    expect(within(gems()!).getByText('Town gem')).toBeInTheDocument();
  });
});

describe('TripResultsPage', () => {
  it('hides a gem photo that fails to load instead of showing a broken image', () => {
    const t = trip({ ...base });
    t.hiddenGems = [{ ...t.hiddenGems![0], photoUrl: '/api/photos/image/x' }];
    renderTrip(t);
    const img = screen.getByRole('img', { name: 'Lerma' });
    fireEvent.error(img);
    expect(img).not.toBeVisible();
  });

  it('shows a tab for a day still being written, with a note instead of its text', () => {
    const t = trip({ ...base, planning: true });
    t.itinerary = t.itinerary.slice(0, 1);
    renderTrip(t);
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    expect(screen.getByRole('status')).toHaveTextContent('Writing day 2');
    expect(screen.queryByText('Drive north')).not.toBeInTheDocument();
  });

  it('offers to try again for a day that could not be written', () => {
    edits.key = 'k';
    const t = trip({ ...base, planning: false, failedDays: [2] });
    t.itinerary = t.itinerary.slice(0, 1);
    renderTrip(t);
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    edits.key = null;
  });

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
    const gemBlock = screen.getByRole('region', { name: 'Gems on the way' });
    expect(within(gemBlock).getAllByText(/^Gem \d$/).length).toBeLessThanOrEqual(3);
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
    const inGems = () => { const b = screen.queryByRole('region', { name: 'Gems on the way' }); return b ? within(b).queryAllByText('Burgos gem').length : 0; };
    const day1 = inGems();
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    const day2 = inGems();
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

  it('offers the Trip pass on a trip, and a trip with a pass shows everything', () => {
    const t = trip({ ...base });
    t.hiddenGems = Array.from({ length: 6 }, (_, i) => ({ name: `Gem ${i}`, description: 'Nice.', address: 'Lerma', latitude: 42 + i / 100, longitude: -3.7, category: 'historic' }));
    const { unmount } = renderTrip(t);
    expect(screen.getByRole('button', { name: 'Get the Trip pass for this trip, €4.99' })).toBeInTheDocument();
    unmount();
    renderTrip({ ...t, lockedGems: 0, planner: { ...t.planner!, pass: true } });
    expect(screen.queryByRole('button', { name: /Trip pass/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Every gem with Plus' })).toBeNull();
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

  it('books every night in the same town as one stay, with its dates filled in', () => {
    const t = trip({ ...base, stayTypes: ['hotel'], overnights: ['Burgos', 'Burgos', 'Brussels'] } as never);
    t.days = 3;
    t.endDate = '2026-06-07';
    t.itinerary = [...t.itinerary, { ...t.itinerary[1], day: 3 }];
    renderTrip(t);
    const to = () => new URL(new URLSearchParams(screen.getByRole('link', { name: 'Hotels' }).getAttribute('href')!.split('?')[1]).get('to')!);
    expect(to().searchParams.get('ss')).toBe('Burgos');
    expect(to().searchParams.get('checkin')).toBe('2026-06-04');
    expect(to().searchParams.get('checkout')).toBe('2026-06-06');
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    expect(to().searchParams.get('checkin')).toBe('2026-06-04');
    expect(to().searchParams.get('checkout')).toBe('2026-06-06');
  });

  it('books stays for the whole group, two adults when an older trip has no group size', () => {
    const { unmount } = renderTrip(trip({ ...base, stayTypes: ['hotel', 'holiday_home'], travellers: 4 } as never));
    const to = (name: string) => new URL(new URLSearchParams(screen.getByRole('link', { name }).getAttribute('href')!.split('?')[1]).get('to')!);
    expect(to('Hotels').searchParams.get('group_adults')).toBe('4');
    expect(to('Hotels').searchParams.get('no_rooms')).toBe('2');
    expect(to('Holiday homes').searchParams.get('adults')).toBe('4');
    unmount();
    renderTrip(trip({ ...base, stayTypes: ['hotel'] }));
    expect(to('Hotels').searchParams.get('group_adults')).toBe('2');
  });

  it('offers a rental car that fits the group, with the dates and places, through Routify', () => {
    renderTrip(trip({ ...base, travellers: 6 } as never));
    const panel = screen.getByRole('heading', { name: 'Rental car' }).closest('div')!;
    expect(panel).toHaveTextContent('Pick up in Madrid on 4 June, drop off in Brussels on 6 June.');
    expect(panel).toHaveTextContent('A 7-seater');
    const compare = screen.getByRole('link', { name: 'Compare cars' }).getAttribute('href')!;
    expect(compare).toMatch(/\/track\/go\/discovercars\?/);
    expect(screen.getByRole('link', { name: 'Localrent' }).getAttribute('href')).toMatch(/\/track\/go\/localrent\?/);
  });

  it('offers tickets for the sights through Tiqets', () => {
    renderTrip(trip({ ...base }));
    expect(screen.getByRole('link', { name: 'Tickets for sights in Burgos' }).getAttribute('href')).toMatch(/\/track\/go\/tiqets\?/);
  });

  it('suggests mobile data only when the road leaves free EU roaming', () => {
    const legs = (codes: string[]) => codes.map((code) => ({ km: 300, hours: 3, countries: [{ code, km: 300 }] }));
    const { unmount } = renderTrip(trip({ ...base, legs: legs(['ES', 'FR']) }));
    expect(screen.queryByRole('heading', { name: 'Mobile data' })).not.toBeInTheDocument();
    unmount();
    renderTrip(trip({ ...base, legs: legs(['FR', 'CH']) }));
    expect(screen.getByRole('heading', { name: 'Mobile data' })).toBeInTheDocument();
    expect(screen.getByText(/Switzerland/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'eSIM from Airalo' }).getAttribute('href')).toMatch(/\/track\/go\/airalo\?/);
  });

  it('books the last nights of a trip in the same town as one stay too', () => {
    const t = trip({ ...base, stayTypes: ['hotel'], overnights: ['Madrid', 'Burgos', 'Burgos'] } as never);
    t.days = 3;
    t.endDate = '2026-06-07';
    t.itinerary = [...t.itinerary, { ...t.itinerary[1], day: 3 }];
    renderTrip(t);
    const to = () => new URL(new URLSearchParams(screen.getByRole('link', { name: 'Hotels' }).getAttribute('href')!.split('?')[1]).get('to')!);
    fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
    expect([to().searchParams.get('checkin'), to().searchParams.get('checkout')]).toEqual(['2026-06-05', '2026-06-07']);
    fireEvent.click(screen.getByRole('button', { name: 'Day 3' }));
    expect([to().searchParams.get('checkin'), to().searchParams.get('checkout')]).toEqual(['2026-06-05', '2026-06-07']);
  });
});
