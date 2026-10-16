import { useReducer, useCallback, useMemo } from 'react';
import {
  alignmentReducer,
  initialAlignmentState,
} from './alignmentReducer';
export type { AlignmentState } from './alignmentReducer';
import type { LyricLine, AlignmentSegment } from '../types';

export function useAlignmentStore() {
  const [state, dispatch] = useReducer(alignmentReducer, initialAlignmentState);

  const init = useCallback((lines: LyricLine[], segments: AlignmentSegment[], version: number) => {
    dispatch({ type: 'INIT', payload: { lines, segments, version } });
  }, []);

  const setLines = useCallback((lines: LyricLine[]) => {
    dispatch({ type: 'SET_LINES', payload: { lines } });
  }, []);

  const addLine = useCallback((text = 'New lyric line') => {
    dispatch({ type: 'ADD_LINE', payload: { text } });
  }, []);

  const reorderLines = useCallback((sourceIndex: number, targetIndex: number) => {
    dispatch({ type: 'REORDER_LINES', payload: { sourceIndex, targetIndex } });
  }, []);

  const setSegment = useCallback((line_id: string, start_ms: number, end_ms: number, maxDurationMs: number) => {
    dispatch({ type: 'SET_SEGMENT', payload: { line_id, start_ms, end_ms, maxDurationMs } });
  }, []);

  const deleteSegment = useCallback((line_id: string) => {
    dispatch({ type: 'DELETE_SEGMENT', payload: { line_id } });
  }, []);

  const nudgeSelected = useCallback((deltaMs: number, maxDurationMs: number) => {
    dispatch({ type: 'NUDGE_SELECTED', payload: { deltaMs, maxDurationMs } });
  }, []);

  const interchangeSegments = useCallback((sourceLineId: string, targetLineId: string) => {
    dispatch({ type: 'INTERCHANGE_SEGMENTS', payload: { sourceLineId, targetLineId } });
  }, []);

  const interchangeGroup = useCallback((sourceLineIds: string[], targetLineId: string) => {
    dispatch({ type: 'INTERCHANGE_GROUP', payload: { sourceLineIds, targetLineId } });
  }, []);

  const splitSegment = useCallback(
    (line_id: string, splitTextFirst: string, splitTextSecond: string, splitTimeMs: number) => {
      dispatch({
        type: 'SPLIT_SEGMENT',
        payload: { line_id, splitTextFirst, splitTextSecond, splitTimeMs },
      });
    },
    []
  );

  const mergeWithNext = useCallback((line_id: string) => {
    dispatch({ type: 'MERGE_WITH_NEXT', payload: { line_id } });
  }, []);

  const mergeLines = useCallback((firstLineId: string, secondLineId: string) => {
    dispatch({ type: 'MERGE_LINES', payload: { firstLineId, secondLineId } });
  }, []);

  const selectLine = useCallback((line_id: string, isMulti = false) => {
    dispatch({ type: 'SELECT_LINE', payload: { line_id, isMulti } });
  }, []);

  const selectMultiple = useCallback((line_ids: string[]) => {
    dispatch({ type: 'SELECT_MULTIPLE', payload: { line_ids } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const syncServerVersion = useCallback((version: number) => {
    dispatch({ type: 'SYNC_SERVER_VERSION', payload: { version } });
  }, []);

  const reconcileConflict = useCallback((lines: LyricLine[], segments: AlignmentSegment[], version: number) => {
    dispatch({ type: 'RECONCILE_CONFLICT', payload: { lines, segments, version } });
  }, []);

  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  return useMemo(
    () => ({
      state,
      canUndo,
      canRedo,
      init,
      setLines,
      addLine,
      reorderLines,
      setSegment,
      deleteSegment,
      nudgeSelected,
      interchangeSegments,
      interchangeGroup,
      splitSegment,
      mergeWithNext,
      mergeLines,
      selectLine,
      selectMultiple,
      clearSelection,
      undo,
      redo,
      syncServerVersion,
      reconcileConflict,
    }),
    [
      state,
      canUndo,
      canRedo,
      init,
      setLines,
      addLine,
      reorderLines,
      setSegment,
      deleteSegment,
      nudgeSelected,
      interchangeSegments,
      interchangeGroup,
      splitSegment,
      mergeWithNext,
      mergeLines,
      selectLine,
      selectMultiple,
      clearSelection,
      undo,
      redo,
      syncServerVersion,
      reconcileConflict,
    ]
  );
}

export type AlignmentStore = ReturnType<typeof useAlignmentStore>;
