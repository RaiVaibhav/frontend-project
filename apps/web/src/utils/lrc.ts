import type { AlignmentSegment, LyricLine } from '../types';

/**
 * Formats milliseconds into LRC standard timestamp [mm:ss.xx] (hundredths of a second)
 * e.g., 65120 -> "[01:05.12]"
 */
export function formatLrcTimestamp(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);

  const minStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(2, '0');
  const hunStr = String(hundredths).padStart(2, '0');

  return `[${minStr}:${secStr}.${hunStr}]`;
}

/**
 * Exports lyric lines and segments as an .LRC file string.
 */
export function exportLrc(
  track: { title?: string; artist?: string },
  lines: LyricLine[],
  segments: AlignmentSegment[]
): string {
  const linesMap = new Map<string, LyricLine>(lines.map((l) => [l.id, l]));

  // Sort timed segments by start_ms
  const sortedSegments = [...segments].sort((a, b) => a.start_ms - b.start_ms);

  const output: string[] = [];

  if (track.title) output.push(`[ti:${track.title}]`);
  if (track.artist) output.push(`[ar:${track.artist}]`);
  if (output.length > 0) output.push('');

  for (const seg of sortedSegments) {
    const line = linesMap.get(seg.line_id);
    if (!line) continue;
    output.push(`${formatLrcTimestamp(seg.start_ms)}${line.text}`);
  }

  return output.join('\n');
}

/**
 * Parses an .LRC file into metadata and timed lines.
 */
export function parseLrc(lrcText: string): {
  title?: string;
  artist?: string;
  lines: Array<{ text: string; start_ms: number }>;
} {
  let title: string | undefined;
  let artist: string | undefined;
  const lines: Array<{ text: string; start_ms: number }> = [];

  const rawLines = lrcText.split(/\r?\n/);

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Check tags: [ti:Title], [ar:Artist]
    const tagMatch = trimmed.match(/^\[(ti|ar|al|by):(.*)\]$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      const val = tagMatch[2].trim();
      if (tag === 'ti') title = val;
      if (tag === 'ar') artist = val;
      continue;
    }

    // Check line timestamp: [mm:ss.xx] or [mm:ss:xx] or [mm:ss.xxx]
    const timeMatch = trimmed.match(/^\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\](.*)$/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1], 10);
      const seconds = parseInt(timeMatch[2], 10);
      const fracStr = timeMatch[3] || '00';
      const text = timeMatch[4].trim();

      // Convert fraction to ms (if 2 digits -> hundredths, if 3 digits -> milliseconds)
      const fracMs = fracStr.length === 2 ? parseInt(fracStr, 10) * 10 : parseInt(fracStr.padEnd(3, '0').slice(0, 3), 10);
      const start_ms = minutes * 60 * 1000 + seconds * 1000 + fracMs;

      lines.push({ text, start_ms });
    }
  }

  lines.sort((a, b) => a.start_ms - b.start_ms);
  return { title, artist, lines };
}
