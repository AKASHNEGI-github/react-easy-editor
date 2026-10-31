// Demo and landing page for react-easy-editor (deployed on Netlify; not part of the npm package).
// One page on purpose: a hero, a single live playground, the feature list, how to use it. Keep it that way.
// The live editor, the tabbed code blocks and the viewer below are all the package's own components.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContentViewer, Editor } from './index';
import { buildCodeBlock } from './core/codeBlockDom';
import { cachedTotal, fetchTotalDownloads, formatCount } from './demo/downloads';
import { FEATURE_GROUPS } from './demo/features';
import { LANGS, USE_FILES, fakeUpload, playgroundCode, starterDoc } from './demo/playground';
import { dropSampleImage } from './demo/sampleImage';
import { useTheme } from './demo/useTheme';

const REPO = 'https://github.com/AKASHNEGI-github/react-easy-editor';
const NPM = 'https://www.npmjs.com/package/react-easy-editor';

function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="#2552c8" />
      <path d="M6 12h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="6" y="18" width="14" height="6" rx="1.2" fill="#ffe15a" />
      <path d="M22 7h5M24.5 7v18M22 25h5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button type="button" className="icon-btn" onClick={onToggle} aria-label={dark ? 'Switch to the light theme' : 'Switch to the dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="10" cy="10" r="3.4" />
            <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
          </>
        ) : (
          <path d="M16.5 11.6A6.5 6.5 0 0 1 8.4 3.5a6.5 6.5 0 1 0 8.1 8.1z" />
        )}
      </svg>
    </button>
  );
}

function CopyButton({ text, label = 'Copy', className = 'ghost-btn' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button type="button" className={className} onClick={copy}>
      <span aria-live="polite">{done ? 'Copied' : label}</span>
    </button>
  );
}

// Code shown with the package's own tabbed code block (syntax highlighting, tabs and Copy included).
function Code({ files, theme }) {
  const html = useMemo(() => buildCodeBlock(files).outerHTML, [files]);
  return <ContentViewer html={html} theme={theme} />;
}

// The total is shown only when npm's numbers could be fetched and are above zero (see demo/downloads.js).
function DownloadStat() {
  const [total, setTotal] = useState(() => cachedTotal());

  useEffect(() => {
    let alive = true;
    fetchTotalDownloads().then((count) => {
      if (alive && count) setTotal(count);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!total) return null;
  return (
    <a className="stat" href={NPM} title="Installs from npm so far, counting this package and its earlier name, react-easy-text-editor">
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3v10M6 9.5l4 4 4-4M4 16.5h12" />
      </svg>
      <span>
        <strong>{formatCount(total)}</strong> downloads on npm
      </span>
    </a>
  );
}

// The one playground. Everything the editor does is in this editor: type, paste, drop an image in, use any
// toolbar button. The only controls are the two that need a hand: a sample image and the interface language.
function Playground({ theme }) {
  const [html, setHtml] = useState(starterDoc);
  const [lang, setLang] = useState('en');
  const sheetRef = useRef(null);

  const code = playgroundCode(lang);
  const files = useMemo(() => [{ language: 'javascript', filename: 'App.jsx', code }], [code]);
  // Long HTML is shown from both ends, so what you just typed (usually at the end) is always visible.
  const shown = html.length > 1500 ? `${html.slice(0, 700)}\n\n… ${html.length - 1400} more characters …\n\n${html.slice(-700)}` : html;

  return (
    <section className="playground wrap" id="demo" aria-labelledby="demo-title">
      <h2 id="demo-title" className="sr-only">Live demo</h2>

      <div className="demo-head">
        <p className="hint">
          This is the real editor, not a recording. Type <code>## </code> and a space for a heading, <code>- </code> for a list, or <code>**bold**</code> for bold. Press <kbd>Ctrl+K</kbd> for a link, and drag in or paste an image.
        </p>
        <div className="controls">
          <button type="button" className="ghost-btn" onClick={() => dropSampleImage(sheetRef.current.querySelector('.jc-content'))}>
            Insert a sample image
          </button>
          <label className="select-label">
            <span>Interface language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="sheet" ref={sheetRef}>
        <Editor
          value={html}
          onChange={setHtml}
          height={480}
          theme={theme}
          placeholder="Start typing…"
          onImageUpload={fakeUpload}
          translations={LANGS.find((l) => l.id === lang)?.pack}
        />
      </div>

      <div className="io">
        <div className="panel">
          <h3>In your app</h3>
          <Code files={files} theme={theme} />
        </div>
        <div className="panel">
          <h3>
            What onChange receives
            <CopyButton text={html} label="Copy HTML" />
          </h3>
          <pre className="out" tabIndex={0} aria-label="HTML produced by the editor">{shown}</pre>
        </div>
      </div>
    </section>
  );
}

// The full list lives in demo/features.js, which is also written into index.html for search engines.
function Features() {
  return (
    <section className="features wrap" id="features" aria-labelledby="features-title">
      <h2 id="features-title">What&rsquo;s inside</h2>
      <p className="section-lede">Everything you can do from the toolbar, and what you get as a developer.</p>
      <div className="feature-grid">
        {FEATURE_GROUPS.map((group) => (
          <div className="feature-group" key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.text}>{item.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const DETAILS = [
  ['Size', 'About 80 KB gzipped, React not included. Each interface language adds about 3 KB, and only if you import it.'],
  ['Dependencies', 'highlight.js for code colours, nothing else at runtime. Your own React is used, so there is no second copy.'],
  ['Works with', 'React 18 and 19, the Next.js App Router, Vite and any bundler that reads ESM or CommonJS.'],
  ['Types', 'TypeScript definitions are included.'],
  ['Output', 'HTML. It is cleaned in the browser when content loads, on undo and redo, and when you paste.'],
  ['Tests', 'Unit tests and real-browser tests (Chromium) cover typing, uploads, forms, languages and accessibility.'],
  ['License', 'MIT. Free for personal and commercial use.'],
];

export default function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <>
      <a className="skip" href="#demo">Skip to the demo</a>

      <header className="top wrap">
        <a className="brand" href={import.meta.env.BASE_URL}>
          <Logo />
          react-easy-editor
        </a>
        <nav className="nav" aria-label="Project links">
          <a href="#features">Features</a>
          <a href={REPO}>GitHub</a>
          <a href={NPM}>npm</a>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </nav>
      </header>

      <main>
        <section className="hero wrap">
          <h1>Rich text editing for React, in one component.</h1>
          <p className="lede">
            Add <code>&lt;Editor /&gt;</code> and your users get a full toolbar, tables, code blocks, image upload, Markdown shortcuts and dark mode. Nothing to configure, and free under the MIT license.
          </p>
          <div className="install-row">
            <div className="install">
              <code>npm install react-easy-editor</code>
              <CopyButton text="npm install react-easy-editor" className="install-copy" />
            </div>
            <DownloadStat />
          </div>
        </section>

        <Playground theme={theme} />

        <Features />

        <section className="use wrap" aria-labelledby="use-title">
          <h2 id="use-title">Use it</h2>
          <p className="section-lede">
            Install it, render <code>&lt;Editor /&gt;</code> and save what <code>onChange</code> gives you. Show saved content to readers with <code>&lt;ContentViewer /&gt;</code>. The editor adds its own styles when it mounts; on server-rendered pages, import <code>react-easy-editor/style.css</code> once.
          </p>
          <div className="use-code">
            <Code files={USE_FILES} theme={theme} />
          </div>
        </section>

        <section className="details wrap" aria-labelledby="details-title">
          <h2 id="details-title">Details</h2>
          <dl>
            {DETAILS.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="foot wrap">
        <span>MIT licensed. Made by Akash Negi.</span>
        <span className="foot-links">
          <a href={REPO}>GitHub</a>
          <a href={NPM}>npm</a>
          <a href={`${REPO}/blob/main/CHANGELOG.md`}>Changelog</a>
          <a href={`${REPO}/issues`}>Report a bug</a>
        </span>
      </footer>
    </>
  );
}
