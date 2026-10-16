import type { AlignmentSegment, LyricLine } from '../types';

export interface SegmentBounds {
  leftPx: number;
  widthPx: number;
}

/**
 * Calculates pixel left and width for a segment block on the timeline.
 * Ensures a minimum visible width (16px) for ease of selection and trimming.
 */
export function calculateSegmentBounds(
  segment: AlignmentSegment,
  durationSeconds: number,
  totalWidth: number,
  minBlockWidthPx = 16
): SegmentBounds {
  if (durationSeconds <= 0 || totalWidth <= 0) {
    return { leftPx: 0, widthPx: minBlockWidthPx };
  }

  const durationMs = durationSeconds * 1000;
  const leftPx = (segment.start_ms / durationMs) * totalWidth;
  const naturalWidth = ((segment.end_ms - segment.start_ms) / durationMs) * totalWidth;

  return {
    leftPx: Math.max(0, Math.min(leftPx, totalWidth)),
    widthPx: Math.max(minBlockWidthPx, naturalWidth),
  };
}

/**
 * Computes new start_ms during left edge trimming, preventing overlap with preceding segment.
 */
export function dragTrimLeft(
  initialStartMs: number,
  currentEndMs: number,
  deltaPx: number,
  totalWidth: number,
  durationSeconds: number,
  minLengthMs = 200,
  prevSegmentEndMs?: number
): number {
  if (totalWidth <= 0 || durationSeconds <= 0) return initialStartMs;

  const msPerPixel = (durationSeconds * 1000) / totalWidth;
  const deltaMs = deltaPx * msPerPixel;
  const targetStart = Math.round(initialStartMs + deltaMs);

  const minStart = prevSegmentEndMs != null ? prevSegmentEndMs : 0;
  const maxStart = currentEndMs - minLengthMs;
  return Math.max(minStart, Math.min(targetStart, maxStart));
}

/**
 * Computes new end_ms during right edge trimming, preventing overlap with subsequent segment.
 */
export function dragTrimRight(
  currentStartMs: number,
  initialEndMs: number,
  deltaPx: number,
  totalWidth: number,
  durationSeconds: number,
  maxDurationMs: number,
  minLengthMs = 200,
  nextSegmentStartMs?: number
): number {
  if (totalWidth <= 0 || durationSeconds <= 0) return initialEndMs;

  const msPerPixel = (durationSeconds * 1000) / totalWidth;
  const deltaMs = deltaPx * msPerPixel;
  const targetEnd = Math.round(initialEndMs + deltaMs);

  const minEnd = currentStartMs + minLengthMs;
  const maxEnd = nextSegmentStartMs != null ? nextSegmentStartMs : maxDurationMs;
  return Math.max(minEnd, Math.min(targetEnd, maxEnd));
}

/**
 * Shifts a segment's start and end timestamps together during center drag,
 * strictly bounding between adjacent segments to prevent overlapping.
 */
export function dragShiftSegment(
  initialStartMs: number,
  initialEndMs: number,
  deltaPx: number,
  totalWidth: number,
  durationSeconds: number,
  prevSegmentEndMs?: number,
  nextSegmentStartMs?: number
): { start_ms: number; end_ms: number } {
  const durationMs = durationSeconds * 1000;
  if (totalWidth <= 0 || durationSeconds <= 0) {
    return { start_ms: initialStartMs, end_ms: initialEndMs };
  }

  const segmentLength = initialEndMs - initialStartMs;
  const msPerPixel = durationMs / totalWidth;
  const deltaMs = deltaPx * msPerPixel;

  const minBound = prevSegmentEndMs != null ? prevSegmentEndMs : 0;
  const maxBound = nextSegmentStartMs != null ? nextSegmentStartMs : durationMs;

  let newStart = Math.round(initialStartMs + deltaMs);
  let newEnd = newStart + segmentLength;

  if (newStart < minBound) {
    newStart = minBound;
    newEnd = Math.min(newStart + segmentLength, maxBound);
  } else if (newEnd > maxBound) {
    newEnd = maxBound;
    newStart = Math.max(minBound, newEnd - segmentLength);
  }

  return { start_ms: newStart, end_ms: newEnd };
}

/**
 * Given all lines and two line IDs, returns all line IDs in the range between them
 * for verse shift-selection.
 */
export function getLineIdRange(lines: LyricLine[], fromLineId: string, toLineId: string): string[] {
  const fromIdx = lines.findIndex((l) => l.id === fromLineId);
  const toIdx = lines.findIndex((l) => l.id === toLineId);
  if (fromIdx < 0 || toIdx < 0) return [toLineId];

  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  return lines.slice(start, end + 1).map((l) => l.id);
}

/**
 * Calculates a valid non-overlapping [start_ms, end_ms] when dropping a line onto the timeline at targetMs.
 * Finds the best viable gap between existing segments to strictly prevent any collision or overlap.
 */
export function fitDroppedSegment(
  existingSegments: AlignmentSegment[],
  targetMs: number,
  maxDurationMs: number,
  preferredDurationMs = 3500,
  minLengthMs = 200
): { start_ms: number; end_ms: number } | null {
  const sorted = [...existingSegments].sort((a, b) => a.start_ms - b.start_ms);

  // Find all available empty intervals [gapStart, gapEnd]
  const gaps: Array<{ start: number; end: number }> = [];
  let currentPos = 0;

  for (const seg of sorted) {
    if (seg.start_ms > currentPos) {
      gaps.push({ start: currentPos, end: seg.start_ms });
    }
    currentPos = Math.max(currentPos, seg.end_ms);
  }
  if (currentPos < maxDurationMs) {
    gaps.push({ start: currentPos, end: maxDurationMs });
  }

  // Filter to gaps that can hold at least minLengthMs
  const viableGaps = gaps.filter((g) => g.end - g.start >= minLengthMs);
  if (viableGaps.length === 0) return null;

  // 1. Check if targetMs falls directly inside a viable gap
  const containingGap = viableGaps.find((g) => targetMs >= g.start && targetMs < g.end);
  if (containingGap) {
    const availableMs = containingGap.end - targetMs;
    if (availableMs >= minLengthMs) {
      const duration = Math.min(preferredDurationMs, availableMs);
      return { start_ms: targetMs, end_ms: targetMs + duration };
    } else {
      // Shift start left so that end fits at containingGap.end
      const start = Math.max(containingGap.start, containingGap.end - minLengthMs);
      return { start_ms: start, end_ms: containingGap.end };
    }
  }

  // 2. If targetMs lands inside an existing segment, find the closest viable gap
  let bestGap = viableGaps[0];
  let minDistance = Infinity;

  for (const g of viableGaps) {
    const dist = targetMs < g.start ? g.start - targetMs : targetMs > g.end ? targetMs - g.end : 0;
    // Prefer forward gap if equidistant
    if (dist < minDistance || (dist === minDistance && g.start >= targetMs)) {
      minDistance = dist;
      bestGap = g;
    }
  }

  const start = targetMs < bestGap.start ? bestGap.start : Math.max(bestGap.start, bestGap.end - preferredDurationMs);
  const duration = Math.min(preferredDurationMs, bestGap.end - start);
  return { start_ms: start, end_ms: start + duration };
}

