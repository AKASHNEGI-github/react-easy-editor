// `maxLength` counts characters of text (what the status bar calls "characters"), so images and
// formatting never count against it.
export function remainingCapacity(editor) {
  const max = editor.maxLength;
  const root = editor.containerRef.current;
  if (!max || !root) return Infinity;
  const sel = window.getSelection();
  const selected = sel && sel.rangeCount && root.contains(sel.anchorNode) ? sel.toString().length : 0;
  return Math.max(0, max - (root.textContent.length - selected));
}

// True when `text` still fits under maxLength (always true when no limit is set).
export function fitsLimit(editor, text) {
  return text.length <= remainingCapacity(editor);
}

// Inserts plain text, cut to whatever room maxLength has left. Used when pasted content is too long.
export function insertTextWithinLimit(editor, text) {
  const room = remainingCapacity(editor);
  const part = room === Infinity ? text : text.slice(0, room);
  if (part) document.execCommand('insertText', false, part);
}
