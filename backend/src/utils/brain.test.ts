import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorAlert, parseFeedback, tellBrain } from './brain';

afterEach(() => { delete process.env.BRAIN_URL; delete process.env.STATS_TOKEN; vi.restoreAllMocks(); });

// 27 Nov: testers' feedback and server errors reach Jarne on Telegram through the Brain.
describe('parseFeedback', () => {
  it('keeps type, message, page and an email, trimmed', () => {
    expect(parseFeedback({ type: 'bug', message: '  Map is empty ', page: '/trips/x', email: 't@example.com' })).toEqual({ type: 'bug', message: 'Map is empty', page: '/trips/x', email: 't@example.com' });
  });
  it('refuses an empty message, and makes an unknown type "other" and a bad email empty', () => {
    expect(parseFeedback({ message: '  ' })).toBeNull();
    expect(parseFeedback({ type: 'hack', message: 'hi', email: 'nope' })).toEqual({ type: 'other', message: 'hi', page: '', email: '' });
  });
});

describe('tellBrain', () => {
  it('posts to the Brain with the stats token, and does nothing when the Brain is not set', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await tellBrain({ kind: 'error', message: 'x' });
    expect(fetchMock).not.toHaveBeenCalled();
    process.env.BRAIN_URL = 'https://brain.example';
    process.env.STATS_TOKEN = 'tok';
    await tellBrain({ kind: 'error', message: 'x' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://brain.example/api/routify/event');
    expect((init!.headers as Record<string, string>)['x-stats-token']).toBe('tok');
  });
});

describe('errorAlert: at most one alert per kind of error every 10 minutes', () => {
  it('sends the first, holds the repeat, sends again after 10 minutes', () => {
    const send = vi.fn();
    const alert = errorAlert(send);
    alert('Prisma P1001 at 12:00:01', 0);
    alert('Prisma P1001 at 12:00:05', 60_000);
    alert('Prisma P1001 again', 11 * 60_000);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
