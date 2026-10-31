// A document that ends in a code block, table, divider, alert, quote, <pre> or loose media used to
// leave the writer nowhere to put the caret after it. The editor now keeps one empty paragraph there
// (core/trailingParagraph.js). These tests click where a writer would click and check where the text goes.
import { test, assert } from '../lib.mjs';

const BLOCKS = {
  'a code block': null, // built in the page, see below
  'a table': '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>',
  'a divider': '<hr>',
  'an alert': '<div class="jc-alert jc-alert--tip"><div class="jc-alert-label" contenteditable="false">Tip</div><div class="jc-alert-content"><p>Hi</p></div></div>',
  'a quote': '<blockquote>quote</blockquote>',
  'a <pre> block': '<pre>code</pre>',
  'an image at the root': '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="x">',
};

const CODE_BLOCK = "window.__buildCodeBlock([{ language: 'javascript', filename: 'a.js', code: 'const a = 1;' }]).outerHTML";

const blockHtml = (page, name) => (BLOCKS[name] === null ? page.evaluate(CODE_BLOCK) : BLOCKS[name]);

// What a writer does: click in the blank space under the last block.
async function clickBelow(page) {
  const point = await page.$eval('.jc-content', (el) => {
    const box = el.getBoundingClientRect();
    return { x: box.left + 40, y: box.bottom - 12 };
  });
  await page.mouse.click(point.x, point.y);
}

const lastLine = (page) =>
  page.$eval('.jc-content', (el) => {
    const last = el.lastElementChild;
    return last && { tag: last.tagName, text: last.textContent, empty: last.textContent === '' && last.childNodes.length === 1 && last.firstChild.nodeName === 'BR' };
  });

test('a caret can follow every kind of last block: text typed under it goes after it, not into it or before it', async ({ open, page, evaluate }) => {
  await open('basic');
  for (const name of Object.keys(BLOCKS)) {
    await evaluate((html) => window.__handle().setHTML(html), '<p>start</p>' + (await blockHtml(page, name)));

    const line = await lastLine(page);
    assert.ok(line && line.tag === 'P' && line.empty, `${name}: the editor should keep an empty line after it, got ${JSON.stringify(line)}`);
    const before = await evaluate(() => window.__handle().getHTML());

    await clickBelow(page);
    await page.keyboard.type('X');

    const after = await lastLine(page);
    assert.ok(after.tag === 'P' && after.text === 'X', `${name}: the typed text should be a paragraph at the end, got ${JSON.stringify(after)}`);
    assert.equal(await evaluate(() => window.__handle().getHTML()), before + '<p>X</p>', `${name}: only the new paragraph should have been added`);
  }
});

test('the extra line is an editing aid: it is never in getHTML(), onChange or the form value', async ({ open, page, evaluate, events, log }) => {
  // Loaded through initialValue, the usual way a saved document comes back.
  await open('basic', { name: 'body', initialValue: '<p>Saved</p><hr>' });
  assert.ok((await lastLine(page)).empty, 'the line should be there');
  assert.equal(await evaluate(() => window.__handle().getHTML()), '<p>Saved</p><hr>');
  assert.equal(await evaluate(() => document.querySelector('input[name="body"]').value), '<p>Saved</p><hr>', 'the form value');
  assert.ok(!(await events()).includes('change'), 'loading a document must not fire onChange');

  // Typing in it makes it real content...
  await clickBelow(page);
  await page.keyboard.type('Added');
  assert.equal(await evaluate(() => window.__handle().getHTML()), '<p>Saved</p><hr><p>Added</p>');
  assert.equal(await evaluate(() => document.querySelector('input[name="body"]').value), '<p>Saved</p><hr><p>Added</p>');

  // ...and deleting what was typed returns it to being an aid, so it drops out of the output again.
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('Backspace');
  assert.equal(await evaluate(() => window.__handle().getHTML()), '<p>Saved</p><hr>');
  const changes = (await log()).filter((entry) => entry.type === 'change');
  assert.ok(changes.every((entry) => !/<p><br><\/p>$/.test(entry.data)), 'onChange must never report the empty trailing line');
});

test('controlled value: a document that ends in a table does not echo, reset or lose the caret', async ({ open, page, evaluate, events, waitFor }) => {
  const table = '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>';
  const start = '<p>Intro</p>' + table;
  await open('controlled', { start });
  assert.ok((await lastLine(page)).empty, 'the line should be there');
  assert.ok(!(await events()).includes('change'), 'mounting must not fire onChange');
  const initial = await evaluate(() => window.__state());
  assert.ok(initial.startsWith('<p>Intro</p><table'), 'the controlled value should be untouched');

  await clickBelow(page);
  await page.keyboard.type('X');
  await waitFor(() => window.__state().endsWith('<p>X</p>'));
  // The parent echoed the new value back. It must not have reset the DOM: the caret is still after X.
  await page.keyboard.type('Y');
  await waitFor(() => window.__state().endsWith('<p>XY</p>'));
  assert.equal((await lastLine(page)).text, 'XY');
});

test('Backspace in the empty line under a code block or a table never deletes the block, and the line stays', async ({ open, page, evaluate }) => {
  await open('basic');
  const table = '<table><tbody><tr><td>a</td></tr></tbody></table>';
  for (const [name, html, selector] of [['code block', await page.evaluate(CODE_BLOCK), '.jc-code-block'], ['table', table, 'table']]) {
    await evaluate((h) => window.__handle().setHTML('<p>start</p>' + h), html);
    const before = await evaluate(() => window.__handle().getHTML());
    await clickBelow(page);
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('Backspace');

    assert.ok(await page.$(`.jc-content ${selector}`), `${name}: Backspace must not delete it`);
    assert.equal(await evaluate(() => window.__handle().getHTML()), before, `${name}: the document should be unchanged`);
    assert.ok((await lastLine(page)).empty, `${name}: an empty line should still follow it`);

    // and the writer is not stuck: the line still takes the caret
    await clickBelow(page);
    await page.keyboard.type('Z');
    assert.equal(await evaluate(() => window.__handle().getHTML()), before + '<p>Z</p>', `${name}: text typed afterwards goes after the block`);
  }
});

test('Backspace in a blank line between a code block and a paragraph removes just that line', async ({ open, page, evaluate }) => {
  await open('basic');
  await evaluate((html) => window.__handle().setHTML('<p>start</p>' + html + '<p><br></p><p>next</p>'), await page.evaluate(CODE_BLOCK));
  const blank = await page.evaluate(() => {
    const el = document.querySelector('.jc-code-block').nextElementSibling;
    const box = el.getBoundingClientRect();
    return { x: box.left + 20, y: box.top + box.height / 2 };
  });
  await page.mouse.click(blank.x, blank.y);
  await page.keyboard.press('Backspace');

  const html = await evaluate(() => window.__handle().getHTML());
  assert.ok(html.includes('jc-code-block'), 'the code block must survive');
  assert.ok(html.endsWith('</div><p>next</p>'), `only the blank line should be gone, got ...${html.slice(-50)}`);
  await page.keyboard.type('Q');
  assert.ok((await evaluate(() => window.__handle().getHTML())).endsWith('<p>Qnext</p>'), 'the caret should be at the start of the next paragraph');
});

test('a quote made with the toolbar at the end of the document also gets a line to continue on', async ({ open, page, evaluate, focusEnd, clickButton }) => {
  await open('basic');
  await focusEnd();
  await page.keyboard.type('quoted');
  await clickButton('Paragraph style');
  const options = await page.$$('.jc-dropdown-menu [role="option"]');
  for (const option of options) {
    if ((await option.evaluate((el) => el.textContent.trim())) === 'Quote') {
      await option.click();
      break;
    }
  }
  await page.waitForFunction(() => document.querySelector('.jc-content blockquote') && document.querySelector('.jc-content').lastElementChild.tagName === 'P');

  await clickBelow(page);
  await page.keyboard.type('after');
  const html = await evaluate(() => window.__handle().getHTML());
  assert.match(html, /<blockquote>quoted<\/blockquote>/);
  assert.ok(html.endsWith('<p>after</p>'), `the text should be outside the quote, got ${html}`);
});

test('undo and redo keep exactly one empty line and bring the typed text back', async ({ open, page, evaluate, sleep, press }) => {
  await open('basic');
  await evaluate((html) => window.__handle().setHTML('<p>start</p>' + html), await page.evaluate(CODE_BLOCK));
  const original = await evaluate(() => window.__handle().getHTML());

  await clickBelow(page);
  await page.keyboard.type('X');
  await sleep(700); // history snapshots are debounced
  await press('Control+z');
  assert.equal(await evaluate(() => window.__handle().getHTML()), original, 'undo should remove the typed text');
  const tail = await page.$eval('.jc-content', (el) => ({ last: el.lastElementChild.outerHTML, before: el.lastElementChild.previousElementSibling.className }));
  assert.equal(tail.last, '<p><br></p>');
  assert.match(tail.before, /jc-code-block/, 'there must be one empty line, not two');

  await press('Control+y');
  assert.equal(await evaluate(() => window.__handle().getHTML()), original + '<p>X</p>', 'redo should bring the text back');
});

test('switching to HTML source and back keeps the line, and the source does not show it', async ({ open, page, evaluate, clickButton, waitFor }) => {
  await open('basic', { initialValue: '<p>a</p><hr>' });
  await clickButton('View content in HTML output');
  await waitFor(() => !document.querySelector('.jc-content'));
  assert.equal(await page.$eval('.jc-source', (el) => el.value), '<p>a</p><hr>');
  await clickButton('View content in HTML output');
  await waitFor(() => document.querySelector('.jc-content'));
  assert.ok((await lastLine(page)).empty, 'the line should be back');
  assert.equal(await evaluate(() => window.__handle().getHTML()), '<p>a</p><hr>');
});

test('a locked editor does not grow a line, and gets it when unlocked', async ({ open, page, evaluate, clickButton, waitFor }) => {
  await open('basic', { readOnly: true, initialValue: '<p>a</p><hr>' });
  assert.equal((await lastLine(page)).tag, 'HR', 'a read-only editor should not get an extra line');

  await open('basic');
  await clickButton('Lock (read-only)');
  await evaluate(() => window.__handle().setHTML('<p>a</p><hr>'));
  assert.equal((await lastLine(page)).tag, 'HR', 'locked: still no extra line');
  await clickButton('Lock (read-only)'); // unlock
  await waitFor(() => document.querySelector('.jc-content').lastElementChild.tagName === 'P');
  assert.ok((await lastLine(page)).empty);
});
