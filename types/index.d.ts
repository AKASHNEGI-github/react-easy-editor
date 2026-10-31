import type {
  CSSProperties,
  FocusEvent,
  ForwardRefExoticComponent,
  MutableRefObject,
  NamedExoticComponent,
  ReactElement,
  ReactNode,
  RefAttributes,
} from 'react';

/* -------------------------------------------------------------------------- */
/*  <Editor />                                                                */
/* -------------------------------------------------------------------------- */

/** `style` may also carry the editor's CSS custom properties, e.g. `{ '--jc-accent': '#e11d48' }`. */
export type EditorStyle =
  | CSSProperties
  | (CSSProperties & { [property: `--${string}`]: string | number | undefined });

export interface EditorProps {
  /**
   * The HTML to show, for controlled use: `<Editor value={html} onChange={setHtml} />`.
   *
   * The first value is the starting content. After that, a value that differs from what
   * `onChange` last reported replaces the document (the caret stays put while the editor has
   * focus); the editor's own value coming back is ignored, so typing is never interrupted.
   * Update it synchronously from `onChange`. If you debounce, use `initialValue` instead.
   * Sanitized before use.
   */
  value?: string;

  /**
   * HTML to start with when you do NOT want a controlled editor. Read once on mount; to load
   * different content later, use `value`, the `ref` handle's `setHTML`, or change the `key`.
   * Ignored when `value` is given. Sanitized before use.
   */
  initialValue?: string;

  /**
   * Called with the editor's current HTML after every change (typing, toolbar action, undo/redo,
   * leaving source view, a finished image upload). An inline arrow function is fine: the editor
   * always calls your latest one and does not re-render because it changed.
   */
  onChange?: (html: string) => void;

  /** Focus entered the editor (content, toolbar or an open dialog). Not fired when it just moves between those. */
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;

  /** Focus left the editor entirely. Moving into the toolbar or a dialog does not count. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;

  /** Focus the editor when it mounts, with the caret at the end. */
  autoFocus?: boolean;

  /**
   * Adds a hidden `<input name={name}>` holding the HTML, so a plain `<form>`, `FormData`, a Next.js
   * server action or a Remix action can read the editor like any other field. A form reset restores
   * the starting content.
   */
  name?: string;

  /** `id` of the editable element, so a `<label htmlFor>` can point at it. */
  id?: string;

  /** Accessible name of the editable area. Defaults to "Rich text content" (translated). */
  ariaLabel?: string;

  /**
   * Maximum number of text characters (what the status bar counts; images and formatting are free).
   * Typing and pasting stop at the limit and the counter turns red. Content you set from code is not cut.
   */
  maxLength?: number;

  /** Text direction of the content: `'rtl'` for Arabic, Hebrew, Persian, Urdu...; `'auto'` decides per paragraph. */
  dir?: 'ltr' | 'rtl' | 'auto';

  /** Language of the content (a BCP 47 tag such as `'ar'`); used for spell checking and screen readers. */
  lang?: string;

  /** Browser spell checking in the content area. Browser default when omitted. */
  spellCheck?: boolean;

  /**
   * Turn Markdown-style typing into formatting: `# ` headings, `- ` and `1. ` lists, `> ` quotes,
   * `---` + Enter for a divider, and `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` followed by a space.
   * Default `true`.
   */
  markdownShortcuts?: boolean;

  /**
   * Translate the interface. Keys are the English strings, values their translation; anything you
   * leave out stays English. `{count}`-style placeholders are filled in. See the README for the list.
   */
  translations?: Translations;

  /**
   * Receives every image that is picked, dropped or pasted. Resolve to the image's public URL (or
   * `{ url, alt }`). While it runs, the image shows as a dimmed placeholder where it will land.
   * Without this handler images are embedded in the HTML as base64.
   */
  onImageUpload?: (file: File) => Promise<string | ImageUploadResult>;

  /** An image was rejected (too large, not an image) or `onImageUpload` failed. The editor also shows a short notice. */
  onImageUploadError?: (error: Error, file: File) => void;

  /** Largest image accepted, in bytes. Default 5 MB. Use `Infinity` for no limit. */
  maxImageSize?: number;

  /**
   * Plugins to register. Defaults to every built-in plugin (`allPlugins`). Must include each
   * plugin that appears in `toolbarRows`, plus any button-less plugin you depend on
   * (e.g. the one that powers table editing).
   */
  plugins?: Plugin[];

  /** Toolbar layout: an array of rows, each an array of plugins and `SEPARATOR`s. Defaults to `toolbarRows`. */
  toolbarRows?: ToolbarRows;

  /** Text shown while the editor is empty. */
  placeholder?: string;

  /**
   * Locks the editor so the content cannot be changed (the toolbar's editing buttons switch off).
   * Selecting, copying and switching code-block tabs still work. To display saved content to
   * readers, `ContentViewer` is usually the better fit.
   */
  readOnly?: boolean;

  /**
   * Forces the light or dark theme (and follows it if the value changes). Leave it out to use the
   * visitor's saved choice, or their system setting the first time. The toolbar's theme button
   * still works either way.
   */
  theme?: Theme;

  /**
   * Size of the whole editor, toolbar and status bar included; the content scrolls inside it.
   * A number means pixels; a string is any CSS length (`'50%'`, `'30rem'`, `'auto'`).
   * Without a height the editor grows with its content (up to 70% of the viewport, then scrolls).
   */
  height?: number | string;
  /** The editor never gets shorter than this. Takes pixels or any CSS length. */
  minHeight?: number | string;
  /** The editor never gets taller than this; the content scrolls inside. Takes pixels or any CSS length. */
  maxHeight?: number | string;
  /** Width of the editor. Takes pixels or any CSS length. Defaults to the full width of its container. */
  width?: number | string;
  /** The editor never gets wider than this. Takes pixels or any CSS length. */
  maxWidth?: number | string;

  /** Extra class name(s) added to the editor's root element (`.jc-root`). */
  className?: string;

  /**
   * Inline style for the root element. Use it for sizing (`width`, `maxWidth`) and for overriding
   * `--jc-*` theme tokens. A fresh object on every render is fine; it is compared shallowly.
   */
  style?: EditorStyle;
}

/** What a parent gets from `<Editor ref={ref} />`. */
export interface EditorHandle {
  /**
   * The current HTML. The empty line the editor keeps under a trailing code block, table, divider,
   * alert or quote (so the caret can always go after it) is left out until something is typed in it.
   */
  getHTML(): string;
  /** Replaces the content (sanitized) and calls `onChange`. */
  setHTML(html: string): void;
  /** The content as plain text. */
  getText(): string;
  /** True when there is no text and no image, table, video or code block. */
  isEmpty(): boolean;
  /** Empties the editor (calls `onChange`). */
  clear(): void;
  /** Focuses the editor; the caret goes to the end if it was not already inside. */
  focus(): void;
  blur(): void;
  /** Inserts HTML (sanitized) at the caret. */
  insertHTML(html: string): void;
  undo(): void;
  redo(): void;
  /** The editable element (`null` while source view is open). */
  getElement(): HTMLDivElement | null;
  /** The full internal API that plugins receive. Not covered by the stability promise of the methods above. */
  getEditor(): EditorApi | null;
}

export interface ImageUploadResult {
  url: string;
  alt?: string;
}

/** English UI string -> translation. See `EditorProps.translations`. */
export type Translations = Record<string, string>;

/** Every string the editor shows, mapped to itself. The template for writing a translation. */
export declare const localeEn: Translations;
/** Spanish. A starter pack, not yet reviewed by a native speaker. */
export declare const localeEs: Translations;
/** French. A starter pack, not yet reviewed by a native speaker. */
export declare const localeFr: Translations;
/** German. A starter pack, not yet reviewed by a native speaker. */
export declare const localeDe: Translations;
/** Hindi. A starter pack, not yet reviewed by a native speaker. */
export declare const localeHi: Translations;

export declare const Editor: ForwardRefExoticComponent<EditorProps & RefAttributes<EditorHandle>>;
export default Editor;

/* -------------------------------------------------------------------------- */
/*  <ContentViewer />  — show saved content outside the editor                */
/* -------------------------------------------------------------------------- */

export interface ContentViewerProps {
  /** The HTML the editor produced (what `onChange` gave you). */
  html?: string;

  /**
   * Clean the HTML (scripts, `on*` handlers, `javascript:` links) before showing it. Default `true`.
   * Sanitizing needs the browser, so with server rendering the content appears right after the page
   * loads. Pass `false` for HTML you already trust (e.g. cleaned on your server) to have it rendered
   * as-is, including in server-rendered HTML.
   */
  sanitize?: boolean;

  /** `'auto'` follows the visitor's system setting. Default `'light'`. */
  theme?: Theme | 'auto';

  /** Extra class name(s) for the viewer's root element. */
  className?: string;

  /** Inline style for the root element: font size, font family, `--jc-*` colors, and so on. */
  style?: EditorStyle;
}

export declare const ContentViewer: NamedExoticComponent<ContentViewerProps>;

/* -------------------------------------------------------------------------- */
/*  Built-in plugins & toolbar layout                                         */
/* -------------------------------------------------------------------------- */

/** Every built-in plugin, flattened (including button-less ones). The default for `plugins`. */
export declare const allPlugins: Plugin[];

/** The default two-row toolbar layout. The default for `toolbarRows`. */
export declare const toolbarRows: ToolbarRows;

/** Renders a thin vertical divider between toolbar buttons. */
export declare const SEPARATOR: ToolbarSeparator;

export interface ToolbarSeparator {
  separator: true;
}
export type ToolbarItem = Plugin | ToolbarSeparator;
export type ToolbarRows = ToolbarItem[][];

/* -------------------------------------------------------------------------- */
/*  Writing your own plugin                                                   */
/* -------------------------------------------------------------------------- */

export type CommandHandler = (editor: EditorApi, value?: any) => void;

export interface Plugin {
  /** Unique name. Also used as the button's identity unless `button.name` is set. */
  name: string;
  /** Commands this plugin adds. Run them with `editor.exec(name, value)`; they get the saved selection restored first, an undo step afterwards, and `onChange` is called. */
  commands?: Record<string, CommandHandler>;
  /** Omit for a commands-only plugin. */
  button?: ToolbarButton;
  /** Runs once when the editor mounts. */
  init?(editor: EditorApi): void;
  /** Runs when the editor unmounts; undo whatever `init` attached. */
  destroy?(editor: EditorApi): void;
}

interface ButtonBase {
  /** Defaults to the plugin's `name`. */
  name?: string;
  isDisabled?(editor: EditorApi): boolean;
}

/** A single button. `toggle` shows an active state; `instant` just fires. */
export interface ToggleButton extends ButtonBase {
  type: 'toggle' | 'instant';
  /** Key into `IconStore`, or a function returning one. */
  icon: string | ((editor: EditorApi) => string);
  tooltip: string | ((editor: EditorApi) => string);
  isActive?(editor: EditorApi): boolean;
  onClick(editor: EditorApi): void;
}

export interface DropdownOption {
  label: string;
  value: string;
}
export interface DropdownButton extends ButtonBase {
  type: 'dropdown';
  icon?: string;
  tooltip: string;
  placeholder?: string;
  options: DropdownOption[];
  /** The currently selected option's `value` (used to show its label on the trigger). */
  getValue?(editor: EditorApi): string;
  onSelect(editor: EditorApi, value: string): void;
}

export interface ButtonGroupOption {
  icon: string;
  value: string;
  label?: string;
}
export interface ButtonGroupButton extends ButtonBase {
  type: 'buttonGroup';
  tooltip: string;
  options: ButtonGroupOption[];
  isActive(editor: EditorApi, value: string): boolean;
  onClick(editor: EditorApi, value: string): void;
}

export interface ColorPickerButton extends ButtonBase {
  type: 'colorpicker';
  icon: string;
  tooltip: string;
}

/** A button that opens a dialog. `renderPopup` returns the dialog's contents. */
export interface PopupButton extends ButtonBase {
  type: 'popup';
  icon: string;
  tooltip: string;
  renderPopup(editor: EditorApi, close: () => void): ReactNode;
  /** Wider dialog. */
  large?: boolean;
  /** Only closes via its own buttons (not backdrop click or Escape). */
  persistent?: boolean;
}

export type ToolbarButton =
  | ToggleButton
  | DropdownButton
  | ButtonGroupButton
  | ColorPickerButton
  | PopupButton;

/* -------------------------------------------------------------------------- */
/*  The object plugins receive                                                */
/* -------------------------------------------------------------------------- */

export type Theme = 'light' | 'dark';
export type EditorMode = 'wysiwyg' | 'source';

export interface SelectionManager {
  /** Remember the current selection if it is inside the editor. */
  save(): void;
  /** Re-apply the remembered selection (call before running a command). */
  restore(): void;
  get(): Range | null;
  /** Nearest block-level ancestor of the remembered selection. */
  getBlockAncestor(root: HTMLElement): HTMLElement;
}

export interface EditorHistory {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Record the current content as an undo step. */
  snapshot(): void;
}

export interface ActivePopup {
  name: string;
  render: (editor: EditorApi, close: () => void) => ReactNode;
  large?: boolean;
  persistent?: boolean;
}

/** What plugin callbacks (`onClick`, `isActive`, `renderPopup`, `init`, ...) are given. */
export interface EditorApi {
  /** The editable element. `null` while source view is open. */
  containerRef: MutableRefObject<HTMLDivElement | null>;
  /** The editor's root element. */
  rootRef: MutableRefObject<HTMLDivElement | null>;
  lastClickedMediaRef: MutableRefObject<Element | null>;

  mode: EditorMode;
  setMode(mode: EditorMode): void;
  getSourceContent(): string;

  fullscreen: boolean;
  toggleFullscreen(): void;

  locked: boolean;
  /** Always-current version of `locked`, for callbacks captured once in `init()`. */
  isLocked(): boolean;
  toggleLock(): void;

  theme: Theme;
  toggleTheme(): void;

  /**
   * Run a command: one registered by a plugin (its `commands`, or `registerCommand`) or one of the
   * built-in formatting commands (`bold`, `italic`, `underline`, `strikeThrough`, `superscript`,
   * `subscript`, `insertOrderedList`, `insertUnorderedList`, `indent`, `outdent`, `justifyLeft`,
   * `justifyCenter`, `justifyRight`, `justifyFull`, `removeFormat`, `insertHorizontalRule`,
   * `selectAll`, `formatBlock`, `foreColor`, `hiliteColor`, `cut`, `copy`). Restores the saved
   * selection first, records an undo step and calls `onChange`. Unknown names log a warning.
   * Does nothing while the editor is locked (except `copy` and `selectAll`).
   */
  exec(name: string, value?: any): void;
  queryState(name: string): boolean;
  queryValue(name: string): string;
  registerCommand(name: string, handler: CommandHandler): void;

  selection: SelectionManager;
  history: EditorHistory;

  /** The writing area's current HTML. Empty while source view is open. */
  getHTML(): string;
  /** Replaces the content (sanitized first) and calls `onChange`. Does nothing while source view is open. */
  setHTML(html: string): void;
  /** Call after you change the content yourself (outside `exec`) so history and `onChange` see it. */
  onInput(): void;
  /** The `placeholder` prop. */
  placeholder?: string;

  /** Translates a UI string with the `translations` prop; returns the English text when there is none. */
  t(text: string, vars?: Record<string, string | number>): string;
  /** Shows a short message in the status bar for a few seconds. */
  notify(text: string): void;
  /** Opens a popup-type toolbar button's dialog by plugin name (e.g. `'insertLink'`). Returns false if there is no such popup. */
  openPluginPopup(name: string): boolean;
  /** The `maxLength` prop. */
  maxLength?: number;

  openPopup(
    name: string,
    render: ActivePopup['render'],
    large?: boolean,
    persistent?: boolean,
  ): void;
  closePopup(): void;
  activePopup: ActivePopup | null;
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

export interface IconRegistry {
  /** Register an icon (an SVG string using `currentColor`) under a name plugins can reference. */
  set(name: string, svg: string): IconRegistry;
  get(name: string): string;
  has(name: string): boolean;
}
export declare const IconStore: IconRegistry;

/** Strips scripts, event-handler attributes and other unsafe markup. Browser-only (uses the DOM). */
export declare function sanitizeHtml(html: string): string;
