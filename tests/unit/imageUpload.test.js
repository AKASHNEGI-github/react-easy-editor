import { describe, it, expect } from 'vitest';
import { normalizeUploadResult, formatBytes, isImageFile, hasFiles, DEFAULT_MAX_IMAGE_SIZE } from '../../src/core/imageUpload';

describe('normalizeUploadResult', () => {
  it('accepts a URL string or { url, alt }', () => {
    expect(normalizeUploadResult('https://cdn.test/a.png')).toEqual({ url: 'https://cdn.test/a.png', alt: undefined });
    expect(normalizeUploadResult({ url: '/u/a.png', alt: 'A cat' })).toEqual({ url: '/u/a.png', alt: 'A cat' });
  });

  it.each([undefined, null, 42, {}, { url: '' }, { url: 5 }, []])('rejects %j', (bad) => {
    expect(() => normalizeUploadResult(bad)).toThrow(/URL/);
  });

  it('refuses addresses that could run script', () => {
    expect(() => normalizeUploadResult('javascript:alert(1)')).toThrow(/not allowed/);
    expect(() => normalizeUploadResult({ url: 'data:text/html;base64,AAAA' })).toThrow(/not allowed/);
  });
});

describe('helpers', () => {
  it('formatBytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('isImageFile', () => {
    expect(isImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isImageFile(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).toBe(true);
    expect(isImageFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe(false);
    expect(isImageFile(null)).toBe(false);
  });

  it('hasFiles looks at the drag payload type, not its contents', () => {
    expect(hasFiles({ types: ['Files'] })).toBe(true);
    expect(hasFiles({ types: ['text/plain', 'text/html'] })).toBe(false);
    expect(hasFiles(null)).toBe(false);
  });

  it('defaults to a 5 MB limit', () => {
    expect(DEFAULT_MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
  });
});
