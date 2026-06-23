import { useAuth } from '@/context/AuthContext';
import type { SubscriptionTier } from '@/types';

export function useSubscription(): {
  tier: SubscriptionTier;
  isPremium: boolean;
  subscriptionExpires: string | null;
} {
  const { user } = useAuth();
  const tier: SubscriptionTier = user?.subscriptionTier ?? 'free';

  return {
    tier,
    isPremium: tier === 'premium',
    subscriptionExpires: user?.subscriptionExpires ?? null,
  };
}
