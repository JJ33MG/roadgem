import axios from 'axios';
import { apiClient } from './apiClient';
import type { GeneratedTrip } from '@/types';

export type TripEdit =
  | { type: 'night'; day: number; stopIndex: number }
  | { type: 'hideGem'; placeId: string }
  | { type: 'showGem'; placeId: string }
  | { type: 'restDay'; afterDay: number };

const storeKey = (tripId: string) => `routify.edit.${tripId}`;

/** The key handed out when this browser planned the trip; it lets the planner change it later. */
export function saveEditKey(tripId: string, key: string): void {
  try {
    localStorage.setItem(storeKey(tripId), key);
  } catch {
    // private mode: changes are then only possible right away
  }
}

export function editKeyFor(tripId: string): string | null {
  try {
    return localStorage.getItem(storeKey(tripId));
  } catch {
    return null;
  }
}

export async function sendEdit(tripId: string, edit: TripEdit): Promise<GeneratedTrip> {
  const key = editKeyFor(tripId);
  try {
    const res = await apiClient.patch<GeneratedTrip>(`/trips/${tripId}/plan`, { edit }, { headers: key ? { 'x-edit-key': key } : {} });
    return res.data;
  } catch (err) {
    const msg = axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : null;
    throw new Error(msg || 'The change could not be saved. Try again.');
  }
}
