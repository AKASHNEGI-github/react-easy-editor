// Markdown-style typing shortcuts, the way most modern editors behave:
//
//   "# " .. "###### "   -> heading 1..6        "> "          -> quote
//   "- " "* " "+ "     -> bullet list           "1. " "1) "   -> numbered list
//   "---" then Enter    -> horizontal rule
//   **bold**  __bold__  *italic*  _italic_  ~~strike~~  `code`   (then Space)
//
// The matching is pure (see matchBlockShortcut / matchInlineShortcut) so it can be tested
// without a browser. The DOM part below is deliberately strict about WHERE it fires: only on a
// plain top-level paragraph line for block shortcuts, and never inside code.

const HEADING = /^(#{1,6})$/;
const BULLET = /^[-*+]$/;
const ORDERED = /^\d{1,9}[.)]$/;
const DIVIDER = /^(-{3,}|\*{3,}|_{3,})$/;

// `text` is everything on the line before the caret (the Space has not been typed yet).
export function matchBlockShortcut(text) {
  let m = HEADING.exec(text);
  if (m) return { type: 'heading', level: m[1].length };
  if (BULLET.test(text)) return { type: 'ul' };
  if (ORDERED.test(text)) return { type: 'ol' };
  if (text === '>') return { type: 'quote' };
  return null;
}

export function matchDividerShortcut(text) {
  return DIVIDER.test(text);
}

// Each rule captures: 1 = the character before the opener (so we never fire inside a word, e.g.
// snake_case_names or 2*3*4), 2 = opener, 3 = the content. Closers must equal the opener.
const INLINE_RULES = [
  { type: 'code', re: /(^|[^`])(`)([^`\n]+)\2$/ },
  { type: 'bold', re: /(^|[^*_\w])(\*\*|__)([^\s*_](?:[^*_]*[^\s*_])?)\2$/ },
  { type: 'strike', re: /(^|[^~])(~~)([^\s~](?:[^~]*[^\s~])?)\2$/ },
  { type: 'italic', re: /(^|[^*_\w])(\*|_)([^\s*_](?:[^*_]*[^\s*_])?)\2$/ },
];

// Returns { type, start, content } where `start` is the index in `before` of the opener,
// or null. The whole matched run is `before.slice(start)`.
export function matchInlineShortcut(before) {
  for (const rule of INLINE_RULES) {
    const m = rule.re.exec(before);
    if (m) return { type: rule.type, start: m.index + m[1].length, content: m[3] };
  }
  return null;
}

// ---------------------------------------------------------------- DOM side

const INLINE_TAG = { code: 'code', bold: 'strong', strike: 's', italic: 'em' };
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'TD', 'TH', 'UL', 'OL', 'TABLE', 'HR',
]);
const INLINE_ONLY = new Set(['SPAN', 'B', 'I', 'U', 'STRONG', 'EM', 'S', 'STRIKE', 'FONT', 'A', 'SUP', 'SUB', 'MARK']);

// True when `node` is the first thing on its visual line (nothing but a line break or a block
// boundary before it).
function startsLine(node, root) {
  let n = node;
  while (n && n !== root) {
    const prev = n.previousSibling;
    if (prev) return prev.nodeName === 'BR' || (prev.nodeType === 1 && BLOCK_TAGS.has(prev.nodeName));
    n = n.parentNode;
    if (n && n !== root && BLOCK_TAGS.has(n.nodeName)) return true;
  }
  return true;
}

// Block shortcuts are only for a plain paragraph line: the text sits at the top level of the
// editor, or inside ONE un-styled <p>/<div> that is itself top level, with nothing but inline
// wrappers in between. Lists, tables, headings, quotes, code and the editor's own widgets
// (alerts, code tabs) all fail this and are left alone.
function isPlainParagraphLine(node, root) {
  let blocks = 0;
  for (let el = node.parentNode; el && el !== root; el = el.parentNode) {
    if (el.nodeType !== 1) return false;
    if (INLINE_ONLY.has(el.nodeName)) continue;
    if ((el.nodeName === 'P' || el.nodeName === 'DIV') && el.parentNode === root && !el.className && el.getAttributeNames().every((a) => a === 'style')) {
      blocks += 1;
      continue;
    }
    return false;
  }
  return blocks <= 1;
}

function inCode(node, root) {
  for (let el = node.parentNode; el && el !== root; el = el.parentNode) {
    if (el.nodeType !== 1) continue;
    if (el.nodeName === 'PRE' || el.nodeName === 'CODE') return true;
    if (typeof el.className === 'string' && /jc-code/.test(el.className)) return true;
  }
  return false;
}

function collapsedTextPosition() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  return { sel, node, offset: sel.anchorOffset };
}

function setCaret(sel, node, offset) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Removes the first `count` characters of the text node and parks the caret there. When that
// leaves the line empty it swaps in a <br>, so the block still has something to hold the caret.
function eraseMarker(sel, node, count) {
  const rest = node.nodeValue.slice(count);
  if (rest) {
    node.nodeValue = rest;
    setCaret(sel, node, 0);
    return;
  }
  const br = document.createElement('br');
  node.parentNode.replaceChild(br, node);
  const range = document.createRange();
  range.setStartBefore(br);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function applyBlock(editor, sel, node, offset, shortcut) {
  eraseMarker(sel, node, offset);
  editor.selection.save();
  if (shortcut.type === 'heading') editor.exec('formatBlock', `<h${shortcut.level}>`);
  else if (shortcut.type === 'ul') editor.exec('insertUnorderedList');
  else if (shortcut.type === 'ol') editor.exec('insertOrderedList');
  else if (shortcut.type === 'quote') editor.exec('formatBlock', '<blockquote>');
}

function applyInline(editor, sel, node, offset, match) {
  const full = node.nodeValue;
  const lead = full.slice(0, match.start);
  const after = full.slice(offset);
  const parent = node.parentNode;

  const el = document.createElement(INLINE_TAG[match.type]);
  el.textContent = match.content;
  // Chrome itself types a non-breaking space at the end of a line; a plain one would collapse.
  const tail = document.createTextNode((after ? ' ' : '\u00A0') + after);

  parent.insertBefore(el, node.nextSibling);
  parent.insertBefore(tail, el.nextSibling);
  if (lead) node.nodeValue = lead;
  else parent.removeChild(node);

  setCaret(sel, tail, 1);
  editor.selection.save();
  editor.onInput(); // records one undo step and tells the host
}

// Returns true when the key was consumed.
export function handleMarkdownKeyDown(editor, e) {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return false;
  const isSpace = e.key === ' ';
  const isEnter = e.key === 'Enter' && !e.shiftKey;
  if (!isSpace && !isEnter) return false;

  const root = editor.containerRef.current;
  const pos = collapsedTextPosition();
  if (!root || !pos || !root.contains(pos.node)) return false;
  const { sel, node, offset } = pos;
  if (inCode(node, root)) return false;
  const before = node.nodeValue.slice(0, offset);

  if (isSpace) {
    if (startsLine(node, root) && isPlainParagraphLine(node, root)) {
      const block = matchBlockShortcut(before);
      if (block) {
        e.preventDefault();
        applyBlock(editor, sel, node, offset, block);
        return true;
      }
    }
    const inline = matchInlineShortcut(before);
    if (inline) {
      e.preventDefault();
      applyInline(editor, sel, node, offset, inline);
      return true;
    }
    return false;
  }

  // Enter: "---" on its own plain line becomes a horizontal rule.
  if (offset === node.nodeValue.length && startsLine(node, root) && isPlainParagraphLine(node, root) && matchDividerShortcut(before)) {
    e.preventDefault();
    eraseMarker(sel, node, offset);
    editor.selection.save();
    editor.exec('insertHorizontalRule');
    return true;
  }
  return false;
}
