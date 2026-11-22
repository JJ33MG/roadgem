// Limits on routes that cost money per request (Claude, Google): one visitor, or a script, cannot
// run up the bill. Counted in memory per instance; a restart resets them, which is fine for a guard.
import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';
import { rateLimiter } from '../routes/track';

const HOUR = 60 * 60_000;

/** At most `max` requests per `windowMs` per visitor (signed-in user, else IP address). */
export function limit(name: string, max: number, windowMs: number, message = 'Too many requests. Please wait a moment and try again.') {
  const allow = rateLimiter(max, windowMs);
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const who = req.userId ? `u:${req.userId}` : `ip:${req.ip ?? 'unknown'}`;
    if (allow(`${name}:${who}`)) return next();
    res.status(429).json({ error: message, code: 'RATE_LIMITED' });
  };
}

/** Planning a trip (about €0.30–0.70 each): 3 an hour without an account, 20 a day with one. */
export function generateLimit() {
  const anonymous = limit('gen-anon', 3, HOUR, 'You planned 3 trips this hour. Make a free account to plan more, or try again later.');
  const member = limit('gen-user', 20, 24 * HOUR, 'You planned 20 trips today. Try again tomorrow.');
  return (req: AuthRequest, res: Response, next: NextFunction) => (req.userId ? member : anonymous)(req, res, next);
}
