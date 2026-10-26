import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryManager } from '../../src/core/HistoryManager';

function make(limit = 100) {
  const state = { html: '<p>a</p>', changes: 0 };
  const history = new HistoryManager({
    getHTML: () => state.html,
    setHTML: (h) => { state.html = h; },
    onChange: () => { state.changes += 1; },
    limit,
    debounceMs: 50,
  });
  return { state, history };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('HistoryManager', () => {
  it('records distinct states and undoes / redoes them', () => {
    const { state, history } = make();
    history.snapshotNow();
    state.html = '<p>ab</p>'; history.snapshotNow();
    state.html = '<p>abc</p>'; history.snapshotNow();
    expect(history.canUndo()).toBe(true);
    history.undo();
    expect(state.html).toBe('<p>ab</p>');
    history.undo();
    expect(state.html).toBe('<p>a</p>');
    expect(history.canUndo()).toBe(false);
    history.redo();
    expect(state.html).toBe('<p>ab</p>');
  });

  it('ignores a snapshot identical to the last one', () => {
    const { history } = make();
    history.snapshotNow();
    history.snapshotNow();
    expect(history.canUndo()).toBe(false);
  });

  it('debounces rapid snapshots into one, and undo flushes a pending one first', () => {
    const { state, history } = make();
    history.snapshotNow();
    state.html = '<p>x</p>'; history.snapshot();
    state.html = '<p>xy</p>'; history.snapshot();
    vi.advanceTimersByTime(60);
    state.html = '<p>xyz</p>'; history.snapshot(); // still pending
    history.undo(); // must save "xyz" first, then step back to "xy"
    expect(state.html).toBe('<p>xy</p>');
    history.redo();
    expect(state.html).toBe('<p>xyz</p>');
  });

  it('a new edit after an undo discards the redo branch', () => {
    const { state, history } = make();
    history.snapshotNow();
    state.html = '<p>b</p>'; history.snapshotNow();
    history.undo();
    state.html = '<p>c</p>'; history.snapshotNow();
    expect(history.canRedo()).toBe(false);
  });

  it('keeps at most `limit` states', () => {
    const { state, history } = make(3);
    history.snapshotNow();
    for (const h of ['1', '2', '3', '4', '5']) { state.html = h; history.snapshotNow(); }
    let steps = 0;
    while (history.canUndo()) { history.undo(); steps += 1; }
    expect(steps).toBe(2);
  });

  it('reset() makes the current content the only baseline', () => {
    const { state, history } = make();
    history.snapshotNow();
    state.html = '<p>b</p>'; history.snapshotNow();
    state.html = '<p>new document</p>';
    history.reset();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    state.html = '<p>new document!</p>'; history.snapshotNow();
    history.undo();
    expect(state.html).toBe('<p>new document</p>');
  });

  it('reset() drops a pending debounced snapshot', () => {
    const { state, history } = make();
    history.snapshotNow();
    state.html = '<p>pending</p>'; history.snapshot();
    history.reset();
    vi.advanceTimersByTime(500);
    expect(history.canUndo()).toBe(false);
  });
});
