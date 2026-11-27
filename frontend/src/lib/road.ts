import i18n from '@/i18n';
// On the road: where the traveller is, checking in at a gem, and the trip passport.
import axios from 'axios';
import { apiClient } from './apiClient';
import { editKeyFor } from './tripEdits';

export type Point = { lat: number; lng: number };

/** The device's position (asks the traveller once); rejects when refused or unavailable. */
export function here(): Promise<Point> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('No location on this device'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.message)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  });
}

export async function checkInAt(tripId: string, placeId: string, at: Point): Promise<{ points: number; stamps: number; total: number }> {
  try {
    // A trip planned on this device before signing in is still yours: its edit key says so.
    const key = editKeyFor(tripId);
    return (await apiClient.post('/community/checkins', { tripId, placeId, at }, { headers: key ? { 'x-edit-key': key } : {} })).data;
  } catch (err) {
    const msg = axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : null;
    throw new Error(msg || i18n.t('errors.checkin'));
  }
}

export async function getPassport(tripId: string): Promise<{ total: number; stamps: { placeId: string }[] }> {
  return (await apiClient.get(`/community/passport/${tripId}`)).data;
}
