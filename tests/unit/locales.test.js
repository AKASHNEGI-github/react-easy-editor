import { describe, it, expect } from 'vitest';
import { extractKeys } from '../../scripts/extract-i18n-keys.mjs';
import { localeEn, localeEs, localeFr, localeDe, localeHi } from '../../src/index.js';
import { createTranslator } from '../../src/core/i18n';

const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort();
const packs = { es: localeEs, fr: localeFr, de: localeDe, hi: localeHi };

describe('English template (src/locales/en.js)', () => {
  it('lists exactly the strings the source asks to translate', () => {
    // If this fails: node scripts/extract-i18n-keys.mjs --write
    expect(Object.keys(localeEn).sort()).toEqual(extractKeys().slice().sort());
  });

  it('maps every key to itself', () => {
    for (const [k, v] of Object.entries(localeEn)) expect(v).toBe(k);
  });
});

describe.each(Object.entries(packs))('%s pack', (code, pack) => {
  it('has every key of the template, and no stray ones', () => {
    expect(Object.keys(pack).sort()).toEqual(Object.keys(localeEn).sort());
  });

  it('has no empty translations', () => {
    for (const [k, v] of Object.entries(pack)) expect(v.trim(), k).not.toBe('');
  });

  it('keeps every {placeholder} the English string has, and adds none', () => {
    for (const [k, v] of Object.entries(pack)) expect(placeholders(v), k).toEqual(placeholders(k));
  });

  it('actually translates (differs from English for most strings)', () => {
    const same = Object.entries(pack).filter(([k, v]) => k === v).length;
    expect(same / Object.keys(pack).length).toBeLessThan(0.15); // a few words (Emoji, URL, Code...) are legitimately identical
  });

  it('plugs into the translator', () => {
    const t = createTranslator(pack);
    expect(t('Bold (Ctrl+B)')).toBe(pack['Bold (Ctrl+B)']);
    expect(t('{count} words', { count: 7 })).toContain('7');
    expect(t('Something not in the pack')).toBe('Something not in the pack');
  });
});
