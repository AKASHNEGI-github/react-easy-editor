import { describe, it, expect } from 'vitest';
import { createTranslator, sameTranslations } from '../../src/core/i18n';

describe('createTranslator', () => {
  it('returns the English text when there are no translations', () => {
    expect(createTranslator(undefined)('Bold')).toBe('Bold');
    expect(createTranslator({})('Bold')).toBe('Bold');
  });

  it('translates known strings and leaves unknown ones in English', () => {
    const t = createTranslator({ Bold: 'Negrita' });
    expect(t('Bold')).toBe('Negrita');
    expect(t('Italic')).toBe('Italic');
  });

  it('fills {placeholders}, and keeps ones it has no value for', () => {
    const t = createTranslator({ '{count} words': '{count} palabras' });
    expect(t('{count} words', { count: 5 })).toBe('5 palabras');
    expect(t('{count} / {max} characters', { count: 1 })).toBe('1 / {max} characters');
  });

  it('is not fooled by inherited object keys', () => {
    const t = createTranslator({});
    expect(t('constructor')).toBe('constructor');
    expect(t('toString')).toBe('toString');
  });
});

describe('sameTranslations', () => {
  it('compares by content, so an inline literal does not count as a change', () => {
    expect(sameTranslations({ a: '1' }, { a: '1' })).toBe(true);
    expect(sameTranslations({ a: '1' }, { a: '2' })).toBe(false);
    expect(sameTranslations({ a: '1' }, { a: '1', b: '2' })).toBe(false);
    expect(sameTranslations(undefined, undefined)).toBe(true);
    expect(sameTranslations(undefined, {})).toBe(false);
  });
});
