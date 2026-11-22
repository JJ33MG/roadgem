import { describe, expect, it } from 'vitest';
import { buildBookingUrl } from './affiliates';

describe('Booking.com links', () => {
  it('book the dates for the whole group: two people a room', () => {
    const u = new URL(buildBookingUrl('Burgos', '2027-05-01', '2027-05-03', 4));
    expect(u.searchParams.get('checkin')).toBe('2027-05-01');
    expect(u.searchParams.get('group_adults')).toBe('4');
    expect(u.searchParams.get('no_rooms')).toBe('2');
    expect(u.searchParams.get('group_children')).toBe('0');
  });
  it('defaults to two adults in one room', () => {
    const u = new URL(buildBookingUrl('Burgos'));
    expect(u.searchParams.get('group_adults')).toBe('2');
    expect(u.searchParams.get('no_rooms')).toBe('1');
  });
});
