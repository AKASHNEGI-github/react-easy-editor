// Dev server + demo-site build (`npm run dev`, `npm run build:demo`).
// The publishable library is built by vite.lib.config.js.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import jcScope from './build/postcss-jc-scope.mjs'
import { FEATURE_GROUPS } from './src/demo/features.js'

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Writes the feature list into index.html as plain HTML, so search engines and people without
// JavaScript see it. React replaces it on load with the same markup (see Features in src/App.jsx).
// The list itself lives in src/demo/features.js.
function staticFeatures() {
  const groups = FEATURE_GROUPS.map(
    (group) =>
      `<div class="feature-group"><h3>${escapeHtml(group.title)}</h3><ul>${group.items
        .map((item) => `<li>${escapeHtml(item.text)}</li>`)
        .join('')}</ul></div>`,
  ).join('')
  const html =
    '<section class="features wrap" id="features"><h2>What&rsquo;s inside</h2>' +
    '<p class="section-lede">Everything you can do from the toolbar, and what you get as a developer.</p>' +
    `<div class="feature-grid">${groups}</div></section>`
  return { name: 'static-features', transformIndexHtml: (page) => page.replace('<!--features-->', html) }
}

export default defineConfig({
  plugins: [react(), staticFeatures()],
  // The demo is served from the root of its own address on Netlify. If you host it under a sub-path
  // instead (a GitHub Pages project site, say), build with VITE_BASE=/<path>/.
  base: process.env.VITE_BASE || '/',
  // The demo site gets its own output folder. `dist/` belongs to the library build (what gets
  // published); building the demo into it would wipe the package files.
  build: { outDir: 'demo-dist' },
  // Same CSS scoping as the library build, so the demo behaves like the package.
  css: { postcss: { plugins: [jcScope()] } },
})
