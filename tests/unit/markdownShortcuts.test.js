import { describe, it, expect } from 'vitest';
import { matchBlockShortcut, matchDividerShortcut, matchInlineShortcut } from '../../src/core/markdownShortcuts';

describe('matchBlockShortcut', () => {
  it.each([
    ['#', { type: 'heading', level: 1 }],
    ['##', { type: 'heading', level: 2 }],
    ['######', { type: 'heading', level: 6 }],
    ['-', { type: 'ul' }],
    ['*', { type: 'ul' }],
    ['+', { type: 'ul' }],
    ['1.', { type: 'ol' }],
    ['12)', { type: 'ol' }],
    ['>', { type: 'quote' }],
  ])('%s', (text, expected) => expect(matchBlockShortcut(text)).toEqual(expected));

  it.each(['', '#######', 'a#', '# ', '-a', '1', '1.5', '>>', ' #', 'x.'])('ignores %j', (text) => {
    expect(matchBlockShortcut(text)).toBeNull();
  });
});

describe('matchDividerShortcut', () => {
  it.each(['---', '-----', '***', '___'])('accepts %s', (t) => expect(matchDividerShortcut(t)).toBe(true));
  it.each(['--', '-*-', '--- ', 'a---', '- - -'])('rejects %j', (t) => expect(matchDividerShortcut(t)).toBe(false));
});

describe('matchInlineShortcut', () => {
  it('finds each kind and reports where the opener starts', () => {
    expect(matchInlineShortcut('**bold**')).toEqual({ type: 'bold', start: 0, content: 'bold' });
    expect(matchInlineShortcut('__bold__')).toEqual({ type: 'bold', start: 0, content: 'bold' });
    expect(matchInlineShortcut('*it*')).toEqual({ type: 'italic', start: 0, content: 'it' });
    expect(matchInlineShortcut('_it_')).toEqual({ type: 'italic', start: 0, content: 'it' });
    expect(matchInlineShortcut('~~gone~~')).toEqual({ type: 'strike', start: 0, content: 'gone' });
    expect(matchInlineShortcut('`x`')).toEqual({ type: 'code', start: 0, content: 'x' });
  });

  it('only looks at the end of the text, and keeps the text before it', () => {
    expect(matchInlineShortcut('say **hi there**')).toEqual({ type: 'bold', start: 4, content: 'hi there' });
    expect(matchInlineShortcut('a *b* c *d*')).toEqual({ type: 'italic', start: 8, content: 'd' });
  });

  it('handles one-character content', () => {
    expect(matchInlineShortcut('**a**')?.content).toBe('a');
    expect(matchInlineShortcut('*a*')?.content).toBe('a');
  });

  it.each([
    ['my_var_name', 'snake_case'],
    ['2*3*4', 'arithmetic'],
    ['**not closed', 'unclosed'],
    ['** spaced **', 'padded with spaces'],
    ['* spaced *', 'padded with spaces'],
    ['~~ spaced ~~', 'padded with spaces'],
    ['plain text', 'nothing to match'],
    ['**mixed__', 'closer differs from opener'],
    ['``', 'empty code'],
    ['', 'empty'],
  ])('ignores %j (%s)', (text) => expect(matchInlineShortcut(text)).toBeNull());

  it('prefers bold over italic for double marks', () => {
    expect(matchInlineShortcut('**x**')?.type).toBe('bold');
  });
});
