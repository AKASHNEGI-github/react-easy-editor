// The "bridge" is one stable object per <Editor>.
//
// The public <Editor> component re-renders whenever the host does, but that render is tiny:
// it only writes the host's LATEST callbacks into the bridge and returns the memoized editor.
// The heavy tree (toolbar, status bar, popups) therefore never re-renders just because a
// callback got a new identity or because a controlled `value` echoed back. Everything inside
// reads callbacks through the bridge at call time, so inline arrow functions are fine.
import { sanitizeHtml } from './sanitize';
import { placeCaretAfter } from './domUtils';

export function createBridge(handlers) {
  return {
    handlers, // latest { onChange, onFocus, onBlur, onImageUpload, onImageUploadError }
    getApi: null, // installed by EditorProvider: () => the current editor api
    applyValue: null, // installed by EditorProvider: (html) => void, for a controlled `value`
  };
}

const MEDIA = 'img, video, iframe, audio, table, hr, pre';

export function isEmptyElement(el) {
  return !el || (!el.textContent.trim() && !el.querySelector(MEDIA));
}

// The object a parent gets from <Editor ref={...}>. Stable for the editor's lifetime: methods
// look up the current api each call, so they never go stale.
export function createHandle(bridge) {
  const api = () => (bridge.getApi ? bridge.getApi() : null);
  const element = () => api()?.containerRef.current ?? null;

  return {
    getHTML: () => api()?.getHTML() ?? '',
    setHTML: (html) => api()?.setHTML(html ?? ''),
    getText: () => element()?.textContent ?? '',
    isEmpty: () => isEmptyElement(element()),
    clear: () => api()?.setHTML(''),
    // Back to where the caret was when focus left (or the end, if it never had one).
    focus: () => api()?.selection.restore(),
    blur: () => element()?.blur(),
    // Inserted through a Range rather than execCommand('insertHTML'), which in Chromium copies
    // the surrounding computed styles (colour, font...) onto whatever it inserts.
    insertHTML: (html) => {
      const editor = api();
      if (!editor || editor.locked || !editor.containerRef.current) return;
      editor.selection.restore();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(sanitizeHtml(String(html ?? '')));
      const last = fragment.lastChild;
      range.insertNode(fragment);
      if (last) placeCaretAfter(editor, last);
      editor.onInput();
    },
    undo: () => api()?.history.undo(),
    redo: () => api()?.history.redo(),
    getElement: element,
    // Escape hatch to the full internal API (exec, selection, history, popups...). Same object
    // plugins receive. Not covered by the semver guarantees of the methods above.
    getEditor: api,
  };
}
