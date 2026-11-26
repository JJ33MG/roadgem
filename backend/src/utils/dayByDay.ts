// Planning day by day (Jarne, 26 Nov: a plan took 34 s of blank screen). First a quick skeleton (stops and
// where each night is) so the trip page opens in seconds; then each day's text is written separately and in
// parallel, and appears on the page as soon as it is ready.

export interface Skeleton {
  stops: { location: string; latitude: number; longitude: number; [k: string]: unknown }[];
  overnights: string[];
  totalCost: number;
  highlights: string[];
  tips: string[];
}

export interface DaySlot {
  time: string;
  activity: string;
  location: string;
  description: string;
  estimatedCost: number;
  notes: string;
}

export interface PlannedDay {
  day: number;
  overnight: string;
  morning: DaySlot;
  afternoon?: DaySlot;
  evening?: DaySlot;
}

const json = (text: string): Record<string, unknown> => {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('The plan came back without JSON');
  return JSON.parse(m[0]);
};

export function parseSkeleton(text: string, days: number): Skeleton {
  const o = json(text);
  const named = Array.isArray(o.overnights) ? (o.overnights as unknown[]).map(String) : [];
  const overnights = Array.from({ length: days }, (_, i) => named[i] ?? named[named.length - 1] ?? '');
  return {
    stops: Array.isArray(o.stops) ? (o.stops as Skeleton['stops']) : [],
    overnights,
    totalCost: Number(o.totalCost) || 0,
    highlights: Array.isArray(o.highlights) ? (o.highlights as unknown[]).map(String) : [],
    tips: Array.isArray(o.tips) ? (o.tips as unknown[]).map(String) : [],
  };
}

export function dayPrompt(i: { day: number; from: string; to: string; destination: string; rules: string; style: string; priorities: string[] }): string {
  const drive = i.from === i.to ? `stays around ${i.to} (no long drive)` : `drives from ${i.from} to ${i.to}`;
  return (
    `You plan Day ${i.day} of a road trip towards ${i.destination}. On this day the traveller ${drive} and sleeps in ${i.to}. ` +
    `Travel style: ${i.style}. Priorities: ${i.priorities.join(', ') || 'none given'}.\n\n${i.rules}\n\n` +
    'Keep text short: each "description" one sentence under 25 words, "notes" under 15 words or empty. ' +
    'Respond with ONLY one JSON object: {"morning": slot, "afternoon": slot, "evening": slot} where slot is ' +
    '{"time": string, "activity": string, "location": string, "description": string, "estimatedCost": number, "notes": string}. ' +
    `The evening is in ${i.to}.`
  );
}

export function parseDay(text: string, day: number, overnight: string): PlannedDay {
  const o = json(text) as Partial<PlannedDay>;
  if (!o.morning) throw new Error(`Day ${day} came back without a morning`);
  return { day, overnight, morning: o.morning, afternoon: o.afternoon, evening: o.evening };
}

export function missingDays(days: number, have: number[]): number[] {
  const got = new Set(have);
  return Array.from({ length: days }, (_, i) => i + 1).filter((d) => !got.has(d));
}

/** Planning is over when every day has its text, or the writer recorded the days it could not write. */
export function planningDone(s: { days: number; have: number[]; failed?: number[] }): boolean {
  return missingDays(s.days, [...s.have, ...(s.failed ?? [])]).length === 0;
}

const STALE_MS = 5 * 60_000;

/** What the trip page is told: still writing, or done with these failed days. A plan still "writing" after
 * 5 minutes was cut short (a restart): its missing days count as failed so the page offers to try again. */
export function planningState(s: { planning?: boolean; createdAt: Date; now: Date; days: number; have: number[]; failed?: number[] }): { planning: boolean; failedDays: number[] } {
  if (s.planning !== true) return { planning: false, failedDays: s.failed ?? [] };
  if (s.now.getTime() - s.createdAt.getTime() < STALE_MS) return { planning: true, failedDays: [] };
  return { planning: false, failedDays: missingDays(s.days, s.have) };
}
