// Booking partners the site sends travellers to, and how each one is credited to Routify.
// IDs live in Railway variables: a partner pays from the moment its ID is set, no code change.

type Partner = {
  /** The partner's own websites; any other target is refused (no open redirect). */
  hosts: string[];
  /** Adds the affiliate id to the link itself (Booking.com style). */
  param?: { env: string; name: string };
  /** Or wraps the link in the network's deep link, with {url} for the target (Awin, CJ, Impact). */
  deeplinkEnv?: string;
};

export const PARTNERS: Record<string, Partner> = {
  booking: { hosts: ['booking.com'], param: { env: 'BOOKING_AFFILIATE_ID', name: 'aid' } },
  pitchup: { hosts: ['pitchup.com'], deeplinkEnv: 'PITCHUP_DEEPLINK' },
  vrbo: { hosts: ['vrbo.com'], deeplinkEnv: 'VRBO_DEEPLINK' },
  roadsurfer: { hosts: ['roadsurfer.com'], deeplinkEnv: 'ROADSURFER_DEEPLINK' },
  indiecampers: { hosts: ['indiecampers.com'], deeplinkEnv: 'INDIECAMPERS_DEEPLINK' },
  getyourguide: { hosts: ['getyourguide.com'], param: { env: 'GETYOURGUIDE_AFFILIATE_ID', name: 'partner_id' } },
  viator: { hosts: ['viator.com'], param: { env: 'VIATOR_AFFILIATE_ID', name: 'pid' } },
  rentalcars: { hosts: ['rentalcars.com'], param: { env: 'RENTALCARS_AFFILIATE_ID', name: 'affiliateCode' } },
  airbnb: { hosts: ['airbnb.com'] },
};

const onHost = (url: URL, hosts: string[]) => url.protocol === 'https:' && hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));

/** Where a click on `partner` should go, credited to Routify; null for an unknown partner or a foreign website. */
export function partnerTarget(partner: string, target: string): string | null {
  const p = Object.prototype.hasOwnProperty.call(PARTNERS, partner) ? PARTNERS[partner] : null;
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (!p || !onHost(url, p.hosts)) return null;
  const id = p.param && process.env[p.param.env];
  if (p.param && id) url.searchParams.set(p.param.name, id);
  const deeplink = p.deeplinkEnv && process.env[p.deeplinkEnv];
  if (deeplink && deeplink.includes('{url}')) return deeplink.replace('{url}', encodeURIComponent(url.toString()));
  return url.toString();
}
