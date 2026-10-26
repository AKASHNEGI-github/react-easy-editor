// Finds a Chrome/Chromium to drive. Locally set CHROME_PATH; GitHub's ubuntu runners already
// have google-chrome. CHROME_EXTRA_ARGS (space separated) is for unusual environments.
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

export function findChrome() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error('No Chrome/Chromium found. Install Chrome or set CHROME_PATH to its executable.');
  }
  return found;
}

export async function launch() {
  const extra = (process.env.CHROME_EXTRA_ARGS || '').split(' ').filter(Boolean);
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: process.env.CHROME_HEADLESS || true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', ...extra],
    defaultViewport: { width: 1100, height: 800, deviceScaleFactor: 1 },
  });
}
