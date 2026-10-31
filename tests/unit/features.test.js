import { describe, it, expect } from 'vitest';
import { allPlugins } from '../../src/index';
import { FEATURE_GROUPS, UNLISTED_PLUGINS } from '../../src/demo/features';

// The demo page lists what the editor contains. These checks keep that list honest: it cannot name
// something the editor does not have, and a new toolbar button cannot be left off it.
const listed = FEATURE_GROUPS.flatMap((group) => group.items).flatMap((item) => item.plugins ?? []);
const real = allPlugins.map((plugin) => plugin.name);

describe('the features list on the demo page', () => {
  it('has groups, and every item has text', () => {
    expect(FEATURE_GROUPS.length).toBeGreaterThanOrEqual(6);
    for (const group of FEATURE_GROUPS) {
      expect(group.title.trim()).not.toBe('');
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) expect(item.text.trim()).not.toBe('');
    }
  });

  it('has no duplicate group titles or items (React uses them as keys)', () => {
    const titles = FEATURE_GROUPS.map((group) => group.title);
    expect(new Set(titles).size).toBe(titles.length);
    const texts = FEATURE_GROUPS.flatMap((group) => group.items.map((item) => item.text));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('only names toolbar plugins that exist', () => {
    expect(listed.filter((name) => !real.includes(name))).toEqual([]);
  });

  it('mentions every toolbar button, so a new one cannot be forgotten', () => {
    const withButtons = allPlugins.filter((plugin) => plugin.button && !UNLISTED_PLUGINS.includes(plugin.name)).map((plugin) => plugin.name);
    expect(withButtons.filter((name) => !listed.includes(name))).toEqual([]);
  });

  it('does not name a plugin twice', () => {
    expect(listed.filter((name, index) => listed.indexOf(name) !== index)).toEqual([]);
  });
});
