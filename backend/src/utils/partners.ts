// Booking partners the site sends travellers to, and how each one is credited to Routify.
// IDs live in Railway variables: a partner pays from the moment its ID is set, no code change.

type Partner = {
  /** The partner's own websites; any other target is refused (no open redirect). */
  hosts: string[];
  /** Adds the affiliate id to the link itself (Booking.com style). */
  param?: { env: string; name: string };
  /** Or wraps the link in the network's deep link, with {url} for the target (default name <PARTNER>_DEEPLINK). */
  deeplinkEnv?: string;
  /** Or a built-in deep link with {url} (Travelpayouts); the <PARTNER>_DEEPLINK variable still wins. */
  deeplink?: string;
};

// Routify's Travelpayouts account: marker (partner) and trs (project). These are in every link a visitor clicks.
const travelpayouts = (campaign: number, program: number) =>
  `https://tp.media/r?campaign_id=${campaign}&marker=649342&p=${program}&trs=607287&u={url}`;

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
  // Travelpayouts (approved 26 Nov): campaign_id and programme number per partner.
  tiqets: { hosts: ['tiqets.com'], deeplink: travelpayouts(89, 2074) },
  klook: { hosts: ['klook.com'], deeplink: travelpayouts(137, 4110) },
  localrent: { hosts: ['localrent.com'], deeplink: travelpayouts(87, 2043) },
  getrentacar: { hosts: ['getrentacar.com'], deeplink: travelpayouts(222, 5996) },
  airalo: { hosts: ['airalo.com'], deeplink: travelpayouts(541, 8310) },
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
  const deeplink = process.env[p.deeplinkEnv ?? `${partner.toUpperCase()}_DEEPLINK`] || p.deeplink;
  if (deeplink && deeplink.includes('{url}')) return deeplink.replace('{url}', encodeURIComponent(url.toString()));
  return url.toString();
}
