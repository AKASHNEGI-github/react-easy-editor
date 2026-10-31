import { afterEach, describe, it, expect, vi } from 'vitest';
import { cachedTotal, fetchTotalDownloads, formatCount, windows } from '../../src/demo/downloads';

afterEach(() => localStorage.clear()); // the default storage is the real (jsdom) one

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-30T12:00:00Z');

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}
const ok = (downloads) => ({ ok: true, status: 200, json: async () => ({ downloads }) });
const status = (code) => ({ ok: false, status: code, json: async () => ({ error: 'x' }) });

describe('windows: the date ranges npm is asked for', () => {
  it('is one range when the history is short', () => {
    expect(windows('2026-10-06', '2026-10-29')).toEqual([['2026-10-06', '2026-10-29']]);
    expect(windows('2026-10-29', '2026-10-29')).toEqual([['2026-10-29', '2026-10-29']]);
  });

  it('is nothing when the start is after the end', () => {
    expect(windows('2026-10-30', '2026-10-29')).toEqual([]);
  });

  it('splits a long history into contiguous pieces of at most a year, with no gap and no overlap', () => {
    const pieces = windows('2026-10-06', '2028-06-01');
    expect(pieces.length).toBe(2);
    expect(pieces[0][0]).toBe('2026-10-06');
    expect(pieces.at(-1)[1]).toBe('2028-06-01');
    for (const [start, end] of pieces) expect((Date.parse(end) - Date.parse(start)) / DAY).toBeLessThan(365);
    for (let i = 1; i < pieces.length; i += 1) expect(Date.parse(pieces[i][0]) - Date.parse(pieces[i - 1][1])).toBe(DAY);
  });
});

describe('fetchTotalDownloads', () => {
  it('adds up every package, asking for the right address', async () => {
    const calls = [];
    const fetchImpl = vi.fn(async (url) => { calls.push(url); return ok(url.endsWith('/react-easy-editor') ? 40 : 2); });
    const total = await fetchTotalDownloads({ fetchImpl, storage: memoryStorage(), now: NOW });
    expect(total).toBe(42);
    expect(calls).toEqual([
      'https://api.npmjs.org/downloads/point/2026-10-06:2026-10-29/react-easy-editor',
      'https://api.npmjs.org/downloads/point/2026-10-06:2026-10-29/react-easy-text-editor',
    ]);
  });

  it('counts a package npm has no numbers for (404) as zero', async () => {
    const fetchImpl = async (url) => (url.endsWith('/react-easy-editor') ? status(404) : ok(7));
    expect(await fetchTotalDownloads({ fetchImpl, storage: memoryStorage(), now: NOW })).toBe(7);
  });

  it('shows nothing when the total is zero', async () => {
    expect(await fetchTotalDownloads({ fetchImpl: async () => ok(0), storage: memoryStorage(), now: NOW })).toBeNull();
  });

  it('shows nothing, rather than a wrong number, when any request fails', async () => {
    for (const fetchImpl of [
      async (url) => (url.endsWith('/react-easy-editor') ? ok(40) : status(500)),
      async (url) => (url.endsWith('/react-easy-editor') ? ok(40) : status(429)),
      async () => { throw new TypeError('network'); },
      async () => ({ ok: true, status: 200, json: async () => ({ downloads: 'lots' }) }),
      async () => ({ ok: true, status: 200, json: async () => ({ downloads: -5 }) }),
      async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }),
    ]) {
      expect(await fetchTotalDownloads({ fetchImpl, storage: memoryStorage(), now: NOW })).toBeNull();
    }
  });

  it('does not ask again while the saved number is fresh', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () => ok(10));
    expect(await fetchTotalDownloads({ fetchImpl, storage, now: NOW })).toBe(20);
    expect(await fetchTotalDownloads({ fetchImpl, storage, now: NOW + 60 * 60 * 1000 })).toBe(20);
    expect(fetchImpl).toHaveBeenCalledTimes(2); // two packages, one round of questions
  });

  it('asks again after the saved number goes stale, and falls back to it if asking fails', async () => {
    const storage = memoryStorage();
    await fetchTotalDownloads({ fetchImpl: async () => ok(10), storage, now: NOW });
    const later = NOW + 7 * 60 * 60 * 1000;
    expect(await fetchTotalDownloads({ fetchImpl: async () => ok(15), storage, now: later })).toBe(30);
    expect(await fetchTotalDownloads({ fetchImpl: async () => { throw new TypeError('offline'); }, storage, now: later + 7 * 60 * 60 * 1000 })).toBe(30);
  });

  it('survives storage that is missing, broken or full', async () => {
    const fetchImpl = async () => ok(3);
    expect(await fetchTotalDownloads({ fetchImpl, storage: null, now: NOW })).toBe(6);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(await fetchTotalDownloads({ fetchImpl, storage: broken, now: NOW })).toBe(6);
    expect(await fetchTotalDownloads({ fetchImpl, storage: memoryStorage({ 'ree-downloads': 'not json' }), now: NOW })).toBe(6);
  });
});

describe('cachedTotal and formatCount', () => {
  it('returns a recent saved total for the first paint, and nothing when it is old or absent', () => {
    expect(cachedTotal(memoryStorage({ 'ree-downloads': JSON.stringify({ at: NOW - 1000, total: 99 }) }), NOW)).toBe(99);
    expect(cachedTotal(memoryStorage({ 'ree-downloads': JSON.stringify({ at: NOW - 24 * 60 * 60 * 1000, total: 99 }) }), NOW)).toBeNull();
    expect(cachedTotal(memoryStorage(), NOW)).toBeNull();
    expect(cachedTotal(null, NOW)).toBeNull();
  });

  it('writes numbers with thousands separators', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(42)).toBe('42');
  });
});
