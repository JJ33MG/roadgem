import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const road = vi.hoisted(() => ({
  here: vi.fn(),
  checkInAt: vi.fn(),
  getPassport: vi.fn(async () => ({ total: 9, stamps: [{ placeId: 'a' }, { placeId: 'b' }, { placeId: 'c' }, { placeId: 'd' }] })),
}));
vi.mock('@/lib/road', () => road);
import { OnTheRoad } from './OnTheRoad';

const gems = [{ placeId: 'p1', name: 'Lerma', latitude: 42, longitude: -3.75 }];
const show = (signedIn = true) =>
  render(<MemoryRouter><OnTheRoad tripId="t1" gems={gems as never} signedIn={signedIn} /></MemoryRouter>);

describe('On the road', () => {
  it('shows the passport and collects a gem from where the traveller is', async () => {
    road.here.mockResolvedValueOnce({ lat: 42.001, lng: -3.75 });
    road.checkInAt.mockResolvedValueOnce({ points: 20, stamps: 5, total: 9 });
    show();
    expect(await screen.findByText('4 of 9 gems')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "I'm at Lerma" }));
    await waitFor(() => expect(road.checkInAt).toHaveBeenCalledWith('t1', 'p1', { lat: 42.001, lng: -3.75 }));
    expect(await screen.findByText('Collected, +20 points')).toBeInTheDocument();
    expect(screen.getByText('5 of 9 gems')).toBeInTheDocument();
  });

  it('asks for location when it is refused, and sends nothing', async () => {
    road.here.mockRejectedValueOnce(new Error('denied'));
    road.checkInAt.mockClear();
    show();
    fireEvent.click(await screen.findByRole('button', { name: "I'm at Lerma" }));
    expect(await screen.findByText('Allow location to check in')).toBeInTheDocument();
    expect(road.checkInAt).not.toHaveBeenCalled();
  });

  it('invites a signed-out traveller to log in', () => {
    show(false);
    expect(screen.getByRole('link', { name: 'Log in to collect stamps' })).toBeInTheDocument();
  });
});
