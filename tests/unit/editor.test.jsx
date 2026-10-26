import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Editor } from '../../src/index.js';

// jsdom has no layout and no execCommand, so these tests cover wiring and rendering. Real editing
// behaviour (typing, selection, drag-drop, ...) is covered in tests/e2e in an actual browser.

const content = (container) => container.querySelector('.jc-content');

describe('<Editor> rendering and props', () => {
  it('renders a toolbar and an editable area', () => {
    const { container } = render(<Editor />);
    expect(container.querySelector('.jc-toolbar')).toBeTruthy();
    expect(content(container).getAttribute('contenteditable')).toBe('true');
  });

  it('shows initialValue, sanitized', () => {
    const { container } = render(<Editor initialValue={'<p>Hi</p><script>alert(1)</script>'} />);
    expect(content(container).innerHTML).toBe('<p>Hi</p>');
  });

  it('value works as the starting content too', () => {
    const { container } = render(<Editor value="<p>from value</p>" onChange={() => {}} />);
    expect(content(container).innerHTML).toBe('<p>from value</p>');
  });

  it('applies dir, lang, id, ariaLabel and spellCheck to the editable area', () => {
    const { container } = render(<Editor dir="rtl" lang="ar" id="body" ariaLabel="Body text" spellCheck={false} />);
    const el = content(container);
    expect(el.getAttribute('dir')).toBe('rtl');
    expect(el.getAttribute('lang')).toBe('ar');
    expect(el.id).toBe('body');
    expect(el.getAttribute('aria-label')).toBe('Body text');
    expect(el.getAttribute('spellcheck')).toBe('false');
  });

  it('is read-only with readOnly', () => {
    const { container } = render(<Editor readOnly />);
    expect(content(container).getAttribute('contenteditable')).toBe('false');
  });

  it('adds a hidden input only when `name` is given', () => {
    const { container, rerender } = render(<Editor initialValue="<p>x</p>" />);
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
    rerender(<Editor initialValue="<p>x</p>" name="body" />);
    const input = container.querySelector('input[type="hidden"][name="body"]');
    expect(input).toBeTruthy();
    expect(input.value).toBe('<p>x</p>');
  });

  it('translates the interface', () => {
    render(<Editor translations={{ 'Bold (Ctrl+B)': 'Negrita (Ctrl+B)', 'Rich text content': 'Contenido' }} />);
    expect(screen.getByLabelText('Negrita (Ctrl+B)')).toBeTruthy();
    expect(screen.getByLabelText('Contenido')).toBeTruthy();
    expect(screen.queryByLabelText('Bold (Ctrl+B)')).toBeNull();
  });

  it('shows the maxLength counter', () => {
    const { container } = render(<Editor maxLength={50} initialValue="<p>hello</p>" />);
    expect(container.querySelector('.jc-statusbar-counts').textContent).toMatch(/5 \/ 50 characters/);
  });
});

describe('<Editor> ref handle', () => {
  it('exposes the documented methods and they work', () => {
    const ref = createRef();
    render(<Editor ref={ref} initialValue="<p>Hello <b>world</b></p>" />);
    const h = ref.current;
    for (const m of ['getHTML', 'setHTML', 'getText', 'isEmpty', 'clear', 'focus', 'blur', 'insertHTML', 'undo', 'redo', 'getElement', 'getEditor']) {
      expect(typeof h[m], m).toBe('function');
    }
    expect(h.getHTML()).toBe('<p>Hello <b>world</b></p>');
    expect(h.getText()).toBe('Hello world');
    expect(h.isEmpty()).toBe(false);
    expect(h.getElement().classList.contains('jc-content')).toBe(true);
  });

  it('setHTML sanitizes, replaces the content and calls onChange once', () => {
    const ref = createRef();
    const onChange = vi.fn();
    render(<Editor ref={ref} onChange={onChange} />);
    ref.current.setHTML('<p onclick="x()">New</p>');
    expect(ref.current.getHTML()).toBe('<p>New</p>');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p>New</p>');
  });

  it('clear() empties it', () => {
    const ref = createRef();
    render(<Editor ref={ref} initialValue="<p>x</p>" />);
    ref.current.clear();
    expect(ref.current.isEmpty()).toBe(true);
  });

  it('the handle keeps working after the host re-renders (it never goes stale)', () => {
    const ref = createRef();
    const { rerender } = render(<Editor ref={ref} initialValue="<p>a</p>" onChange={() => {}} />);
    const first = ref.current;
    rerender(<Editor ref={ref} initialValue="<p>a</p>" onChange={() => {}} />);
    expect(ref.current).toBe(first);
    first.setHTML('<p>b</p>');
    expect(ref.current.getHTML()).toBe('<p>b</p>');
  });
});

describe('<Editor> controlled value', () => {
  it('applies a changed value, without calling onChange for it', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<Editor value="<p>one</p>" onChange={onChange} />);
    rerender(<Editor value="<p>two</p>" onChange={onChange} />);
    expect(content(container).innerHTML).toBe('<p>two</p>');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores the value it just reported (the normal controlled loop)', () => {
    const ref = createRef();
    let latest = '';
    const onChange = (h) => { latest = h; };
    const { container, rerender } = render(<Editor ref={ref} value="<p>a</p>" onChange={onChange} />);
    ref.current.setHTML('<p>typed</p>'); // editor reports "<p>typed</p>"
    expect(latest).toBe('<p>typed</p>');
    const node = content(container).firstChild;
    rerender(<Editor ref={ref} value={latest} onChange={onChange} />); // host echoes it back
    expect(content(container).firstChild).toBe(node); // same DOM node: nothing was rebuilt
  });

  it('sanitizes a value that arrives later', () => {
    const { container, rerender } = render(<Editor value="<p>a</p>" onChange={() => {}} />);
    rerender(<Editor value={'<p>b</p><script>1</script>'} onChange={() => {}} />);
    expect(content(container).innerHTML).toBe('<p>b</p>');
  });

  it('always calls the LATEST onChange, even though the editor itself did not re-render', () => {
    const ref = createRef();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Editor ref={ref} onChange={first} />);
    rerender(<Editor ref={ref} onChange={second} />);
    ref.current.setHTML('<p>x</p>');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
