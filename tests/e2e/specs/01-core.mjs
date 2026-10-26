import { test, assert, CONTENT } from '../lib.mjs';

test('renders a full toolbar and an editable area', async ({ open, page }) => {
  await open('basic');
  const buttons = await page.$$('.jc-toolbar button');
  assert.ok(buttons.length > 35, `expected 35+ toolbar buttons, got ${buttons.length}`);
  assert.equal(await page.$eval(CONTENT, (el) => el.getAttribute('contenteditable')), 'true');
});

test('typing reports the HTML through onChange', async ({ open, focusEnd, page, evaluate }) => {
  await open('basic');
  await focusEnd();
  await page.keyboard.type('Hello world');
  assert.match(await evaluate(() => window.__html), /Hello world/);
});

test('bold from the toolbar wraps the selection', async ({ open, selectAll, clickButton, html }) => {
  await open('basic', { initialValue: '<p>make me bold</p>' });
  await selectAll();
  await clickButton('Bold (Ctrl+B)');
  assert.match(await html(), /<(b|strong)>make me bold<\/(b|strong)>/);
});

test('undo and redo with the keyboard', async ({ open, focusEnd, page, html, sleep, press }) => {
  await open('basic', { initialValue: '<p>one</p>' });
  await focusEnd();
  await page.keyboard.type(' two');
  await sleep(600); // history snapshots are debounced
  assert.match(await html(), /one two/);
  await press('Control+z');
  assert.doesNotMatch(await html(), /two/);
  await press('Control+Shift+z');
  assert.match(await html(), /one two/);
});

test('ref handle: getHTML / setHTML / getText / isEmpty / clear / insertHTML', async ({ open, evaluate, html }) => {
  await open('basic');
  assert.equal(await evaluate(() => window.__handle().isEmpty()), true);
  await evaluate(() => window.__handle().setHTML('<p>Alpha <b>beta</b></p>'));
  assert.equal(await evaluate(() => window.__handle().getHTML()), '<p>Alpha <b>beta</b></p>');
  assert.equal(await evaluate(() => window.__handle().getText()), 'Alpha beta');
  assert.equal(await evaluate(() => window.__handle().isEmpty()), false);
  await evaluate(() => window.__handle().focus());
  await evaluate(() => window.__handle().insertHTML('<i>gamma</i>'));
  assert.match(await html(), /<i>gamma<\/i>/, 'inserted without Chromium stamping inline styles onto it');
  assert.doesNotMatch(await html(), /<i style/);
  await evaluate(() => window.__handle().clear());
  assert.equal(await evaluate(() => window.__handle().isEmpty()), true);
});

test('ref handle: an image alone makes the editor non-empty', async ({ open, evaluate }) => {
  const dot = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  await open('basic', { initialValue: `<p><img src="${dot}" alt=""></p>` });
  assert.equal(await evaluate(() => window.__handle().isEmpty()), false);
});

test('onFocus / onBlur fire for entering and leaving the editor, not for toolbar use', async ({ open, page, clearLog, events, clickButton, focusEnd }) => {
  await open('basic', { initialValue: '<p>text</p>' });
  await clearLog();
  await focusEnd();
  await clickButton('Bold (Ctrl+B)'); // toolbar use must not blur
  await clickButton('Italic (Ctrl+I)');
  assert.deepEqual((await events()).filter((e) => e === 'focus' || e === 'blur'), ['focus']);
  await page.mouse.click(5, 5); // outside the editor
  assert.deepEqual((await events()).filter((e) => e === 'focus' || e === 'blur'), ['focus', 'blur']);
});

test('autoFocus focuses the content on mount', async ({ open, page }) => {
  await open('basic', { autoFocus: true });
  await page.waitForFunction(() => document.activeElement?.classList.contains('jc-content'));
});

test('controlled: typing is never interrupted and state follows', async ({ open, focusEnd, page, evaluate, html }) => {
  await open('controlled');
  await focusEnd();
  await page.keyboard.type('XYZ');
  assert.match(await html(), /StartXYZ/);
  assert.match(await evaluate(() => window.__state()), /StartXYZ/);
  // keep typing: the caret must still be at the end, not reset by the echo
  await page.keyboard.type('123');
  assert.match(await html(), /StartXYZ123/);
});

test('controlled: an outside change replaces the content without calling onChange', async ({ open, evaluate, html, clearLog, events, sleep }) => {
  await open('controlled');
  await clearLog();
  await evaluate(() => window.__setValue('<p>Loaded from outside</p>'));
  await sleep(100);
  assert.equal(await html(), '<p>Loaded from outside</p>');
  assert.deepEqual(await events(), [], 'an external value must not echo back through onChange');
});

test('controlled: an outside change keeps the caret where the user had it', async ({ open, page, evaluate, html }) => {
  await open('controlled', { start: '<p>Hello world</p>' });
  await page.click(CONTENT);
  // caret after "Hello"
  await evaluate(() => {
    const p = document.querySelector('.jc-content p').firstChild;
    const r = document.createRange(); r.setStart(p, 5); r.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  await evaluate(() => window.__setValue('<p>Hello brave world</p>'));
  await page.waitForFunction(() => document.querySelector('.jc-content').innerHTML === '<p>Hello brave world</p>');
  await page.keyboard.type('X');
  assert.match(await html(), /HelloX brave world/);
});

test('inline onChange does not make the toolbar re-render more than the editor needs', async ({ open, focusEnd, page, evaluate }) => {
  await open('basic'); // its onChange is an inline arrow function, recreated on every host render
  await focusEnd();
  const before = await evaluate(() => window.__renders);
  await page.keyboard.type('abcdefghij', { delay: 15 });
  const perKey = ((await evaluate(() => window.__renders)) - before) / 10;
  console.log(`      toolbar renders per keystroke: ${perKey}`);
  assert.ok(perKey <= 3, `toolbar re-rendered ${perKey}x per keystroke`);
});

test('form: the editor submits through a plain <form> and resets with it', async ({ open, page, evaluate, focusEnd, sleep }) => {
  await open('form');
  const read = () => evaluate(() => Object.fromEntries(new FormData(document.getElementById('f'))));
  assert.equal((await read()).body, '<p>Hello</p>');
  await focusEnd();
  await page.keyboard.type(' there');
  assert.match((await read()).body, /Hello there/);
  await page.click('#reset');
  await sleep(150);
  assert.equal((await read()).body, '<p>Hello</p>');
});

test('works under React StrictMode (effects run twice)', async ({ open, focusEnd, page, html, evaluate }) => {
  await open('controlled', { start: '<p>Strict</p>' }, '&strict=1');
  assert.equal(await html(), '<p>Strict</p>');
  await focusEnd();
  await page.keyboard.type('!!');
  assert.match(await html(), /Strict!!/);
  assert.match(await evaluate(() => window.__state()), /Strict!!/);
});
