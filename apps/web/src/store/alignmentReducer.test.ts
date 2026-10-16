import { describe, it, expect } from 'vitest';
import {
  alignmentReducer,
  initialAlignmentState,
  type AlignmentState,
} from './alignmentReducer';
import type { LyricLine, AlignmentSegment } from '../types';

describe('alignmentReducer', () => {
  const sampleLines: LyricLine[] = [
    { id: '1', index: 0, text: 'First line of the song' },
    { id: '2', index: 1, text: 'Second line of the song' },
    { id: '3', index: 2, text: 'Third line of the song' },
  ];

  const sampleSegments: AlignmentSegment[] = [
    { line_id: '1', start_ms: 1000, end_ms: 3000 },
    { line_id: '2', start_ms: 3500, end_ms: 5500 },
  ];

  function getLoadedState(): AlignmentState {
    return alignmentReducer(initialAlignmentState, {
      type: 'INIT',
      payload: {
        lines: sampleLines,
        segments: sampleSegments,
        version: 1,
      },
    });
  }

  it('initializes state accurately', () => {
    const state = getLoadedState();
    expect(state.lines.length).toBe(3);
    expect(state.segments.length).toBe(2);
    expect(state.version).toBe(1);
    expect(state.history.past.length).toBe(0);
  });

  it('sets and updates segments with clamping', () => {
    let state = getLoadedState();

    // Add segment for line 3
    state = alignmentReducer(state, {
      type: 'SET_SEGMENT',
      payload: { line_id: '3', start_ms: 6000, end_ms: 8500, maxDurationMs: 10000 },
    });

    expect(state.segments.length).toBe(3);
    expect(state.segments[2]).toEqual({ line_id: '3', start_ms: 6000, end_ms: 8500 });

    // Update segment for line 1
    state = alignmentReducer(state, {
      type: 'SET_SEGMENT',
      payload: { line_id: '1', start_ms: 1200, end_ms: 3200, maxDurationMs: 10000 },
    });

    expect(state.segments.find((s) => s.line_id === '1')).toEqual({
      line_id: '1',
      start_ms: 1200,
      end_ms: 3200,
    });
  });

  it('supports full undo and redo cycles', () => {
    let state = getLoadedState();
    expect(state.segments.length).toBe(2);

    // Perform action
    state = alignmentReducer(state, {
      type: 'SET_SEGMENT',
      payload: { line_id: '3', start_ms: 6000, end_ms: 8000, maxDurationMs: 10000 },
    });
    expect(state.segments.length).toBe(3);
    expect(state.history.past.length).toBe(1);

    // Undo action
    state = alignmentReducer(state, { type: 'UNDO' });
    expect(state.segments.length).toBe(2);
    expect(state.history.past.length).toBe(0);
    expect(state.history.future.length).toBe(1);

    // Redo action
    state = alignmentReducer(state, { type: 'REDO' });
    expect(state.segments.length).toBe(3);
    expect(state.history.past.length).toBe(1);
    expect(state.history.future.length).toBe(0);
  });

  it('nudges multiple selected segments together', () => {
    let state = getLoadedState();

    // Select lines 1 and 2
    state = alignmentReducer(state, {
      type: 'SELECT_MULTIPLE',
      payload: { line_ids: ['1', '2'] },
    });

    // Nudge forward by 500ms
    state = alignmentReducer(state, {
      type: 'NUDGE_SELECTED',
      payload: { deltaMs: 500, maxDurationMs: 10000 },
    });

    expect(state.segments[0]).toEqual({ line_id: '1', start_ms: 1500, end_ms: 3500 });
    expect(state.segments[1]).toEqual({ line_id: '2', start_ms: 4000, end_ms: 6000 });
  });

  it('splits a segment into two adjacent segments', () => {
    let state = getLoadedState();

    state = alignmentReducer(state, {
      type: 'SPLIT_SEGMENT',
      payload: {
        line_id: '1',
        splitTextFirst: 'First line',
        splitTextSecond: 'of the song',
        splitTimeMs: 2000,
      },
    });

    expect(state.lines.length).toBe(4);
    expect(state.lines[0].text).toBe('First line');
    expect(state.lines[1].text).toBe('of the song');

    // Verify segments were split
    expect(state.segments[0].end_ms).toBe(2000);
    expect(state.segments[2].start_ms).toBe(2000);
    expect(state.segments[2].end_ms).toBe(3000);
  });

  it('merges two adjacent lines into one', () => {
    let state = getLoadedState();

    state = alignmentReducer(state, {
      type: 'MERGE_WITH_NEXT',
      payload: { line_id: '1' },
    });

    expect(state.lines.length).toBe(2);
    expect(state.lines[0].text).toBe('First line of the song Second line of the song');
    expect(state.segments.length).toBe(1);
    expect(state.segments[0]).toEqual({ line_id: '1', start_ms: 1000, end_ms: 5500 });
  });

  it('reorders lines and re-indexes properly', () => {
    let state = getLoadedState();

    // Move line index 0 to index 2
    state = alignmentReducer(state, {
      type: 'REORDER_LINES',
      payload: { sourceIndex: 0, targetIndex: 2 },
    });

    expect(state.lines[0].id).toBe('2');
    expect(state.lines[0].index).toBe(0);
    expect(state.lines[1].id).toBe('3');
    expect(state.lines[1].index).toBe(1);
    expect(state.lines[2].id).toBe('1');
    expect(state.lines[2].index).toBe(2);
  });

  it('adds a new lyric line and selects it', () => {
    let state = getLoadedState();
    expect(state.lines.length).toBe(3);

    state = alignmentReducer(state, {
      type: 'ADD_LINE',
      payload: { text: 'Fourth line added' },
    });

    expect(state.lines.length).toBe(4);
    expect(state.lines[3].text).toBe('Fourth line added');
    expect(state.lines[3].index).toBe(3);
    expect(state.selectedLineIds.has(state.lines[3].id)).toBe(true);
    expect(state.history.past.length).toBe(1);
  });

  it('interchanges two placed segments and supports undo', () => {
    let state = getLoadedState();
    // Segment 1 is [1000, 3000], Segment 2 is [3500, 5500]
    expect(state.segments[0].line_id).toBe('1');
    expect(state.segments[1].line_id).toBe('2');

    state = alignmentReducer(state, {
      type: 'INTERCHANGE_SEGMENTS',
      payload: { sourceLineId: '1', targetLineId: '2' },
    });

    const seg1 = state.segments.find((s) => s.line_id === '1')!;
    const seg2 = state.segments.find((s) => s.line_id === '2')!;

    // Swapped! Line 1 now has [3500, 5500], Line 2 has [1000, 3000]
    expect(seg1.start_ms).toBe(3500);
    expect(seg1.end_ms).toBe(5500);
    expect(seg2.start_ms).toBe(1000);
    expect(seg2.end_ms).toBe(3000);

    // Undo restores original positions
    state = alignmentReducer(state, { type: 'UNDO' });
    const restoredSeg1 = state.segments.find((s) => s.line_id === '1')!;
    const restoredSeg2 = state.segments.find((s) => s.line_id === '2')!;
    expect(restoredSeg1.start_ms).toBe(1000);
    expect(restoredSeg1.end_ms).toBe(3000);
    expect(restoredSeg2.start_ms).toBe(3500);
    expect(restoredSeg2.end_ms).toBe(5500);
  });

  it('interchanges a placed segment with an unplaced line', () => {
    let state = getLoadedState();
    // Line 3 is currently unplaced
    expect(state.segments.some((s) => s.line_id === '3')).toBe(false);

    state = alignmentReducer(state, {
      type: 'INTERCHANGE_SEGMENTS',
      payload: { sourceLineId: '3', targetLineId: '1' },
    });

    // Line 3 takes Line 1's segment [1000, 3000], Line 1 becomes unplaced
    expect(state.segments.some((s) => s.line_id === '1')).toBe(false);
    const seg3 = state.segments.find((s) => s.line_id === '3')!;
    expect(seg3.start_ms).toBe(1000);
    expect(seg3.end_ms).toBe(3000);
  });
});

