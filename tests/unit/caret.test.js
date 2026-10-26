import { describe, it, expect, beforeEach } from 'vitest';
import { saveCaret, restoreCaret, placeCaretAtEnd } from '../../src/core/caret';

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="root"><p>Hello <b>big</b> world</p><p>Second</p></div>';
  root = document.getElementById('root');
});

function caretAt(node, offset) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

describe('caret save / restore', () => {
  it('returns null when the selection is outside the root', () => {
    caretAt(document.body.appendChild(document.createTextNode('outside')), 2);
    expect(saveCaret(root)).toBeNull();
  });

  it('counts characters across nested elements', () => {
    caretAt(root.querySelector('b').firstChild, 2); // "Hello bi|g world"
    expect(saveCaret(root)).toEqual({ start: 8, end: 8 });
  });

  it('puts the caret back after the content is rebuilt', () => {
    caretAt(root.querySelector('b').firstChild, 2);
    const saved = saveCaret(root);
    root.innerHTML = '<p>Hello <b>big</b> world</p><p>Second</p>'; // brand-new nodes
    expect(restoreCaret(root, saved)).toBe(true);
    const sel = window.getSelection();
    expect(sel.anchorNode.textContent).toBe('big');
    expect(sel.anchorOffset).toBe(2);
  });

  it('keeps its place when text is inserted AFTER the caret', () => {
    caretAt(root.firstChild.firstChild, 5); // "Hello| "
    const saved = saveCaret(root);
    root.innerHTML = '<p>Hello brave <b>big</b> world</p>';
    restoreCaret(root, saved);
    expect(window.getSelection().anchorOffset).toBe(5);
  });

  it('restores a range, not just a caret', () => {
    const range = document.createRange();
    range.setStart(root.firstChild.firstChild, 0);
    range.setEnd(root.querySelector('b').firstChild, 3);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    const saved = saveCaret(root);
    const markup = root.innerHTML; // re-serialising replaces every node, like a re-render does
    root.innerHTML = markup;
    restoreCaret(root, saved);
    expect(window.getSelection().toString()).toBe('Hello big');
  });

  it('clamps to the end when the new content is shorter', () => {
    caretAt(root.lastChild.firstChild, 6);
    const saved = saveCaret(root);
    root.innerHTML = '<p>Hi</p>';
    expect(restoreCaret(root, saved)).toBe(true);
    expect(window.getSelection().anchorOffset).toBe(2);
  });

  it('does nothing without a saved caret', () => {
    expect(restoreCaret(root, null)).toBe(false);
  });

  it('placeCaretAtEnd collapses to the very end', () => {
    placeCaretAtEnd(root);
    const sel = window.getSelection();
    expect(sel.isCollapsed).toBe(true);
    expect(saveCaret(root).start).toBe(root.textContent.length);
  });
});
