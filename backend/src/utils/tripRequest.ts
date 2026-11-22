// Validates the body of POST /api/trips/generate, including the Routify planner fields
// (kilometres a day, gems a day, the gems switch, sleep types, filters), with safe defaults.

export type StayType = 'campsite' | 'hotel' | 'holiday_home';
export type Vehicle = 'car' | 'ev' | 'campervan' | 'caravan';
const VEHICLES: Vehicle[] = ['car', 'ev', 'campervan', 'caravan'];

export interface GenerateRequest {
  startLocation: string;
  destination: string;
  startDate: string;
  endDate: string;
  days?: number;
  budget: number;
  travelStyle: string;
  priorities: string[];
  transportType: 'own_car' | 'rental_car' | 'public';
  kmPerDay: number;
  gemsPerDay: number;
  gemsEnabled: boolean;
  stayTypes: StayType[];
  filters: string[];
  vehicle: Vehicle;
  /** People travelling together (1 to 9). */
  travellers: number;
}

const STAY_TYPES: StayType[] = ['campsite', 'hotel', 'holiday_home'];
const DEFAULT_STAYS: StayType[] = ['campsite', 'hotel'];

function clampNumber(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const text = (raw: unknown) => (typeof raw === 'string' ? raw.trim() : '');

export function parseGenerateBody(body: unknown): { ok: true; value: GenerateRequest } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const startLocation = text(b.startLocation);
  const destination = text(b.destination);
  const startDate = text(b.startDate);
  const endDate = text(b.endDate);
  const budget = Number(b.budget);
  if (!startLocation || !destination || !startDate || !endDate || !(budget > 0)) {
    return { ok: false, error: 'startLocation, destination, startDate, endDate, and budget are required' };
  }

  const stays = Array.isArray(b.stayTypes) ? (b.stayTypes.filter((s) => STAY_TYPES.includes(s as StayType)) as StayType[]) : [];
  const filters = Array.isArray(b.filters)
    ? b.filters.filter((f): f is string => typeof f === 'string' && f.length > 0 && f.length <= 40).slice(0, 30)
    : [];
  const transport = b.transportType === 'rental_car' || b.transportType === 'public' ? b.transportType : 'own_car';

  return {
    ok: true,
    value: {
      startLocation,
      destination,
      startDate,
      endDate,
      days: b.days === undefined ? undefined : clampNumber(b.days, 1, 60, 1),
      budget,
      travelStyle: text(b.travelStyle) || 'balanced',
      priorities: Array.isArray(b.priorities) ? b.priorities.filter((p): p is string => typeof p === 'string') : [],
      transportType: transport,
      kmPerDay: clampNumber(b.kmPerDay, 100, 800, 350),
      gemsPerDay: clampNumber(b.gemsPerDay, 1, 6, 3),
      gemsEnabled: b.gemsEnabled !== false,
      stayTypes: stays.length ? [...new Set(stays)] : DEFAULT_STAYS,
      filters,
      vehicle: VEHICLES.includes(b.vehicle as Vehicle) ? (b.vehicle as Vehicle) : 'car',
      travellers: b.travellers === undefined ? 2 : clampNumber(b.travellers, 1, 9, 2),
    },
  };
}
