import { describe, it, expect, beforeEach } from 'vitest';
import { insertRow, insertColumn, deleteRow, deleteColumn, mergeRight } from '../../src/core/tableUtils';
import { highlightMatches, replaceAllMatches, clearHighlights } from '../../src/core/findReplace';
import { isEmptyElement } from '../../src/core/editorBridge';

function table(rows) {
  document.body.innerHTML = `<table><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return document.querySelector('table');
}
const shape = (t) => Array.from(t.rows).map((r) => r.cells.length);
const text = (t) => Array.from(t.rows).map((r) => Array.from(r.cells).map((c) => c.textContent).join('|'));

describe('table operations', () => {
  let t;
  beforeEach(() => { t = table([['a', 'b', 'c'], ['d', 'e', 'f']]); });

  it('insertRow adds a full-width row after / before', () => {
    insertRow(t.rows[0].cells[1], true);
    expect(shape(t)).toEqual([3, 3, 3]);
    expect(text(t)[0]).toBe('a|b|c');
    insertRow(t.rows[0].cells[0], false);
    expect(shape(t)).toEqual([3, 3, 3, 3]);
    expect(text(t)[1]).toBe('a|b|c');
  });

  it('insertColumn adds one cell to every row at the right spot', () => {
    insertColumn(t.rows[0].cells[1], true);
    expect(shape(t)).toEqual([4, 4]);
    expect(text(t)[0]).toBe('a|b||c');
    insertColumn(t.rows[1].cells[0], false);
    expect(text(t)[1]).toBe('|d|e||f');
  });

  it('deleteRow / deleteColumn remove one row / one cell per row', () => {
    deleteRow(t.rows[0].cells[0]);
    expect(text(t)).toEqual(['d|e|f']);
    t = table([['a', 'b', 'c'], ['d', 'e', 'f']]);
    deleteColumn(t.rows[0].cells[1]);
    expect(text(t)).toEqual(['a|c', 'd|f']);
  });

  it('mergeRight joins the text and widens the cell', () => {
    mergeRight(t.rows[0].cells[0]);
    expect(t.rows[0].cells.length).toBe(2);
    expect(t.rows[0].cells[0].colSpan).toBe(2);
    expect(t.rows[0].cells[0].textContent).toBe('a b');
  });

  it('merging at the last column is a no-op', () => {
    mergeRight(t.rows[0].cells[2]);
    expect(shape(t)).toEqual([3, 3]);
  });
});

describe('find & replace', () => {
  let root;
  beforeEach(() => {
    document.body.innerHTML = '<div id="r"><p>The cat and the Cat</p><p>concatenate</p></div>';
    root = document.getElementById('r');
  });

  it('highlights every hit, case-insensitively by default', () => {
    expect(highlightMatches(root, 'cat', false)).toHaveLength(3);
  });

  it('can match case', () => {
    expect(highlightMatches(root, 'Cat', true)).toHaveLength(1);
  });

  it('an empty query highlights nothing and clears old highlights', () => {
    highlightMatches(root, 'cat', false);
    expect(highlightMatches(root, '', false)).toEqual([]);
    expect(root.querySelector('mark')).toBeNull();
  });

  it('clearHighlights restores the original text and merges text nodes', () => {
    const before = root.innerHTML;
    highlightMatches(root, 'the', false);
    clearHighlights(root);
    expect(root.innerHTML).toBe(before);
  });

  it('replaceAllMatches returns the count and replaces in place', () => {
    expect(replaceAllMatches(root, 'cat', 'dog', false)).toBe(3);
    expect(root.textContent).toBe('The dog and the dogconcatenate'.replace('concatenate', 'condogenate'));
  });

  it('replacement text is inserted as text, not markup', () => {
    replaceAllMatches(root, 'cat', '<b>x</b>', false);
    expect(root.querySelector('b')).toBeNull();
  });
});

describe('isEmptyElement', () => {
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
  it('treats whitespace and an empty paragraph as empty', () => {
    expect(isEmptyElement(el(''))).toBe(true);
    expect(isEmptyElement(el('<p><br></p>'))).toBe(true);
    expect(isEmptyElement(el('<p>  </p>'))).toBe(true);
    expect(isEmptyElement(null)).toBe(true);
  });
  it('text, images, tables, rules, video and code blocks all count as content', () => {
    for (const html of ['<p>x</p>', '<img src="a.png">', '<table></table>', '<hr>', '<video></video>', '<pre></pre>']) {
      expect(isEmptyElement(el(html)), html).toBe(false);
    }
  });
});
