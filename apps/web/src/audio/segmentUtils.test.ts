import { describe, it, expect } from 'vitest';
import {
  calculateSegmentBounds,
  dragTrimLeft,
  dragTrimRight,
  dragShiftSegment,
  getLineIdRange,
  fitDroppedSegment,
  findInterchangeTarget,
} from './segmentUtils';
import type { LyricLine } from '../types';

describe('segmentUtils', () => {
  const durationSeconds = 100; // 100 seconds = 100,000 ms
  const totalWidth = 1000; // 1,000 pixels -> 1px = 100ms

  describe('calculateSegmentBounds', () => {
    it('calculates left and width accurately in pixels', () => {
      const seg = { line_id: '1', start_ms: 10000, end_ms: 25000 }; // 10s to 25s
      const bounds = calculateSegmentBounds(seg, durationSeconds, totalWidth);
      expect(bounds.leftPx).toBe(100);
      expect(bounds.widthPx).toBe(150);
    });

    it('enforces a minimum visible pixel width', () => {
      const seg = { line_id: '2', start_ms: 5000, end_ms: 5100 }; // 100ms = 1px
      const bounds = calculateSegmentBounds(seg, durationSeconds, totalWidth);
      expect(bounds.widthPx).toBeGreaterThanOrEqual(72); // Generous minimum visible width for handles and text
    });
  });

  describe('dragTrimLeft with collision prevention', () => {
    it('trims left edge forward respecting minLengthMs', () => {
      const newStart = dragTrimLeft(10000, 20000, 20, totalWidth, durationSeconds, 500);
      expect(newStart).toBe(12000);
    });

    it('clamps left trim to previous segment end to prevent overlap', () => {
      // Preceding segment ends at 8,000ms. Attempting to drag left to 5,000ms stops at 8,000ms!
      const clamped = dragTrimLeft(10000, 20000, -50, totalWidth, durationSeconds, 500, 8000);
      expect(clamped).toBe(8000);
    });
  });

  describe('dragTrimRight with collision prevention', () => {
    it('trims right edge backward respecting minLengthMs', () => {
      const newEnd = dragTrimRight(10000, 20000, -30, totalWidth, durationSeconds, 100000, 500);
      expect(newEnd).toBe(17000);
    });

    it('clamps right trim to next segment start to prevent overlap', () => {
      // Subsequent segment starts at 22,000ms. Attempting to drag right to 25,000ms stops at 22,000ms!
      const clamped = dragTrimRight(10000, 20000, 50, totalWidth, durationSeconds, 100000, 500, 22000);
      expect(clamped).toBe(22000);
    });
  });

  describe('dragShiftSegment with collision prevention', () => {
    it('shifts start and end together by deltaMs', () => {
      const shifted = dragShiftSegment(10000, 15000, 10, totalWidth, durationSeconds);
      expect(shifted.start_ms).toBe(11000);
      expect(shifted.end_ms).toBe(16000);
    });

    it('prevents shifting into previous segment', () => {
      // Previous segment ends at 8000ms. Dragging left stops at 8000ms!
      const shifted = dragShiftSegment(10000, 15000, -50, totalWidth, durationSeconds, 8000);
      expect(shifted.start_ms).toBe(8000);
      expect(shifted.end_ms).toBe(13000);
    });

    it('prevents shifting into next segment', () => {
      // Next segment starts at 18000ms. Dragging right stops at 18000ms!
      const shifted = dragShiftSegment(10000, 15000, 50, totalWidth, durationSeconds, undefined, 18000);
      expect(shifted.end_ms).toBe(18000);
      expect(shifted.start_ms).toBe(13000);
    });
  });

  describe('getLineIdRange for shift-select verse', () => {
    const lines: LyricLine[] = [
      { id: 'l1', index: 0, text: 'Line 1' },
      { id: 'l2', index: 1, text: 'Line 2' },
      { id: 'l3', index: 2, text: 'Line 3' },
      { id: 'l4', index: 3, text: 'Line 4' },
    ];

    it('returns all line IDs between from and to indices', () => {
      const range = getLineIdRange(lines, 'l1', 'l3');
      expect(range).toEqual(['l1', 'l2', 'l3']);

      const reverse = getLineIdRange(lines, 'l4', 'l2');
      expect(reverse).toEqual(['l2', 'l3', 'l4']);
    });
  });

  describe('fitDroppedSegment for collision-free placement', () => {
    it('places segment cleanly in an empty gap without overlapping neighbors', () => {
      const existing = [
        { line_id: 'l1', start_ms: 1000, end_ms: 4000 },
        { line_id: 'l3', start_ms: 8000, end_ms: 12000 },
      ];

      // Dropping at 5000ms in [4000, 8000] gap: shifts start left to 4500 to preserve full 3500ms duration
      const placed = fitDroppedSegment(existing, 5000, 30000, 3500);
      expect(placed).toEqual({ start_ms: 4500, end_ms: 8000 });
    });

    it('relocates to nearest gap if dropped directly inside an existing segment', () => {
      const existing = [
        { line_id: 'l1', start_ms: 1000, end_ms: 5000 },
      ];

      // Dropping at 3000ms (inside l1): moves to the gap after 5000ms
      const placed = fitDroppedSegment(existing, 3000, 30000, 3500);
      expect(placed).toBeDefined();
      expect(placed!.start_ms).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('findInterchangeTarget for drag-to-interchange', () => {
    const segments = [
      { line_id: 'l1', start_ms: 1000, end_ms: 4000 },
      { line_id: 'l2', start_ms: 6000, end_ms: 9000 },
      { line_id: 'l3', start_ms: 12000, end_ms: 15000 },
    ];

    it('detects target when dragged segment center is inside another segment', () => {
      // Dragging a 3-second segment to [6500, 9500] (center 8000 is inside l2 [6000, 9000])
      const target = findInterchangeTarget(segments, 6500, 9500);
      expect(target).toBeDefined();
      expect(target!.line_id).toBe('l2');
    });

    it('detects target when there is significant overlap (>= 30%)', () => {
      // Dragging to [5500, 7500] (overlaps l2 [6000, 9000] from 6000 to 7500 = 1500ms, which is 50% of l2)
      const target = findInterchangeTarget(segments, 5500, 7500);
      expect(target).toBeDefined();
      expect(target!.line_id).toBe('l2');
    });

    it('returns null when dragged into open empty space between segments', () => {
      // Dragging to [9500, 11500] (in the gap between l2 [6000, 9000] and l3 [12000, 15000])
      const target = findInterchangeTarget(segments, 9500, 11500);
      expect(target).toBeNull();
    });
  });
});


