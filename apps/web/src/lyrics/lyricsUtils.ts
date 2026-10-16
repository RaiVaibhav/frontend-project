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

export interface KaraokeContext {
  prevLine: LyricLine | null;
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
}

/**
 * Given the full lyrics list, placed segments, and current playback timestamp (ms),
 * returns the 3-line karaoke context: previous line, active/current line, and next line.
 */
export function getKaraokeContext(
  lines: LyricLine[],
  segments: AlignmentSegment[],
  timeMs: number
): KaraokeContext {
  if (lines.length === 0) {
    return { prevLine: null, currentLine: null, nextLine: null };
  }

  const activeId = findActiveLineId(segments, timeMs);

  if (activeId) {
    const idx = lines.findIndex((l) => l.id === activeId);
    if (idx >= 0) {
      return {
        prevLine: idx > 0 ? lines[idx - 1] : null,
        currentLine: lines[idx],
        nextLine: idx < lines.length - 1 ? lines[idx + 1] : null,
      };
    }
  }

  // If no line is currently active, find previous and upcoming lines
  const sorted = [...segments].sort((a, b) => a.start_ms - b.start_ms);
  const nextSeg = sorted.find((s) => s.start_ms > timeMs);
  const prevSeg = [...sorted].reverse().find((s) => s.end_ms < timeMs);

  const nextLine = nextSeg ? lines.find((l) => l.id === nextSeg.line_id) ?? null : null;
  const prevLine = prevSeg ? lines.find((l) => l.id === prevSeg.line_id) ?? null : null;

  return {
    prevLine,
    currentLine: null,
    nextLine,
  };
}
