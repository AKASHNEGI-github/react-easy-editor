// Caret helpers that survive the editor's DOM being rebuilt.
//
// A controlled `value` update replaces innerHTML, which would normally throw the caret away.
// Saving the selection as plain character offsets (counted over the text of `root`) and
// re-resolving them afterwards keeps the caret where the user left it, as long as the text
// is the same shape.

function offsetOf(root, node, offset) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

// Returns { start, end } as text offsets inside `root`, or null if the selection is elsewhere.
export function saveCaret(root) {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!root || !sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  return {
    start: offsetOf(root, range.startContainer, range.startOffset),
    end: offsetOf(root, range.endContainer, range.endOffset),
  };
}

function locate(root, target) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = target;
  let last = null;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const len = node.nodeValue.length;
    if (remaining <= len) return { node, offset: remaining };
    remaining -= len;
    last = node;
  }
  // Past the end of the text (the new content is shorter): clamp to the very end.
  return last ? { node: last, offset: last.nodeValue.length } : { node: root, offset: root.childNodes.length };
}

// Puts the selection back. Returns false when there was nothing to restore.
export function restoreCaret(root, saved) {
  if (!root || !saved) return false;
  const sel = window.getSelection();
  if (!sel) return false;
  const start = locate(root, saved.start);
  const end = saved.end === saved.start ? start : locate(root, saved.end);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

export function placeCaretAtEnd(root) {
  const sel = window.getSelection();
  if (!root || !sel) return;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}
