import { describe, expect, it } from 'vitest';
import { languageLine } from './prompt';
import { dayPrompt } from '../utils/dayByDay';
import { experiencePrompt } from '../utils/experiences';

const day = { day: 2, from: 'Vienna', to: 'Brno', destination: 'Prague', rules: '', style: 'balanced', priorities: [] };

describe('trips in the traveller\'s language', () => {
  it('says nothing extra for English', () => expect(languageLine('en')).toBe(''));
  it('asks for Dutch with the informal you, and keeps names as they are', () => {
    expect(languageLine('nl')).toContain('in Dutch');
    expect(languageLine('nl')).toContain('je/jij');
    expect(languageLine('nl')).toContain('Keep place names');
  });
  it('puts it in the day and experience prompts', () => {
    expect(dayPrompt({ ...day, lang: 'nl' })).toContain('in Dutch');
    expect(dayPrompt(day)).not.toContain('Keep place names');
    expect(experiencePrompt('Prague', 'balanced', 'de')).toContain('in German');
  });
});
