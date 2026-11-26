import { describe, expect, it } from 'vitest';
import { dayPrompt, missingDays, parseDay, parseSkeleton, planningDone } from './dayByDay';

describe('parseSkeleton: the quick first answer (stops and where each night is)', () => {
  it('reads stops, the overnight per day, cost, highlights and tips', () => {
    const text = 'Here you go {"stops":[{"location":"Ghent","latitude":51,"longitude":3.7}],"overnights":["Reims","Dijon"],"totalCost":900,"highlights":["a"],"tips":["b"]}';
    const s = parseSkeleton(text, 2);
    expect(s.stops[0].location).toBe('Ghent');
    expect(s.overnights).toEqual(['Reims', 'Dijon']);
    expect(s.totalCost).toBe(900);
  });

  it('fills missing overnights with the last one so every day has a night', () => {
    const s = parseSkeleton('{"stops":[],"overnights":["Reims"],"totalCost":0,"highlights":[],"tips":[]}', 3);
    expect(s.overnights).toEqual(['Reims', 'Reims', 'Reims']);
  });

  it('refuses an answer without JSON', () => {
    expect(() => parseSkeleton('sorry', 2)).toThrow();
  });
});

describe('dayPrompt and parseDay: one day at a time', () => {
  it('tells the model where the day starts and where the traveller sleeps', () => {
    const p = dayPrompt({ day: 2, from: 'Reims', to: 'Dijon', destination: 'Lyon', rules: 'RULES', style: 'balanced', priorities: ['food'] });
    expect(p).toContain('Day 2');
    expect(p).toContain('from Reims');
    expect(p).toContain('sleeps in Dijon');
    expect(p).toContain('RULES');
  });

  it('keeps the day number and the overnight it was given', () => {
    const d = parseDay('{"morning":{"time":"9:00","activity":"Drive","location":"A","description":"","estimatedCost":0,"notes":""}}', 2, 'Dijon');
    expect(d.day).toBe(2);
    expect(d.overnight).toBe('Dijon');
    expect(d.morning.activity).toBe('Drive');
  });
});

describe('missingDays and planningDone', () => {
  it('lists the days that have no text yet', () => {
    expect(missingDays(4, [1, 3])).toEqual([2, 4]);
    expect(missingDays(2, [1, 2])).toEqual([]);
  });

  it('is done when every day is there, or when the writer gave up (an error is recorded)', () => {
    expect(planningDone({ days: 3, have: [1, 2, 3] })).toBe(true);
    expect(planningDone({ days: 3, have: [1], failed: [2, 3] })).toBe(true);
    expect(planningDone({ days: 3, have: [1] })).toBe(false);
  });
});

import { planningState } from './dayByDay';

describe('planningState: a plan cut short by a server restart does not spin forever', () => {
  const now = new Date('2026-11-26T12:10:00Z');
  it('keeps writing while the plan is young', () => {
    expect(planningState({ planning: true, createdAt: new Date('2026-11-26T12:08:00Z'), now, days: 3, have: [1] })).toEqual({ planning: true, failedDays: [] });
  });
  it('after 5 minutes reports the missing days as failed so the page offers a retry', () => {
    expect(planningState({ planning: true, createdAt: new Date('2026-11-26T12:00:00Z'), now, days: 3, have: [1] })).toEqual({ planning: false, failedDays: [2, 3] });
  });
  it('passes a finished plan through', () => {
    expect(planningState({ planning: false, createdAt: new Date('2026-11-26T12:00:00Z'), now, days: 3, have: [1, 3], failed: [2] })).toEqual({ planning: false, failedDays: [2] });
  });
});
