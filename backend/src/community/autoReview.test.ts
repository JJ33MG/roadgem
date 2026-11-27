import { describe, expect, it } from 'vitest';
import { decide } from './autoReview';

const v = (o: Partial<{ reject: boolean; challengeMet: boolean; failed: boolean }>) => ({ reject: false, challengeMet: false, failed: false, note: '', ...o });

describe('automatic photo decision', () => {
  it('rejects what the AI calls unsafe', () => expect(decide(v({ reject: true }), false)).toBe('reject'));
  it('approves a challenge that is done', () => expect(decide(v({ challengeMet: true }), true)).toBe('approve'));
  it('keeps the photo but not the challenge when the challenge is not done', () => expect(decide(v({}), true)).toBe('approve_photo'));
  it('approves a normal photo', () => expect(decide(v({}), false)).toBe('approve'));
  it('tries again later when the check failed, never publishes unchecked', () => {
    expect(decide(v({ failed: true }), false)).toBe('retry');
    expect(decide(null, false)).toBe('retry');
  });
});
