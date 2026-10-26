// A test page with one scenario per feature. The scenario and extra props come from the URL:
//   /?s=controlled&props={"maxLength":20}
// Everything the tests need to observe is on window (__log, __handle, ...).
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from '../../../src/index.js';
import { buildCodeBlock } from '../../../src/core/codeBlockDom';

window.__buildCodeBlock = buildCodeBlock; // lets specs build a real code block without hand-writing its markup

const params = new URLSearchParams(window.location.search);
const scenario = params.get('s') || 'basic';
const extra = JSON.parse(params.get('props') || '{}');
const strict = params.get('strict') === '1';

window.__log = [];
window.__renders = 0; // how many times the toolbar probe rendered
const log = (type, data) => window.__log.push({ type, data });

// Counts toolbar re-renders: ToolbarButton calls `tooltip` each time it renders.
const probe = {
  name: 'probe',
  button: { type: 'instant', icon: 'bold', tooltip: () => { window.__renders += 1; return 'Probe'; }, onClick() {} },
};
import { allPlugins, toolbarRows, IconStore, SEPARATOR } from '../../../src/index.js';
const plugins = [...allPlugins, probe];
const rows = [[probe], ...toolbarRows];

function Basic() {
  const ref = useRef(null);
  window.__handle = () => ref.current;
  return (
    <Editor
      ref={ref}
      plugins={plugins}
      toolbarRows={rows}
      onChange={(html) => { window.__html = html; log('change', html); }}
      onFocus={() => log('focus')}
      onBlur={() => log('blur')}
      {...extra}
    />
  );
}

function Controlled() {
  const [html, setHtml] = useState(extra.start ?? '<p>Start</p>');
  window.__setValue = setHtml;
  window.__state = () => html;
  return (
    <>
      <Editor plugins={plugins} toolbarRows={rows} value={html} onChange={(h) => { log('change', h); setHtml(h); }} {...extra.props} />
      <pre id="state" style={{ display: 'none' }}>{html}</pre>
    </>
  );
}

function FormScenario() {
  return (
    <form id="f" onSubmit={(e) => e.preventDefault()}>
      <Editor name="body" initialValue="<p>Hello</p>" {...extra} />
      <input name="title" defaultValue="T" />
      <button type="submit">Send</button>
      <button type="reset" id="reset">Reset</button>
    </form>
  );
}

function Upload() {
  const delay = Number(extra.delay ?? 50);
  const fail = !!extra.fail;
  const bad = extra.bad;
  const ref = useRef(null);
  window.__handle = () => ref.current;
  return (
    <Editor
      ref={ref}
      onChange={(h) => { window.__html = h; log('change', h); }}
      onImageUpload={(file) => {
        log('upload', { name: file.name, size: file.size, type: file.type });
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (fail) reject(new Error('boom'));
            else if (bad) resolve(bad);
            // a real file served by the harness, so the <img> loads without any network
            else resolve(`${window.location.origin}/uploads/pixel.png`);
          }, delay);
        });
      }}
      onImageUploadError={(err, file) => log('upload-error', { message: err.message, name: file.name })}
      {...(extra.props || {})}
    />
  );
}

// A translator that wraps EVERY string it is asked for in ⟦ ⟧. Anything visible without those
// marks never went through t(), so it would stay English in a translated editor.
window.__keys = new Set(); // every string the UI asked to translate
const markerTranslations = new Proxy({}, {
  get: (_, key) => {
    if (typeof key !== 'string') return undefined;
    window.__keys.add(key);
    return `\u27e6${key}\u27e7`;
  },
  getOwnPropertyDescriptor: (_, key) => (typeof key === 'string'
    ? { value: `\u27e6${key}\u27e7`, writable: true, enumerable: true, configurable: true }
    : undefined),
});
const DOT = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function Marker() {
  const ref = useRef(null);
  window.__handle = () => ref.current;
  return (
    <Editor
      ref={ref}
      translations={markerTranslations}
      initialValue={`<p>Some text with a <a href="https://example.com">link</a>.</p><table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table><p><img src="${DOT}" alt="x" style="width:40px"></p>`}
      {...extra}
    />
  );
}

// The plugin from the README's "Writing a plugin" section, character for character, so the docs stay true.
IconStore.set('star', '<svg viewBox="0 0 20 20"><path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.6 5.1 17.2 6 11.7 2 7.8l5.6-.8z" fill="currentColor"/></svg>');
const star = {
  name: 'star',
  commands: {
    insertStar: () => document.execCommand('insertText', false, '\u2605'),
  },
  button: {
    type: 'instant',
    icon: 'star',
    tooltip: 'Insert star',
    onClick: (editor) => editor.exec('insertStar'),
  },
};
const starPlugins = [...allPlugins, star];
const starRows = [[allPlugins.find((p) => p.name === 'bold'), SEPARATOR, star]];

function PluginScenario() {
  return <Editor plugins={starPlugins} toolbarRows={starRows} onChange={(html) => { window.__html = html; log('change', html); }} {...extra} />;
}

const SCENARIOS = { basic: Basic, controlled: Controlled, form: FormScenario, upload: Upload, marker: Marker, plugin: PluginScenario };
const Scenario = SCENARIOS[scenario] || Basic;
const tree = <Scenario />;
createRoot(document.getElementById('root')).render(strict ? <StrictMode>{tree}</StrictMode> : tree);
window.__ready = true;
