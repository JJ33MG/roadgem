import { useEffect } from 'react';

/** Sets the browser tab title ("Pricing | RoamGem"); the home page keeps the full default title. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | RoamGem` : 'RoamGem: plan a road trip with the gems on the way';
  }, [title]);
}
