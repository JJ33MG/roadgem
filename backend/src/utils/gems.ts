/** The free plan shows three gems per trip; Plus shows every gem. */
export const FREE_GEMS = 3;

export function gemsFor<T>(gems: T[], isPremium: boolean): { hiddenGems: T[]; lockedGems: number } {
  if (isPremium) return { hiddenGems: gems, lockedGems: 0 };
  // Gems per day (since 26 Nov): the free plan shows the best gem of every day.
  if (gems.some((g) => typeof (g as { day?: unknown }).day === 'number')) {
    const seen = new Set<number>();
    // Gems the traveller added from the community are always shown.
    const free = gems.filter((g) => {
      if ((g as { added?: boolean }).added === true) return true;
      const d = (g as { day?: number }).day ?? 0;
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });
    return { hiddenGems: free, lockedGems: gems.length - free.length };
  }
  if (gems.length <= FREE_GEMS) return { hiddenGems: gems, lockedGems: 0 };
  // Gems come in route order: give one at the start, one in the middle and one near the end.
  const picks = [0, Math.floor((gems.length - 1) / 2), gems.length - 1];
  return { hiddenGems: picks.map((i) => gems[i]), lockedGems: gems.length - FREE_GEMS };
}
