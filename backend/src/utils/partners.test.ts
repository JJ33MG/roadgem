import { afterEach, describe, expect, it } from 'vitest';
import { partnerTarget } from './partners';

afterEach(() => {
  delete process.env.BOOKING_AFFILIATE_ID;
  delete process.env.PITCHUP_DEEPLINK;
});

describe('partner links', () => {
  it('adds the Booking.com affiliate id to a Booking link', () => {
    process.env.BOOKING_AFFILIATE_ID = '123';
    const out = new URL(partnerTarget('booking', 'https://www.booking.com/searchresults.html?ss=Burgos')!);
    expect(out.searchParams.get('aid')).toBe('123');
    expect(out.searchParams.get('ss')).toBe('Burgos');
  });

  it('wraps a link in the network deep link when one is set (Awin style)', () => {
    process.env.PITCHUP_DEEPLINK = 'https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued={url}';
    expect(partnerTarget('pitchup', 'https://www.pitchup.com/campsites/spain/')).toBe(
      'https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued=https%3A%2F%2Fwww.pitchup.com%2Fcampsites%2Fspain%2F',
    );
  });

  it('accepts a network deep link for every partner, Booking.com included (its programme runs through CJ)', () => {
    process.env.BOOKING_DEEPLINK = 'https://www.anrdoezrs.net/click-1-2?url={url}';
    expect(partnerTarget('booking', 'https://www.booking.com/searchresults.html?ss=Burgos&checkin=2027-05-01')).toBe(
      'https://www.anrdoezrs.net/click-1-2?url=https%3A%2F%2Fwww.booking.com%2Fsearchresults.html%3Fss%3DBurgos%26checkin%3D2027-05-01',
    );
    delete process.env.BOOKING_DEEPLINK;
  });

  it('credits DiscoverCars with the username as a_aid', () => {
    process.env.DISCOVERCARS_AFFILIATE_ID = 'routify';
    expect(new URL(partnerTarget('discovercars', 'https://www.discovercars.com/')!).searchParams.get('a_aid')).toBe('routify');
    delete process.env.DISCOVERCARS_AFFILIATE_ID;
  });

  it('passes the link unchanged without an id, and refuses other websites (no open redirect)', () => {
    expect(partnerTarget('pitchup', 'https://www.pitchup.com/campsites/spain/')).toBe('https://www.pitchup.com/campsites/spain/');
    expect(partnerTarget('booking', 'https://evil.example/booking.com')).toBeNull();
    expect(partnerTarget('booking', 'https://booking.com.evil.example/')).toBeNull();
    expect(partnerTarget('nobody', 'https://www.booking.com/')).toBeNull();
  });
});

describe('Travelpayouts partners (Jarne, 26 Nov): every click carries the RoamGem marker and opens the exact page', () => {
  const tp = (campaign: number, program: number, url: string) =>
    `https://tp.media/r?campaign_id=${campaign}&marker=649342&p=${program}&trs=607287&u=${encodeURIComponent(url)}`;

  it('opens the Tiqets page of tonight\'s town', () => {
    expect(partnerTarget('tiqets', 'https://www.tiqets.com/en/search?q=Burgos')).toBe(tp(89, 2074, 'https://www.tiqets.com/en/search?q=Burgos'));
  });

  it('knows each programme number', () => {
    expect(partnerTarget('localrent', 'https://localrent.com/en')).toBe(tp(87, 2043, 'https://localrent.com/en'));
    expect(partnerTarget('getrentacar', 'https://getrentacar.com/')).toBe(tp(222, 5996, 'https://getrentacar.com/'));
    expect(partnerTarget('airalo', 'https://www.airalo.com/')).toBe(tp(541, 8310, 'https://www.airalo.com/'));
    expect(partnerTarget('klook', 'https://www.klook.com/')).toBe(tp(137, 4110, 'https://www.klook.com/'));
  });

  it('still refuses other websites', () => {
    expect(partnerTarget('klook', 'https://evil.example/')).toBeNull();
  });
});
