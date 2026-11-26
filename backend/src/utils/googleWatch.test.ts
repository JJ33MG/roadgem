import { describe, expect, it } from 'vitest';
import { googleProblem } from './googleWatch';

describe('googleProblem: why Google refused (26 Nov: photos and stays empty after a new key)', () => {
  it('names the API and Google\'s own reason, never the key', () => {
    const line = googleProblem('https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=AIzaSECRET', { status: 'REQUEST_DENIED', error_message: 'This API project is not authorized to use this API.' });
    expect(line).toBe('[google] place/nearbysearch REQUEST_DENIED: This API project is not authorized to use this API.');
  });
  it('stays quiet when all is well or there are simply no results', () => {
    expect(googleProblem('https://maps.googleapis.com/maps/api/place/nearbysearch/json', { status: 'OK' })).toBeNull();
    expect(googleProblem('https://maps.googleapis.com/maps/api/place/nearbysearch/json', { status: 'ZERO_RESULTS' })).toBeNull();
    expect(googleProblem('https://example.com/x', { status: 'REQUEST_DENIED' })).toBeNull();
  });
});
