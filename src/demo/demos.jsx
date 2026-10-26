import { buildCodeBlock } from '../core/codeBlockDom';
import { localeDe, localeEs, localeFr, localeHi } from '../index';

// ---------------------------------------------------------------------------------------------
// Starting documents. Plain HTML, exactly what the editor itself would produce.
// ---------------------------------------------------------------------------------------------

const cell = 'border: 1px solid #d1d5db; padding: 6px 8px;';
// Header cells get no background of their own, so they follow the light or dark theme.
const headCell = cell;

const typingDoc = () =>
  [
    '<h1>Release notes</h1>',
    '<p>This page is a live editor. <strong>Select text</strong> to format it, drag an image in, or press <em>Ctrl+K</em> to add a link.</p>',
    '<h2>What changed in 1.1</h2>',
    '<ul>',
    '<li>A controlled <code>value</code> prop and a <code>ref</code> handle</li>',
    '<li>An upload hook for picked, dropped and pasted images</li>',
    '<li>Markdown shortcuts, a character limit and right-to-left text</li>',
    '<li>An interface in English, Spanish, French, German and Hindi</li>',
    '</ul>',
    '<table style="border-collapse: collapse; width: 100%;"><tbody>',
    `<tr><th style="${headCell}">Prop</th><th style="${headCell}">Use it to</th></tr>`,
    `<tr><td style="${cell}">value</td><td style="${cell}">Keep the HTML in React state</td></tr>`,
    `<tr><td style="${cell}">onImageUpload</td><td style="${cell}">Send images to your server</td></tr>`,
    `<tr><td style="${cell}">maxLength</td><td style="${cell}">Cap how much text can be written</td></tr>`,
    '</tbody></table>',
    '<p></p>',
    '<div class="jc-alert jc-alert--tip"><div class="jc-alert-label" contenteditable="false">Tip</div><div class="jc-alert-content"><p>Save whatever <code>onChange</code> gives you. It is plain HTML, so any backend can store it.</p></div></div>',
    '<p></p>',
    buildCodeBlock([
      {
        language: 'javascript',
        filename: 'App.jsx',
        code: "import { Editor } from 'react-easy-editor';\n\nexport default function App() {\n  return <Editor onChange={(html) => save(html)} />;\n}",
      },
    ]).outerHTML,
    '<p></p>',
  ].join('');

const imagesDoc = () => '<p>Drag an image into this page, paste a screenshot, or use the sample image button above.</p><p></p>';
const languagesDoc = () => '<h2>Hello</h2><p>What you write stays exactly as you typed it. Only the toolbar, the dialogs and the status bar change language.</p>';
const rtlDoc = () =>
  '<h2>مرحبًا بالعالم</h2><p>هذا المحرر يدعم الكتابة من اليمين إلى اليسار.</p><ul><li>عنصر أول</li><li>عنصر ثانٍ</li></ul><blockquote>هذا اقتباس.</blockquote>';
const limitDoc = () => '<p>Try adding more text here. This note can hold 140 characters.</p>';

// ---------------------------------------------------------------------------------------------
// Interface languages offered on the Languages tab.
// ---------------------------------------------------------------------------------------------

export const LANGS = [
  { id: 'en', label: 'English', pack: undefined, symbol: null },
  { id: 'es', label: 'Español', pack: localeEs, symbol: 'localeEs' },
  { id: 'fr', label: 'Français', pack: localeFr, symbol: 'localeFr' },
  { id: 'de', label: 'Deutsch', pack: localeDe, symbol: 'localeDe' },
  { id: 'hi', label: 'हिन्दी', pack: localeHi, symbol: 'localeHi' },
];

// The upload a real app would do is a fetch() to its server. The demo has no server, so it reads the
// file and "finishes" after a short wait, which is enough to watch the placeholder turn into the image.
export function fakeUpload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => setTimeout(() => resolve(reader.result), 1200);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------------------------
// One entry per tab. `props` are what the live editor receives; `code` is what you would write.
// ---------------------------------------------------------------------------------------------

export const DEMOS = [
  {
    id: 'typing',
    label: 'Typing',
    height: 480,
    doc: typingDoc,
    hint: (
      <>
        Type <code>## </code> and a space for a heading, <code>- </code> for a bullet list, or <code>**bold**</code> for bold text. Press <kbd>Ctrl+K</kbd> to add a link.
      </>
    ),
    props: () => ({}),
    code: () =>
      "import { useState } from 'react';\nimport { Editor } from 'react-easy-editor';\n\nexport default function Notes() {\n  const [html, setHtml] = useState('<p>Hello</p>');\n  return <Editor value={html} onChange={setHtml} height={480} />;\n}",
  },
  {
    id: 'images',
    label: 'Images',
    height: 380,
    doc: imagesDoc,
    hint: <>Drag an image onto the page, paste a screenshot, or use the image button. It shows up at once and is swapped for the uploaded address when your handler finishes. Here the upload is faked with a 1.2 second wait.</>,
    props: () => ({ onImageUpload: fakeUpload }),
    code: () =>
      "<Editor\n  onImageUpload={async (file) => {\n    const body = new FormData();\n    body.append('file', file);\n    const res = await fetch('/api/upload', { method: 'POST', body });\n    return (await res.json()).url;\n  }}\n/>",
  },
  {
    id: 'languages',
    label: 'Languages',
    height: 380,
    doc: languagesDoc,
    hint: <>The toolbar, dialogs and status bar change language. Each pack is a separate import, so the ones you skip stay out of your bundle.</>,
    props: ({ lang }) => ({ translations: LANGS.find((l) => l.id === lang)?.pack }),
    code: ({ lang }) => {
      const { symbol } = LANGS.find((l) => l.id === lang) ?? {};
      return symbol
        ? `import { Editor, ${symbol} } from 'react-easy-editor';\n\n<Editor translations={${symbol}} />`
        : "import { Editor } from 'react-easy-editor';\n\n<Editor />  {/* English is built in */}";
    },
  },
  {
    id: 'rtl',
    label: 'Right to left',
    height: 380,
    doc: rtlDoc,
    hint: (
      <>
        Set <code>dir="rtl"</code> for Arabic, Hebrew, Persian or Urdu. Lists and quotes mirror, and code blocks stay left to right.
      </>
    ),
    props: () => ({ dir: 'rtl', lang: 'ar' }),
    code: () => '<Editor dir="rtl" lang="ar" />',
  },
  {
    id: 'limit',
    label: 'Character limit',
    height: 380,
    doc: limitDoc,
    hint: <>Typing and pasting stop at the limit, and the counter in the status bar turns red. Images and formatting don&rsquo;t count.</>,
    props: () => ({ maxLength: 140 }),
    code: () => '<Editor maxLength={140} />',
  },
];

// ---------------------------------------------------------------------------------------------
// The "Use it" section: one tabbed code block, rendered by the package's own ContentViewer.
// ---------------------------------------------------------------------------------------------

export const USE_FILES = [
  { language: 'bash', filename: 'Terminal', code: 'npm install react-easy-editor' },
  {
    language: 'javascript',
    filename: 'PostForm.jsx',
    code: "import { useState } from 'react';\nimport { Editor } from 'react-easy-editor';\n\nexport default function PostForm({ post, onSave }) {\n  const [html, setHtml] = useState(post.body);\n\n  return (\n    <>\n      <Editor value={html} onChange={setHtml} height={400} />\n      <button onClick={() => onSave(html)}>Save</button>\n    </>\n  );\n}",
  },
  {
    language: 'javascript',
    filename: 'Post.jsx',
    code: "import { ContentViewer } from 'react-easy-editor';\n\nexport default function Post({ post }) {\n  return (\n    <article>\n      <h1>{post.title}</h1>\n      <ContentViewer html={post.body} />\n    </article>\n  );\n}",
  },
  {
    language: 'javascript',
    filename: 'Form.jsx',
    code: "// Works inside a plain <form>, a Next.js server action or a Remix action.\n<form action={saveDraft}>\n  <Editor name=\"body\" initialValue={draft.body} />\n  <button type=\"submit\">Save draft</button>\n</form>",
  },
];
