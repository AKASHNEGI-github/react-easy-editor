// The plugin example in the README must keep working: a custom toolbar row, a custom button and a command.
import { test, assert } from '../lib.mjs';

test('README plugin example: custom toolbar row, custom button and command go through undo and onChange', async ({ open, focusEnd, button, clickButton, page, html, events, sleep, press }) => {
  await open('plugin');

  // toolbarRows from the README: only Bold and the new star button
  assert.ok(await button('Bold (Ctrl+B)'), 'Bold should be on the toolbar');
  assert.ok(await button('Insert star'), 'the custom button should be on the toolbar');
  assert.equal(await button('Italic (Ctrl+I)'), null, 'buttons that are not in toolbarRows should be absent');

  await focusEnd();
  await page.keyboard.type('Rating: ');
  await sleep(600); // history snapshots are debounced
  await clickButton('Insert star');
  assert.match(await html(), /Rating: \u2605/);
  assert.ok((await events()).includes('change'), 'running a command should call onChange');

  await sleep(600);
  await press('Control+z');
  assert.doesNotMatch(await html(), /\u2605/, 'a command should be one undo step');
});
