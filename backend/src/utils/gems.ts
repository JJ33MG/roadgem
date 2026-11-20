/** The free plan shows three gems per trip; Plus shows every gem. */
export const FREE_GEMS = 3;

export function gemsFor<T>(gems: T[], isPremium: boolean): { hiddenGems: T[]; lockedGems: number } {
  if (isPremium) return { hiddenGems: gems, lockedGems: 0 };
  return { hiddenGems: gems.slice(0, FREE_GEMS), lockedGems: Math.max(0, gems.length - FREE_GEMS) };
}
