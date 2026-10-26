import { describe, it, expect } from 'vitest';
import hljs from 'highlight.js/lib/core';
import { highlightCode, LANGUAGES } from '../../src/core/highlight';

describe('highlightCode', () => {
  it('adds token spans for a known language', () => {
    const out = highlightCode('const answer = 42;', 'javascript');
    expect(out).toContain('hljs-keyword');
    expect(out).toContain('hljs-number');
  });

  it('every language the picker offers is actually registered', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(15);
    for (const { value } of LANGUAGES) expect(hljs.getLanguage(value), value).toBeTruthy();
  });

  it('an unknown language degrades to escaped plain text, never to a guess or raw HTML', () => {
    const out = highlightCode('<script>alert("x")</script> & more', 'klingon');
    expect(out).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more');
    expect(out).not.toContain('hljs');
  });

  it('escapes markup inside highlighted code too', () => {
    expect(highlightCode('<img src=x onerror=alert(1)>', 'xml')).not.toContain('<img');
  });

  it('plaintext adds nothing', () => {
    expect(highlightCode('a < b', 'plaintext')).toBe('a &lt; b');
  });
});
