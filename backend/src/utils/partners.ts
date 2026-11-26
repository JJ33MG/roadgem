// Booking partners the site sends travellers to, and how each one is credited to Routify.
// IDs live in Railway variables: a partner pays from the moment its ID is set, no code change.

type Partner = {
  /** The partner's own websites; any other target is refused (no open redirect). */
  hosts: string[];
  /** Adds the affiliate id to the link itself (Booking.com style). */
  param?: { env: string; name: string };
  /** Or wraps the link in the network's deep link, with {url} for the target (default name <PARTNER>_DEEPLINK). */
  deeplinkEnv?: string;
  /** Or, until a deep link is set, the partner's own tracked link (Travelpayouts short link: its home page). */
  link?: string;
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
  // DiscoverCars' own programme: the username is the affiliate id, sent as a_aid.
  discovercars: { hosts: ['discovercars.com'], param: { env: 'DISCOVERCARS_AFFILIATE_ID', name: 'a_aid' } },
  airbnb: { hosts: ['airbnb.com'] },
  // Travelpayouts (approved 26 Nov). Short links land on the home page; TIQETS_DEEPLINK etc. adds the town page.
  tiqets: { hosts: ['tiqets.com'], link: 'https://tiqets.tp.st/kodpfFz2' },
  klook: { hosts: ['klook.com'], link: 'https://klook.tp.st/EF7WH2wH' },
  localrent: { hosts: ['localrent.com'], link: 'https://localrent.tp.st/OhHm6Uij' },
  getrentacar: { hosts: ['getrentacar.com'], link: 'https://getrentacar.tp.st/C7CqluG0' },
  airalo: { hosts: ['airalo.com'], link: 'https://airalo.tp.st/UEfImg7J' },
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
  // Every partner may also come through a network (CJ, Awin, Travelpayouts, Stay22): <PARTNER>_DEEPLINK.
  const deeplink = process.env[p.deeplinkEnv ?? `${partner.toUpperCase()}_DEEPLINK`];
  if (deeplink && deeplink.includes('{url}')) return deeplink.replace('{url}', encodeURIComponent(url.toString()));
  return p.link ?? url.toString();
}
