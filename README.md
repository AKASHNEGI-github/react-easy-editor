# React Easy Editor

[![npm version](https://img.shields.io/npm/v/react-easy-editor)](https://www.npmjs.com/package/react-easy-editor)
[![npm downloads](https://img.shields.io/npm/dm/react-easy-editor)](https://www.npmjs.com/package/react-easy-editor)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-easy-editor)](https://bundlephobia.com/package/react-easy-editor)
[![types included](https://img.shields.io/npm/types/react-easy-editor)](#typescript)
[![CI](https://github.com/AKASHNEGI-github/react-easy-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/AKASHNEGI-github/react-easy-editor/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/react-easy-editor)](./LICENSE)

**A free, open-source rich text editor (WYSIWYG) for React.** Add one component and your users get a full
toolbar, tables, code blocks with syntax highlighting, image upload, Markdown shortcuts and dark mode.
Nothing to configure, and it saves plain HTML.

<p align="center">
  <a href="https://akashnegi-github.github.io/react-easy-editor/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/AKASHNEGI-github/react-easy-editor/main/docs/screenshot-dark.png">
      <img alt="React Easy Editor: a rich text editor with a toolbar, headings, a list, a table, a tip box and a code block" src="https://raw.githubusercontent.com/AKASHNEGI-github/react-easy-editor/main/docs/screenshot-light.png" width="820">
    </picture>
  </a>
</p>

**[Try it live](https://akashnegi-github.github.io/react-easy-editor/)** · [Quick start](#quick-start) · [Recipes](#recipes) · [Props](#props) · [FAQ](#faq)

## Quick start

```bash
npm install react-easy-editor
```

```jsx
import { Editor } from 'react-easy-editor';

export default function App() {
  return <Editor height={400} onChange={(html) => console.log(html)} />;
}
```

That is the whole setup. There is no CSS file to import: the editor adds its own styles when it mounts.
(For server-rendered pages, see [Next.js and server rendering](#nextjs-and-server-rendering).)

## What you get

- **A complete toolbar.** Bold, italic, underline, strikethrough, sub and superscript, fonts, sizes, colors,
  headings, lists, alignment, line height, alerts, links, images, files, video, emoji, special characters,
  find and replace, full screen, preview, print, and an HTML source view.
- **Tables** with a bar that follows the cursor: add and remove rows and columns, merge and split cells,
  resize columns, color cells.
- **Tabbed code blocks** with syntax highlighting for 19 languages and a Copy button.
- **Images** that you pick, drag in or paste. Send them to your own server with one function
  ([`onImageUpload`](#upload-images)), or embed them as base64.
- **Markdown shortcuts** as you type: `## ` for a heading, `- ` for a list, `**bold**`, and more.
- **Controlled or uncontrolled.** Use `value` and `onChange`, or read the content from a `ref`.
- **A real form field.** Give it a `name` and a plain `<form>`, a Next.js server action or a Remix action can read it.
- **Character limit, read-only mode, placeholder, auto focus.**
- **Light and dark themes**, right-to-left text, and an interface in **English, Spanish, French, German and
  Hindi** (or your own translation).
- **TypeScript types**, ESM and CommonJS builds, and a `"use client"` directive for the Next.js App Router.
- **About 80 KB gzipped** (React not included). MIT licensed.

## Contents

[Recipes](#recipes) · [Props](#props) · [The ref handle](#the-ref-handle) · [ContentViewer](#contentviewer) ·
[Markdown shortcuts](#markdown-shortcuts) · [Keyboard shortcuts](#keyboard-shortcuts) · [Theming](#theming) ·
[Styles and CSS conflicts](#styles-and-css-conflicts) · [Next.js and server rendering](#nextjs-and-server-rendering) ·
[Customizing the toolbar](#customizing-the-toolbar) · [Writing a plugin](#writing-a-plugin) ·
[TypeScript](#typescript) · [CommonJS](#commonjs) · [Security](#security) ·
[Browser and React support](#browser-and-react-support) · [FAQ](#faq) ·
[Coming from react-easy-text-editor](#coming-from-react-easy-text-editor) · [Contributing](#contributing)

## Recipes

### Save and load content

The editor produces plain HTML. Keep it in state with `value` and `onChange`:

```jsx
import { useState } from 'react';
import { Editor } from 'react-easy-editor';

function PostForm({ post, onSave }) {
  const [html, setHtml] = useState(post.body);

  return (
    <>
      <Editor value={html} onChange={setHtml} />
      <button onClick={() => onSave(html)}>Save</button>
    </>
  );
}
```

- `value` is the starting content. After that, a different value replaces the document (your caret stays put
  if the editor has focus), and the editor's own value coming back is ignored, so typing is never interrupted.
  Update it **synchronously** from `onChange`. If you debounce, use `initialValue` instead.
- `initialValue` is the uncontrolled alternative: it is read once, on mount. To load other content later
  (after a fetch, say), change the component's `key`: `<Editor key={post.id} initialValue={post.body} />`.
- An inline `onChange={(html) => ...}` is fine. The editor always calls your latest function and does not
  re-render because it changed.

### Read the content from a ref

When you only need the HTML at one moment (on submit, say), skip state and ask the editor:

```jsx
import { useRef } from 'react';
import { Editor } from 'react-easy-editor';

function Comment({ onSend }) {
  const editor = useRef(null);

  return (
    <>
      <Editor ref={editor} placeholder="Write a comment…" />
      <button
        onClick={() => {
          if (editor.current.isEmpty()) return;
          onSend(editor.current.getHTML());
          editor.current.clear();
        }}
      >
        Send
      </button>
    </>
  );
}
```

All the methods are listed under [The ref handle](#the-ref-handle).

### Upload images

Images can be picked in the Insert image dialog, dragged onto the editor, or pasted (screenshots included).
Without a handler they are embedded in the HTML as base64. To store them yourself, pass `onImageUpload`:

```jsx
<Editor
  onImageUpload={async (file) => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body });
    const { url } = await res.json();
    return url; // or { url, alt: 'A description' }
  }}
  onImageUploadError={(error, file) => console.warn(file.name, error.message)}
  maxImageSize={2 * 1024 * 1024} // default is 5 MB
/>
```

While your function runs, the image shows right away as a dimmed placeholder where it will land. That
placeholder never reaches `onChange`, `getHTML()` or a form value. If the upload fails or a file is too big,
a short notice appears in the status bar, `onImageUploadError` is called, and nothing is left behind in the
document. Addresses that are not safe (`javascript:` and similar) are rejected.

### Use it in a form

Give the editor a `name` and it adds a hidden `<input>` holding the HTML, so it behaves like any other field:

```jsx
<form action={saveDraft}>
  <Editor name="body" initialValue={draft.body} />
  <button type="submit">Save draft</button>
</form>
```

That works with `FormData`, a Next.js server action, a Remix action or a classic POST. Resetting the form puts
the starting content back. Use `id` and `ariaLabel` to connect a `<label>`:

```jsx
<label htmlFor="body">Body</label>
<Editor id="body" name="body" />
```

### Limit the length

```jsx
<Editor maxLength={500} />
```

`maxLength` counts text characters, the same number the status bar shows. Images and formatting are free.
Typing and pasting stop at the limit (a long paste is cut to fit) and the counter turns red. Content you set
from code with `value` or `setHTML` is not cut.

### Translate the interface

```jsx
import { Editor, localeEs } from 'react-easy-editor';

<Editor translations={localeEs} />
```

Packs for Spanish (`localeEs`), French (`localeFr`), German (`localeDe`) and Hindi (`localeHi`) are included.
They are separate named exports, so a bundler leaves out the ones you do not import (each one is about 3 KB
gzipped). These are starter translations that a native speaker has not reviewed yet; corrections are welcome.

To write your own, copy `localeEn`, which lists every string the editor shows, and translate the values:

```jsx
import { Editor, localeEn } from 'react-easy-editor';

const portuguese = { ...localeEn, 'Insert link (Ctrl+K)': 'Inserir link (Ctrl+K)', '{count} words': '{count} palavras' };

<Editor translations={portuguese} />
```

Keys you leave out stay in English. Placeholders such as `{count}` are filled in for you, so keep them in
the translation. A new object on every render is fine; it is compared by content.

### Right-to-left text

```jsx
<Editor dir="rtl" lang="ar" />
```

Lists and quotes mirror, and code blocks stay left to right. `dir="auto"` decides paragraph by paragraph.
`lang` helps spell checking and screen readers.

### Size and layout

Numbers are pixels, strings are any CSS length.

```jsx
<Editor height={400} />                        {/* exactly 400px tall; content scrolls inside */}
<Editor minHeight={300} maxHeight={700} />     {/* grows with the content between 300 and 700px */}
<Editor width={800} />                         {/* 800px wide */}
<Editor width="100%" height="60vh" />
<Editor maxWidth={720} />                      {/* full width, but never wider than 720px */}
```

`height` sizes the whole editor, toolbar and status bar included, and the writing area scrolls inside it.
With no height set, the editor grows with its content up to 70% of the window height, then scrolls. Full
screen always fills the window and hands the size back when you leave it.

## Props

### `<Editor />`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | | HTML for [controlled use](#save-and-load-content). Sanitized before use. |
| `initialValue` | `string` | | HTML to start with, read once on mount. Ignored when `value` is given. |
| `onChange` | `(html: string) => void` | | Called with the current HTML after every change: typing, toolbar actions, undo and redo, leaving source view, a finished image upload. |
| `onFocus` | `(event) => void` | | Focus entered the editor (content, toolbar or a dialog). Not fired when it just moves between those. |
| `onBlur` | `(event) => void` | | Focus left the editor entirely. |
| `autoFocus` | `boolean` | `false` | Focus the editor on mount, caret at the end. |
| `name` | `string` | | Adds a hidden `<input name>` holding the HTML, for [forms](#use-it-in-a-form). |
| `id` | `string` | | `id` of the editable element, for a `<label htmlFor>`. |
| `ariaLabel` | `string` | `"Rich text content"` | Accessible name of the writing area. |
| `placeholder` | `string` | | Text shown while the editor is empty. |
| `readOnly` | `boolean` | `false` | Locks the content. Selecting, copying and switching code-block tabs still work. |
| `maxLength` | `number` | | Maximum number of text characters. [Details](#limit-the-length). |
| `markdownShortcuts` | `boolean` | `true` | [Markdown-style typing](#markdown-shortcuts). |
| `dir` | `'ltr' \| 'rtl' \| 'auto'` | | Text direction of the content. |
| `lang` | `string` | | Language of the content, a BCP 47 tag such as `'ar'`. |
| `spellCheck` | `boolean` | browser default | Browser spell checking in the writing area. |
| `translations` | `Record<string, string>` | English | [Translate the interface](#translate-the-interface). |
| `onImageUpload` | `(file: File) => Promise<string \| { url, alt? }>` | | [Receives every image](#upload-images) that is picked, dropped or pasted. |
| `onImageUploadError` | `(error: Error, file: File) => void` | | An image was rejected or its upload failed. |
| `maxImageSize` | `number` | `5242880` (5 MB) | Largest image accepted, in bytes. `Infinity` for no limit. |
| `theme` | `'light' \| 'dark'` | saved choice, else system | Forces the theme and follows it if the value changes. The toolbar's theme button still works. |
| `height`, `minHeight`, `maxHeight` | `number \| string` | auto | [Size](#size-and-layout) of the whole editor. |
| `width`, `maxWidth` | `number \| string` | `100%` of the container | Width of the editor. |
| `toolbarRows` | `ToolbarItem[][]` | the default two rows | [Which buttons appear](#customizing-the-toolbar) and in what order. |
| `plugins` | `Plugin[]` | all built-in plugins | Plugins to register. |
| `className` | `string` | | Extra class on the root element. |
| `style` | `CSSProperties` | | Inline style on the root element (`--jc-*` [tokens](#theming) allowed). |

### The ref handle

`<Editor ref={ref} />` gives you:

| Method | What it does |
| --- | --- |
| `getHTML()` | The current HTML. |
| `setHTML(html)` | Replaces the content (sanitized) and calls `onChange`. |
| `getText()` | The content as plain text. |
| `isEmpty()` | `true` when there is no text and no image, table, video or code block. |
| `clear()` | Empties the editor and calls `onChange`. |
| `focus()` | Focuses the editor. The caret returns to where it was, or goes to the end. |
| `blur()` | Removes focus. |
| `insertHTML(html)` | Inserts HTML (sanitized) at the caret. |
| `undo()`, `redo()` | Step through the history. |
| `getElement()` | The editable element (`null` while source view is open). |
| `getEditor()` | The full internal API that plugins receive. Not covered by the stability promise of the methods above. |

### `ContentViewer`

`ContentViewer` shows HTML that the editor produced, with the same typography, tables, alerts and
syntax-highlighted code blocks, but without the toolbar and border. Use it for blog posts, comments,
previews, or anywhere readers see the content.

```jsx
import { ContentViewer } from 'react-easy-editor';

function Post({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <ContentViewer html={post.body} />
    </article>
  );
}
```

Code-block tabs and the Copy button work; the editing actions (Edit, Delete, Add tab) are hidden.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `html` | `string` | `''` | The HTML to show. |
| `sanitize` | `boolean` | `true` | Removes scripts, `on*` handlers and `javascript:` links before showing the HTML. See the note below. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | `'auto'` follows the visitor's system setting. |
| `className` | `string` | | Extra class on the viewer's root element. |
| `style` | `CSSProperties` | | Inline style: font size, font family, `--jc-*` colors. |

The viewer reads at 16px and has no background of its own. Match your site with `style`:

```jsx
<ContentViewer html={html} style={{ fontSize: 18, '--jc-font-family': 'Inter, sans-serif', '--jc-text': '#222' }} />
```

**Server rendering.** Sanitizing needs a browser DOM, so with the default `sanitize` the viewer's first server
render is empty and the content appears as soon as the page loads in the browser. If your HTML is already
trusted (for example cleaned on your server before it was stored), pass `sanitize={false}`: the content is
then rendered as-is, including in the server-rendered HTML that search engines see.

## Markdown shortcuts

On by default. They work on plain paragraphs (not inside lists, headings or code blocks), and one undo takes
a shortcut back. Turn them off with `markdownShortcuts={false}`.

| Type | You get |
| --- | --- |
| `# ` to `###### ` | Heading 1 to 6 |
| `- `, `* ` or `+ ` | Bulleted list |
| `1. ` or `1) ` | Numbered list |
| `> ` | Quote |
| `---`, `***` or `___`, then Enter | Divider |
| `**bold**` or `__bold__`, then a space | **Bold** |
| `*italic*` or `_italic_`, then a space | *Italic* |
| `~~strike~~`, then a space | ~~Strikethrough~~ |
| `` `code` ``, then a space | `Inline code` |

## Keyboard shortcuts

Use <kbd>Cmd</kbd> instead of <kbd>Ctrl</kbd> on a Mac.

| Keys | Action |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>B</kbd>, <kbd>I</kbd>, <kbd>U</kbd> | Bold, italic, underline |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Insert or edit a link |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd>+<kbd>Y</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | Redo |
| <kbd>Ctrl</kbd>+<kbd>X</kbd>, <kbd>C</kbd>, <kbd>V</kbd> | Cut, copy, paste |

## Theming

The look is driven by CSS custom properties that all begin with `--jc-`. Set them from CSS or from the `style` prop.

```css
.jc-root {
  --jc-accent: #e11d48;
  --jc-accent-rgb: 225, 29, 72;   /* the same color as r, g, b (used for translucent highlights) */
}
```

```jsx
<Editor style={{ '--jc-accent': '#e11d48', '--jc-accent-rgb': '225, 29, 72' }} />
```

| Variable | What it controls |
| --- | --- |
| `--jc-bg`, `--jc-surface` | Editor and toolbar backgrounds |
| `--jc-text`, `--jc-text-muted` | Text colors |
| `--jc-border` | Borders |
| `--jc-accent`, `--jc-accent-rgb`, `--jc-accent-soft` | Links, active buttons, highlights (`-rgb` is the same color written as `r, g, b`) |
| `--jc-font-family` | Font used by the editor and viewer |
| `--jc-content-min-height` | Minimum height of the writing area (default `260px`) |
| `--jc-body-max-height` | Height cap of the writing area when no `height` is set (default `70vh`) |
| `--jc-z-fullscreen`, `--jc-z-modal` | Stacking order of full screen (`1000`) and dialogs (`1100`) |

The dark palette is the same set of variables under `.jc-root[data-theme='dark']`. There are more (alert
colors, find-highlight colors, shadows); they are all declared at the top of `style.css`.

## Styles and CSS conflicts

The stylesheet is built so that it neither leaks into your page nor gets broken by it:

- **Everything is scoped.** Every rule starts with `.jc-root`. There are no bare element selectors and no
  `:root`, `html` or `body` rules, so nothing here can restyle your app. `npm run check:css` fails the build if
  an unscoped rule ever appears.
- **Your global CSS can't reach in.** The editor's root starts from a clean slate (`all: initial`), so
  `text-align`, `line-height`, `letter-spacing` and similar set on `body` or your wrapper don't flow in, and
  its internal sizing no longer depends on a global `box-sizing` rule. Host rules such as
  `button:hover { ... }` can't win against the editor's controls.
- **Resets don't strip the content.** Tailwind's preflight, Bootstrap's reboot, normalize.css and similar
  remove bullets, bold headings and link underlines. The writing area restores them.

This was checked in Chromium by rendering the real build on a clean page and on pages loaded with the Vite
React template CSS, Bootstrap 5, normalize.css, Tailwind 3 and 4, and a deliberately hostile stylesheet, in
both load orders, across 12 UI states (hover, keyboard focus, open menus, dialogs, source view, dark theme,
full screen, the viewer). The computed styles and the rendered pixels of every element matched the clean page.

**Customizing.** Prefer the `--jc-*` variables. If you need to override a rule directly, match its weight:
because rules are scoped, `.jc-btn` ships as `.jc-root .jc-btn`, so write `.my-app .jc-root .jc-btn { ... }`.

**Where the CSS comes from.** The first time an editor or viewer mounts in the browser, it adds its stylesheet
to `<head>` unless it is already there. For server-rendered pages, or sites with a strict Content-Security-Policy
that blocks inline `<style>`, import the stylesheet yourself; nothing is injected when it's present:

```js
import 'react-easy-editor/style.css';
```

## Next.js and server rendering

The package ships with a `"use client"` directive, so it works directly from the App Router. Import the
stylesheet in your layout so server-rendered pages are styled before the JavaScript loads:

```jsx
// app/layout.js
import 'react-easy-editor/style.css';
```

```jsx
// app/editor/page.js (a Server Component can render it as long as you don't pass functions)
import { Editor } from 'react-easy-editor';

export default function Page() {
  return <Editor height={400} initialValue="<p>Hello</p>" />;
}
```

To use `onChange`, put the editor in your own Client Component (`'use client'` at the top of the file). The
toolbar is part of the server-rendered HTML; the writing area is filled in as soon as the page loads in the
browser. To pass the content to a server action, give the editor a [`name`](#use-it-in-a-form).

## Customizing the toolbar

`toolbarRows` is an array of rows, each an array of plugins and `SEPARATOR`s. Pick plugins from `allPlugins` by name.
Define the rows once, outside your component, so the editor can skip needless re-renders:

```jsx
import { Editor, allPlugins, SEPARATOR } from 'react-easy-editor';

const pick = (...names) => names.map((name) => allPlugins.find((p) => p.name === name));

const toolbarRows = [
  [...pick('bold', 'italic', 'underline'), SEPARATOR, ...pick('insertLink', 'insertImage', 'insertTable'), SEPARATOR, ...pick('sourceMode')],
];

<Editor toolbarRows={toolbarRows} />
```

Leave `plugins` alone: it defaults to all built-in plugins, which keeps features such as table editing working
even when their buttons are hidden.

Built-in plugin names: `undo`, `redo`, `bold`, `italic`, `underline`, `strikeThrough`, `superscript`,
`subscript`, `fontFamily`, `fontSize`, `color`, `clearFormatting`, `orderedList`, `unorderedList`, `outdent`,
`indent`, `align`, `formatBlock`, `lineHeight`, `alert`, `sourceMode`, `insertLink`, `insertImage`,
`insertFile`, `insertVideo`, `insertTable`, `insertCode`, `horizontalLine`, `specialCharacter`, `emoji`, `cut`,
`copy`, `paste`, `selectAll`, `findReplace`, `fullscreen`, `lock`, `theme`, `preview`, `print`, `about`, and
`tableTools` (no button; powers table editing).

## Writing a plugin

A plugin is an object with a `name`, an optional toolbar `button`, and optional `commands`, `init` and
`destroy`. The `editor` object your callbacks receive can run commands (`editor.exec`), open dialogs
(`editor.openPopup`), read and set the HTML (`editor.getHTML`, `editor.setHTML`), translate text (`editor.t`),
show a status-bar notice (`editor.notify`) and more; see `EditorApi` in the bundled types.

```jsx
import { Editor, allPlugins, IconStore, SEPARATOR } from 'react-easy-editor';

IconStore.set('star', '<svg viewBox="0 0 20 20"><path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.6 5.1 17.2 6 11.7 2 7.8l5.6-.8z" fill="currentColor"/></svg>');

const star = {
  name: 'star',
  // A command goes through the editor's undo history and calls onChange for you.
  commands: {
    insertStar: () => document.execCommand('insertText', false, '★'),
  },
  button: {
    type: 'instant',
    icon: 'star',
    tooltip: 'Insert star',
    onClick: (editor) => editor.exec('insertStar'),
  },
};

const plugins = [...allPlugins, star];
const rows = [[allPlugins.find((p) => p.name === 'bold'), SEPARATOR, star]];

<Editor plugins={plugins} toolbarRows={rows} />
```

Button types are `toggle`, `instant`, `dropdown`, `buttonGroup`, `colorpicker` and `popup` (a button that opens
a dialog). The shapes are all in the bundled TypeScript definitions.

## TypeScript

Types are included; there is nothing extra to install.

```tsx
import { useRef } from 'react';
import { Editor, type EditorHandle, type EditorProps } from 'react-easy-editor';

const props: EditorProps = { height: 400, onChange: (html) => console.log(html) };

function Example() {
  const ref = useRef<EditorHandle>(null);
  return <Editor ref={ref} {...props} />;
}
```

## CommonJS

```js
const { Editor, ContentViewer } = require('react-easy-editor');
```

## Security

The editor and the viewer clean HTML in the browser: scripts, event-handler attributes and `javascript:` links
are removed when content loads and on undo, redo, paste and leaving source view. Embedded frames are limited
to YouTube and Vimeo. Image addresses returned by `onImageUpload` are checked before use.

Treat that as a safety net rather than your only defense. If you store or show content written by other
people, sanitize it on your server as well before saving it. To report a vulnerability, see
[SECURITY.md](./SECURITY.md).

## Browser and React support

- **Browsers:** the automated browser tests run in Chromium (Chrome and Edge). Firefox and Safari rely on the
  same standard web features (contentEditable, CSS custom properties, `:where()`, `all`) but are not in the
  test matrix yet. Reports are welcome.
- **React:** the whole browser suite passes on React 18 and 19. The code uses no API newer than React 17, so
  17 should work (the peer range is `>=17`), but it is not tested.
- **Server rendering:** safe to import on the server, and checked with a server render of the built package.

## FAQ

**Is it free for commercial use?** Yes. It is [MIT licensed](./LICENSE).

**What does it save, HTML or Markdown?** HTML. The Markdown shortcuts are only a typing aid. If you need
Markdown in storage, convert the HTML with a library on your side.

**Can I show saved content without the editor?** Yes: [`ContentViewer`](#contentviewer), or render the HTML
yourself after sanitizing it.

**Does it do real-time collaboration, comments or tracked changes?** No. React Easy Editor is a ready-made
editor that reads and writes HTML. If you need collaborative editing or custom document schemas, you want a
framework built for that.

**Where do uploaded images go?** Wherever you send them in [`onImageUpload`](#upload-images). Without that
function, images are embedded in the HTML as base64, which makes the HTML large.

**Can people paste from Word or Google Docs?** Yes. Pasted HTML is accepted and sanitized the same way as
everything else the editor loads.

**How do I add or remove toolbar buttons?** [Customizing the toolbar](#customizing-the-toolbar).

**How do I add a language?** [Translate the interface](#translate-the-interface).

**Why does my editor re-render the toolbar on every keystroke?** Most likely `plugins` or `toolbarRows` is an
inline array or object, which is a new value on every render. Define them once at module level.

## Coming from react-easy-text-editor

The package was renamed. To switch:

```bash
npm uninstall react-easy-text-editor
npm install react-easy-editor
```

Then change the import from `'react-easy-text-editor'` to `'react-easy-editor'`. Everything you used before
(`initialValue`, `onChange`, `height`, `toolbarRows`, plugins, `ContentViewer`) works the same way. See the
[changelog](./CHANGELOG.md) for what is new.

## Contributing

Bug reports, fixes and translations are welcome. [CONTRIBUTING.md](./CONTRIBUTING.md) explains how to run
the project, the tests and the translation workflow.

## License

[MIT](./LICENSE) © Akash Negi. Code highlighting is provided by [highlight.js](https://highlightjs.org/).
