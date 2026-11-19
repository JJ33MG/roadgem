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
