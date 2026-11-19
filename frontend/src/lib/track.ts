import { baseURL } from './apiClient';

const PARTNERS: [RegExp, string][] = [
  [/booking\.com/, 'booking'],
  [/airbnb\./, 'airbnb'],
  [/rentalcars\.com/, 'rentalcars'],
  [/autoeurope\./, 'autoeurope'],
  [/viator\.com/, 'viator'],
  [/getyourguide\./, 'getyourguide'],
];

/** The affiliate partner behind a link, or null for other links. */
export function partnerFor(href: string): string | null {
  return PARTNERS.find(([re]) => re.test(href))?.[1] ?? null;
}

/** Counts a click on a partner link without delaying the visitor (a beacon survives the page change). */
export function trackClick(partner: string, tripId?: string): void {
  try {
    const body = new Blob([JSON.stringify({ partner, ...(tripId ? { tripId } : {}) })], { type: 'application/json' });
    navigator.sendBeacon?.(`${baseURL ?? '/api'}/track/click`, body);
  } catch {
    // Counting is best effort.
  }
}
