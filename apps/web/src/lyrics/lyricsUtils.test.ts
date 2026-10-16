import { describe, it, expect } from 'vitest';
import {
  findActiveLineId,
  getLineSegmentMap,
  countPlacementStats,
  getKaraokeContext,
} from './lyricsUtils';
import type { LyricLine, AlignmentSegment } from '../types';

describe('lyricsUtils', () => {
  const sampleLines: LyricLine[] = [
    { id: 'line-1', index: 0, text: 'First line of the song' },
    { id: 'line-2', index: 1, text: 'Second line of the song' },
    { id: 'line-3', index: 2, text: 'Third line of the song' },
  ];

  const sampleSegments: AlignmentSegment[] = [
    { line_id: 'line-1', start_ms: 1000, end_ms: 3000 },
    { line_id: 'line-2', start_ms: 3500, end_ms: 5500 },
  ];

  it('correctly maps segments by line_id', () => {
    const map = getLineSegmentMap(sampleSegments);
    expect(map.size).toBe(2);
    expect(map.get('line-1')).toEqual({ line_id: 'line-1', start_ms: 1000, end_ms: 3000 });
    expect(map.get('line-3')).toBeUndefined();
  });

  it('identifies the active line id for a given timestamp', () => {
    expect(findActiveLineId(sampleSegments, 500)).toBeNull();
    expect(findActiveLineId(sampleSegments, 1000)).toBe('line-1');
    expect(findActiveLineId(sampleSegments, 2000)).toBe('line-1');
    expect(findActiveLineId(sampleSegments, 3000)).toBe('line-1');
    expect(findActiveLineId(sampleSegments, 3200)).toBeNull(); // Gap between line 1 and 2
    expect(findActiveLineId(sampleSegments, 4000)).toBe('line-2');
    expect(findActiveLineId(sampleSegments, 6000)).toBeNull();
  });

  it('calculates accurate placement statistics', () => {
    const stats = countPlacementStats(sampleLines, sampleSegments);
    expect(stats.total).toBe(3);
    expect(stats.placed).toBe(2);
    expect(stats.unplaced).toBe(1);
  });

  describe('getKaraokeContext', () => {
    it('returns 3-line context when active line is playing', () => {
      // At 4000ms, line-2 is active. line-1 is prevLine, line-3 is nextLine.
      const ctx = getKaraokeContext(sampleLines, sampleSegments, 4000);
      expect(ctx.currentLine?.id).toBe('line-2');
      expect(ctx.prevLine?.id).toBe('line-1');
      expect(ctx.nextLine?.id).toBe('line-3');
    });

    it('returns upcoming line when in gap before singing begins', () => {
      // At 500ms, intro before line-1 [1000, 3000]
      const ctx = getKaraokeContext(sampleLines, sampleSegments, 500);
      expect(ctx.currentLine).toBeNull();
      expect(ctx.prevLine).toBeNull();
      expect(ctx.nextLine?.id).toBe('line-1');
    });

    it('returns previous line when song advances past last segment', () => {
      // At 6000ms, after line-2 [3500, 5500]
      const ctx = getKaraokeContext(sampleLines, sampleSegments, 6000);
      expect(ctx.currentLine).toBeNull();
      expect(ctx.prevLine?.id).toBe('line-2');
      expect(ctx.nextLine).toBeNull();
    });
  });
});
