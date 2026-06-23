import { useState } from 'react';
import { subscriptionApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function useManageSubscription() {
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  async function upgrade() {
    setIsLoading(true);
    try {
      await subscriptionApi.upgrade();
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  }

  async function downgrade() {
    setIsLoading(true);
    try {
      await subscriptionApi.downgrade();
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  }

  return { upgrade, downgrade, isLoading };
}
