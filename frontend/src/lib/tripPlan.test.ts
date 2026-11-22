import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN, FILTER_GROUPS, QUICK_FILTERS, suggestedDays, toGenerateRequest } from './tripPlan';

describe('trip plan', () => {
  it('turns the default plan into a generate request', () => {
    const req = toGenerateRequest({ ...DEFAULT_PLAN, from: 'Madrid', to: 'Brussels' }, new Date('2026-06-04T00:00:00Z'));
    expect(req).toMatchObject({
      startLocation: 'Madrid',
      destination: 'Brussels',
      kmPerDay: 350,
      gemsPerDay: 3,
      gemsEnabled: true,
      stayTypes: ['campsite', 'hotel'],
      days: 5,
      startDate: '2026-06-04',
      endDate: '2026-06-09',
      travellers: 2,
    });
  });

  it('suggests enough days for the route at the chosen distance', () => {
    expect(suggestedDays(1580, 350)).toBe(5);
    expect(suggestedDays(70, 350)).toBe(1);
  });

  it('has 24 filters with unique ids, and the quick row comes from them', () => {
    const ids = FILTER_GROUPS.flatMap((g) => g.options.map((o) => o.id));
    expect(ids).toHaveLength(24);
    expect(new Set(ids).size).toBe(24);
    for (const q of QUICK_FILTERS) expect(ids).toContain(q);
    expect(QUICK_FILTERS).toEqual(['family', 'friends', 'old_towns', 'nature', 'step_free']);
  });
});
