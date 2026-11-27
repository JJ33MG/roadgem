import { describe, expect, it } from 'vitest';
import { isLang, langOf } from './lang';

describe('the language of a request', () => {
  it('reads one of the six languages from the header, else English', () => {
    expect(langOf('nl')).toBe('nl');
    expect(langOf('de')).toBe('de');
    expect(langOf('cs')).toBe('en');
    expect(langOf(undefined)).toBe('en');
    expect(langOf(['fr'])).toBe('en');
  });
  it('knows the six', () => {
    expect(['en', 'nl', 'fr', 'de', 'es', 'it'].every(isLang)).toBe(true);
    expect(isLang('EN')).toBe(false);
  });
});

describe('server messages in the visitor\'s language', () => {
  it('translates a known message and leaves others as they are', async () => {
    const { translateMessage } = await import('./messages');
    expect(translateMessage('Tag a gem within 5 km of where you are.', 'de')).toBe('Tagge einen Gem im Umkreis von 5 km um deinen Standort.');
    expect(translateMessage('Tag a gem within 5 km of where you are.', 'en')).toBe('Tag a gem within 5 km of where you are.');
    expect(translateMessage('lat and lng are required', 'nl')).toBe('lat and lng are required');
  });

  it('has every message in all five other languages', async () => {
    const { MESSAGES } = await import('./messages');
    for (const [en, t] of Object.entries(MESSAGES)) expect(Object.keys(t).sort(), en).toEqual(['de', 'es', 'fr', 'it', 'nl']);
  });

  it('answers in the request language through res.json', async () => {
    const { speakLanguage } = await import('./messages');
    let sent: unknown;
    const res = { json: (b: unknown) => { sent = b; return res; } } as never;
    const req = { headers: { 'x-lang': 'fr' } } as never;
    speakLanguage(req, res, () => undefined);
    (res as { json: (b: unknown) => unknown }).json({ error: 'Trip not found' });
    expect(sent).toEqual({ error: 'Voyage introuvable' });
    expect((req as { lang: string }).lang).toBe('fr');
  });
});

describe('the refusals people meet most', () => {
  it('translates the rate limits and the check-in distance', async () => {
    const { translateMessage } = await import('./messages');
    for (const m of [
      'You planned 3 trips this hour. Make a free account to plan more, or try again later.',
      'You planned 20 trips today. Try again tomorrow.',
      'Too many requests. Please wait a moment and try again.',
      'Too many attempts. Try again in an hour.',
      'Too many new accounts from here. Try again in an hour.',
      'Check-ins count only within 300 m of the gem.',
    ]) expect(translateMessage(m, 'nl'), m).not.toBe(m);
  });
});
