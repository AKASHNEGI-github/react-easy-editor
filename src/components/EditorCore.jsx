import { useEffect, useRef } from 'react';
import { useEditor } from '../core/EditorContext';
import { handleEditorCopy, handleEditorCut, handleEditorPaste } from '../core/clipboardUtils';
import { handleAlertKeyDown } from '../core/alertUtils';
import { handleTableTabKeyDown } from '../core/tableUtils';
import { handleMarkdownKeyDown } from '../core/markdownShortcuts';
import { hasFiles, isImageFile, insertImageFiles, rangeFromPoint } from '../core/imageUpload';
import { remainingCapacity } from '../core/limits';

// This is the one component in the whole app that is NOT re-rendered from
// React state on every keystroke. contentEditable owns its own DOM while
// someone is typing; if we re-rendered innerHTML from state here, the
// cursor would jump to the start of the text after every character.
// Content only gets pushed in imperatively (via editor.setHTML), for
// deliberate actions: undo/redo, loading new content, leaving source mode.
export default function EditorCore() {
  const editor = useEditor();

  // The native `beforeinput` event is the only place a keystroke can still be vetoed before it
  // lands (React's own onBeforeInput is a different, synthetic event without `inputType`). Bound
  // by hand, and reading the editor through a ref so the one listener never goes stale.
  const editorRef = useRef(editor);
  editorRef.current = editor;
  useEffect(() => {
    const el = editor.containerRef.current;
    if (!el) return undefined;
    const onBeforeInput = (e) => {
      const ed = editorRef.current;
      if (!ed.maxLength || ed.locked) return;
      let incoming = 0;
      if (e.inputType === 'insertText' || e.inputType === 'insertReplacementText') {
        incoming = (e.data || e.dataTransfer?.getData('text/plain') || '').length;
      } else if (e.inputType === 'insertFromDrop') {
        incoming = (e.dataTransfer?.getData('text/plain') || '').length;
      }
      if (incoming > remainingCapacity(ed)) e.preventDefault();
    };
    el.addEventListener('beforeinput', onBeforeInput);
    return () => el.removeEventListener('beforeinput', onBeforeInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Without these, dropping a file onto a contentEditable makes the browser open the file and
  // navigate away from the page, taking unsaved work with it. Images are inserted; anything else
  // is refused with a notice.
  const handleDragOver = (e) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = editor.locked ? 'none' : 'copy';
  };
  const handleDrop = (e) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    if (editor.locked) return;
    const files = Array.from(e.dataTransfer.files);
    const images = files.filter(isImageFile);
    if (images.length === 0) {
      editor.notify(editor.t('Only image files can be added here.'));
      return;
    }
    insertImageFiles(editor, images, { range: rangeFromPoint(e.clientX, e.clientY, editor.containerRef.current) });
  };

  const handleMouseUp = () => editor.selection.save();
  const handleKeyUp = () => editor.selection.save();

  // Two media elements sitting right next to each other (several images
  // in a row) collapse the click to the exact same selection boundary
  // either way — see the comment on getMediaFromSelection. Recording the
  // real mousedown target here, before the browser's own selection
  // handling for this same event even runs, gives MediaTools something
  // unambiguous to prefer when that happens. Cleared (not just set) on
  // every mousedown, media or not, so a stale value can't get reused for
  // some later, unrelated selection change (e.g. arrow-key navigation).
  const handleMouseDown = (e) => {
    editor.lastClickedMediaRef.current = e.target.closest('img, video, iframe');
  };

  // Route Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or +Y) through the app's own
  // history stack instead of leaving them to the browser's native
  // contentEditable undo manager. The two track different things —
  // native undo has no idea about table edits, code blocks, or alerts,
  // and this app's stack has no idea a native undo just happened — so
  // with both active at once, the toolbar's own Undo button and Ctrl+Z
  // can quietly fight each other and even bring back content the user
  // just deleted. preventDefault() here keeps exactly one system in
  // charge of undo/redo, always.
  const handleKeyDown = (e) => {
    // Lets you get back out of an alert callout (Enter on an empty last
    // line, or Escape unconditionally) and Tab between table cells,
    // before falling through to the undo/redo shortcuts below.
    if (handleAlertKeyDown(editor, e)) return;
    if (handleTableTabKeyDown(editor, e)) return;
    if (!editor.locked && editor.markdownShortcuts && handleMarkdownKeyDown(editor, e)) return;
    if ((!e.ctrlKey && !e.metaKey) || e.altKey) return;
    // Keeps Ctrl+Z/Y from being a back door around a locked/read-only
    // document — the toolbar's own Undo/Redo buttons are disabled while
    // locked (see Toolbar.jsx), but nothing stopped the keyboard shortcut
    // from still running the same thing.
    if (editor.locked) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      editor.history.undo();
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      editor.history.redo();
    } else if (key === 'k' && !e.shiftKey) {
      // Ctrl/Cmd+K opens the same dialog as the toolbar's link button.
      if (editor.openPluginPopup('insertLink')) e.preventDefault();
    }
  };

  return (
    <div
      ref={editor.containerRef}
      className="jc-content"
      data-placeholder={editor.placeholder}
      id={editor.id}
      dir={editor.dir}
      lang={editor.lang}
      spellCheck={editor.spellCheck}
      contentEditable={!editor.locked}
      suppressContentEditableWarning
      onInput={editor.onInput}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onKeyUp={handleKeyUp}
      onKeyDown={handleKeyDown}
      onCopy={(e) => handleEditorCopy(editor, e)}
      onCut={(e) => handleEditorCut(editor, e)}
      onPaste={(e) => handleEditorPaste(editor, e)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="textbox"
      aria-multiline="true"
      aria-readonly={editor.locked}
      aria-label={editor.ariaLabel || editor.t('Rich text content')}
    />
  );
}
