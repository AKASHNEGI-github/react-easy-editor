import { describe, it, expect } from 'vitest';
import { isSafeUrl, isSafeImageSrc, normalizeUrlForSchemeCheck } from '../../src/core/domUtils';

describe('isSafeUrl', () => {
  it.each(['https://a.test', 'http://a.test/x?y=1#z', 'mailto:a@b.test', 'tel:+123', '/relative/path', '#anchor', '?q=1', 'page.html'])(
    'accepts %s', (u) => expect(isSafeUrl(u)).toBe(true));

  it.each(['javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', 'vbscript:x', 'data:text/html,<script>1</script>', 'file:///etc/passwd', '', '   '])(
    'rejects %j', (u) => expect(isSafeUrl(u)).toBe(false));
});

describe('isSafeImageSrc', () => {
  it('accepts web URLs and embedded images', () => {
    expect(isSafeImageSrc('https://cdn.test/a.png')).toBe(true);
    expect(isSafeImageSrc('data:image/png;base64,AAAA')).toBe(true);
    expect(isSafeImageSrc('/uploads/a.png')).toBe(true);
  });
  it('rejects scripts and non-image data URLs', () => {
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
    expect(isSafeImageSrc('data:text/html;base64,AAAA')).toBe(false);
    expect(isSafeImageSrc('')).toBe(false);
  });
});

describe('normalizeUrlForSchemeCheck', () => {
  it('strips what browsers strip before reading the scheme', () => {
    expect(normalizeUrlForSchemeCheck('  java\tscr\nipt:x ')).toBe('javascript:x');
  });
});
