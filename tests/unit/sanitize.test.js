import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../src/core/sanitize';

describe('sanitizeHtml', () => {
  it('passes empty input through', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(undefined)).toBe(undefined);
  });

  it('removes script elements', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>');
  });

  it('removes every on* handler but keeps the element', () => {
    const out = sanitizeHtml('<img src="https://x.test/a.png" onerror="alert(1)" onclick="x()" alt="a">');
    expect(out).not.toMatch(/onerror|onclick/i);
    expect(out).toMatch(/<img[^>]+src="https:\/\/x\.test\/a\.png"/);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)', // the browser strips the tab and still runs it
    '  javascript:alert(1)',
    'vbscript:msgbox(1)',
  ])('strips a dangerous href: %j', (href) => {
    const out = sanitizeHtml(`<a href="${href}">x</a>`);
    expect(out).not.toMatch(/href/i);
  });

  it('keeps ordinary links and the editor\u2019s own data attributes', () => {
    const out = sanitizeHtml('<a href="https://example.com/a?b=1" target="_blank">x</a><div data-language="js" contenteditable="false">y</div>');
    expect(out).toContain('href="https://example.com/a?b=1"');
    expect(out).toContain('data-language="js"');
    expect(out).toContain('contenteditable="false"');
  });

  it('only allows YouTube and Vimeo iframes', () => {
    expect(sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toContain('<iframe');
    expect(sanitizeHtml('<iframe src="https://player.vimeo.com/video/1"></iframe>')).toContain('<iframe');
    expect(sanitizeHtml('<iframe src="https://evil.example/x"></iframe>')).not.toContain('<iframe');
    expect(sanitizeHtml('<iframe src="https://www.youtube.com.evil.example/x"></iframe>')).not.toContain('<iframe');
    expect(sanitizeHtml('<iframe srcdoc="<script>1</script>"></iframe>')).not.toContain('<iframe');
  });

  it('is idempotent', () => {
    const once = sanitizeHtml('<p onclick="x()">a <b>b</b></p><script>1</script>');
    expect(sanitizeHtml(once)).toBe(once);
  });
});
