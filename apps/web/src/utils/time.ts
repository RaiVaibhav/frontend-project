import type { AlignmentSegment } from '../types';

/**
 * Formats milliseconds into standard presentation time string "M:SS.mmm"
 * e.g., 65120 -> "1:05.120", 0 -> "0:00.000"
 */
export function formatTime(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const remainderMs = safeMs % 1000;

  const paddedSec = String(seconds).padStart(2, '0');
  const paddedMs = String(remainderMs).padStart(3, '0');

  return `${minutes}:${paddedSec}.${paddedMs}`;
}

/**
 * Formats milliseconds into short timestamp "M:SS" for timeline rulers
 * e.g., 65000 -> "1:05"
 */
export function formatTimeShort(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const paddedSec = String(seconds).padStart(2, '0');
  return `${minutes}:${paddedSec}`;
}

/**
 * Parses user input strings into integer milliseconds.
 * Supported formats:
 * - "1:05.120" -> 65120
 * - "0:05.5" -> 5500
 * - "1:30" -> 90000
 * - "12.34" -> 12340
 * - "45" -> 45000 (if purely seconds)
 * Returns null if format cannot be parsed.
 */
export function parseTimeToMs(input: string): number | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern: [minutes:]seconds[.fraction]
  const match = trimmed.match(/^(?:(?:(\d+):)?(\d+)(?:\.(\d+))?)$/);
  if (!match) return null;

  const minPart = match[1];
  const secPart = match[2];
  const fracPart = match[3];

  const minutes = minPart !== undefined ? parseInt(minPart, 10) : 0;
  const seconds = parseInt(secPart, 10);

  let ms = minutes * 60 * 1000 + seconds * 1000;

  if (fracPart) {
    // Standardize fractional seconds to milliseconds (3 digits)
    const normalizedFrac = fracPart.padEnd(3, '0').slice(0, 3);
    ms += parseInt(normalizedFrac, 10);
  }

  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/**
 * Converts float seconds to integer milliseconds.
 */
export function secondsToMs(seconds: number): number {
  return Math.max(0, Math.round(seconds * 1000));
}

/**
 * Converts integer milliseconds to float seconds.
 */
export function msToSeconds(ms: number): number {
  return Math.max(0, ms) / 1000;
}

/**
 * Clamps segment start and end so:
 * - start_ms >= 0
 * - end_ms <= maxDurationMs
 * - end_ms >= start_ms + minLengthMs
 */
export function clampSegment(
  start_ms: number,
  end_ms: number,
  maxDurationMs: number,
  minLengthMs = 200
): { start_ms: number; end_ms: number } {
  const safeMax = Math.max(minLengthMs, Math.round(maxDurationMs));
  let safeStart = Math.max(0, Math.round(start_ms));
  let safeEnd = Math.max(safeStart + minLengthMs, Math.round(end_ms));

  if (safeEnd > safeMax) {
    safeEnd = safeMax;
    if (safeStart > safeEnd - minLengthMs) {
      safeStart = Math.max(0, safeEnd - minLengthMs);
    }
  }

  return { start_ms: safeStart, end_ms: safeEnd };
}

/**
 * Nudges a subset of segments by deltaMs, ensuring all stay within [0, maxDurationMs].
 */
export function nudgeSegments(
  segments: AlignmentSegment[],
  lineIdsToNudge: Set<string>,
  deltaMs: number,
  maxDurationMs: number
): AlignmentSegment[] {
  if (lineIdsToNudge.size === 0 || deltaMs === 0) return segments;

  // Check boundaries for all selected segments before applying delta
  let effectiveDelta = deltaMs;

  for (const seg of segments) {
    if (!lineIdsToNudge.has(seg.line_id)) continue;

    // Check lower bound
    if (seg.start_ms + effectiveDelta < 0) {
      effectiveDelta = -seg.start_ms;
    }
    // Check upper bound
    if (seg.end_ms + effectiveDelta > maxDurationMs) {
      effectiveDelta = maxDurationMs - seg.end_ms;
    }
  }

  return segments.map((seg) => {
    if (!lineIdsToNudge.has(seg.line_id)) return seg;

    return {
      ...seg,
      start_ms: Math.round(seg.start_ms + effectiveDelta),
      end_ms: Math.round(seg.end_ms + effectiveDelta),
    };
  });
}
