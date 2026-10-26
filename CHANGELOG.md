# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-26

### Renamed

- The package is now **`react-easy-editor`** (it was `react-easy-text-editor`). Install the new name and
  change your imports; every prop you already used works the same way. See
  [Coming from react-easy-text-editor](./README.md#coming-from-react-easy-text-editor).

### Added

- **`value`** prop for controlled use: `<Editor value={html} onChange={setHtml} />`. Changes you make from
  outside are applied without moving the caret, and the editor's own value coming back is ignored, so
  typing is never interrupted.
- **`ref` handle** with `getHTML`, `setHTML`, `getText`, `isEmpty`, `clear`, `focus`, `blur`, `insertHTML`,
  `undo`, `redo`, `getElement` and `getEditor`.
- **Image uploads**: `onImageUpload`, `onImageUploadError` and `maxImageSize`. Picked, dropped and pasted
  images share one pipeline. The image appears at once as a dimmed placeholder and is swapped for the
  address your handler returns. Failures and oversized files are reported and leave the document clean, and
  an unsafe address (such as `javascript:`) returned by a handler is rejected.
- A file picker in the Insert image dialog, and drag and drop onto the editor. Dropping a file on the
  editor no longer makes the browser navigate away from the page.
- **Markdown shortcuts** while typing (`# `, `- `, `1. `, `> `, `---`, `**bold**`, `*italic*`, `~~strike~~`,
  `` `code` ``). On by default; turn off with `markdownShortcuts={false}`. One undo reverts a shortcut.
- **`maxLength`** with a live counter that turns red at the limit. Typing and pasting stop at the limit.
- **Forms**: `name` adds a hidden field so a plain `<form>`, `FormData`, a Next.js server action or a Remix
  action can read the editor. A form reset restores the starting content. Also `id` and `ariaLabel`.
- **Focus**: `onFocus`, `onBlur` and `autoFocus`. `onFocus` and `onBlur` fire when focus enters or leaves
  the whole editor, not when it moves between the toolbar, the content and dialogs.
- **Right-to-left**: `dir` and `lang`. Lists and quotes mirror, and code blocks stay left to right.
- **Interface translations**: the `translations` prop, plus English, Spanish, French, German and Hindi
  packs (`localeEn`, `localeEs`, `localeFr`, `localeDe`, `localeHi`). Packs are separate named exports, so
  bundlers drop the ones you do not import. `localeEn` is the template for writing your own.
- <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> on Mac) opens the link dialog.
- Accessibility: roles and `aria-expanded` on toolbar menus, labelled toolbar and writing area.
- TypeScript types for everything above.
- A demo and landing site, plus `CONTRIBUTING.md`, `SECURITY.md`, issue templates and GitHub Actions workflows
  for CI, the demo site and releases.
- Tests: unit tests (Vitest and jsdom) and real-browser tests (Chromium, driven by puppeteer-core). Two
  checks keep translations honest: one fails when the English template drifts from the source, and one
  opens every dialog and fails if any visible text bypasses translation.

### Changed

- The editor no longer re-renders its toolbar and status bar each time your component re-renders, so an
  inline `onChange` is fine. Pass stable `plugins` and `toolbarRows` (module-level constants) to keep it that
  way.
- Code blocks in a language the highlighter does not know are shown as plain, escaped text. Automatic language
  guessing was removed because it could pick the wrong language.
- highlight.js is now loaded as its core plus the 19 languages the code-block picker offers, instead of its
  whole common set. Even with every feature added in this release, the gzipped bundle went from about 99 KB
  to about 81 KB (React excluded).
- Source maps are no longer published. They were more than half of the install size.
- Pasted screenshots and images now go through the same pipeline as picked ones, so `onImageUpload` applies to them too.
- `ref.insertHTML` inserts through the DOM range, so the browser no longer copies computed styles onto the
  inserted content.

### Fixed

- Code blocks had no padding and could not scroll long lines sideways, because `.jc-content pre` outranked the
  code-block rule. Both are fixed and covered by a browser test.
- Several toolbar tooltips, dialog labels and every table-menu entry could not be translated.
- A `name` prop added after the first render left the hidden form field empty.
- All lint warnings.

### Removed

- Mentions of other editors from the code, the documentation and the package metadata.

## Earlier versions

Versions before 1.1.0 were published as
[`react-easy-text-editor`](https://www.npmjs.com/package/react-easy-text-editor).
