import { useEffect } from 'react';

/** Sets the browser tab title ("Pricing | Routify"); the home page keeps the full default title. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Routify` : 'Routify: plan a road trip with the gems on the way';
  }, [title]);
}
