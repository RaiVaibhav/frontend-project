import type { AlignmentSegment } from '../types';

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
 * Computes new start_ms during left edge trimming.
 */
export function dragTrimLeft(
  initialStartMs: number,
  currentEndMs: number,
  deltaPx: number,
  totalWidth: number,
  durationSeconds: number,
  minLengthMs = 200
): number {
  if (totalWidth <= 0 || durationSeconds <= 0) return initialStartMs;

  const msPerPixel = (durationSeconds * 1000) / totalWidth;
  const deltaMs = deltaPx * msPerPixel;
  const targetStart = Math.round(initialStartMs + deltaMs);

  const maxStart = currentEndMs - minLengthMs;
  return Math.max(0, Math.min(targetStart, maxStart));
}

/**
 * Computes new end_ms during right edge trimming.
 */
export function dragTrimRight(
  currentStartMs: number,
  initialEndMs: number,
  deltaPx: number,
  totalWidth: number,
  durationSeconds: number,
  maxDurationMs: number,
  minLengthMs = 200
): number {
  if (totalWidth <= 0 || durationSeconds <= 0) return initialEndMs;

  const msPerPixel = (durationSeconds * 1000) / totalWidth;
  const deltaMs = deltaPx * msPerPixel;
  const targetEnd = Math.round(initialEndMs + deltaMs);

  const minEnd = currentStartMs + minLengthMs;
  return Math.max(minEnd, Math.min(targetEnd, maxDurationMs));
}

/**
 * Shifts a segment's start and end timestamps together during center drag.
 */
export function dragShiftSegment(
  initialStartMs: number,
  initialEndMs: number,
  deltaPx: number,
  totalWidth: number,
  durationSeconds: number
): { start_ms: number; end_ms: number } {
  const durationMs = durationSeconds * 1000;
  if (totalWidth <= 0 || durationSeconds <= 0) {
    return { start_ms: initialStartMs, end_ms: initialEndMs };
  }

  const segmentLength = initialEndMs - initialStartMs;
  const msPerPixel = durationMs / totalWidth;
  const deltaMs = deltaPx * msPerPixel;

  let newStart = Math.round(initialStartMs + deltaMs);
  let newEnd = newStart + segmentLength;

  if (newStart < 0) {
    newStart = 0;
    newEnd = segmentLength;
  } else if (newEnd > durationMs) {
    newEnd = durationMs;
    newStart = Math.max(0, durationMs - segmentLength);
  }

  return { start_ms: newStart, end_ms: newEnd };
}
