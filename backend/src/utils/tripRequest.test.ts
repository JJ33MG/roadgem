import { describe, expect, it } from 'vitest';
import { parseGenerateBody } from './tripRequest';

const base = { startLocation: 'Madrid', destination: 'Brussels', startDate: '2026-06-04', endDate: '2026-06-09', budget: 1250 };

describe('parseGenerateBody', () => {
  it('refuses a request without a start', () => {
    const r = parseGenerateBody({ ...base, startLocation: '' });
    expect(r.ok).toBe(false);
  });

  it('fills the planner defaults', () => {
    const r = parseGenerateBody(base);
    expect(r).toMatchObject({ ok: true, value: { kmPerDay: 350, gemsPerDay: 3, gemsEnabled: true, stayTypes: ['campsite', 'hotel'], filters: [] } });
  });

  it('clamps kilometres a day and ignores nonsense', () => {
    expect(parseGenerateBody({ ...base, kmPerDay: 5000 })).toMatchObject({ value: { kmPerDay: 800 } });
    expect(parseGenerateBody({ ...base, kmPerDay: 20 })).toMatchObject({ value: { kmPerDay: 100 } });
    expect(parseGenerateBody({ ...base, kmPerDay: 'abc' })).toMatchObject({ value: { kmPerDay: 350 } });
    expect(parseGenerateBody({ ...base, gemsPerDay: 9 })).toMatchObject({ value: { gemsPerDay: 6 } });
  });

  it('keeps gems switched off and drops unknown stay types', () => {
    expect(parseGenerateBody({ ...base, gemsEnabled: false })).toMatchObject({ value: { gemsEnabled: false } });
    expect(parseGenerateBody({ ...base, stayTypes: ['castle'] })).toMatchObject({ value: { stayTypes: ['campsite', 'hotel'] } });
    expect(parseGenerateBody({ ...base, stayTypes: ['holiday_home', 'castle'] })).toMatchObject({ value: { stayTypes: ['holiday_home'] } });
  });

  it('keeps at most 30 short filters', () => {
    const filters = Array.from({ length: 40 }, (_, i) => `f${i}`).concat(['x'.repeat(41)]);
    const r = parseGenerateBody({ ...base, filters });
    expect(r.ok && r.value.filters).toHaveLength(30);
  });
});

describe('plannerPrompt', () => {
  it('asks for the daily distance and no padding on short routes', async () => {
    const { plannerPrompt } = await import('./claude');
    const t = plannerPrompt({ kmPerDay: 350, gemsPerDay: 3, gemsEnabled: true, stayTypes: ['campsite', 'hotel'], filters: [] }, 'own_car');
    expect(t).toContain('near 350 km');
    expect(t).toContain('never more than 420 km');
    expect(t).toContain('do NOT add extra driving');
    expect(t).toContain('about 3 short stops');
  });

  it('forbids gems when the traveller switched them off', async () => {
    const { plannerPrompt } = await import('./claude');
    const t = plannerPrompt({ kmPerDay: 350, gemsPerDay: 3, gemsEnabled: false, stayTypes: ['holiday_home'], filters: ['family'] }, 'own_car');
    expect(t).toContain('NO GEMS');
    expect(t).not.toContain('short stops');
    expect(t).toContain('holiday homes');
    expect(t).toContain('family');
  });
});
