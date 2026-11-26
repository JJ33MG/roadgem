import { describe, expect, it } from 'vitest';
import { errorResponse } from './errors';

describe('errorResponse', () => {
  it('hides an upstream API failure behind a plain 502', () => {
    const upstream = Object.assign(new Error('401 invalid x-api-key'), { status: 401, headers: {} });
    expect(errorResponse(upstream)).toEqual({ status: 502, body: { error: 'Trip planning is not available right now. Please try again later.' } });
  });

  it('keeps client errors that Express marks as safe to show', () => {
    const bad = Object.assign(new Error('Unexpected token in JSON'), { status: 400, expose: true });
    expect(errorResponse(bad)).toEqual({ status: 400, body: { error: 'Unexpected token in JSON' } });
  });

  it('answers anything else with a generic 500', () => {
    expect(errorResponse(new Error('db exploded'))).toEqual({ status: 500, body: { error: 'Something went wrong on our end.' } });
  });
});

import { recentErrors, recordServerError } from './errors';

describe('server errors the Brain reports', () => {
  it('counts server errors of the last 24 hours and keeps the latest message short', () => {
    const t = new Date('2026-12-01T12:00:00Z').getTime();
    recordServerError(new Error('old'), t - 25 * 3_600_000);
    recordServerError(new Error('Prisma: database unreachable '.repeat(20)), t - 3_600_000);
    const r = recentErrors(t);
    expect(r.errors24h).toBe(1);
    expect(r.lastError!.message.length).toBeLessThanOrEqual(200);
    expect(r.lastError!.at).toBe(new Date(t - 3_600_000).toISOString());
  });
});

import { logLine } from './errors';

describe('logLine: server logs never carry an API key (an Axios error printed the Google key, 26 Nov)', () => {
  it('keeps the message and the upstream status, without the key', () => {
    const err = Object.assign(new Error('Request failed with status code 403'), {
      isAxiosError: true,
      config: { url: 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=abc&key=AIzaSECRET123' },
      response: { status: 403 },
    });
    const line = logLine(err);
    expect(line).toContain('403');
    expect(line).toContain('maps.googleapis.com/maps/api/place/photo');
    expect(line).not.toContain('AIzaSECRET123');
  });

  it('redacts keys in plain error messages too', () => {
    expect(logLine(new Error('bad url ...&key=AIzaXYZ&x=1'))).not.toContain('AIzaXYZ');
  });
});
