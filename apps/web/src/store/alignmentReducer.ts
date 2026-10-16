import type { LyricLine, AlignmentSegment } from '../types';
import { clampSegment, nudgeSegments } from '../utils/time';

export interface StateSnapshot {
  lines: LyricLine[];
  segments: AlignmentSegment[];
}

export interface AlignmentState {
  lines: LyricLine[];
  segments: AlignmentSegment[];
  version: number;
  selectedLineIds: Set<string>;
  history: {
    past: StateSnapshot[];
    future: StateSnapshot[];
  };
}

export type AlignmentAction =
  | { type: 'INIT'; payload: { lines: LyricLine[]; segments: AlignmentSegment[]; version: number } }
  | { type: 'SET_LINES'; payload: { lines: LyricLine[] } }
  | { type: 'ADD_LINE'; payload: { text?: string } }
  | { type: 'REORDER_LINES'; payload: { sourceIndex: number; targetIndex: number } }
  | { type: 'SET_SEGMENT'; payload: { line_id: string; start_ms: number; end_ms: number; maxDurationMs: number } }
  | { type: 'DELETE_SEGMENT'; payload: { line_id: string } }
  | { type: 'NUDGE_SELECTED'; payload: { deltaMs: number; maxDurationMs: number } }
  | { type: 'INTERCHANGE_SEGMENTS'; payload: { sourceLineId: string; targetLineId: string } }
  | { type: 'SPLIT_SEGMENT'; payload: { line_id: string; splitTextFirst: string; splitTextSecond: string; splitTimeMs: number } }
  | { type: 'MERGE_WITH_NEXT'; payload: { line_id: string } }
  | { type: 'SELECT_LINE'; payload: { line_id: string; isMulti: boolean } }
  | { type: 'SELECT_MULTIPLE'; payload: { line_ids: string[] } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SYNC_SERVER_VERSION'; payload: { version: number } }
  | { type: 'RECONCILE_CONFLICT'; payload: { lines: LyricLine[]; segments: AlignmentSegment[]; version: number } };

export const initialAlignmentState: AlignmentState = {
  lines: [],
  segments: [],
  version: 0,
  selectedLineIds: new Set<string>(),
  history: {
    past: [],
    future: [],
  },
};

/**
 * Pushes the current lines and segments onto the undo history stack.
 * Limits undo history to 50 snapshots to prevent memory leaks.
 */
function recordHistory(state: AlignmentState): { past: StateSnapshot[]; future: StateSnapshot[] } {
  const currentSnapshot: StateSnapshot = {
    lines: state.lines,
    segments: state.segments,
  };

  const newPast = [...state.history.past, currentSnapshot].slice(-50);
  return {
    past: newPast,
    future: [], // New user action clears redo future
  };
}

export function alignmentReducer(state: AlignmentState, action: AlignmentAction): AlignmentState {
  switch (action.type) {
    case 'INIT': {
      return {
        ...state,
        lines: action.payload.lines,
        segments: action.payload.segments,
        version: action.payload.version,
        selectedLineIds: new Set<string>(),
        history: { past: [], future: [] },
      };
    }

    case 'SET_LINES': {
      const history = recordHistory(state);
      return {
        ...state,
        lines: action.payload.lines,
        history,
      };
    }

    case 'ADD_LINE': {
      const history = recordHistory(state);
      const newLineId = `line-${Date.now()}-${state.lines.length + 1}`;
      const newLine: LyricLine = {
        id: newLineId,
        index: state.lines.length,
        text: action.payload.text || 'New lyric line',
      };
      return {
        ...state,
        lines: [...state.lines, newLine],
        selectedLineIds: new Set([newLineId]),
        history,
      };
    }

    case 'REORDER_LINES': {
      const { sourceIndex, targetIndex } = action.payload;
      if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return state;
      if (sourceIndex >= state.lines.length || targetIndex >= state.lines.length) return state;

      const history = recordHistory(state);
      const reordered = [...state.lines];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      // Re-index line numbers
      const updatedLines = reordered.map((line, idx) => ({ ...line, index: idx }));

      return {
        ...state,
        lines: updatedLines,
        history,
      };
    }

    case 'SET_SEGMENT': {
      const { line_id, start_ms, end_ms, maxDurationMs } = action.payload;
      const clamped = clampSegment(start_ms, end_ms, maxDurationMs);

      const history = recordHistory(state);
      const existingIndex = state.segments.findIndex((s) => s.line_id === line_id);

      let newSegments: AlignmentSegment[];
      if (existingIndex >= 0) {
        newSegments = state.segments.map((s, i) =>
          i === existingIndex ? { line_id, start_ms: clamped.start_ms, end_ms: clamped.end_ms } : s
        );
      } else {
        newSegments = [...state.segments, { line_id, start_ms: clamped.start_ms, end_ms: clamped.end_ms }];
      }

      return {
        ...state,
        segments: newSegments,
        history,
      };
    }

    case 'DELETE_SEGMENT': {
      const { line_id } = action.payload;
      const exists = state.segments.some((s) => s.line_id === line_id);
      if (!exists) return state;

      const history = recordHistory(state);
      return {
        ...state,
        segments: state.segments.filter((s) => s.line_id !== line_id),
        history,
      };
    }

    case 'NUDGE_SELECTED': {
      const { deltaMs, maxDurationMs } = action.payload;
      if (state.selectedLineIds.size === 0 || deltaMs === 0) return state;

      const history = recordHistory(state);
      const nudged = nudgeSegments(state.segments, state.selectedLineIds, deltaMs, maxDurationMs);

      return {
        ...state,
        segments: nudged,
        history,
      };
    }

    case 'INTERCHANGE_SEGMENTS': {
      const { sourceLineId, targetLineId } = action.payload;
      if (sourceLineId === targetLineId) return state;

      const sourceSeg = state.segments.find((s) => s.line_id === sourceLineId);
      const targetSeg = state.segments.find((s) => s.line_id === targetLineId);

      if (!sourceSeg && !targetSeg) return state;

      const history = recordHistory(state);

      let updatedSegments = [...state.segments];

      if (sourceSeg && targetSeg) {
        // Both lines have segments: swap their timing intervals!
        updatedSegments = updatedSegments.map((s) => {
          if (s.line_id === sourceLineId) {
            return { line_id: sourceLineId, start_ms: targetSeg.start_ms, end_ms: targetSeg.end_ms };
          }
          if (s.line_id === targetLineId) {
            return { line_id: targetLineId, start_ms: sourceSeg.start_ms, end_ms: sourceSeg.end_ms };
          }
          return s;
        });
      } else if (sourceSeg && !targetSeg) {
        // Source has a segment, target does not: transfer timing to target
        updatedSegments = updatedSegments.map((s) =>
          s.line_id === sourceLineId ? { line_id: targetLineId, start_ms: sourceSeg.start_ms, end_ms: sourceSeg.end_ms } : s
        );
      } else if (!sourceSeg && targetSeg) {
        // Target has a segment, source does not: transfer timing to source
        updatedSegments = updatedSegments.map((s) =>
          s.line_id === targetLineId ? { line_id: sourceLineId, start_ms: targetSeg.start_ms, end_ms: targetSeg.end_ms } : s
        );
      }

      return {
        ...state,
        segments: updatedSegments,
        selectedLineIds: new Set([sourceLineId]),
        history,
      };
    }

    case 'SPLIT_SEGMENT': {
      const { line_id, splitTextFirst, splitTextSecond, splitTimeMs } = action.payload;
      const lineIndex = state.lines.findIndex((l) => l.id === line_id);
      if (lineIndex < 0) return state;

      const originalLine = state.lines[lineIndex];
      const segment = state.segments.find((s) => s.line_id === line_id);

      const history = recordHistory(state);

      // Create new second line ID
      const secondLineId = `${line_id}-b-${Date.now()}`;

      const firstLine: LyricLine = { ...originalLine, text: splitTextFirst };
      const secondLine: LyricLine = { id: secondLineId, index: lineIndex + 1, text: splitTextSecond };

      const updatedLines = [
        ...state.lines.slice(0, lineIndex),
        firstLine,
        secondLine,
        ...state.lines.slice(lineIndex + 1).map((l) => ({ ...l, index: l.index + 1 })),
      ];

      let updatedSegments = state.segments;
      if (segment) {
        const safeSplit = Math.max(segment.start_ms + 100, Math.min(splitTimeMs, segment.end_ms - 100));
        updatedSegments = state.segments
          .map((s) => (s.line_id === line_id ? { line_id, start_ms: segment.start_ms, end_ms: safeSplit } : s))
          .concat({ line_id: secondLineId, start_ms: safeSplit, end_ms: segment.end_ms });
      }

      return {
        ...state,
        lines: updatedLines,
        segments: updatedSegments,
        selectedLineIds: new Set([line_id]),
        history,
      };
    }

    case 'MERGE_WITH_NEXT': {
      const { line_id } = action.payload;
      const lineIndex = state.lines.findIndex((l) => l.id === line_id);
      if (lineIndex < 0 || lineIndex >= state.lines.length - 1) return state;

      const firstLine = state.lines[lineIndex];
      const secondLine = state.lines[lineIndex + 1];

      const firstSeg = state.segments.find((s) => s.line_id === firstLine.id);
      const secondSeg = state.segments.find((s) => s.line_id === secondLine.id);

      const history = recordHistory(state);

      const mergedText = `${firstLine.text} ${secondLine.text}`.trim();
      const mergedLine: LyricLine = { ...firstLine, text: mergedText };

      const updatedLines = [
        ...state.lines.slice(0, lineIndex),
        mergedLine,
        ...state.lines.slice(lineIndex + 2).map((l) => ({ ...l, index: l.index - 1 })),
      ];

      let updatedSegments = state.segments.filter((s) => s.line_id !== secondLine.id);
      if (firstSeg && secondSeg) {
        updatedSegments = updatedSegments.map((s) =>
          s.line_id === firstLine.id
            ? { line_id: firstLine.id, start_ms: Math.min(firstSeg.start_ms, secondSeg.start_ms), end_ms: Math.max(firstSeg.end_ms, secondSeg.end_ms) }
            : s
        );
      } else if (secondSeg && !firstSeg) {
        updatedSegments.push({ line_id: firstLine.id, start_ms: secondSeg.start_ms, end_ms: secondSeg.end_ms });
      }

      return {
        ...state,
        lines: updatedLines,
        segments: updatedSegments,
        selectedLineIds: new Set([firstLine.id]),
        history,
      };
    }

    case 'SELECT_LINE': {
      const { line_id, isMulti } = action.payload;
      let newSelection: Set<string>;

      if (isMulti) {
        newSelection = new Set(state.selectedLineIds);
        if (newSelection.has(line_id)) {
          newSelection.delete(line_id);
        } else {
          newSelection.add(line_id);
        }
      } else {
        newSelection = new Set([line_id]);
      }

      return {
        ...state,
        selectedLineIds: newSelection,
      };
    }

    case 'SELECT_MULTIPLE': {
      return {
        ...state,
        selectedLineIds: new Set(action.payload.line_ids),
      };
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedLineIds: new Set<string>(),
      };
    }

    case 'UNDO': {
      if (state.history.past.length === 0) return state;

      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);

      const currentSnapshot: StateSnapshot = {
        lines: state.lines,
        segments: state.segments,
      };

      return {
        ...state,
        lines: previous.lines,
        segments: previous.segments,
        history: {
          past: newPast,
          future: [currentSnapshot, ...state.history.future],
        },
      };
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state;

      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);

      const currentSnapshot: StateSnapshot = {
        lines: state.lines,
        segments: state.segments,
      };

      return {
        ...state,
        lines: next.lines,
        segments: next.segments,
        history: {
          past: [...state.history.past, currentSnapshot],
          future: newFuture,
        },
      };
    }

    case 'SYNC_SERVER_VERSION': {
      return {
        ...state,
        version: action.payload.version,
      };
    }

    case 'RECONCILE_CONFLICT': {
      const history = recordHistory(state);
      return {
        ...state,
        lines: action.payload.lines,
        segments: action.payload.segments,
        version: action.payload.version,
        history,
      };
    }

    default:
      return state;
  }
}
