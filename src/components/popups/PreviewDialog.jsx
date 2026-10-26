import { openPrintWindow } from '../../core/printUtils';

// Simple, single-view "what will this look like" preview: it
// just shows the document, rather than
// simulating multiple screen sizes. The content reuses the exact same
// .jc-content class the live editor uses, so it's styled identically —
// same alert colors, same code syntax highlighting, same everything.
export default function PreviewDialog({ editor, onClose }) {
  const html = editor.getHTML();
  const text = editor.containerRef.current?.textContent || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="jc-preview">
      <div className="jc-preview-header">
        <h3 className="jc-form-title" style={{ margin: 0 }}>{editor.t('Preview')}</h3>
        <span className="jc-preview-meta">
          {editor.t(words === 1 ? '{count} word' : '{count} words', { count: words })} &middot; {editor.t(text.length === 1 ? '{count} character' : '{count} characters', { count: text.length })}
        </span>
      </div>

      <div className="jc-preview-page-wrap">
        <div className="jc-preview-page">
          <div className="jc-content jc-preview-content" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>{editor.t('Close')}</button>
        <button type="button" className="jc-btn-primary" onClick={() => openPrintWindow(html)}>{editor.t('Print')}</button>
      </div>
    </div>
  );
}
