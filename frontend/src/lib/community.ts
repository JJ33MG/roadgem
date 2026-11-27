import axios from 'axios';
import { apiClient } from './apiClient';

export type FeedItem = {
  id: string; userId: string; caption: string; challenge: boolean; points: number; createdAt: string; by: string;
  /** No coordinates: a new place is where the poster stood. */
  gem: { id: string; name: string; status: string; address: string };
  likes: number; likedByMe: boolean; photoUrl: string;
  /** Kilometres from the gem, rounded to 0.1 (the exact spot is never shared). */
  distanceKm: number;
  /** How many travellers put this gem in a trip. */
  inTrips: number;
  /** Place in this week's top 10, if any. */
  rank: number | null;
  /** Team posts: the photo credit and the gem's Google rating. */
  credit: string;
  rating: number | null;
  /** Posted by the RoamGem team (labelled, never presented as a traveller). */
  team?: boolean;
};
export type FeedPeriod = 'today' | 'week' | 'route';
export type BoardPeriod = 'week' | 'month' | 'all';
export type BoardRow = { rank: number; userId: string; name: string; points: number; moments: number; likes: number; inTrips: number; gems: number };
export type NearbyGem = { gemId?: string; placeId?: string; name: string; lat: number; lng: number; address: string; distanceKm: number };
export type MyTrip = { id: string; title: string; days: number; startDate: string };
export type GemChallenge = { gemId: string; name: string; status: string; lat: number; lng: number; challenge: string };
export type GemRef = { gemId: string } | { placeId: string; name: string; lat: number; lng: number; address?: string };
type At = { lat: number; lng: number };

/** The server's own sentence when it gives one (it explains refusals), else a plain fallback. */
function reason(err: unknown, fallback: string): Error {
  const msg = axios.isAxiosError(err) ? (err.response?.data as { error?: unknown } | undefined)?.error : null;
  return new Error(typeof msg === 'string' && msg ? msg : fallback);
}
const call = async <T,>(p: Promise<{ data: T }>, fallback: string): Promise<T> => {
  try {
    return (await p).data;
  } catch (e) {
    throw reason(e, fallback);
  }
};

/** Full address for a photo served by the API (same origin on the preview). */
export const photoSrc = (path: string) => `${import.meta.env.VITE_BACKEND_URL ?? ''}${path}`;

export const challenge = (gem: GemRef) => call<GemChallenge>(apiClient.post('/community/challenge', gem), 'This gem could not be loaded.');
export const sendPost = (body: { gem: GemRef; at: At; photo: string; caption: string; challenge: boolean }) =>
  call<{ id: string; status: string }>(apiClient.post('/community/posts', body, { timeout: 60_000 }), 'The photo could not be sent. Try again.');
export const sendSuggestion = (body: { name: string; description: string; category: string; at: At; photo: string }) =>
  call<{ gemId: string; postId: string }>(apiClient.post('/community/suggest', body, { timeout: 60_000 }), 'The gem could not be sent. Try again.');
export const feed = (q: { period: FeedPeriod; page: number }) => call<FeedItem[]>(apiClient.get('/community/feed', { params: q }), 'The feed could not be loaded.');
export const board = (q: { period: BoardPeriod; country: string }) => call<BoardRow[]>(apiClient.get('/community/board', { params: q }), 'The board could not be loaded.');
export const nearby = (at: At) => call<NearbyGem[]>(apiClient.get('/community/nearby', { params: at }), 'Gems nearby could not be loaded.');
export const myTrips = () => call<MyTrip[]>(apiClient.get('/community/my-trips'), 'Your trips could not be loaded.');
export const addToTrip = (gemId: string, body: { postId?: string; tripId?: string; day?: number }) =>
  call<{ added: 'trip' | 'saved'; inTrips: number }>(apiClient.post(`/community/gems/${gemId}/add`, body), 'Adding the gem did not work.');
export const like = (postId: string) => call<{ liked: boolean; likes: number }>(apiClient.post(`/community/posts/${postId}/like`), 'Liking did not work.');
export type MyPosts = {
  posts: { id: string; status: string; points: number; challenge: boolean; createdAt: string; gem: { name: string }; photoUrl: string }[];
  name: string; points: number; rank: number | null; toTop10: number; moments: number; likes: number; inTrips: number; moderator: boolean;
};
export const mine = (period: BoardPeriod = 'week') => call<MyPosts>(apiClient.get('/community/me', { params: { period } }), 'Your posts could not be loaded.');
export type Pending = { id: string; caption: string; challenge: boolean; distanceM: number; aiNote: string; createdAt: string; user: { name: string }; gem: { name: string; status: string; description: string }; photoUrl: string };
export const pending = () => call<Pending[]>(apiClient.get('/community/moderation'), 'The queue could not be loaded.');
export const decide = (postId: string, decision: 'approve' | 'approve_photo' | 'reject') =>
  call(apiClient.post(`/community/posts/${postId}/review`, { decision }), 'That did not work.');

/** A photo that needs the login (pending ones, for their owner or a moderator): fetched, then shown from memory. */
export async function privatePhoto(path: string): Promise<string> {
  const res = await apiClient.get(path.replace(/^\/api/, ''), { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
}

export const monthly = () => call<{ challenge: string; plusOnly: boolean }>(apiClient.get('/community/monthly'), 'The challenge could not be loaded.');
export type ExplorerAnswer = { locked: true; count: number } | { gems: { id: string; name: string; lat: number; lng: number; description: string }[] };
export const explorerGems = (tripId: string) => call<ExplorerAnswer>(apiClient.get(`/community/explorer/${tripId}`), 'Explorer gems could not be loaded.');
export const myInvite = () => call<{ code: string; url: string }>(apiClient.get('/community/invite'), 'Your invite link could not be loaded.');
export type WeekGem = { placeId: string; name: string; lat: number; lng: number; rating: number; reviews: number; address: string; photoUrl: string | null };
export const gemsOfTheWeek = () => call<WeekGem[]>(apiClient.get('/community/gems-of-the-week'), 'The gems of the week could not be loaded.');
