// A tiny test registry + page helpers. Specs call test(name, fn); run.mjs executes them, each in
// a fresh browser tab, and fails a test if the page threw an error or logged a console error.
import assert from 'node:assert/strict';

export const tests = [];
export const test = (name, fn, options = {}) => tests.push({ name, fn, options });
export { assert };

export const CONTENT = '.jc-content';

export function makeHelpers(page, base) {
  const h = {
    page,
    async open(scenario, props = {}, query = '') {
      const url = `${base}/?s=${scenario}&props=${encodeURIComponent(JSON.stringify(props))}${query}`;
      await page.goto(url);
      await page.waitForFunction('window.__ready === true');
      await page.waitForSelector(CONTENT);
    },
    html: () => page.$eval(CONTENT, (el) => el.innerHTML),
    text: () => page.$eval(CONTENT, (el) => el.textContent),
    // Click into the content and put the caret at the very end.
    async focusEnd() {
      await page.click(CONTENT);
      await page.keyboard.down('Control');
      await page.keyboard.press('End');
      await page.keyboard.up('Control');
    },
    async selectAll() {
      await page.click(CONTENT);
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
    },
    async press(combo) {
      const keys = combo.split('+');
      const key = keys.pop();
      for (const k of keys) await page.keyboard.down(k);
      await page.keyboard.press(key);
      for (const k of keys.reverse()) await page.keyboard.up(k);
    },
    button: (label) => page.$(`.jc-toolbar [aria-label="${label}"]`),
    async clickButton(label) {
      const el = await h.button(label);
      if (!el) throw new Error(`No toolbar button with aria-label "${label}"`);
      await el.click();
    },
    log: () => page.evaluate(() => window.__log),
    events: async () => (await page.evaluate(() => window.__log)).map((e) => e.type),
    clearLog: () => page.evaluate(() => { window.__log.length = 0; }),
    // Never rely on a fixed sleep for app state; poll for it.
    waitFor: (fn, arg, timeout = 4000) => page.waitForFunction(fn, { timeout }, arg),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    evaluate: (fn, ...args) => page.evaluate(fn, ...args),
  };
  return h;
}
