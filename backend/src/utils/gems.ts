/** The free plan shows three gems per trip; Plus shows every gem. */
export const FREE_GEMS = 3;

export function gemsFor<T>(gems: T[], isPremium: boolean): { hiddenGems: T[]; lockedGems: number } {
  if (isPremium) return { hiddenGems: gems, lockedGems: 0 };
  if (gems.length <= FREE_GEMS) return { hiddenGems: gems, lockedGems: 0 };
  // Gems come in route order: give one at the start, one in the middle and one near the end.
  const picks = [0, Math.floor((gems.length - 1) / 2), gems.length - 1];
  return { hiddenGems: picks.map((i) => gems[i]), lockedGems: gems.length - FREE_GEMS };
}
