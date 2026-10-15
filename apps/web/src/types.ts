/**
 * Domain types for Lyric Alignment.
 *
 * Single Units Boundary:
 * - Audio playback & track duration: float seconds (`duration_seconds`)
 * - Segment boundaries: integer milliseconds (`start_ms`, `end_ms`)
 * - Presentation format: M:SS.mmm (handled strictly at UI seams via utils/time)
 */

export interface LyricLine {
  id: string;
  index: number;
  text: string;
}

export interface AlignmentSegment {
  line_id: string;
  start_ms: number;
  end_ms: number;
}

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  audio_url: string;
  lines: LyricLine[];
  version: number;
  alignment: {
    segments: AlignmentSegment[];
  } | null;
}

/**
 * Payload sent to PUT /api/v1/track/alignment
 */
export interface PutAlignmentPayload {
  version: number;
  lines: LyricLine[];
  segments: AlignmentSegment[];
}

/**
 * Successful response from PUT /api/v1/track/alignment
 */
export interface PutAlignmentResponse {
  version: number;
  lines: LyricLine[];
  alignment: {
    segments: AlignmentSegment[];
  };
}

/**
 * 409 Conflict payload returned by API when local version is stale
 */
export interface ConflictErrorBody {
  error: 'version_conflict';
  expected_version: number;
  received_version: number;
  version: number;
  lines: LyricLine[];
  alignment: {
    segments: AlignmentSegment[];
  } | null;
}

/**
 * Editor interaction and selection state
 */
export interface SelectionState {
  selectedLineIds: Set<string>;
  activeLineId: string | null;
}

/**
 * History snapshot for Undo/Redo
 */
export interface HistorySnapshot {
  lines: LyricLine[];
  segments: AlignmentSegment[];
  description: string;
}

/**
 * Real-time audio playback clock info
 */
export interface PlaybackClock {
  currentTimeSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
}
