// The Routify trip planner's state and how it becomes a trip request. Defaults come from the
// approved design (docs/superpowers/specs/2026-11-19-routify-redesign-design.md).
import type { AccommodationType, Priority, TravelStyle, TripSearchParams } from '@/types';

export type StayType = 'campsite' | 'hotel' | 'holiday_home';

export interface TripPlan {
  from: string;
  to: string;
  days: number;
  kmPerDay: number;
  gemsPerDay: number;
  gemsEnabled: boolean;
  stayTypes: StayType[];
  filters: string[];
}

export const KM_PER_DAY = { min: 100, max: 800, step: 25 } as const;
export const GEMS_PER_DAY = { min: 1, max: 6 } as const;

export const DEFAULT_PLAN: TripPlan = {
  from: '',
  to: '',
  days: 5,
  kmPerDay: 350,
  gemsPerDay: 3,
  gemsEnabled: true,
  stayTypes: ['campsite', 'hotel'],
  filters: [],
};

export const STAY_LABELS: Record<StayType, string> = {
  campsite: 'Campsites',
  hotel: 'Hotels',
  holiday_home: 'Airbnb and holiday homes',
};

export const FILTER_GROUPS: { id: string; label: string; options: { id: string; label: string }[] }[] = [
  { id: 'who', label: 'Who is going', options: [
    { id: 'family', label: 'Family' }, { id: 'friends', label: 'Friends' }, { id: 'couple', label: 'Couple' },
    { id: 'solo', label: 'On my own' }, { id: 'pets', label: 'With a dog' },
  ] },
  { id: 'pace', label: 'Pace and budget', options: [
    { id: 'relaxed', label: 'Relaxed pace' }, { id: 'active', label: 'Active days' },
    { id: 'budget_tight', label: 'Tight budget' }, { id: 'budget_comfort', label: 'Comfort' }, { id: 'budget_luxury', label: 'Luxury' },
  ] },
  { id: 'interests', label: 'Interests', options: [
    { id: 'old_towns', label: 'Old towns' }, { id: 'nature', label: 'Nature' }, { id: 'food', label: 'Food and markets' },
    { id: 'castles', label: 'Castles' }, { id: 'beaches', label: 'Beaches and lakes' }, { id: 'viewpoints', label: 'Viewpoints' },
    { id: 'kids', label: 'Things for kids' },
  ] },
  { id: 'access', label: 'Access', options: [
    { id: 'step_free', label: 'Step-free' }, { id: 'short_walks', label: 'Short walks only' }, { id: 'quiet', label: 'Away from crowds' },
  ] },
  { id: 'car', label: 'Car', options: [
    { id: 'rental_car', label: 'I need a rental car' }, { id: 'ev_charging', label: 'Electric car charging' }, { id: 'no_tolls', label: 'Avoid toll roads' },
    { id: 'no_motorways', label: 'Scenic roads, no motorways' },
  ] },
];

/** The filters shown as one row under the planner; the rest live in the All filters sheet. */
export const QUICK_FILTERS = ['family', 'friends', 'old_towns', 'nature', 'step_free'];

/** Days needed to drive a route at a daily distance: never fewer than one. */
export function suggestedDays(routeKm: number, kmPerDay: number): number {
  return Math.max(1, Math.ceil(routeKm / kmPerDay));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function travelStyleOf(filters: string[]): TravelStyle {
  if (filters.includes('family') || filters.includes('kids')) return 'family';
  if (filters.includes('food')) return 'food';
  if (filters.includes('active') || filters.includes('nature')) return 'adventure';
  if (filters.includes('relaxed')) return 'relaxation';
  if (filters.includes('solo')) return 'solo';
  return 'culture';
}

function budgetOf(filters: string[], days: number): number {
  const perDay = filters.includes('budget_luxury') ? 450 : filters.includes('budget_tight') ? 120 : 250;
  return perDay * days;
}

function prioritiesOf(plan: TripPlan): Priority[] {
  const p: Priority[] = [];
  if (plan.gemsEnabled) p.push('hidden_gems');
  if (plan.filters.includes('budget_tight')) p.push('budget_friendly');
  if (plan.filters.includes('viewpoints') || plan.filters.includes('no_motorways')) p.push('scenic');
  return p;
}

const STAY_TO_ACCOMMODATION: Record<StayType, AccommodationType> = { campsite: 'campsite', hotel: 'hotel', holiday_home: 'airbnb' };

export function toGenerateRequest(plan: TripPlan, startDate: Date): TripSearchParams {
  const end = new Date(startDate.getTime() + plan.days * 86_400_000);
  return {
    startLocation: plan.from.trim(),
    destination: plan.to.trim(),
    startDate: iso(startDate),
    endDate: iso(end),
    days: plan.days,
    budget: budgetOf(plan.filters, plan.days),
    travelStyle: travelStyleOf(plan.filters),
    priorities: prioritiesOf(plan),
    accommodationTypes: plan.stayTypes.map((s) => STAY_TO_ACCOMMODATION[s]),
    transportType: plan.filters.includes('rental_car') ? 'rental_car' : 'own_car',
    kmPerDay: plan.kmPerDay,
    gemsPerDay: plan.gemsPerDay,
    gemsEnabled: plan.gemsEnabled,
    stayTypes: plan.stayTypes,
    filters: plan.filters,
  };
}
