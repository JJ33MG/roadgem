import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const card = vi.hoisted(() => ({ cardFile: vi.fn(async () => new File(['x'], 'routify-trip.png', { type: 'image/png' })) }));
vi.mock('@/lib/shareCard', () => card);
vi.mock('@/lib/road', () => ({ getPassport: vi.fn(async () => ({ total: 9, stamps: [{ placeId: 'a' }, { placeId: 'b' }] })) }));
vi.mock('@/lib/community', () => ({ myInvite: vi.fn(async () => ({ code: 'C', url: 'https://routify.test/signup?invite=C' })) }));
import { ShareTrip } from './ShareTrip';

describe('Share your trip', () => {
  it('makes the card with the passport and invite link, and opens the share sheet', async () => {
    const share = vi.fn(async () => {});
    Object.assign(navigator, { share, canShare: () => true });
    render(<ShareTrip tripId="t1" from="Amsterdam" to="Lake Garda" km={1240} countries={['NL', 'DE']} totalGems={9} signedIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Share your trip' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(card.cardFile).toHaveBeenCalledWith({ from: 'Amsterdam', to: 'Lake Garda', done: 2, total: 9, km: 1240, countries: ['NL', 'DE'], inviteUrl: 'https://routify.test/signup?invite=C' });
  });
});
