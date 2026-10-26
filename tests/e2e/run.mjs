// Real-browser tests: `npm run test:e2e [filter]`.
// Starts a Vite dev server for tests/e2e/harness, drives Chrome with puppeteer-core, prints a
// result per test. Needs a Chrome/Chromium (see browser.mjs).
import path from 'node:path';
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { launch } from './browser.mjs';
import { tests, makeHelpers, assert } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const filter = process.argv[2];

const server = await createServer({
  configFile: path.join(repo, 'vite.config.js'),
  root: path.join(here, 'harness'),
  server: { host: '127.0.0.1', port: 0, fs: { allow: [repo] } },
  logLevel: 'error',
  clearScreen: false,
});
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');

const specsDir = path.join(here, 'specs');
for (const file of readdirSync(specsDir).filter((f) => f.endsWith('.mjs')).sort()) {
  await import(pathToFileURL(path.join(specsDir, file)).href);
}

const browser = await launch();
let passed = 0;
const failures = [];
const selected = tests.filter((t) => !filter || t.name.toLowerCase().includes(filter.toLowerCase()));

for (const t of selected) {
  const page = await browser.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !t.options.allowConsoleErrors) problems.push(`console error: ${m.text()}`);
  });
  const started = Date.now();
  try {
    await t.fn({ ...makeHelpers(page, base), base, assert });
    if (problems.length) throw new Error(problems.join('\n'));
    passed += 1;
    console.log(`  \u2713 ${t.name} (${Date.now() - started} ms)`);
  } catch (err) {
    failures.push({ name: t.name, err });
    console.log(`  \u2717 ${t.name}\n      ${String(err.message).split('\n').join('\n      ')}`);
  } finally {
    await page.close();
  }
}

await browser.close();
await server.close();
console.log(`\n${passed}/${selected.length} passed${failures.length ? `, ${failures.length} FAILED` : ''}`);
process.exit(failures.length ? 1 : 0);
