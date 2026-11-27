// RoamGem reports to the Brain (27 Nov, ready for testers): tester feedback and server errors, which the Brain
// passes to Jarne on Telegram. Signed with STATS_TOKEN (the token the Brain already reads RoamGem's numbers with).
const TYPES = ['bug', 'idea', 'other'] as const;
export type Feedback = { type: (typeof TYPES)[number]; message: string; page: string; email: string };

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

export function parseFeedback(body: Record<string, unknown>): Feedback | null {
  const message = clip(body.message, 2000);
  if (!message) return null;
  const type = (TYPES as readonly string[]).includes(String(body.type)) ? (body.type as Feedback['type']) : 'other';
  const email = clip(body.email, 120);
  return { type, message, page: clip(body.page, 200), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '' };
}

/** Fire and forget: a lost report never breaks what the visitor is doing. */
export async function tellBrain(event: { kind: 'feedback' | 'error'; message: string; type?: string; page?: string; email?: string }): Promise<void> {
  const url = process.env.BRAIN_URL;
  const token = process.env.STATS_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url.replace(/\/$/, '')}/api/routify/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-stats-token': token },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // The Brain is down or slow: the error is still in Railway's logs.
  }
}

/** An alerter that sends each kind of error (its first two words) at most once every 10 minutes. */
export function errorAlert(send: (message: string) => void) {
  const last = new Map<string, number>();
  return (message: string, now = Date.now()) => {
    const key = message.replace(/[0-9]/g, '').split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    if (now - (last.get(key) ?? -Infinity) < 10 * 60_000) return;
    if (last.size > 500) last.clear();
    last.set(key, now);
    send(message);
  };
}

/** Server errors to Jarne (through the Brain), at most one per kind every 10 minutes. */
export const alertError = errorAlert((message) => void tellBrain({ kind: 'error', message: message.slice(0, 1500) }));
