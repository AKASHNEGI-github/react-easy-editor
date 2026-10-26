// Regenerates the images the README and the demo site use, from the real built demo:
//   docs/screenshot-light.png, docs/screenshot-dark.png   the editor, for the README
//   docs/social-preview.png                                1280x640, upload under GitHub > Settings > Social preview
//   public/og.png                                          1200x630, the link preview for the demo site
//
// Needs Chrome or Chromium (set CHROME_PATH if it is not in a usual place):  npm run screenshots
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { launch } from '../tests/e2e/browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/`;

console.log('Building the demo site...');
const built = spawnSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'warn'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE: '/' },
});
if (built.status !== 0) process.exit(built.status ?? 1);

mkdirSync(join(root, 'docs'), { recursive: true });
const server = await preview({ root, preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });
const browser = await launch();

async function open({ theme, width, height, scale = 1 }) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((value) => {
    try { localStorage.setItem('ree-theme', value); } catch { /* storage blocked */ }
  }, theme);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

try {
  for (const theme of ['light', 'dark']) {
    const page = await open({ theme, width: 1200, height: 900, scale: 2 });
    // A taller editor than the page shows, so the screenshot includes the table, tip and code block.
    await page.addStyleTag({ content: '.sheet .jc-root { height: 780px !important; }' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await (await page.$('.sheet')).screenshot({ path: join(root, `docs/screenshot-${theme}.png`) });
    console.log(`docs/screenshot-${theme}.png`);
    await page.close();
  }

  for (const [path, width, height] of [['docs/social-preview.png', 1280, 640], ['public/og.png', 1200, 630]]) {
    const page = await open({ theme: 'light', width, height });
    // For link previews the editor should peek up right under the install command.
    await page.addStyleTag({ content: '.tabbar, .hint { display: none !important; } .playground { padding-top: 40px !important; }' });
    await page.screenshot({ path: join(root, path), clip: { x: 0, y: 0, width, height } });
    console.log(path);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
