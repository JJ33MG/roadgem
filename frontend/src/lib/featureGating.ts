import type { SubscriptionTier } from '@/types';

export type PremiumFeature = 'unlimited_trips' | 'extended_stops';

export const PREMIUM_FEATURES: Record<PremiumFeature, { label: string; description: string }> = {
  unlimited_trips: {
    label: 'Unlimited road trips',
    description: 'Save and revisit as many road trips as you like.',
  },
  extended_stops: {
    label: 'Extended stops',
    description: 'Plan trips with more than 5 stops.',
  },
};

export const FREE_TIER_LIMITS = {
  maxTrips: 1,
  maxStops: 5,
};

export function canAccessFeature(feature: PremiumFeature, tier: SubscriptionTier): boolean {
  if (tier === 'premium') return true;

  switch (feature) {
    case 'unlimited_trips':
    case 'extended_stops':
      return false;
    default:
      return false;
  }
}
