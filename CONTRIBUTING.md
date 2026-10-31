# Contributing

Thanks for helping. Bug reports, fixes, translations and documentation improvements are all welcome.

## Run it locally

You need Node.js 22.12 or newer (the repository has an `.nvmrc`, so `nvm use` picks the right one).

```bash
git clone https://github.com/AKASHNEGI-github/react-easy-editor.git
cd react-easy-editor
npm install
npm run dev        # the demo site, with hot reload
```

## Project layout

| Folder | What is in it |
| --- | --- |
| `src/components` | The editor's React components: the toolbar, the writing area, the status bar, dialogs |
| `src/core` | The engine: commands, history, selection, sanitizing, image upload, Markdown shortcuts |
| `src/plugins` | One file per toolbar feature. A plugin is a plain object |
| `src/locales` | Interface translations. `en.js` is generated; the others are written by hand |
| `src/styles` | The editor's stylesheet. Every rule is scoped under `.jc-root` automatically |
| `src/demo`, `src/App.jsx` | The demo and landing site. It is not part of the npm package |
| `tests/unit` | Fast tests (Vitest and jsdom) |
| `tests/e2e` | Real-browser tests (Chrome, driven by puppeteer-core) |
| `types` | The TypeScript definitions that ship with the package |
| `scripts`, `build` | Build checks, the translation key extractor, screenshots, the CSS scoping plugin |

## Check your change

```bash
npm run lint           # oxlint; there are zero warnings, please keep it that way
npm test               # unit and component tests
npm run build          # builds dist/
npm run check:css      # fails if any CSS rule is not scoped under .jc-root
npm run check:package  # publint and "Are the types wrong"
npm run test:package   # packs the real tarball and imports it in a clean project
npm run test:e2e       # real-browser tests
```

`npm run test:e2e` needs Chrome or Chromium. If it is not in a usual place, set `CHROME_PATH` to the
executable. You can run a subset by passing part of a test name: `npm run test:e2e -- "code blocks"`.

When you fix a bug, add a test that fails without the fix. Some bugs only show up in a real browser (a CSS
rule being overridden, for example), so `tests/e2e` is the right place for those.

## Translations

Every string the editor shows goes through `editor.t('English text')`. The English text is the key.

- **Fixing or improving a translation:** edit the value in `src/locales/<language>.js`.
- **Adding a language:** copy `src/locales/en.js` to `src/locales/<code>.js`, rename the export (`localePt`),
  translate the values, and export it from `src/index.js` and `types/index.d.ts`. Keep `{count}`-style
  placeholders exactly as they are.
- **Adding or changing UI text in the code:** run `node scripts/extract-i18n-keys.mjs --write` to regenerate
  `src/locales/en.js`, then add the new keys to every other pack. `npm test` fails if the English template
  drifts from the source or if a pack is missing a key. The browser tests also open every dialog and fail if
  any visible text skips translation.

Translations written by a non-native speaker are fine as a start. Please say so in the pull request.

## Pull requests

- Keep a pull request focused on one change.
- Update `CHANGELOG.md` under an "Unreleased" heading.
- Update the README and `types/index.d.ts` when you add or change a prop.
- Added a toolbar button? List it in `src/demo/features.js`, which feeds the feature list on the demo site. `npm test`
  fails until you do.
- Say how you tested it. A screenshot helps for anything visual.

By contributing you agree that your work is released under the [MIT license](./LICENSE).

## Releasing (maintainers)

See [docs/PUBLISHING.md](./docs/PUBLISHING.md).
