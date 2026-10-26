import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, assert, CONTENT } from '../lib.mjs';

// 1x1 red PNG
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const pngPath = path.join(tmpdir(), 'jc-test.png');
writeFileSync(pngPath, Buffer.from(PNG_B64, 'base64'));

// Opens Insert image > Choose image... and picks the test PNG.
async function pickViaDialog(page, clickButton) {
  await page.click(CONTENT);
  await clickButton('Insert image');
  await page.waitForSelector('#jc-img-file');
  const [chooser] = await Promise.all([page.waitForFileChooser(), page.click('#jc-img-file')]);
  await chooser.accept([pngPath]);
}

// Builds a DataTransfer holding a file, inside the page, and dispatches an event with it.
const dispatchWithFile = (page, kind, { name, type, b64 = PNG_B64 }) =>
  page.evaluate(
    (k, n, t, data) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], n, { type: t }));
      const el = document.querySelector('.jc-content');
      const box = el.getBoundingClientRect();
      const init = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: box.left + 20, clientY: box.top + 10 };
      const ev = k === 'paste' ? new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }) : new DragEvent(k, init);
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    },
    kind, name, type, b64
  );

test('picked image without an upload handler is embedded as a data URL', async ({ open, page, clickButton }) => {
  await open('basic');
  await pickViaDialog(page, clickButton);
  await page.waitForFunction(() => document.querySelector('.jc-content img')?.src.startsWith('data:image/png'));
  assert.equal(await page.$eval('.jc-content img', (i) => i.hasAttribute('data-jc-upload-id')), false);
  assert.equal(await page.$eval('.jc-content img', (i) => i.alt), 'jc-test', 'alt text comes from the file name');
});

test('upload handler: placeholder first (never in onChange), then the real URL', async ({ open, page, clickButton, evaluate, log }) => {
  await open('upload', { delay: 500 });
  await pickViaDialog(page, clickButton);
  // while uploading: a dimmed blob: placeholder is in the DOM...
  await page.waitForSelector('.jc-content img[data-jc-upload-id]');
  assert.match(await page.$eval('.jc-content img', (i) => i.src), /^blob:/);
  // ...but nothing the host can see mentions it
  assert.doesNotMatch(await evaluate(() => window.__handle().getHTML()), /blob:|upload-id/);
  await page.waitForFunction(() => document.querySelector('.jc-content img')?.src.endsWith('/uploads/pixel.png'));
  assert.equal(await page.$eval('.jc-content img', (i) => i.hasAttribute('data-jc-upload-id')), false);
  const entries = await log();
  assert.equal(entries.filter((e) => e.type === 'upload').length, 1);
  const finalChange = entries.filter((e) => e.type === 'change').at(-1).data;
  assert.match(finalChange, /\/uploads\/pixel\.png/);
  assert.ok(entries.every((e) => e.type !== 'change' || !/blob:/.test(e.data)), 'a blob: URL leaked into onChange');
});

test('upload failure removes the placeholder, tells the host, and shows a notice', async ({ open, page, clickButton, log }) => {
  await open('upload', { fail: true, delay: 100 });
  await pickViaDialog(page, clickButton);
  await page.waitForSelector('.jc-statusbar-notice');
  assert.equal(await page.$('.jc-content img'), null);
  const err = (await log()).find((e) => e.type === 'upload-error');
  assert.equal(err.data.message, 'boom');
});

test('an unsafe URL from the uploader is rejected instead of written into the document', async ({ open, page, clickButton, log }) => {
  await open('upload', { bad: 'javascript:alert(1)', delay: 50 });
  await pickViaDialog(page, clickButton);
  await page.waitForSelector('.jc-statusbar-notice');
  assert.equal(await page.$('.jc-content img'), null);
  assert.match((await log()).find((e) => e.type === 'upload-error').data.message, /not allowed/);
});

test('an image over maxImageSize is refused before any upload starts', async ({ open, page, clickButton, log }) => {
  await open('upload', { props: { maxImageSize: 10 } });
  await pickViaDialog(page, clickButton);
  await page.waitForSelector('.jc-statusbar-notice');
  assert.match(await page.$eval('.jc-statusbar-notice', (n) => n.textContent), /too large/i);
  assert.equal((await log()).filter((e) => e.type === 'upload').length, 0);
});

test('dropping an image file inserts it; the browser is not allowed to navigate to it', async ({ open, page }) => {
  await open('basic', { initialValue: '<p>drop here</p>' });
  const overPrevented = await dispatchWithFile(page, 'dragover', { name: 'd.png', type: 'image/png' });
  assert.equal(overPrevented, true, 'dragover must be cancelled or the drop never reaches us');
  const dropPrevented = await dispatchWithFile(page, 'drop', { name: 'drop.png', type: 'image/png' });
  assert.equal(dropPrevented, true, 'drop must be cancelled or the browser navigates away and unsaved work is lost');
  await page.waitForFunction(() => document.querySelector('.jc-content img')?.src.startsWith('data:image/png'));
});

test('dropping a non-image file is refused with a notice', async ({ open, page }) => {
  await open('basic', { initialValue: '<p>x</p>' });
  const prevented = await dispatchWithFile(page, 'drop', { name: 'notes.txt', type: 'text/plain', b64: 'aGk=' });
  assert.equal(prevented, true);
  await page.waitForSelector('.jc-statusbar-notice');
  assert.equal(await page.$('.jc-content img'), null);
});

test('pasting a screenshot goes through onImageUpload too', async ({ open, page, log }) => {
  await open('upload', { delay: 60 });
  await page.click(CONTENT);
  await dispatchWithFile(page, 'paste', { name: 'image.png', type: 'image/png' });
  await page.waitForFunction(() => document.querySelector('.jc-content img')?.src.endsWith('/uploads/pixel.png'));
  assert.equal((await log()).filter((e) => e.type === 'upload').length, 1);
});

test('a read-only editor refuses drops without navigating', async ({ open, page }) => {
  await open('basic', { readOnly: true, initialValue: '<p>locked</p>' });
  const prevented = await dispatchWithFile(page, 'drop', { name: 'd.png', type: 'image/png' });
  assert.equal(prevented, true);
  assert.equal(await page.$('.jc-content img'), null);
});
