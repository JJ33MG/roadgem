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

  it('passes the link unchanged without an id, and refuses other websites (no open redirect)', () => {
    expect(partnerTarget('pitchup', 'https://www.pitchup.com/campsites/spain/')).toBe('https://www.pitchup.com/campsites/spain/');
    expect(partnerTarget('booking', 'https://evil.example/booking.com')).toBeNull();
    expect(partnerTarget('booking', 'https://booking.com.evil.example/')).toBeNull();
    expect(partnerTarget('nobody', 'https://www.booking.com/')).toBeNull();
  });
});
