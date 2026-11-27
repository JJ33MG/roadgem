import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  challenge: vi.fn(),
  sendPost: vi.fn(),
  feed: vi.fn(),
  board: vi.fn(),
  like: vi.fn(),
  sendSuggestion: vi.fn(),
  pending: vi.fn(),
  decide: vi.fn(),
  privatePhoto: vi.fn().mockResolvedValue('blob:photo'),
  mine: vi.fn().mockResolvedValue({ posts: [], name: 'Anna', points: 640, rank: 14, toTop10: 120, moments: 9, likes: 1204, inTrips: 41, moderator: false }),
  photoSrc: (p: string) => p,
  monthly: vi.fn().mockResolvedValue({ challenge: 'The oldest bridge on your route.', plusOnly: true }),
  nearby: vi.fn(),
  addToTrip: vi.fn(),
  myTrips: vi.fn().mockResolvedValue([]),
  gemsOfTheWeek: vi.fn().mockResolvedValue([{ placeId: 'p1', name: 'Castle of Peñafiel', lat: 41.6, lng: -4.1, rating: 4.7, reviews: 5100, address: 'Peñafiel, Spain', photoUrl: null }]),
}));
const sub = vi.hoisted(() => ({ isPremium: true }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: sub.isPremium }) }));
vi.mock('@/lib/community', () => api);
vi.mock('@/lib/geo', () => ({ whereAmI: vi.fn().mockResolvedValue({ lat: 50.8469, lng: 4.3527, accuracy: 12 }) }));
vi.mock('@/lib/photo', () => ({ shrinkPhoto: vi.fn().mockResolvedValue('data:image/jpeg;base64,/9j/AAA=') }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Anna' }, isLoading: false }) }));

import { PostPhotoPage } from './PostPhotoPage';
import { CommunityPage } from './CommunityPage';
import { SuggestGemPage } from './SuggestGemPage';
import { ModeratePage } from './ModeratePage';
import { ExplorersPage } from './ExplorersPage';

const at = (path: string, el: JSX.Element, route: string) =>
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={el} /></Routes></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

describe('PostPhotoPage', () => {
  it('shows the gem’s challenge and sends the photo with the traveller’s location', async () => {
    api.challenge.mockResolvedValue({ gemId: 'g1', name: 'Grand-Place', status: 'official', lat: 50.8467, lng: 4.3525, challenge: 'Both towers in one shot.' });
    api.sendPost.mockResolvedValue({ id: 'p1', status: 'pending' });
    at('/community/post?placeId=pl1&name=Grand-Place&lat=50.8467&lng=4.3525&address=Brussels', <PostPhotoPage />, '/community/post');
    expect(await screen.findByText('Both towers in one shot.')).toBeInTheDocument();
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Take the photo'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'This photo does the challenge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send the photo' }));
    await waitFor(() => expect(api.sendPost).toHaveBeenCalledWith({
      gem: { gemId: 'g1' }, at: { lat: 50.8469, lng: 4.3527 }, photo: 'data:image/jpeg;base64,/9j/AAA=', caption: '', challenge: true,
    }));
    expect(await screen.findByText(/appears in the feed in a minute/)).toBeInTheDocument();
  });

  it('shows the server’s reason when the photo is refused', async () => {
    api.challenge.mockResolvedValue({ gemId: 'g1', name: 'Grand-Place', status: 'official', lat: 50.8467, lng: 4.3525, challenge: 'x' });
    api.sendPost.mockRejectedValue(new Error('Photos count only when you are at the gem (within 300 m). Try again when you are there.'));
    at('/community/post?gemId=g1', <PostPhotoPage />, '/community/post');
    await screen.findByText('Grand-Place');
    fireEvent.change(screen.getByLabelText('Take the photo'), { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Send the photo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('within 300 m');
  });
});

const MOMENT = {
  id: 'p1', userId: 'u2', caption: 'Woke up here.', challenge: false, points: 10, createdAt: '2026-11-26T10:00:00Z', by: 'anna_roams', team: false,
  gem: { id: 'g1', name: 'Lago di Braies', status: 'official', address: 'Braies, Italy', lat: 46.69, lng: 12.08 },
  distanceKm: 1.2, likes: 2, likedByMe: false, inTrips: 37, credit: '', rating: null, rank: 3, photoUrl: '/api/community/posts/p1/photo',
};

describe('CommunityPage', () => {
  it('opens on this week with moments near gems, and likes one', async () => {
    api.feed.mockResolvedValue([MOMENT]);
    api.like.mockResolvedValue({ liked: true, likes: 3 });
    at('/community', <CommunityPage />, '/community');
    expect(await screen.findByText('near Lago di Braies · 1.2 km')).toBeInTheDocument();
    expect(api.feed).toHaveBeenCalledWith({ period: 'week', page: 0 });
    expect(screen.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('#3 this week')).toBeInTheDocument();
    expect(screen.getByText('In 37 trips')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Like, 2 likes' }));
    expect(await screen.findByRole('button', { name: 'Unlike, 3 likes' })).toBeInTheDocument();
  });

  it('saves the gem for the next trip when I have no trip yet', async () => {
    api.feed.mockResolvedValue([MOMENT]);
    api.myTrips.mockResolvedValue([]);
    api.addToTrip.mockResolvedValue({ added: 'saved', inTrips: 38 });
    at('/community', <CommunityPage />, '/community');
    fireEvent.click(await screen.findByRole('button', { name: 'Add Lago di Braies to my trip' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save for my next trip' }));
    await waitFor(() => expect(api.addToTrip).toHaveBeenCalledWith('g1', { postId: 'p1' }));
    expect(await screen.findByText('Saved. We add it when you plan a trip that passes by.')).toBeInTheDocument();
  });

  it('labels team moments as the RoamGem team, with the rating and the photo credit', async () => {
    api.feed.mockResolvedValue([{ ...MOMENT, id: 't1', by: 'RoamGem team', team: true, rank: null, rating: 4.7, credit: 'Photo: Wikimedia Commons' }]);
    at('/community', <CommunityPage />, '/community');
    expect(await screen.findByText('RoamGem team')).toBeInTheDocument();
    expect(screen.getByText('Checked gem · rated 4.7 on Google')).toBeInTheDocument();
    expect(screen.getByText('Photo: Wikimedia Commons')).toBeInTheDocument();
  });
});

describe('ExplorersPage', () => {
  it('shows my place, how far the top 10 is, and the board', async () => {
    api.board.mockResolvedValue([{ rank: 1, userId: 'u2', name: 'lukas.vanlife', points: 2310, moments: 23, likes: 900, inTrips: 40, gems: 0 }]);
    at('/community/explorers', <ExplorersPage />, '/community/explorers');
    expect(await screen.findByText('lukas.vanlife')).toBeInTheDocument();
    expect(screen.getByText('2,310')).toBeInTheDocument();
    expect(await screen.findByText('#14 this week · 120 points to #10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'This month' }));
    await waitFor(() => expect(api.board).toHaveBeenLastCalledWith({ period: 'month', country: '' }));
  });
});

describe('Post a moment', () => {
  it('lists gems nearby and posts the moment tagged to the chosen one', async () => {
    api.nearby.mockResolvedValue([
      { placeId: 'pl1', name: 'Lago di Braies', lat: 46.69, lng: 12.08, address: 'Italy', distanceKm: 1.2 },
      { gemId: 'g7', name: 'Prato Piazza viewpoint', lat: 46.65, lng: 12.17, address: 'Italy', distanceKm: 4.6 },
    ]);
    api.sendPost.mockResolvedValue({ id: 'p1', status: 'pending' });
    at('/community/post', <PostPhotoPage />, '/community/post');
    fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByText('1.2 km')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Prato Piazza viewpoint/ }));
    fireEvent.change(screen.getByLabelText('Say something'), { target: { value: 'Our camper spot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post to the community' }));
    await waitFor(() => expect(api.sendPost).toHaveBeenCalledWith({
      gem: { gemId: 'g7' }, at: { lat: 50.8469, lng: 4.3527 }, photo: 'data:image/jpeg;base64,/9j/AAA=', caption: 'Our camper spot', challenge: false,
    }));
    expect(await screen.findByText(/appears in the feed in a minute/)).toBeInTheDocument();
  });
});

describe('SuggestGemPage', () => {
  it('sends the new gem with a photo and where the traveller stands', async () => {
    api.sendSuggestion.mockResolvedValue({ gemId: 'g9', postId: 'p9' });
    at('/community/suggest', <SuggestGemPage />, '/community/suggest');
    fireEvent.change(screen.getByLabelText('Name of the place'), { target: { value: 'Bench above the Meuse' } });
    fireEvent.change(screen.getByLabelText('What makes it special'), { target: { value: 'The quietest view of the valley at sunset.' } });
    fireEvent.change(screen.getByLabelText('Kind of place'), { target: { value: 'viewpoint' } });
    fireEvent.change(screen.getByLabelText('Take the photo'), { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Send the gem' }));
    await waitFor(() => expect(api.sendSuggestion).toHaveBeenCalledWith({
      name: 'Bench above the Meuse', description: 'The quietest view of the valley at sunset.', category: 'viewpoint',
      at: { lat: 50.8469, lng: 4.3527 }, photo: 'data:image/jpeg;base64,/9j/AAA=',
    }));
    expect(await screen.findByText(/turns official/)).toBeInTheDocument();
  });
});

describe('ModeratePage', () => {
  it('keeps suggesting a new gem for Plus, with the way to get it', () => {
    sub.isPremium = false;
    render(<MemoryRouter><SuggestGemPage /></MemoryRouter>);
    expect(screen.getByText('Suggesting new gems comes with Plus.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See Plus' })).toHaveAttribute('href', '/pricing');
    expect(screen.queryByRole('button', { name: /Send/ })).toBeNull();
    sub.isPremium = true;
  });

  it('lists waiting photos and approves one', async () => {
    api.pending.mockResolvedValue([{ id: 'p1', caption: 'Hi', challenge: true, distanceM: 26, aiNote: 'Clear photo.', createdAt: '2026-11-20T10:00:00Z', user: { name: 'Anna' }, gem: { name: 'Grand-Place', status: 'official', description: '' }, photoUrl: '/api/community/posts/p1/photo' }]);
    api.decide.mockResolvedValue({});
    at('/community/moderate', <ModeratePage />, '/community/moderate');
    expect(await screen.findByText('Clear photo.')).toBeInTheDocument();
    expect(screen.getByText('26 m from the gem')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve with the challenge, 50 points' }));
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith('p1', 'approve'));
    expect(await screen.findByText('Nothing waiting. All photos are checked.')).toBeInTheDocument();
  });
});
