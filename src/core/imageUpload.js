// One pipeline for every way an image gets into the editor: the Insert Image dialog's file
// picker, drag-and-drop, and paste (Ctrl+V and the toolbar button).
//
// With an `onImageUpload` handler the file is sent there and the URL it resolves to is used.
// Without one, the image is embedded as a base64 data URL (fine for demos, not for a database).
//
// The image appears immediately as a placeholder (a blob: preview marked data-jc-upload-id) so it
// lands exactly where the caret/drop point was even if uploads finish out of order. The
// editor's getHTML() leaves placeholders out, so onChange / form values / undo snapshots never
// contain a temporary blob: URL.
import { isSafeImageSrc, placeCaretAfter } from './domUtils';

export const DEFAULT_MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export const UPLOAD_ATTR = 'data-jc-upload-id';

let uploadCounter = 0;

export function isImageFile(file) {
  return !!file && typeof file.type === 'string' && file.type.startsWith('image/');
}

export function hasFiles(dataTransfer) {
  return !!dataTransfer && Array.from(dataTransfer.types || []).includes('Files');
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${+(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

// An uploader may resolve to a URL string or { url, alt }. Anything else, or an unsafe URL
// (javascript:, an unknown scheme), is rejected rather than written into the document.
export function normalizeUploadResult(result) {
  const url = typeof result === 'string' ? result : result && result.url;
  if (typeof url !== 'string' || !url) {
    throw new Error('onImageUpload must resolve to a URL string or an object like { url }.');
  }
  if (!isSafeImageSrc(url)) throw new Error('onImageUpload returned a URL that is not allowed.');
  return { url, alt: typeof result === 'object' && typeof result.alt === 'string' ? result.alt : undefined };
}

function altFromName(file) {
  const base = (file.name || '').replace(/\.[^.]+$/, '').trim();
  return /^(image|blob|untitled)$/i.test(base) ? '' : base;
}

// Collapsed range at a screen point (drop position), or null when it is not inside `root`.
export function rangeFromPoint(x, y, root) {
  let range = null;
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  } else if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  }
  return range && root.contains(range.startContainer) ? range : null;
}

function insertionRange(editor, range) {
  const root = editor.containerRef.current;
  if (range && root && root.contains(range.startContainer)) return range;
  editor.selection.restore();
  const sel = window.getSelection();
  return sel.rangeCount ? sel.getRangeAt(0) : null;
}

// `message` is what the person sees; the real error always goes to the host's onError.
function fail(editor, options, file, error, message = error.message) {
  editor.notify(message);
  options.onError?.(error, file);
}

async function insertOne(editor, file, startRange, options) {
  if (!isImageFile(file)) {
    return fail(editor, options, file, new Error(editor.t('Only image files can be added here.')));
  }
  if (file.size > options.maxSize) {
    return fail(editor, options, file, new Error(editor.t('Image is too large (max {size}).', { size: formatBytes(options.maxSize) })));
  }

  const root = editor.containerRef.current;
  const range = insertionRange(editor, startRange);
  if (!root || !range) return undefined;

  const id = `jc-up-${(uploadCounter += 1)}`;
  const preview = URL.createObjectURL(file);
  const img = document.createElement('img');
  img.src = preview;
  img.alt = altFromName(file);
  img.setAttribute(UPLOAD_ATTR, id);
  img.className = 'jc-img--uploading';
  img.style.maxWidth = '100%';
  img.draggable = false; // MediaTools has its own move handle; native drag would fight it

  if (!range.collapsed) range.deleteContents();
  range.insertNode(img);
  placeCaretAfter(editor, img);

  try {
    const resolved = options.upload
      ? normalizeUploadResult(await options.upload(file))
      : { url: await readAsDataURL(file), alt: undefined };
    const live = editor.containerRef.current?.querySelector(`[${UPLOAD_ATTR}="${id}"]`);
    if (live) {
      live.src = resolved.url;
      if (resolved.alt !== undefined) live.alt = resolved.alt;
      live.removeAttribute(UPLOAD_ATTR);
      live.removeAttribute('class');
      editor.onInput(); // one undo step, one onChange, now that the real URL is in place
    }
  } catch (error) {
    editor.containerRef.current?.querySelector(`[${UPLOAD_ATTR}="${id}"]`)?.remove();
    fail(editor, options, file, error instanceof Error ? error : new Error(String(error)), editor.t('Image upload failed.'));
  } finally {
    URL.revokeObjectURL(preview);
  }
  return undefined;
}

// `files` may be a FileList or an array. Files are handled one after another, so several
// dropped images keep their order.
export async function insertImageFiles(editor, files, { range } = {}) {
  if (editor.locked) return;
  const options = editor.getImageOptions();
  let at = range;
  for (const file of Array.from(files)) {
    // eslint-disable-next-line no-await-in-loop
    await insertOne(editor, file, at, options);
    at = null; // later files go after the previous image, where the caret now is
  }
}
