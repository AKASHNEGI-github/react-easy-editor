// The writing area must never end in something the caret cannot follow.
//
// When a code block, alert, table, divider, quote, <pre> or loose image or video is the last thing in
// the document, there is nowhere to click or arrow to after it. The writer cannot add anything below:
// typing lands before the block, inside it, or as loose text at the root. Lists, headings and plain
// lines are fine, because Enter leaves them. So when the last block is one of the traps, we keep one
// empty paragraph after it.
//
// That paragraph is an editing aid, not content. getHTML() leaves it out while it is empty (see
// withoutTrailingBlank), so it never reaches onChange, a form value or the saved HTML. Once the writer
// types in it, it is an ordinary paragraph and is saved like one.

// Blocks the caret cannot move past when they are last.
const BLOCK_TRAPS = new Set(['TABLE', 'HR', 'PRE', 'BLOCKQUOTE', 'FIGURE']);
// Media sitting loose at the root (an image inside a paragraph is fine: the caret can follow it).
const LOOSE_MEDIA = new Set(['IMG', 'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'EMBED']);
// Plain lines. Enter in this editor makes <div> lines; inserted paragraphs are <p>.
const LINES = new Set(['P', 'DIV']);

// Code blocks, alerts and similar widgets: our own classes, or anything marked contenteditable.
const isWidget = (el) => el.hasAttribute('contenteditable') || Array.from(el.classList).some((name) => name.startsWith('jc-'));

// The last child that is not just whitespace between tags or a comment.
function lastSignificantChild(parent) {
  let node = parent.lastChild;
  while (node && ((node.nodeType === 3 && !node.nodeValue.trim()) || node.nodeType === 8)) node = node.previousSibling;
  return node;
}

/** True when `node`, as the last block of the document, would leave the caret nowhere to go. */
export function needsLineAfter(node, atRoot = true) {
  if (!node || node.nodeType !== 1) return false; // loose text: the caret can follow it
  const tag = node.tagName;
  if (BLOCK_TRAPS.has(tag) || isWidget(node)) return true;
  if (LOOSE_MEDIA.has(tag)) return atRoot;
  // A plain line whose own last child is a trap (a table inserted into the last <div>, say).
  if (LINES.has(tag)) return needsLineAfter(lastSignificantChild(node), false);
  return false;
}

function newLine(doc) {
  const line = doc.createElement('p');
  line.appendChild(doc.createElement('br'));
  return line;
}

/**
 * Makes sure the caret can always go after the last block. Returns true when it changed the DOM.
 * An empty document is left alone: the root itself takes the caret there, and the placeholder
 * (which relies on `:empty`) must keep showing.
 */
export function ensureTrailingParagraph(root) {
  const last = lastSignificantChild(root);
  if (!last) return false;
  const doc = root.ownerDocument;
  if (needsLineAfter(last)) {
    root.appendChild(newLine(doc));
    return true;
  }
  // An empty line with nothing inside collapses to no height, so it cannot be clicked either.
  if (last.nodeType === 1 && LINES.has(last.tagName) && !isWidget(last) && !last.firstChild) {
    last.appendChild(doc.createElement('br'));
    return true;
  }
  return false;
}

/**
 * The HTML without the empty paragraph that ends it, if there is one. Only a plain paragraph is
 * dropped (one with attributes such as an alignment is content), and only one of them. This works on
 * the serialized string because it is cheap and runs on every keystroke.
 */
export function withoutTrailingBlank(html) {
  const text = html.trimEnd();
  if (text.endsWith('<p><br></p>')) return text.slice(0, -11);
  if (text.endsWith('<p></p>')) return text.slice(0, -7);
  return html;
}

/**
 * Keeps the rule true as the document changes, whichever code path changed it: typing, undo, a
 * plugin, deleting the paragraph after a block. `isEnabled` is asked each time (a locked editor
 * should not grow lines). Returns a function that stops watching.
 */
export function watchTrailingParagraph(root, isEnabled = () => true) {
  const run = () => {
    if (isEnabled()) ensureTrailingParagraph(root);
  };
  // Only structural changes matter (a block added or removed), not each typed character.
  const observer = new MutationObserver(run);
  observer.observe(root, { childList: true, subtree: true });
  run();
  return () => observer.disconnect();
}

// ---------------------------------------------------------------------------------------------
// Backspace in the empty line under a block that is not text.
//
// With the empty line in place, writers will press Backspace on it to "remove the extra line". The
// browser's own answer is to delete the whole block above instead: one Backspace removes a code
// block, a few remove a table. That must never happen. The line stays (or, if it is a blank line
// between blocks, just that line goes) and the block is left alone. Blocks that hold text (quotes,
// <pre>, alerts) already behave well: Backspace moves the caret into them.
// ---------------------------------------------------------------------------------------------

// Blocks the browser would delete wholesale: non-editable widgets (the code block) and tables.
const isHeavy = (el) => el.getAttribute('contenteditable') === 'false' || el.tagName === 'TABLE' || el.tagName === 'FIGURE';

const isEmptyLine = (el) =>
  el.nodeType === 1 && LINES.has(el.tagName) && !isWidget(el) && el.textContent === '' && !el.querySelector('img,iframe,video,audio,table,hr,pre');

/**
 * Call from `beforeinput` for backward deletions. Returns null when it has nothing to say (let the
 * browser delete), 'kept' when it handled the key by doing nothing, or 'removed' when it removed a
 * blank line (the caller should report the change).
 */
export function guardBackspaceAfterBlock(root) {
  const selection = root.ownerDocument.getSelection();
  if (!selection || !selection.rangeCount || !selection.isCollapsed) return null;

  // The top-level block that holds the caret.
  let line = selection.anchorNode;
  while (line && line.parentNode !== root) line = line.parentNode;
  if (!line || !isEmptyLine(line)) return null;

  const before = line.previousElementSibling;
  if (!before || !isHeavy(before)) return null;

  const after = line.nextElementSibling;
  // The last line is the one that is kept for the caret. A blank line before another heavy block
  // stays too, so two blocks never end up with no place between them.
  if (!after || isHeavy(after)) return 'kept';

  line.remove();
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(after);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return 'removed';
}
