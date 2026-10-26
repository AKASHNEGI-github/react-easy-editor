import { test, assert, CONTENT } from '../lib.mjs';
import { localeEn } from '../../../src/locales/en.js';

// Reports visible text and accessible names inside the editor chrome (everything except the
// document itself) that did NOT come out of t().
const untranslated = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('.jc-root');
    const found = new Set();
    const hasWords = (s) => /[A-Za-z]{2,}/.test(s);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!el || el.closest('.jc-content, textarea, script, style, .jc-statusbar-path, .jc-emoji-grid')) continue;
      const text = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (hasWords(text) && !/^https?:\/\//i.test(text) && !text.includes('\u27e6')) found.add(`text: ${text}`);
    }
    // Not words that belong in a translation file: emoji search keywords (a deliberately English
    // search index), colour codes, and addresses / the user's own link.
    const ignore = (v) => /^#[0-9a-f]{3,8}$/i.test(v) || /^https?:\/\//i.test(v);
    root.querySelectorAll('[title],[aria-label],[placeholder]').forEach((el) => {
      if (el.closest('.jc-content, .jc-emoji-grid')) return;
      for (const attr of ['title', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(attr);
        if (v && hasWords(v) && !ignore(v) && !v.includes('\u27e6')) found.add(`${attr}: ${v}`);
      }
    });
    return [...found];
  });

// The dialogs and tools to open. Each entry: a name and how to reach it from a fresh page.
const openers = {
  'initial toolbar and status bar': async () => {},
  'insert link': async ({ clickButton }) => clickButton('\u27e6Insert link (Ctrl+K)\u27e7'),
  'insert image': async ({ clickButton }) => clickButton('\u27e6Insert image\u27e7'),
  'insert file': async ({ clickButton }) => clickButton('\u27e6Insert file\u27e7'),
  'insert video': async ({ clickButton }) => clickButton('\u27e6Insert video\u27e7'),
  'insert table': async ({ clickButton }) => clickButton('\u27e6Insert table\u27e7'),
  'insert code': async ({ clickButton }) => clickButton('\u27e6Insert code\u27e7'),
  'emoji': async ({ clickButton }) => clickButton('\u27e6Insert emoji\u27e7'),
  'special characters': async ({ clickButton }) => clickButton('\u27e6Insert special character\u27e7'),
  'find and replace': async ({ clickButton }) => clickButton('\u27e6Find & replace\u27e7'),
  'preview': async ({ clickButton }) => clickButton('\u27e6Preview\u27e7'),
  'about': async ({ clickButton }) => clickButton('\u27e6About this editor\u27e7'),
  'colour picker': async ({ clickButton }) => clickButton('\u27e6Text & background color\u27e7'),
  'paragraph dropdown': async ({ page }) => page.click('.jc-toolbar [aria-label="\u27e6Paragraph style\u27e7"]'),
  'alert dropdown': async ({ page }) => page.click('.jc-toolbar [aria-label^="\u27e6Insert alert"]'),
  'font dropdown': async ({ page }) => page.click('.jc-toolbar [aria-label="\u27e6Font family\u27e7"]'),
  'line height dropdown': async ({ page }) => page.click('.jc-toolbar [aria-label="\u27e6Line height\u27e7"]'),
  'source view': async ({ clickButton }) => clickButton('\u27e6View content in HTML output\u27e7'),
  // The tool bars below mount after the click lands, so every opener waits for its bar instead of
  // hoping it is already there (an opener that silently opens nothing makes the scans pass for nothing).
  'table tools': async ({ page }) => {
    await page.click(`${CONTENT} td`);
    await page.waitForSelector('.jc-table-tools');
  },
  ...Object.fromEntries(
    ['Row', 'Column', 'Merge & split', 'Table', 'Cell colors'].map((menu) => [
      `table menu: ${menu}`,
      async ({ page }) => {
        await page.click(`${CONTENT} td`);
        const button = `[title="\u27e6${menu}\u27e7"]`;
        await page.waitForSelector(button);
        await page.click(button);
        await page.waitForSelector('.jc-table-tools .jc-dropdown-menu, .jc-table-tools .jc-color-popup');
      },
    ]),
  ),
  'image tools': async ({ page }) => {
    await page.click(`${CONTENT} img`);
    await page.waitForSelector('.jc-media-tools');
  },
  'link tools': async ({ page }) => {
    await page.click(`${CONTENT} a`);
    await page.waitForSelector('.jc-media-tools');
  },
};

for (const [name, open] of Object.entries(openers)) {
  test(`i18n: nothing is left untranslated in "${name}"`, async (h) => {
    await h.open('marker');
    await h.page.click(CONTENT);
    await open(h);
    await h.sleep(200);
    const left = await untranslated(h.page);
    assert.deepEqual(left, [], `these never went through t():\n  ${left.join('\n  ')}`);
  });
}

test('i18n: a real translation replaces the toolbar text, the dialogs and the status bar', async (h) => {
  await h.open('basic', {
    translations: {
      'Bold (Ctrl+B)': 'Negrita (Ctrl+B)',
      'Insert link (Ctrl+K)': 'Insertar enlace (Ctrl+K)',
      '{count} words': '{count} palabras',
      '{count} word': '{count} palabra',
      Cancel: 'Cancelar',
    },
    initialValue: '<p>one two three</p>',
  });
  assert.ok(await h.button('Negrita (Ctrl+B)'));
  assert.match(await h.page.$eval('.jc-statusbar-counts', (n) => n.textContent), /3 palabras/);
  await h.clickButton('Insertar enlace (Ctrl+K)');
  await h.page.waitForSelector('#jc-link-url');
  assert.ok(await h.page.evaluate(() => [...document.querySelectorAll('.jc-btn-secondary')].some((b) => b.textContent === 'Cancelar')));
  // strings with no translation fall back to English
  assert.ok(await h.button('Italic (Ctrl+I)'));
});

// The English template is generated from the source. This proves it is also COMPLETE: every
// string the running UI asks t() for, in every dialog and tool, must be a key in it.
test('i18n: every string the UI requests is in the English template (src/locales/en.js)', async (h) => {
  const requested = new Set();
  for (const [name, open] of Object.entries(openers)) {
    await h.open('marker');
    await h.page.click(CONTENT);
    await open(h);
    await h.sleep(120);
    for (const k of await h.page.evaluate(() => [...window.__keys])) requested.add(k);
    // never saw `name` for nothing: each opener must actually have requested something
    assert.ok(requested.size > 0, name);
  }
  const known = new Set(Object.keys(localeEn));
  const missing = [...requested].filter((k) => !known.has(k) && !/^(\d+(\.\d+)?|Arial|Georgia|Impact|Tahoma|Times New Roman|Courier New|Verdana|Trebuchet MS|Comic Sans MS|\d+)$/.test(k) && !/^(JavaScript|TypeScript|Python|Java|C#|C\+\+|C|HTML \/ XML|CSS|JSON|Bash \/ Shell|SQL|PHP|Ruby|Go|Rust|YAML|Markdown)$/.test(k)
    // emoji names are search keywords, deliberately English
    && !/^[a-z0-9 ]+$/.test(k));
  assert.deepEqual(missing, [], `strings the UI translates that are missing from src/locales/en.js (run: node scripts/extract-i18n-keys.mjs --write):\n  ${missing.join('\n  ')}`);
});
