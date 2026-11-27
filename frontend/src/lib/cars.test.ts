import { describe, expect, it } from 'vitest';
import { carForGroup } from './cars';

describe('a rental car for the group', () => {
  it('fits the number of travellers', () => {
    expect(carForGroup(2)).toMatchObject({ label: 'A compact car (4 to 5 seats)', seats: 5 });
    expect(carForGroup(2).key).toBe('car.compact');
    expect(carForGroup(5)).toMatchObject({ label: 'A family car or estate (5 seats, big boot)', seats: 5 });
    expect(carForGroup(6).seats).toBe(7);
    expect(carForGroup(7)).toMatchObject({ label: 'A 7-seater', seats: 7 });
    expect(carForGroup(9)).toMatchObject({ label: 'A 9-seat minivan', seats: 9 });
  });
});
