// Checks that rely on the browser's real CSS cascade (jsdom does not apply the stylesheet), so they
// catch a rule being silently overridden by another one.
import { test, assert } from '../lib.mjs';

test('code blocks keep their padding and scroll long lines sideways', async ({ open, evaluate }) => {
  await open('basic');
  const result = await evaluate(() => {
    const longLine = 'const x = ' + '"abcdefghij" + '.repeat(40) + '1;';
    window.__handle().setHTML(window.__buildCodeBlock([{ language: 'javascript', filename: 'long.js', code: longLine }]).outerHTML);
    const pre = document.querySelector('.jc-content .jc-code-pre');
    const style = getComputedStyle(pre);
    return {
      paddingLeft: parseFloat(style.paddingLeft),
      paddingTop: parseFloat(style.paddingTop),
      overflowX: style.overflowX,
      scrollable: pre.scrollWidth > pre.clientWidth,
    };
  });
  assert.ok(result.paddingLeft >= 10 && result.paddingTop >= 8, `code padding was ${result.paddingLeft}px / ${result.paddingTop}px`);
  assert.equal(result.overflowX, 'auto');
  assert.ok(result.scrollable, 'a very long line should be reachable by scrolling, not clipped');
});
