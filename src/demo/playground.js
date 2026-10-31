// Content for the single playground on the demo page: the starting document, the interface languages,
// the fake upload, and the code shown beside the editor.
import { buildCodeBlock } from '../core/codeBlockDom';
import { localeDe, localeEs, localeFr, localeHi } from '../index';

// ---------------------------------------------------------------------------------------------
// The starting document: plain HTML, exactly what the editor itself would produce. (Its headings start at h2: the
// page's own h1 is the hero.) It ends with a
// code block on purpose. The editor keeps a free line under it, so you can click below and keep typing.
// ---------------------------------------------------------------------------------------------

const cell = 'border: 1px solid #d1d5db; padding: 6px 8px;';

export const starterDoc = () =>
  [
    '<h2>Release notes</h2>',
    '<p>This page is a live editor. <strong>Select text</strong> to format it, drag an image in, or press <em>Ctrl+K</em> to add a link.</p>',
    '<h3>What changed in 1.1</h3>',
    '<ul>',
    '<li>A controlled <code>value</code> prop and a <code>ref</code> handle</li>',
    '<li>An upload hook for picked, dropped and pasted images</li>',
    '<li>Markdown shortcuts, a character limit and right-to-left text</li>',
    '<li>An interface in English, Spanish, French, German and Hindi</li>',
    '</ul>',
    '<table style="border-collapse: collapse; width: 100%;"><tbody>',
    `<tr><th style="${cell}">Prop</th><th style="${cell}">Use it to</th></tr>`,
    `<tr><td style="${cell}">value</td><td style="${cell}">Keep the HTML in React state</td></tr>`,
    `<tr><td style="${cell}">onImageUpload</td><td style="${cell}">Send images to your server</td></tr>`,
    `<tr><td style="${cell}">maxLength</td><td style="${cell}">Cap how much text can be written</td></tr>`,
    '</tbody></table>',
    '<p><br></p>',
    '<div class="jc-alert jc-alert--tip"><div class="jc-alert-label" contenteditable="false">Tip</div><div class="jc-alert-content"><p>Save whatever <code>onChange</code> gives you. It is plain HTML, so any backend can store it.</p></div></div>',
    '<p><br></p>',
    buildCodeBlock([
      {
        language: 'javascript',
        filename: 'App.jsx',
        code: "import { Editor } from 'react-easy-editor';\n\nexport default function App() {\n  return <Editor onChange={(html) => save(html)} />;\n}",
      },
    ]).outerHTML,
  ].join('');

// ---------------------------------------------------------------------------------------------
// Interface languages.
// ---------------------------------------------------------------------------------------------

export const LANGS = [
  { id: 'en', label: 'English', pack: undefined, symbol: null },
  { id: 'es', label: 'Español', pack: localeEs, symbol: 'localeEs' },
  { id: 'fr', label: 'Français', pack: localeFr, symbol: 'localeFr' },
  { id: 'de', label: 'Deutsch', pack: localeDe, symbol: 'localeDe' },
  { id: 'hi', label: 'हिन्दी', pack: localeHi, symbol: 'localeHi' },
];

// ---------------------------------------------------------------------------------------------
// The upload a real app would do is a fetch() to its server. The demo has no server, so it reads the
// file and "finishes" after a short wait, which is enough to watch the placeholder become the image.
// ---------------------------------------------------------------------------------------------

export function fakeUpload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => setTimeout(() => resolve(reader.result), 1200);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------------------------
// The code shown beside the editor: what you would write to get this same editor in your app.
// ---------------------------------------------------------------------------------------------

export function playgroundCode(lang) {
  const { symbol } = LANGS.find((l) => l.id === lang) ?? {};
  const imports = symbol ? `Editor, ${symbol}` : 'Editor';
  const translations = symbol ? `\n      translations={${symbol}}` : '';
  return [
    "import { useState } from 'react';",
    `import { ${imports} } from 'react-easy-editor';`,
    '',
    'export default function Notes() {',
    "  const [html, setHtml] = useState('<p>Hello</p>');",
    '',
    '  return (',
    '    <Editor',
    '      value={html}',
    '      onChange={setHtml}',
    `      onImageUpload={(file) => uploadToMyServer(file)}${translations}`,
    '      height={480}',
    '    />',
    '  );',
    '}',
  ].join('\n');
}

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
