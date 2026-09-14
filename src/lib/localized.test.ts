import { describe, expect, it } from 'vitest';
import { localized } from './localized';

const rule = { title: 'Atraso ao treino', title_en: 'Late for training', category: 'Treinos', category_en: null };
const untranslated = { title: 'Pôr música pimba no balneário', title_en: null };

describe('localized', () => {
  it('uses the English column when the language is English', () => {
    expect(localized(rule, 'title', 'en-GB')).toBe('Late for training');
  });

  it('always uses Portuguese when the language is Portuguese', () => {
    expect(localized(rule, 'title', 'pt-PT')).toBe('Atraso ao treino');
  });

  it('falls back silently to Portuguese when there is no translation', () => {
    expect(localized(untranslated, 'title', 'en-GB')).toBe('Pôr música pimba no balneário');
    expect(localized(rule, 'category', 'en-GB')).toBe('Treinos');
  });

  it('ignores empty or blank translations', () => {
    expect(localized({ title: 'Multa', title_en: '   ' }, 'title', 'en-GB')).toBe('Multa');
  });
});
