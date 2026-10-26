import { useRef, useState } from 'react';
import { placeCaretAfter, isSafeImageSrc } from '../../core/domUtils';
import { insertImageFiles } from '../../core/imageUpload';

// Also handles editing an existing image (opened from MediaTools, passing
// `existingImage`) — previously the only option was insert-a-new-one, so
// changing an image's URL/alt text meant deleting it and starting over.
export default function InsertImageForm({ editor, onClose, existingImage }) {
  const isEditing = !!existingImage;
  const [url, setUrl] = useState(isEditing ? existingImage.getAttribute('src') || '' : '');
  const [alt, setAlt] = useState(isEditing ? existingImage.alt || '' : '');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Picked files take the same path as dropped and pasted ones: a placeholder appears at once,
  // then becomes the uploaded URL (or an embedded data URL when no onImageUpload is set).
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // so picking the same file again still fires
    if (files.length === 0) return;
    onClose();
    insertImageFiles(editor, files);
  };

  const handleInsert = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!isSafeImageSrc(trimmedUrl)) {
      setError(editor.t('That image address isn\u2019t allowed. Use a web (https://) URL.'));
      return;
    }

    if (isEditing) {
      existingImage.src = trimmedUrl;
      existingImage.alt = alt.trim();
      editor.onInput();
      onClose();
      return;
    }

    editor.selection.restore();
    const img = document.createElement('img');
    img.src = trimmedUrl;
    img.alt = alt.trim();
    img.style.maxWidth = '100%';
    // Dragging is handled by MediaTools' own pointer-based move handle
    // instead — turning off the browser's native image drag keeps the
    // two mechanisms from fighting over the same mouse-down.
    img.draggable = false;
    const range = editor.selection.get();
    range?.collapse(false);
    range?.insertNode(img);
    // Land the caret right after the image instead of leaving it
    // selected, so continuing to type doesn't wipe it out again.
    placeCaretAfter(editor, img);
    editor.onInput();
    onClose();
  };

  return (
    <div>
      <h3 className="jc-form-title">{isEditing ? editor.t('Edit image') : editor.t('Insert image')}</h3>
      <div className="jc-form-field">
        <label htmlFor="jc-img-url">{editor.t('Image URL')}</label>
        <input
          id="jc-img-url"
          type="url"
          className={error ? 'jc-input-error' : ''}
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(''); }}
          autoFocus
          placeholder="https://"
        />
        {error && <div className="jc-form-error">{error}</div>}
      </div>
      {!isEditing && (
        <div className="jc-form-field">
          <label htmlFor="jc-img-file">{editor.t('Or upload from your device')}</label>
          <button type="button" id="jc-img-file" className="jc-btn-secondary" onClick={() => fileInputRef.current?.click()}>
            {editor.t('Choose image\u2026')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
          <div className="jc-form-hint">{editor.t('You can also drag and drop, or paste, images straight into the editor.')}</div>
        </div>
      )}
      <div className="jc-form-field">
        <label htmlFor="jc-img-alt">{editor.t('Alt text')}</label>
        <input id="jc-img-alt" type="text" value={alt} onChange={(e) => setAlt(e.target.value)} />
      </div>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>{editor.t('Cancel')}</button>
        <button type="button" className="jc-btn-primary" onClick={handleInsert}>{isEditing ? editor.t('Save') : editor.t('Insert')}</button>
      </div>
    </div>
  );
}
