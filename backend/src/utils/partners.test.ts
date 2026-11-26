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

describe('Travelpayouts partners (Jarne, 26 Nov): their own tracked link until a deep link is set', () => {
  it('sends a rental or eSIM click to the tracked Travelpayouts link', () => {
    expect(partnerTarget('localrent', 'https://localrent.com/')).toBe('https://localrent.tp.st/OhHm6Uij');
    expect(partnerTarget('getrentacar', 'https://getrentacar.com/')).toBe('https://getrentacar.tp.st/C7CqluG0');
    expect(partnerTarget('airalo', 'https://www.airalo.com/')).toBe('https://airalo.tp.st/UEfImg7J');
  });

  it('uses the deep link (with the town page) once it is set', () => {
    process.env.TIQETS_DEEPLINK = 'https://tp.media/r?u={url}';
    expect(partnerTarget('tiqets', 'https://www.tiqets.com/en/search?q=Burgos')).toBe(`https://tp.media/r?u=${encodeURIComponent('https://www.tiqets.com/en/search?q=Burgos')}`);
    delete process.env.TIQETS_DEEPLINK;
  });

  it('still refuses other websites', () => {
    expect(partnerTarget('klook', 'https://evil.example/')).toBeNull();
  });
});
