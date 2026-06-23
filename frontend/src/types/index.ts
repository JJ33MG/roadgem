// Shared domain types for ROADGEM frontend.
// Mirrors the backend database schema (see backend/src/db/migrations).

export type TravelStyle =
  | 'adventure'
  | 'relaxation'
  | 'culture'
  | 'food'
  | 'solo'
  | 'family';

export type Priority =
  | 'hidden_gems'
  | 'budget_friendly'
  | 'scenic'
  | 'nightlife'
  | 'local_culture'
  | 'photography';

export type ActivityType =
  | 'accommodation'
  | 'restaurant'
  | 'activity'
  | 'transport'
  | 'sightseeing';

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export type TripStatus = 'draft' | 'saved' | 'archived';

export type BookingType = 'hotel' | 'restaurant' | 'activity';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  subscriptionTier: SubscriptionTier;
  subscriptionExpires: string | null;
}

export interface TripSearchParams {
  startLocation: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelStyle: TravelStyle;
  priorities: Priority[];
  accommodationTypes?: AccommodationType[];
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteStop extends GeoPoint {
  name: string;
}

export interface Trip {
  id: string;
  userId: string | null;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelStyle: TravelStyle;
  priorities: Priority[];
  route: GeoJSON.FeatureCollection | null;
  totalCost: number;
  totalDistance: number;
  status: TripStatus;
  createdAt: string;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  dayNumber: number;
  timeSlot: TimeSlot;
  locationName: string;
  latitude: number;
  longitude: number;
  description: string;
  cost: number;
  duration: number;
  activityType: ActivityType;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  items: ItineraryItem[];
}

export interface TripDetail extends Trip {
  stops: RouteStop[];
  itinerary: ItineraryDay[];
  fuelStations: FuelStation[];
}

export interface Booking {
  id: string;
  tripId: string;
  userId: string;
  type: BookingType;
  bookingId: string;
  cost: number;
  status: BookingStatus;
}

export interface HotelOption {
  id: string;
  name: string;
  rating: number;
  pricePerNight: number;
  imageUrl: string;
  affiliateUrl: string;
}

export interface RestaurantOption {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: number;
  rating: number;
  imageUrl: string;
}

export interface FuelStation extends GeoPoint {
  id: string;
  brand: string;
  price: number;
  currency: string;
}

export interface WeatherForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
}

// --- Generated trip (from no-DB Claude-powered backend) ---

export interface GeneratedTripStop {
  location: string;
  reason: string;
  description: string;
  latitude: number;
  longitude: number;
  activities: string[];
  bestTimeOfDay: string;
  estimatedDuration: string;
  localSpecialties: string[];
}

export interface GeneratedItinerarySlot {
  time: string;
  activity: string;
  location: string;
  description: string;
  estimatedCost: number;
  notes: string;
}

export interface GeneratedItineraryDay {
  day: number;
  morning: GeneratedItinerarySlot;
  afternoon: GeneratedItinerarySlot;
  evening: GeneratedItinerarySlot;
}

export interface GeneratedWeatherDay {
  day: number;
  temp: number;
  condition: string;
}

export interface HiddenGem {
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  category: 'restaurant' | 'café' | 'viewpoint' | 'activity' | 'market' | 'bar' | 'nature' | 'culture' | 'historic' | 'other';
}

export interface RentalCarOption {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  rentalcarsUrl: string;
  autoeuropeUrl: string;
}

// --- Accommodation / overnight stays ---

export type AccommodationType = 'hotel' | 'hostel' | 'campsite' | 'airbnb';

export interface AccommodationOption {
  id: string;
  name: string;
  type: AccommodationType;
  rating: number;
  pricePerNight: number;
  imageUrl: string | null;
  address: string;
  latitude: number;
  longitude: number;
  affiliateUrl: string;
}

export interface GeneratedTrip {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  stops: GeneratedTripStop[];
  itinerary: GeneratedItineraryDay[];
  totalCost: number;
  totalDistance: number;
  highlights: string[];
  tips: string[];
  weather: GeneratedWeatherDay[];
  hiddenGems: HiddenGem[];
}
