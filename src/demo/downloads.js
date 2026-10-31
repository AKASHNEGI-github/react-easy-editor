// The download total shown on the demo page: how many times the package has been installed from npm.
//
// It adds up this package and its earlier name, because they are the same project (the earlier name
// was renamed to this one). Numbers come straight from npm's public download-counts API, fetched in
// the visitor's browser and remembered for a few hours so the page does not ask on every visit. If
// anything goes wrong the total is simply not shown; nothing here ever makes a number up.

export const PACKAGES = ['react-easy-editor', 'react-easy-text-editor'];
// The day the earlier name was first published. Counting starts here.
export const SINCE = '2026-10-06';

const API = 'https://api.npmjs.org/downloads/point';
const DAY = 24 * 60 * 60 * 1000;
// npm limits how long a range one request may cover, so a long history is asked for in pieces.
const MAX_DAYS = 365;
const CACHE_KEY = 'ree-downloads';
const CACHE_MS = 6 * 60 * 60 * 1000;

const isoDay = (date) => date.toISOString().slice(0, 10);

// Merely reading localStorage throws in some browsers when storage is blocked.
function safeStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Inclusive [start, end] date pairs (YYYY-MM-DD) that cover since..until in pieces of at most maxDays. */
export function windows(since, until, maxDays = MAX_DAYS) {
  const pieces = [];
  let start = new Date(`${since}T00:00:00Z`);
  const last = new Date(`${until}T00:00:00Z`);
  while (start <= last) {
    const end = new Date(Math.min(start.getTime() + (maxDays - 1) * DAY, last.getTime()));
    pieces.push([isoDay(start), isoDay(end)]);
    start = new Date(end.getTime() + DAY);
  }
  return pieces;
}

export function formatCount(total) {
  return new Intl.NumberFormat('en-US').format(total);
}

function readCache(storage, now) {
  try {
    const saved = JSON.parse(storage.getItem(CACHE_KEY));
    if (saved && Number.isFinite(saved.total)) return { total: saved.total, fresh: now - saved.at < CACHE_MS };
  } catch {
    // no storage, or it holds something else: treat as empty
  }
  return null;
}

/** The last total we saved, if it is recent enough to show without asking again. For the first paint. */
export function cachedTotal(storage = safeStorage(), now = Date.now()) {
  const saved = readCache(storage ?? {}, now);
  return saved && saved.fresh ? saved.total : null;
}

/**
 * Adds up downloads since SINCE for every package. Returns the total, or null when it cannot be
 * worked out honestly (a request failed, or there is nothing to show yet).
 */
export async function fetchTotalDownloads({
  fetchImpl = globalThis.fetch,
  storage = safeStorage(),
  now = Date.now(),
  packages = PACKAGES,
  since = SINCE,
} = {}) {
  const cached = readCache(storage ?? {}, now);
  if (cached && cached.fresh) return cached.total;

  try {
    // Today's counts are not in yet, so count up to yesterday.
    // const until = isoDay(new Date(now - DAY));

    // Today's counts
    const until = isoDay(new Date(now - DAY));
    const pieces = windows(since, until);
    if (!pieces.length) return null;

    const counts = await Promise.all(
      packages.flatMap((name) =>
        pieces.map(async ([start, end]) => {
          const response = await fetchImpl(`${API}/${start}:${end}/${name}`);
          // npm answers 404 for a package it has no numbers for yet: that really is zero downloads.
          if (response.status === 404) return 0;
          if (!response.ok) throw new Error(`npm responded ${response.status}`);
          const body = await response.json();
          if (!Number.isFinite(body.downloads) || body.downloads < 0) throw new Error('unexpected answer');
          return body.downloads;
        }),
      ),
    );
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total <= 0) return null;

    try {
      storage?.setItem(CACHE_KEY, JSON.stringify({ at: now, total }));
    } catch {
      // storage is full or blocked: fine, we just ask again next time
    }
    return total;
  } catch {
    // Offline, blocked, rate limited, or npm changed its answer. An older number is better than none.
    return cached ? cached.total : null;
  }
}
