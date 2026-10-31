import { describe, it, expect } from 'vitest';
import { ensureTrailingParagraph, needsLineAfter, watchTrailingParagraph, withoutTrailingBlank } from '../../src/core/trailingParagraph';

function root(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}
const lastOf = (el) => el.lastElementChild;
const tick = () => Promise.resolve(); // MutationObserver callbacks run as microtasks

describe('needsLineAfter: which last blocks leave the caret nowhere to go', () => {
  const trap = (html) => needsLineAfter(root(html).lastElementChild);

  it.each([
    ['a table', '<table><tbody><tr><td>a</td></tr></tbody></table>'],
    ['a divider', '<hr>'],
    ['a <pre> block', '<pre>code</pre>'],
    ['a quote', '<blockquote>quote</blockquote>'],
    ['a quote with a paragraph inside', '<blockquote><p>quote</p></blockquote>'],
    ['a figure', '<figure><img src="x.png"></figure>'],
    ['the editor\'s code block', '<div class="jc-code-block" contenteditable="false"><pre>x</pre></div>'],
    ['the editor\'s alert', '<div class="jc-alert jc-alert--tip"><div class="jc-alert-content"><p>Hi</p></div></div>'],
    ['any contenteditable widget', '<div contenteditable="false">x</div>'],
    ['a loose image', '<img src="x.png">'],
    ['a loose video frame', '<iframe src="https://www.youtube.com/embed/a"></iframe>'],
    ['a table inside the last plain line', '<div>text<table><tbody><tr><td>a</td></tr></tbody></table></div>'],
  ])('%s needs a line after it', (_name, html) => {
    expect(trap(html)).toBe(true);
  });

  it.each([
    ['a paragraph', '<p>text</p>'],
    ['a plain line (Enter makes <div>s)', '<div>text</div>'],
    ['an empty line', '<div><br></div>'],
    ['a heading (Enter leaves it)', '<h2>Title</h2>'],
    ['a bulleted list (Enter leaves it)', '<ul><li>one</li></ul>'],
    ['a numbered list', '<ol><li>one</li></ol>'],
    ['an image inside a paragraph (the caret can follow it)', '<p><img src="x.png"></p>'],
    ['an image inside a plain line', '<div><img src="x.png"></div>'],
    ['an aligned line', '<div style="text-align: center">text</div>'],
  ])('%s does not', (_name, html) => {
    expect(trap(html)).toBe(false);
  });

  it('treats loose text, comments and missing nodes as fine', () => {
    expect(needsLineAfter(document.createTextNode('text'))).toBe(false);
    expect(needsLineAfter(null)).toBe(false);
  });
});

describe('ensureTrailingParagraph', () => {
  it('adds an empty paragraph after a trailing block', () => {
    const el = root('<p>start</p><hr>');
    expect(ensureTrailingParagraph(el)).toBe(true);
    expect(el.innerHTML).toBe('<p>start</p><hr><p><br></p>');
  });

  it('does nothing when the last block is already a line', () => {
    for (const html of ['<p>a</p>', '<p>a</p><div>b</div>', '<h2>T</h2>', '<ul><li>a</li></ul>']) {
      const el = root(html);
      expect(ensureTrailingParagraph(el)).toBe(false);
      expect(el.innerHTML).toBe(html);
    }
  });

  it('leaves an empty document alone, so the placeholder (which relies on :empty) keeps showing', () => {
    const el = root('');
    expect(ensureTrailingParagraph(el)).toBe(false);
    expect(el.childNodes.length).toBe(0);
  });

  it('gives an empty last line a <br>, because an empty block collapses to nothing and cannot be clicked', () => {
    const el = root('<p>a</p><hr><p></p>');
    expect(ensureTrailingParagraph(el)).toBe(true);
    expect(el.innerHTML).toBe('<p>a</p><hr><p><br></p>');
  });

  it('looks past trailing whitespace and comments when deciding', () => {
    const el = root('<p>a</p><hr>\n  <!-- note -->\n');
    expect(ensureTrailingParagraph(el)).toBe(true);
    expect(lastOf(el).tagName).toBe('P');
  });

  it('is idempotent', () => {
    const el = root('<table><tbody><tr><td>a</td></tr></tbody></table>');
    expect(ensureTrailingParagraph(el)).toBe(true);
    const once = el.innerHTML;
    expect(ensureTrailingParagraph(el)).toBe(false);
    expect(el.innerHTML).toBe(once);
  });

  it('adds a line after a table that sits inside the last plain line', () => {
    const el = root('<div>text<table><tbody><tr><td>a</td></tr></tbody></table></div>');
    expect(ensureTrailingParagraph(el)).toBe(true);
    expect(el.innerHTML.endsWith('</div><p><br></p>')).toBe(true);
  });
});

describe('withoutTrailingBlank: what getHTML() reports', () => {
  it('drops one empty paragraph at the end', () => {
    expect(withoutTrailingBlank('<p>a</p><hr><p><br></p>')).toBe('<p>a</p><hr>');
    expect(withoutTrailingBlank('<p>a</p><p></p>')).toBe('<p>a</p>');
  });

  it('drops only one, so a deliberate extra blank line is kept', () => {
    expect(withoutTrailingBlank('<p>a</p><p><br></p><p><br></p>')).toBe('<p>a</p><p><br></p>');
  });

  it('turns a document that is only the empty paragraph into an empty string', () => {
    expect(withoutTrailingBlank('<p><br></p>')).toBe('');
  });

  it('ignores whitespace after the paragraph', () => {
    expect(withoutTrailingBlank('<p>a</p><p><br></p>\n')).toBe('<p>a</p>');
  });

  it('leaves everything else alone', () => {
    for (const html of [
      '',
      '<p>a</p>',
      '<p>a <br></p>',
      '<p style="text-align: center"><br></p>', // has formatting, so it is content
      '<div><br></div>',
      '<blockquote><p><br></p></blockquote>', // an empty paragraph that is not the last block
      '<p>a</p><p><br>x</p>',
    ]) {
      expect(withoutTrailingBlank(html)).toBe(html);
    }
  });
});

describe('watchTrailingParagraph', () => {
  it('adds the line straight away when it starts watching', () => {
    const el = root('<p>a</p><hr>');
    const stop = watchTrailingParagraph(el);
    expect(el.innerHTML).toBe('<p>a</p><hr><p><br></p>');
    stop();
  });

  it('keeps the rule true when content is replaced, a block is added, or the last line is removed', async () => {
    const el = root('<p>a</p>');
    const stop = watchTrailingParagraph(el);

    el.innerHTML = '<p>b</p><div class="jc-code-block" contenteditable="false"><pre>x</pre></div>';
    await tick();
    expect(lastOf(el).outerHTML).toBe('<p><br></p>');

    // The writer deletes the empty line after the block: it comes back.
    lastOf(el).remove();
    await tick();
    expect(lastOf(el).outerHTML).toBe('<p><br></p>');

    // A block is appended after a paragraph (what an insert plugin does).
    el.innerHTML = '<p>c</p>';
    await tick();
    el.appendChild(document.createElement('hr'));
    await tick();
    expect(el.innerHTML).toBe('<p>c</p><hr><p><br></p>');
    stop();
  });

  it('notices a block added deep inside the last line', async () => {
    const el = root('<div>text</div>');
    const stop = watchTrailingParagraph(el);
    el.firstChild.appendChild(document.createElement('table'));
    await tick();
    expect(lastOf(el).outerHTML).toBe('<p><br></p>');
    stop();
  });

  it('does not loop: adding the line is itself a change, which must settle', async () => {
    const el = root('<hr>');
    let calls = 0;
    const stop = watchTrailingParagraph(el, () => { calls += 1; return true; });
    await tick();
    await tick();
    expect(calls).toBeLessThan(5);
    expect(el.querySelectorAll('p').length).toBe(1);
    stop();
  });

  it('adds nothing while disabled (a locked editor) and nothing after it is stopped', async () => {
    let enabled = false;
    const el = root('<p>a</p>');
    const stop = watchTrailingParagraph(el, () => enabled);
    el.innerHTML = '<p>a</p><hr>';
    await tick();
    expect(el.innerHTML).toBe('<p>a</p><hr>');

    enabled = true;
    el.appendChild(document.createElement('hr'));
    await tick();
    expect(lastOf(el).tagName).toBe('P');

    stop();
    el.innerHTML = '<p>b</p><hr>';
    await tick();
    expect(el.innerHTML).toBe('<p>b</p><hr>');
  });
});
