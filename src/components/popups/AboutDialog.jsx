export default function AboutDialog({ editor, onClose }) {
  return (
    <div>
      <h3 className="jc-form-title">{editor.t('About this editor')}</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--jc-text-muted)', margin: '0 0 16px' }}>
        {editor.t('A from-scratch rich text editor built in React, with no editor dependency. Every plugin, from the core engine to the toolbar icons, is our own code.')}
      </p>
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-primary" onClick={onClose}>{editor.t('Close')}</button>
      </div>
    </div>
  );
}
