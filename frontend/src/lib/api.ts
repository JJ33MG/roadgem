import { apiClient } from './apiClient';
import type {
  Trip,
  TripDetail,
  TripSearchParams,
  GeneratedTrip,
  User,
  HotelOption,
  RestaurantOption,
  FuelStation,
  WeatherForecast,
  SubscriptionTier,
  AccommodationOption,
  AccommodationType,
  AgentRun,
  AgentLog,
  AgentStats,
  AgentMessage,
} from '@/types';

// --- Auth ---
export const authApi = {
  signup: (data: { email: string; password: string; name: string }) =>
    apiClient.post<{ token: string; user: User }>('/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ token: string; user: User }>('/auth/login', data),

  me: () => apiClient.get<User>('/auth/me'),
};

// --- Trips ---
export const tripsApi = {
  generate: (params: TripSearchParams) =>
    apiClient.post<GeneratedTrip>('/trips/generate', params),

  getById: (tripId: string) => apiClient.get<TripDetail>(`/trips/${tripId}`),

  save: (tripId: string) => apiClient.post<Trip>(`/trips/${tripId}/save`),

  getUserTrips: () => apiClient.get<Trip[]>('/user/trips'),
};

// --- Subscription ---
export interface SubscriptionStatus {
  subscriptionTier: SubscriptionTier;
  subscriptionExpires: string | null;
}

export const subscriptionApi = {
  getStatus: () => apiClient.get<SubscriptionStatus>('/subscription/status'),

  upgrade: () => apiClient.post<SubscriptionStatus>('/subscription/upgrade'),

  downgrade: () => apiClient.post<SubscriptionStatus>('/subscription/downgrade'),
};

// --- Bookings ---
export const bookingsApi = {
  getHotelOptions: (tripId: string) =>
    apiClient.get<HotelOption[]>(`/trips/${tripId}/hotel-options`),

  getRestaurantOptions: (tripId: string) =>
    apiClient.get<RestaurantOption[]>(`/trips/${tripId}/restaurant-options`),

  book: (
    tripId: string,
    data: { type: 'hotel' | 'restaurant' | 'activity'; optionId: string },
  ) => apiClient.post(`/trips/${tripId}/book`, data),
};

// --- Photos ---
export const photosApi = {
  search: (query: string, count = 1) =>
    apiClient.get<{ photos: string[] }>('/photos', { params: { query, count } }),
};

// --- Accommodations ---
export const accommodationsApi = {
  search: (params: {
    lat: number;
    lng: number;
    location: string;
    types?: AccommodationType[];
    checkin?: string;
    checkout?: string;
  }) =>
    apiClient.get<{ accommodations: AccommodationOption[] }>('/accommodations', {
      params: {
        lat: params.lat,
        lng: params.lng,
        location: params.location,
        types: params.types?.join(','),
        checkin: params.checkin,
        checkout: params.checkout,
      },
    }),
};

// --- Utilities ---
export const agentsApi = {
  getRuns: () => apiClient.get<AgentRun[]>('/agents/runs'),
  getRunLogs: (runId: string) => apiClient.get<AgentLog[]>(`/agents/runs/${runId}/logs`),
  getStats: () => apiClient.get<AgentStats>('/agents/stats'),
  getMessages: () => apiClient.get<AgentMessage[]>('/agents/messages'),
  trigger: (name: string) => apiClient.post(`/agents/${name}/trigger`, {}),
};

export const utilsApi = {
  getFuelPrices: (lat: number, lng: number) =>
    apiClient.get<FuelStation[]>('/fuel-prices', { params: { lat, lng } }),

  getWeather: (destination: string) =>
    apiClient.get<WeatherForecast[]>(`/weather/${destination}`),

  getDestinationSuggestions: (query: string) =>
    apiClient.get<string[]>('/destinations/suggestions', { params: { query } }),
};
