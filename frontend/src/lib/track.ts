import { baseURL } from './apiClient';

const PARTNERS: [RegExp, string][] = [
  [/booking\.com/, 'booking'],
  [/airbnb\./, 'airbnb'],
  [/rentalcars\.com/, 'rentalcars'],
  [/autoeurope\./, 'autoeurope'],
  [/viator\.com/, 'viator'],
  [/getyourguide\./, 'getyourguide'],
  [/pitchup\.com/, 'pitchup'],
  [/vrbo\.com/, 'vrbo'],
  [/roadsurfer\.com/, 'roadsurfer'],
  [/indiecampers\.com/, 'indiecampers'],
  [/discovercars\.com/, 'discovercars'],
  [/tiqets\.com/, 'tiqets'],
  [/klook\.com/, 'klook'],
  [/localrent\.com/, 'localrent'],
  [/getrentacar\.com/, 'getrentacar'],
  [/airalo\.com/, 'airalo'],
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

/** A partner link sent through the server, which adds RoamGem's affiliate id and counts the click; other links unchanged. */
export function goLink(href: string, tripId?: string): string {
  const partner = partnerFor(href);
  if (!partner) return href;
  const q = new URLSearchParams({ to: href, ...(tripId ? { trip: tripId } : {}) });
  return `${baseURL ?? '/api'}/track/go/${partner}?${q}`;
}
