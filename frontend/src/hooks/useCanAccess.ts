import { canAccessFeature, type PremiumFeature } from '@/lib/featureGating';
import { useSubscription } from './useSubscription';

export function useCanAccess(feature: PremiumFeature): boolean {
  const { tier } = useSubscription();
  return canAccessFeature(feature, tier);
}
