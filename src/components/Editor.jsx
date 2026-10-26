import { memo, forwardRef, useMemo, useRef, useImperativeHandle } from 'react';
import { allPlugins, toolbarRows as defaultToolbarRows } from '../plugins';
import { ensureStyles } from '../core/injectStyles';
import { useIsomorphicLayoutEffect } from '../core/useIsomorphicLayoutEffect';
import { EditorProvider, useEditor } from '../core/EditorContext';
import { createBridge, createHandle } from '../core/editorBridge';
import { sameTranslations } from '../core/i18n';
import Toolbar from './Toolbar';
import TableTools from './TableTools';
import MediaTools from './MediaTools';
import LinkTools from './LinkTools';
import EditorCore from './EditorCore';
import SourceView from './SourceView';
import StatusBar from './StatusBar';
import Modal from './Modal';
import '../styles/editor.css';

// Numbers mean pixels (`height={400}`); strings pass through ('50%', '30rem', 'auto').
const toCss = (v) => (typeof v === 'number' ? `${v}px` : v);

function EditorShell({ toolbarRows, className, style, width, maxWidth, height, minHeight, maxHeight }) {
  const editor = useEditor();

  // Adds the stylesheet if the app hasn't imported it (see core/injectStyles.js).
  useIsomorphicLayoutEffect(() => {
    ensureStyles(editor.rootRef.current);
  }, []);

  // React's onFocus/onBlur bubble (focusin/focusout), so these fire for the whole editor - the
  // toolbar, the content, an open dialog - and we only report focus ENTERING or LEAVING it.
  const handleFocus = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    editor.getHandlers().onFocus?.(e);
  };
  const handleBlur = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    editor.getHandlers().onBlur?.(e);
  };

  const sized = height != null || minHeight != null || maxHeight != null;
  const classes = [
    'jc-root',
    sized && 'jc-root--sized',
    editor.fullscreen && 'jc-root--fullscreen',
    className,
  ].filter(Boolean).join(' ');
  // Full screen always fills the viewport, so the size props step aside while it's on.
  const box = editor.fullscreen
    ? undefined
    : {
        width: toCss(width),
        maxWidth: toCss(maxWidth),
        height: toCss(height),
        minHeight: toCss(minHeight),
        maxHeight: toCss(maxHeight),
      };
  const rootStyle = box || style ? { ...box, ...style } : undefined;

  return (
    <div
      ref={editor.rootRef}
      data-theme={editor.theme}
      className={classes}
      style={rootStyle}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Toolbar rows={toolbarRows} />
      <div className="jc-body">
        {editor.mode === 'source' ? <SourceView /> : <EditorCore />}
        <TableTools />
        <MediaTools />
        <LinkTools />
      </div>
      <StatusBar />
      <Modal />
      {/* Lets a plain <form> (and FormData, server actions, ...) read the editor like any field. */}
      {editor.name ? <input type="hidden" name={editor.name} ref={editor.setHiddenInput} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Why there are two components below.
//
// onChange fires on every keystroke and hosts usually store the HTML in state, so the host
// re-renders on every keystroke. A controlled `value` makes that unavoidable (it IS the state).
// If that render reached the toolbar, status bar and popups, typing would get heavier as the
// document grew - this project measured exactly that.
//
//   <Editor>       cheap, never memoized. Re-renders with the host, writes the host's LATEST
//                  callbacks into a stable `bridge`, forwards a changed `value`, owns the ref.
//   <EditorInner>  memoized. Only re-renders when a prop that affects what is drawn changes.
//                  It reads callbacks through the bridge, so inline `onChange={(h) => ...}`
//                  arrows no longer need useCallback.
//
// This still only pays off when `plugins` / `toolbarRows` are stable references (module-level
// constants, as in the demo): an inline `plugins={[...]}` literal is a new array every render.
// ---------------------------------------------------------------------------------------------
function shallowEqualStyle(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

// `style` and `translations` are compared by content so an inline `style={{ height: 500 }}` or
// `translations={{...}}` literal does not defeat the memo; everything else by identity.
function propsAreEqual(prev, next) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    if (k === 'style') {
      if (!shallowEqualStyle(prev.style, next.style)) return false;
    } else if (k === 'translations') {
      if (!sameTranslations(prev.translations, next.translations)) return false;
    } else if (prev[k] !== next[k]) {
      return false;
    }
  }
  return true;
}

// `plugins` and `toolbarRows` default to the full built-in set, so `<Editor />` works with
// no configuration. `width`/`height`/`minHeight`/`maxHeight` size the whole editor (toolbar and
// status bar included; the content scrolls inside). `className` and `style` land on the root
// element (`.jc-root`); because the root resets inherited styles (see editor.css), use `style`
// for anything else you want to set on it, including overriding `--jc-*` tokens.
const EditorInner = memo(function EditorInner({
  bridge,
  plugins = allPlugins,
  toolbarRows = defaultToolbarRows,
  initialValue,
  placeholder,
  theme,
  readOnly,
  width,
  maxWidth,
  height,
  minHeight,
  maxHeight,
  className,
  style,
  maxLength,
  maxImageSize,
  markdownShortcuts,
  dir,
  lang,
  translations,
  name,
  id,
  ariaLabel,
  spellCheck,
  autoFocus,
}) {
  return (
    <EditorProvider
      plugins={plugins}
      initialValue={initialValue}
      bridge={bridge}
      theme={theme}
      placeholder={placeholder}
      readOnly={readOnly}
      maxLength={maxLength}
      maxImageSize={maxImageSize}
      markdownShortcuts={markdownShortcuts}
      dir={dir}
      lang={lang}
      translations={translations}
      name={name}
      id={id}
      ariaLabel={ariaLabel}
      spellCheck={spellCheck}
      autoFocus={autoFocus}
    >
      <EditorShell
        toolbarRows={toolbarRows}
        className={className}
        style={style}
        width={width}
        maxWidth={maxWidth}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
      />
    </EditorProvider>
  );
}, propsAreEqual);

const Editor = forwardRef(function Editor(props, ref) {
  const { value, initialValue, onChange, onFocus, onBlur, onImageUpload, onImageUploadError, ...rest } = props;
  const handlers = { onChange, onFocus, onBlur, onImageUpload, onImageUploadError };

  const bridgeRef = useRef(null);
  if (bridgeRef.current === null) bridgeRef.current = createBridge(handlers);
  const bridge = bridgeRef.current;

  // The first `value` is just the starting content. Capture it once so later values (which
  // change on every keystroke when controlled) never reach the memoized editor as props.
  const startRef = useRef(null);
  if (startRef.current === null) startRef.current = { html: initialValue ?? value };

  // Always hand the editor the host's latest callbacks.
  useIsomorphicLayoutEffect(() => {
    bridge.handlers = handlers;
  });

  // Forward later changes of a controlled `value`. Skipped on mount: it is already the content.
  const mountedRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (value !== undefined) bridge.applyValue?.(value);
  }, [value, bridge]);

  const handle = useMemo(() => createHandle(bridge), [bridge]);
  useImperativeHandle(ref, () => handle, [handle]);

  return <EditorInner bridge={bridge} initialValue={startRef.current.html} {...rest} />;
});

export default Editor;
