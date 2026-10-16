import { describe, it, expect } from 'vitest';
import {
  calculateSegmentBounds,
  dragTrimLeft,
  dragTrimRight,
  dragShiftSegment,
} from './segmentUtils';

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
      expect(bounds.widthPx).toBeGreaterThanOrEqual(16); // Minimum clickable block width
    });
  });

  describe('dragTrimLeft', () => {
    it('trims left edge forward respecting minLengthMs', () => {
      // Current: 10,000ms to 20,000ms. Move right by +20px (+2000ms)
      const newStart = dragTrimLeft(10000, 20000, 20, totalWidth, durationSeconds, 500);
      expect(newStart).toBe(12000);
    });

    it('clamps left trim to 0 and end_ms - minLength', () => {
      // Drag left by -150px (-15,000ms) from 10,000ms -> clamps to 0
      const clampedZero = dragTrimLeft(10000, 20000, -150, totalWidth, durationSeconds, 500);
      expect(clampedZero).toBe(0);

      // Drag right by +990px -> clamps to 19,500ms
      const clampedMax = dragTrimLeft(10000, 20000, 990, totalWidth, durationSeconds, 500);
      expect(clampedMax).toBe(19500);
    });
  });

  describe('dragTrimRight', () => {
    it('trims right edge backward respecting minLengthMs', () => {
      // Current: 10,000ms to 20,000ms. Drag left by -30px (-3000ms)
      const newEnd = dragTrimRight(10000, 20000, -30, totalWidth, durationSeconds, 100000, 500);
      expect(newEnd).toBe(17000);
    });

    it('clamps right trim to maxDurationMs and start_ms + minLength', () => {
      // Drag right by +900px past max duration
      const clampedEnd = dragTrimRight(10000, 20000, 900, totalWidth, durationSeconds, 100000, 500);
      expect(clampedEnd).toBe(100000);

      // Drag left by -150px past start + minLength
      const clampedMin = dragTrimRight(10000, 20000, -150, totalWidth, durationSeconds, 100000, 500);
      expect(clampedMin).toBe(10500);
    });
  });

  describe('dragShiftSegment', () => {
    it('shifts start and end together by deltaMs', () => {
      // Current: 10,000 to 15,000. Drag right by +10px (+1000ms)
      const shifted = dragShiftSegment(10000, 15000, 10, totalWidth, durationSeconds);
      expect(shifted.start_ms).toBe(11000);
      expect(shifted.end_ms).toBe(16000);
    });

    it('clamps shifted segment within timeline boundaries', () => {
      // Shift left past 0
      const leftClamped = dragShiftSegment(1000, 6000, -50, totalWidth, durationSeconds);
      expect(leftClamped.start_ms).toBe(0);
      expect(leftClamped.end_ms).toBe(5000);

      // Shift right past max
      const rightClamped = dragShiftSegment(95000, 99000, 100, totalWidth, durationSeconds);
      expect(rightClamped.end_ms).toBe(100000);
      expect(rightClamped.start_ms).toBe(96000);
    });
  });
});
