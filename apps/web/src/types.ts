/**
 * Domain types for Lyric Alignment.
 *
 * Generated & matched directly against OpenAPI 3.1 contract (apps/api/openapi.yaml).
 *
 * Single Units Boundary:
 * - Audio playback & track duration: float seconds (`duration_seconds`)
 * - Segment boundaries: integer milliseconds (`start_ms`, `end_ms`)
 * - Presentation format: M:SS.mmm (handled strictly at UI seams via utils/time)
 */

import type { components, paths } from './api-schema';

// Types derived directly from OpenAPI generated schema
export type LyricLine = components['schemas']['LyricLine'];
export type AlignmentSegment = components['schemas']['AlignmentSegment'];
export type AlignmentData = components['schemas']['AlignmentData'];
export type TrackData = components['schemas']['TrackPayload'];
export type PutAlignmentPayload = components['schemas']['PutAlignmentRequest'];
export type PutAlignmentResponse = components['schemas']['PutAlignmentResponse'];
export type ConflictErrorBody = components['schemas']['ConflictError'];
export type BadRequestErrorBody = components['schemas']['BadRequestError'];
export type IndexResponse = components['schemas']['IndexResponse'];
export type ApiPaths = paths;

/**
 * Editor interaction and selection state (client-side)
 */
export interface SelectionState {
  selectedLineIds: Set<string>;
  activeLineId: string | null;
}

/**
 * History snapshot for Undo/Redo (client-side)
 */
export interface HistorySnapshot {
  lines: LyricLine[];
  segments: AlignmentSegment[];
  description: string;
}

/**
 * Real-time audio playback clock info (client-side)
 */
export interface PlaybackClock {
  currentTimeSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
}
