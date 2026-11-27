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
  mine: vi.fn().mockResolvedValue({ posts: [], points: 0, rank: null, moderator: false }),
  photoSrc: (p: string) => p,
  monthly: vi.fn().mockResolvedValue({ challenge: 'The oldest bridge on your route.', plusOnly: true }),
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
    expect(await screen.findByText(/appears in the feed after a quick check/)).toBeInTheDocument();
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

describe('CommunityPage', () => {
  it('shows the feed with likes and the explorers board', async () => {
    api.feed.mockResolvedValue([{ id: 'p1', caption: 'Morning light', challenge: true, points: 50, createdAt: '2026-11-20T10:00:00Z', by: 'Anna', gem: { id: 'g1', name: 'Grand-Place', status: 'official', address: 'Brussels', lat: 1, lng: 1 }, likes: 2, likedByMe: false, photoUrl: '/api/community/posts/p1/photo' }]);
    api.board.mockResolvedValue([{ rank: 1, userId: 'u2', name: 'Bert', points: 260, photos: 3, gems: 1 }]);
    api.like.mockResolvedValue({ liked: true, likes: 3 });
    at('/community', <CommunityPage />, '/community');
    expect(await screen.findByText('Grand-Place')).toBeInTheDocument();
    expect(screen.getByText('Challenge done')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Like, 2 likes' }));
    expect(await screen.findByRole('button', { name: 'Unlike, 3 likes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Explorers board' }));
    expect(await screen.findByText('Bert')).toBeInTheDocument();
    expect(screen.getByText('260 points')).toBeInTheDocument();
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

  it('shows the challenge of the month, for Plus', async () => {
    api.feed.mockResolvedValue([]);
    api.board.mockResolvedValue([]);
    render(<MemoryRouter><CommunityPage /></MemoryRouter>);
    expect(await screen.findByText('The oldest bridge on your route.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Challenge of the month' })).toBeInTheDocument();
  });

  it('shows gems of the week, and labels team posts as the RoamGem team', async () => {
    api.feed.mockResolvedValue([{ id: 'x', caption: 'Sunrise', challenge: false, points: 10, createdAt: '2027-03-01', by: 'RoamGem team', team: true, gem: { id: 'g', name: 'Lerma', status: 'official', address: '', lat: 0, lng: 0 }, likes: 0, likedByMe: false, photoUrl: '/p' }]);
    api.board.mockResolvedValue([]);
    render(<MemoryRouter><CommunityPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Gems of the week' })).toBeInTheDocument();
    expect(screen.getByText('Castle of Peñafiel')).toBeInTheDocument();
    expect(await screen.findByText('RoamGem team')).toBeInTheDocument();
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
