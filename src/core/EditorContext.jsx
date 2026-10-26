import { createContext, useContext, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SelectionManager } from './SelectionManager';
import { CommandRegistry } from './CommandRegistry';
import { HistoryManager } from './HistoryManager';
import { getInitialTheme, persistTheme } from './themeStorage';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { sanitizeHtml } from './sanitize';
import { createTranslator } from './i18n';
import { saveCaret, restoreCaret, placeCaretAtEnd } from './caret';
import { UPLOAD_ATTR, DEFAULT_MAX_IMAGE_SIZE } from './imageUpload';

const EditorContext = createContext(null);


export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor() must be used inside <EditorProvider>');
  return ctx;
}

// `bridge` carries the host's latest callbacks (onChange, onFocus, ...) and receives the hooks the
// public wrapper needs (getApi, applyValue) - see core/editorBridge.js for why it exists.
export function EditorProvider({
  plugins,
  initialValue,
  bridge,
  theme: themeProp,
  placeholder,
  readOnly,
  maxLength,
  maxImageSize = DEFAULT_MAX_IMAGE_SIZE,
  markdownShortcuts = true,
  dir,
  lang,
  translations,
  name,
  id,
  ariaLabel,
  spellCheck,
  autoFocus,
  children,
}) {
  const containerRef = useRef(null);
  // Points at the outer .jc-root shell, which is mounted once and lives
  // for the whole life of the editor. containerRef, by contrast, gets
  // reassigned to a brand-new DOM node every time EditorCore
  // unmounts/remounts (which happens on every switch into "view HTML
  // source" and back — see EditorShell). Plugins that attach a DOM
  // listener once in init() and expect it to keep working forever (e.g.
  // codeBlock's click delegation) need to bind to something that never
  // gets swapped out from under them — this ref is that anchor.
  const rootRef = useRef(null);
  // Set by EditorCore's onMouseDown, read by MediaTools via
  // getMediaFromSelection's `preferred` param — see the comment on that
  // function for why the selection alone can't always tell which of two
  // side-by-side images/videos was actually clicked.
  const lastClickedMediaRef = useRef(null);
  const selectionRef = useRef(null);
  const commandsRef = useRef(null);
  const historyRef = useRef(null);
  const apiRef = useRef(null); // always holds the *current* render's api — closures below read this, not a stale one
  const sourceContentRef = useRef(''); // HTML captured the instant source mode is entered — see changeMode below

  const [mode, setMode] = useState('wysiwyg'); // 'wysiwyg' | 'source'
  const [fullscreen, setFullscreen] = useState(false);
  // The toolbar's Lock button flips `lockedState`; the `readOnly` prop locks the editor from the
  // outside and wins over it (the button then does nothing).
  const [lockedState, setLocked] = useState(false);
  const locked = !!readOnly || lockedState;
  // A plain captured `editor.locked` boolean is fine for anything read
  // through useEditor() during a normal render (Context correctly
  // re-renders consumers with the current value) - but codeBlock.jsx's
  // init() hook captures its whole `editor` argument exactly ONCE, in a
  // click listener meant to keep working for the editor's entire
  // lifetime (see the comment on that plugin's init() for why it has to
  // be set up that way). Every render below builds a brand new `api`
  // object, so a plain `locked` property baked into that first, one-time
  // snapshot stays permanently frozen at whatever it was at mount (i.e.
  // false) - toggling Lock later never changes what that specific
  // captured object holds, and the code-block widget's own locked check
  // would silently pass an unlocked check forever, letting edit/delete-
  // tab/add-tab keep working right through Lock being turned on. This
  // ref is mutated in place instead of replaced, so isLocked() below
  // keeps reading the *current* value no matter how old the particular
  // closure calling it is.
  const lockedRef = useRef(locked);
  // Always starts as 'light' so the server render and the first client render agree
  // (reading localStorage / prefers-color-scheme during render would produce a hydration
  // mismatch under Next.js and friends). The saved/system preference is applied in a layout
  // effect right after mount — before the browser paints — so client-only apps never see a flash.
  // An explicit `theme` prop wins over the saved/system preference, on mount and whenever it changes.
  const [theme, setThemeState] = useState(themeProp || 'light');
  useIsomorphicLayoutEffect(() => {
    setThemeState(themeProp || getInitialTheme());
  }, [themeProp]);
  const [activePopup, setActivePopup] = useState(null); // { name, render } | null
  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((v) => v + 1), []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      // When the host app drives the theme through the `theme` prop, don't also store a preference.
      if (!themeProp) persistTheme(next);
      return next;
    });
  }, [themeProp]);

  // Syntax-highlighting colors need no JS: hljs-scoped.css ships both the light and dark
  // palettes, scoped to `.jc-root[data-theme]`, so the `data-theme` attribute on the root
  // element is all that switches them (see scripts/generate-hljs-css.mjs).

  if (!selectionRef.current) selectionRef.current = new SelectionManager(containerRef);
  if (!commandsRef.current) commandsRef.current = new CommandRegistry();

  const t = useMemo(() => createTranslator(translations), [translations]);
  const hiddenInputRef = useRef(null); // <input type="hidden" name={name}> so native forms submit the HTML
  const lastEmittedRef = useRef(null); // last HTML handed to onChange
  const recentRef = useRef([]); // a few recent emissions, to recognise a controlled value echoing back
  const pendingValueRef = useRef(null); // a controlled value that arrived while source view was open
  const initialHtmlRef = useRef(initialValue ?? ''); // what a native <form> reset puts back
  const maxImageSizeRef = useRef(maxImageSize);
  maxImageSizeRef.current = maxImageSize;
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  const notify = useCallback((text) => {
    setNotice(text);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 5000);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimerRef.current), []);

  // Images still uploading are placeholders marked with a data attribute (see core/imageUpload.js).
  // They are left out of everything the host sees: onChange, form value, undo snapshots.
  const getHTML = useCallback(() => {
    const el = containerRef.current;
    if (!el) return '';
    if (!el.querySelector(`[${UPLOAD_ATTR}]`)) return el.innerHTML;
    const copy = el.cloneNode(true);
    copy.querySelectorAll(`[${UPLOAD_ATTR}]`).forEach((node) => node.remove());
    return copy.innerHTML;
  }, []);

  // Callback ref for the hidden form input: whenever it mounts (also when `name` is added later,
  // not only at first render) it is filled from the current content.
  const setHiddenInput = useCallback(
    (node) => {
      hiddenInputRef.current = node;
      if (node && containerRef.current) node.value = getHTML();
    },
    [getHTML]
  );

  // Every change the host should hear about goes through here: it records what was sent (so a
  // controlled `value` echoing back is recognised and ignored), keeps the hidden form input in
  // step, and calls the host's latest onChange.
  const emit = useCallback(
    (html) => {
      lastEmittedRef.current = html;
      const recent = recentRef.current;
      recent.push(html);
      if (recent.length > 5) recent.shift();
      if (hiddenInputRef.current) hiddenInputRef.current.value = html;
      bridge.handlers.onChange?.(html);
    },
    [bridge]
  );
  const setHTMLInternal = useCallback(
    (html) => {
      if (containerRef.current) {
        // Sanitized here rather than on the way out: this is the one
        // choke point that every source of "content from outside this
        // editor's own live DOM" already passes through — undo/redo
        // replay, committing out of source-view, and (via editor.setHTML)
        // whatever the host app loads in from its database — so it's
        // where a script tag or an on-click handler that got saved by
        // some other path gets stopped before it can run again.
        const clean = sanitizeHtml(html);
        containerRef.current.innerHTML = clean;
        emit(clean);
      }
    },
    [emit]
  );

  if (!historyRef.current) {
    historyRef.current = new HistoryManager({
      getHTML,
      setHTML: setHTMLInternal,
      onChange: bump,
      isAvailable: () => !!containerRef.current,
    });
  }

  const exec = useCallback(
    (name, value) => {
      selectionRef.current.restore();
      commandsRef.current.exec(apiRef.current, name, value);
      emit(getHTML());
      bump();
    },
    [bump, getHTML, emit]
  );

  const handleInput = useCallback(() => {
    // A contentEditable element that's mid-unmount (e.g. switching into
    // source view while it's focused) can still fire one last native
    // "input" event on the way out — see the isAvailable comment on
    // HistoryManager for why. Without this guard, getHTML() below would
    // read back '' at that moment and hand it straight to the host app's
    // onChange as if the document had just been emptied.
    if (!containerRef.current) return;
    historyRef.current.snapshot();
    emit(getHTML());
  }, [getHTML, emit]);

  const openPopup = useCallback((name, render, large, persistent) => setActivePopup({ name, render, large, persistent }), []);
  const closePopup = useCallback(() => setActivePopup(null), []);

  const undo = useCallback(() => {
    historyRef.current.undo();
    emit(getHTML());
    bump();
  }, [bump, getHTML, emit]);

  const redo = useCallback(() => {
    historyRef.current.redo();
    emit(getHTML());
    bump();
  }, [bump, getHTML, emit]);

  const setHTML = useCallback(
    (html) => {
      setHTMLInternal(html);
      historyRef.current.snapshotNow();
      bump();
    },
    [bump, setHTMLInternal]
  );

  // A controlled `value` from the host. Our own onChange value coming straight back is ignored
  // (that is the normal loop); anything else replaces the document, keeping the caret in place
  // when the editor has focus. It never calls onChange itself, so it cannot loop.
  const applyExternalValue = useCallback(
    (html) => {
      const next = html == null ? '' : String(html);
      const el = containerRef.current;
      if (!el) {
        pendingValueRef.current = next; // source view is open; applied when it closes
        return;
      }
      if (next === lastEmittedRef.current || recentRef.current.includes(next)) return;
      const clean = sanitizeHtml(next);
      if (clean === getHTML()) return;
      const focused = el === document.activeElement || el.contains(document.activeElement);
      const caret = focused ? saveCaret(el) : null;
      el.innerHTML = clean;
      if (caret) restoreCaret(el, caret);
      if (hiddenInputRef.current) hiddenInputRef.current.value = clean;
      lastEmittedRef.current = clean;
      // Typing-time corrections stay undoable; loading a different document starts fresh.
      if (focused) historyRef.current.snapshotNow();
      else historyRef.current.reset();
      bump();
    },
    [bump, getHTML]
  );

  // Opens a popup-type toolbar button's dialog by plugin name (used by Ctrl+K).
  const openPluginPopup = useCallback(
    (pluginName) => {
      const plugin = plugins.find((p) => p.name === pluginName);
      const button = plugin?.button;
      if (!button || button.type !== 'popup') return false;
      selectionRef.current.save();
      setActivePopup({ name: button.name || plugin.name, render: button.renderPopup, large: button.large, persistent: button.persistent });
      return true;
    },
    [plugins]
  );

  // Switching to 'source' mode unmounts EditorCore and mounts SourceView
  // in the same render. By the time SourceView's own effects run, React
  // has already nulled containerRef.current (it happens synchronously
  // during commit, before any effect fires) — so SourceView calling
  // getHTML() itself reads empty. The fix is capturing the HTML *here*,
  // synchronously in this same click-handler tick, while EditorCore is
  // still mounted and the ref is still valid — before setMode even runs.
  const changeMode = useCallback(
    (newMode) => {
      if (newMode === 'source' && mode !== 'source') {
        sourceContentRef.current = getHTML();
      }
      setMode(newMode);
    },
    [mode, getHTML]
  );

  // Register every plugin's custom commands + run init(), on mount. No
  // "only once" guard here on purpose: StrictMode intentionally runs this
  // as mount -> cleanup -> mount to catch exactly the bug a guard like
  // that causes — init() attaches things (e.g. codeBlock's click
  // delegation), destroy() removes them, and a guard that blocks the
  // second init() leaves things permanently torn down. Every step here is
  // safe to run more than once: content-loading and command registration
  // are idempotent, and historyRef.current.snapshotNow() already no-ops
  // if nothing changed since the last snapshot.
  useEffect(() => {
    if (containerRef.current && initialValue) {
      // Sanitized on the way in — see setHTMLInternal above for why this
      // is the boundary that matters. initialValue is the one entry
      // point that boundary doesn't already cover, since it lands
      // directly in the DOM before any editor.setHTML() call exists to
      // pass through.
      containerRef.current.innerHTML = sanitizeHtml(initialValue);
    }

    plugins.forEach((plugin) => {
      Object.entries(plugin.commands || {}).forEach(([name, handler]) => {
        commandsRef.current.register(name, handler);
      });
    });
    plugins.forEach((plugin) => plugin.init?.(apiRef.current));
    historyRef.current.snapshotNow();

    lastEmittedRef.current = getHTML();
    if (hiddenInputRef.current) hiddenInputRef.current.value = lastEmittedRef.current;
    if (autoFocus && containerRef.current) {
      containerRef.current.focus();
      placeCaretAtEnd(containerRef.current);
    }

    return () => plugins.forEach((plugin) => plugin.destroy?.(apiRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hand the public wrapper its two hooks (see core/editorBridge.js).
  useIsomorphicLayoutEffect(() => {
    bridge.getApi = () => apiRef.current;
    bridge.applyValue = applyExternalValue;
    return () => {
      bridge.getApi = null;
      bridge.applyValue = null;
    };
  }, [bridge, applyExternalValue]);

  // A controlled value that arrived while source view was open lands once WYSIWYG is back.
  useEffect(() => {
    if (mode === 'wysiwyg' && pendingValueRef.current != null && containerRef.current) {
      const pending = pendingValueRef.current;
      pendingValueRef.current = null;
      applyExternalValue(pending);
    }
  }, [mode, applyExternalValue]);

  // <form> reset puts the editor back to what it started with, like any native field.
  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form) return undefined;
    const onReset = () => setTimeout(() => apiRef.current?.setHTML(initialHtmlRef.current), 0);
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, [name]);

  // Recompute toolbar active-state whenever the selection moves inside the editor.
  useEffect(() => {
    const handler = () => {
      const root = containerRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.rangeCount === 0) return;
      if (root.contains(sel.anchorNode)) {
        selectionRef.current.save();
        bump();
      }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [bump]);

  const api = {
    containerRef,
    rootRef,
    lastClickedMediaRef,
    mode,
    setMode: changeMode,
    getSourceContent: () => sourceContentRef.current,
    fullscreen,
    toggleFullscreen: () => setFullscreen((f) => !f),
    locked,
    // Stable, always-fresh accessor for the same value - see the
    // lockedRef comment above for exactly why plain `locked` isn't
    // enough for every consumer of this object. Everything that reads
    // state through useEditor() during a normal render should keep using
    // the plain `locked` boolean above (it's simpler, and Context
    // re-renders make it correct there); isLocked() exists specifically
    // for the one-time-captured-closure case.
    isLocked: () => lockedRef.current,
    toggleLock: () => {
      if (!readOnly) setLocked((l) => !l);
    },
    theme,
    toggleTheme,
    placeholder,
    exec,
    queryState: (name, value) => commandsRef.current.queryState(name, value),
    queryValue: (name) => commandsRef.current.queryValue(name),
    registerCommand: (name, handler) => commandsRef.current.register(name, handler),
    selection: selectionRef.current,
    history: {
      undo,
      redo,
      canUndo: () => historyRef.current.canUndo(),
      canRedo: () => historyRef.current.canRedo(),
      snapshot: () => historyRef.current.snapshot(),
    },
    getHTML,
    setHTML,
    onInput: handleInput,
    openPopup,
    closePopup,
    activePopup,
    openPluginPopup,
    // Translate a UI string; falls back to the English text. See core/i18n.js.
    t,
    // Options other than the fixed props, read fresh at the moment of use.
    maxLength,
    markdownShortcuts,
    dir,
    lang,
    name,
    id,
    ariaLabel,
    spellCheck,
    setHiddenInput,
    notice,
    notify,
    getHandlers: () => bridge.handlers,
    getImageOptions: () => ({
      upload: bridge.handlers.onImageUpload,
      onError: bridge.handlers.onImageUploadError,
      maxSize: maxImageSizeRef.current,
    }),
  };
  apiRef.current = api; // keep the ref current *after* every render for the closures above
  lockedRef.current = locked;

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>;
}

export default EditorContext;
