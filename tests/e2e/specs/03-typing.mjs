import { test, assert, CONTENT } from '../lib.mjs';

const typeInto = async ({ open, page, focusEnd }, text, props = {}) => {
  await open('basic', props);
  await focusEnd();
  await page.keyboard.type(text);
};

// --------------------------------------------------------------- Markdown shortcuts
for (const [typed, expected] of [
  ['# Title', /<h1>Title<\/h1>/],
  ['## Title', /<h2>Title<\/h2>/],
  ['###### Tiny', /<h6>Tiny<\/h6>/],
  ['- one', /<ul><li>one<\/li><\/ul>/],
  ['* star', /<ul><li>star<\/li><\/ul>/],
  ['+ plus', /<ul><li>plus<\/li><\/ul>/],
  ['1. first', /<ol><li>first<\/li><\/ol>/],
  ['2) paren', /<ol><li>paren<\/li><\/ol>/],
  ['> quoted', /<blockquote>quoted<\/blockquote>|<blockquote><div>quoted<\/div><\/blockquote>/],
]) {
  test(`markdown: "${typed}" becomes ${expected.source.slice(0, 22)}`, async (h) => {
    await typeInto(h, typed);
    assert.match(await h.html(), expected);
  });
}

test('markdown: "---" then Enter makes a horizontal rule', async (h) => {
  await typeInto(h, '---');
  await h.page.keyboard.press('Enter');
  assert.match(await h.html(), /<hr>/);
});

for (const [typed, expected] of [
  ['**bold** after', /<strong>bold<\/strong>(&nbsp;| )after/],
  ['__bold__ after', /<strong>bold<\/strong>(&nbsp;| )after/],
  ['*italic* after', /<em>italic<\/em>(&nbsp;| )after/],
  ['_italic_ after', /<em>italic<\/em>(&nbsp;| )after/],
  ['~~gone~~ after', /<s>gone<\/s>(&nbsp;| )after/],
  ['`code` after', /<code>code<\/code>(&nbsp;| )after/],
  ['say **hi there** now', /say <strong>hi there<\/strong>(&nbsp;| )now/],
]) {
  test(`markdown inline: ${typed}`, async (h) => {
    await typeInto(h, typed);
    assert.match(await h.html(), expected);
  });
}

test('markdown inline: the text typed after the closing mark is NOT formatted', async (h) => {
  await typeInto(h, '**bold** plain');
  assert.doesNotMatch(await h.html(), /<strong>[^<]*plain/);
});

for (const [typed, why] of [
  ['my_var_name ', 'snake_case is not italic'],
  ['2*3*4 ', 'maths is not italic'],
  ['a # b', 'a # in the middle of a line is not a heading'],
  ['x - y', 'a dash in the middle is not a list'],
  ['**not closed ', 'an unclosed ** stays literal'],
  ['** spaced ** ', 'spaces inside the marks do not count'],
]) {
  test(`markdown leaves alone: ${typed.trim()} (${why})`, async (h) => {
    await typeInto(h, typed);
    const html = await h.html();
    assert.doesNotMatch(html, /<(h\d|ul|ol|strong|em|s|code|blockquote)>/, html);
  });
}

test('markdown: off when markdownShortcuts is false', async (h) => {
  await typeInto(h, '# Title', { markdownShortcuts: false });
  assert.doesNotMatch(await h.html(), /<h1>/);
});

test('markdown: not applied inside a list item or a heading', async (h) => {
  await typeInto(h, '- item');
  await h.page.keyboard.press('Enter');
  await h.page.keyboard.type('# not a heading');
  assert.doesNotMatch(await h.html(), /<h1>/);
});

test('markdown: not applied inside a code block', async (h) => {
  await h.open('basic', { initialValue: '<pre><code>x</code></pre>' });
  await h.page.click(`${CONTENT} code`);
  await h.press('End');
  await h.page.keyboard.type(' **bold** ');
  assert.doesNotMatch(await h.html(), /<strong>/);
});

test('markdown: one undo step reverts the transformation', async (h) => {
  await typeInto(h, '# Title');
  assert.match(await h.html(), /<h1>/);
  await h.sleep(600);
  await h.press('Control+z');
  assert.doesNotMatch(await h.html(), /<h1>/);
});

test('markdown: reports the change to onChange', async (h) => {
  await typeInto(h, '# Title');
  assert.match(await h.evaluate(() => window.__html), /<h1>Title<\/h1>/);
});

// ------------------------------------------------------------------------ Ctrl+K
test('Ctrl+K opens the link dialog', async (h) => {
  await typeInto(h, 'link me');
  await h.press('Control+k');
  await h.page.waitForFunction(() => [...document.querySelectorAll('.jc-form-title')].some((e) => /link/i.test(e.textContent)));
});

test('Ctrl+K does nothing in a read-only editor', async (h) => {
  await h.open('basic', { readOnly: true, initialValue: '<p>x</p>' });
  await h.page.click(CONTENT);
  await h.press('Control+k');
  await h.sleep(150);
  assert.equal(await h.page.$('.jc-form-title'), null);
});

// ------------------------------------------------------------------------ maxLength
test('maxLength: typing stops at the limit and the counter says so', async (h) => {
  await typeInto(h, 'abcdefghijklmnopqrstuvwxyz', { maxLength: 10 });
  assert.equal(await h.text(), 'abcdefghij');
  assert.match(await h.page.$eval('.jc-statusbar-counts', (n) => n.textContent), /10 \/ 10 characters/);
  assert.ok(await h.page.$('.jc-statusbar-limit'));
});

test('maxLength: Backspace still works at the limit, and typing resumes', async (h) => {
  await typeInto(h, 'abcdefghijXYZ', { maxLength: 10 });
  await h.page.keyboard.press('Backspace');
  await h.page.keyboard.type('Q');
  assert.equal(await h.text(), 'abcdefghiQ');
});

test('maxLength: replacing a selection is allowed at the limit', async (h) => {
  await typeInto(h, 'abcdefghij', { maxLength: 10 });
  await h.selectAll();
  await h.page.keyboard.type('Z');
  assert.equal(await h.text(), 'Z');
});

test('maxLength: pasted text is cut to what still fits', async (h) => {
  await h.open('basic', { maxLength: 12, initialValue: '<p>abcd</p>' });
  await h.focusEnd();
  await h.page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'x'.repeat(50));
    document.querySelector('.jc-content').dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
  });
  assert.equal((await h.text()).length, 12);
});

// -------------------------------------------------------------------- RTL and lang
test('dir="rtl" and lang are applied to the content, and quotes/lists/alerts mirror', async (h) => {
  await h.open('basic', { dir: 'rtl', lang: 'ar', initialValue: '<blockquote>اقتباس</blockquote><ul><li>عنصر</li></ul>' });
  const info = await h.page.$eval(CONTENT, (el) => {
    const bq = getComputedStyle(el.querySelector('blockquote'));
    const ul = getComputedStyle(el.querySelector('ul'));
    return { dir: el.dir, lang: el.lang, direction: getComputedStyle(el).direction,
      bqRight: bq.borderRightWidth, bqLeft: bq.borderLeftWidth, ulRight: ul.paddingRight, ulLeft: ul.paddingLeft };
  });
  assert.equal(info.dir, 'rtl');
  assert.equal(info.lang, 'ar');
  assert.equal(info.direction, 'rtl');
  assert.equal(info.bqRight, '3px');
  assert.equal(info.bqLeft, '0px');
  assert.notEqual(info.ulRight, '0px');
  assert.equal(info.ulLeft, '0px');
});

test('LTR content keeps its left quote bar (logical properties changed nothing)', async (h) => {
  await h.open('basic', { initialValue: '<blockquote>quote</blockquote>' });
  const bq = await h.page.$eval(`${CONTENT} blockquote`, (b) => { const c = getComputedStyle(b); return [c.borderLeftWidth, c.borderRightWidth]; });
  assert.deepEqual(bq, ['3px', '0px']);
});

test('code stays left-to-right inside RTL content', async (h) => {
  await h.open('basic', { dir: 'rtl', initialValue: '<pre>code</pre>' });
  assert.equal(await h.page.$eval(`${CONTENT} pre`, (p) => getComputedStyle(p).direction), 'ltr');
});

// ------------------------------------------------------------------------- ARIA
test('dropdowns announce themselves: aria-haspopup, aria-expanded, option roles', async (h) => {
  await h.open('basic');
  const trigger = await h.page.$('.jc-dropdown-trigger');
  assert.equal(await trigger.evaluate((n) => n.getAttribute('aria-haspopup')), 'listbox');
  assert.equal(await trigger.evaluate((n) => n.getAttribute('aria-expanded')), 'false');
  await trigger.click();
  assert.equal(await trigger.evaluate((n) => n.getAttribute('aria-expanded')), 'true');
  const options = await h.page.$$eval('.jc-dropdown-menu [role="option"]', (n) => n.map((o) => o.getAttribute('aria-selected')));
  assert.ok(options.length > 2);
  assert.ok(options.every((v) => v === 'true' || v === 'false'));
});

test('the toolbar has a role and an accessible name, and the editable area is labelled', async (h) => {
  await h.open('basic');
  assert.equal(await h.page.$eval('.jc-toolbar', (n) => n.getAttribute('role')), 'toolbar');
  assert.ok(await h.page.$eval('.jc-toolbar', (n) => n.getAttribute('aria-label')));
  assert.equal(await h.page.$eval(CONTENT, (n) => n.getAttribute('aria-label')), 'Rich text content');
});

test('ariaLabel and id reach the editable element (so <label htmlFor> works)', async (h) => {
  await h.open('basic', { id: 'post-body', ariaLabel: 'Post body' });
  assert.equal(await h.page.$eval(CONTENT, (n) => n.id), 'post-body');
  assert.equal(await h.page.$eval(CONTENT, (n) => n.getAttribute('aria-label')), 'Post body');
});
