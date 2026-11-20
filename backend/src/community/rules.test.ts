import { describe, expect, it } from 'vitest';
import { decodePhoto, isAdmin, metresBetween, onTheSpot, pointsFor, readyToBeOfficial, SPOT_METRES } from './rules';

describe('community rules', () => {
  it('measures metres between two points', () => {
    const m = metresBetween({ lat: 50.8467, lng: 4.3525 }, { lat: 50.8476, lng: 4.3572 }); // Grand-Place to Central station area
    expect(m).toBeGreaterThan(300);
    expect(m).toBeLessThan(400);
  });

  it('counts a photo only within 300 m of the gem', () => {
    expect(SPOT_METRES).toBe(300);
    expect(onTheSpot({ lat: 50.8467, lng: 4.3525 }, { lat: 50.8475, lng: 4.3525 })).toBe(true); // ~90 m
    expect(onTheSpot({ lat: 50.8467, lng: 4.3525 }, { lat: 50.8500, lng: 4.3525 })).toBe(false); // ~370 m
  });

  it('gives 10 points for a photo and 50 for a completed challenge', () => {
    expect(pointsFor({ challenge: false })).toBe(10);
    expect(pointsFor({ challenge: true })).toBe(50);
  });

  it('turns a suggestion official at 10 visitors and 20 likes', () => {
    expect(readyToBeOfficial({ visitors: 10, likes: 20 })).toBe(true);
    expect(readyToBeOfficial({ visitors: 9, likes: 40 })).toBe(false);
    expect(readyToBeOfficial({ visitors: 12, likes: 19 })).toBe(false);
  });

  it('accepts a JPEG, PNG or WebP photo up to 5 MB and refuses anything else', () => {
    const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]).toString('base64')}`;
    expect(decodePhoto(jpeg)).toMatchObject({ type: 'image/jpeg' });
    const fakeJpeg = `data:image/jpeg;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}`;
    expect(() => decodePhoto(fakeJpeg)).toThrow(/photo/i);
    expect(() => decodePhoto('hello')).toThrow(/photo/i);
    const big = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024)]).toString('base64')}`;
    expect(() => decodePhoto(big)).toThrow(/large/i);
  });

  it('knows the admins from ADMIN_EMAILS, case-insensitive', () => {
    expect(isAdmin('Boss@Example.com', 'boss@example.com, other@example.com')).toBe(true);
    expect(isAdmin('someone@example.com', 'boss@example.com')).toBe(false);
    expect(isAdmin('boss@example.com', undefined)).toBe(false);
  });
});
