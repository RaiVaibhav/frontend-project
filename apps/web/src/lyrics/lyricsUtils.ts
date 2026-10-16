import type { LyricLine, AlignmentSegment } from '../types';

/**
 * Creates an O(1) Map lookup of segments by their line_id.
 */
export function getLineSegmentMap(segments: AlignmentSegment[]): Map<string, AlignmentSegment> {
  const map = new Map<string, AlignmentSegment>();
  for (const seg of segments) {
    map.set(seg.line_id, seg);
  }
  return map;
}

/**
 * Finds the line_id that is currently singing at the specified timestamp in milliseconds.
 * Returns null if no line spans this timestamp.
 */
export function findActiveLineId(segments: AlignmentSegment[], timeMs: number): string | null {
  for (const seg of segments) {
    if (timeMs >= seg.start_ms && timeMs <= seg.end_ms) {
      return seg.line_id;
    }
  }
  return null;
}

export interface PlacementStats {
  total: number;
  placed: number;
  unplaced: number;
}

/**
 * Returns summary counts of total, placed, and unplaced lines.
 */
export function countPlacementStats(
  lines: LyricLine[],
  segments: AlignmentSegment[]
): PlacementStats {
  const placedSet = new Set(segments.map((s) => s.line_id));
  let placed = 0;

  for (const line of lines) {
    if (placedSet.has(line.id)) {
      placed++;
    }
  }

  return {
    total: lines.length,
    placed,
    unplaced: lines.length - placed,
  };
}
