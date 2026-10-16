import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatTimeShort,
  parseTimeToMs,
  secondsToMs,
  msToSeconds,
  clampSegment,
  nudgeSegments,
} from './time';

describe('formatTime', () => {
  it('formats ms to M:SS.mmm correctly', () => {
    expect(formatTime(0)).toBe('0:00.000');
    expect(formatTime(999)).toBe('0:00.999');
    expect(formatTime(1000)).toBe('0:01.000');
    expect(formatTime(65120)).toBe('1:05.120');
    expect(formatTime(124960)).toBe('2:04.960');
    expect(formatTime(-500)).toBe('0:00.000');
  });
});

describe('formatTimeShort', () => {
  it('formats ms to M:SS correctly', () => {
    expect(formatTimeShort(0)).toBe('0:00');
    expect(formatTimeShort(65000)).toBe('1:05');
    expect(formatTimeShort(120000)).toBe('2:00');
  });
});

describe('parseTimeToMs', () => {
  it('parses valid time strings into integer ms', () => {
    expect(parseTimeToMs('1:05.120')).toBe(65120);
    expect(parseTimeToMs('0:05.5')).toBe(5500);
    expect(parseTimeToMs('1:30')).toBe(90000);
    expect(parseTimeToMs('45')).toBe(45000);
    expect(parseTimeToMs('0')).toBe(0);
    expect(parseTimeToMs('   1:02.300   ')).toBe(62300);
  });

  it('returns null for invalid inputs', () => {
    expect(parseTimeToMs('')).toBeNull();
    expect(parseTimeToMs('abc')).toBeNull();
    expect(parseTimeToMs('1:2:3')).toBeNull();
    expect(parseTimeToMs('-5')).toBeNull();
  });
});

describe('secondsToMs & msToSeconds', () => {
  it('converts accurately', () => {
    expect(secondsToMs(124.96)).toBe(124960);
    expect(secondsToMs(0)).toBe(0);
    expect(msToSeconds(124960)).toBe(124.96);
    expect(msToSeconds(0)).toBe(0);
  });
});

describe('clampSegment', () => {
  it('respects minimum length and duration boundaries', () => {
    expect(clampSegment(1000, 3000, 10000, 200)).toEqual({ start_ms: 1000, end_ms: 3000 });
    expect(clampSegment(-500, 2000, 10000, 200)).toEqual({ start_ms: 0, end_ms: 2000 });
    expect(clampSegment(9500, 10500, 10000, 200)).toEqual({ start_ms: 9500, end_ms: 10000 });
    expect(clampSegment(2000, 2050, 10000, 200)).toEqual({ start_ms: 2000, end_ms: 2200 });
  });
});

describe('nudgeSegments', () => {
  it('shifts selected segments while respecting boundaries', () => {
    const segments = [
      { line_id: '1', start_ms: 1000, end_ms: 3000 },
      { line_id: '2', start_ms: 3500, end_ms: 5000 },
      { line_id: '3', start_ms: 6000, end_ms: 8000 },
    ];

    const nudged = nudgeSegments(segments, new Set(['1', '2']), 200, 10000);
    expect(nudged).toEqual([
      { line_id: '1', start_ms: 1200, end_ms: 3200 },
      { line_id: '2', start_ms: 3700, end_ms: 5200 },
      { line_id: '3', start_ms: 6000, end_ms: 8000 },
    ]);

    const clampedBackward = nudgeSegments(segments, new Set(['1']), -1500, 10000);
    expect(clampedBackward[0]).toEqual({ line_id: '1', start_ms: 0, end_ms: 2000 });
  });

  it('prevents nudging selected segments into unselected segments', () => {
    const segments = [
      { line_id: '1', start_ms: 1000, end_ms: 3000 },
      { line_id: '2', start_ms: 3500, end_ms: 5000 },
      { line_id: '3', start_ms: 6000, end_ms: 8000 },
    ];

    // Nudging 1 & 2 right by 2000ms: line 2 hits unselected line 3 at 6000ms!
    // Max shift is 6000 - 5000 = 1000ms.
    const nudgedRight = nudgeSegments(segments, new Set(['1', '2']), 2000, 10000);
    expect(nudgedRight[1].end_ms).toBe(6000);
    expect(nudgedRight[1].start_ms).toBe(4500);
    expect(nudgedRight[0].start_ms).toBe(2000);
    expect(nudgedRight[0].end_ms).toBe(4000);

    // Nudging 2 & 3 left by 2000ms: line 2 hits unselected line 1 at 3000ms!
    // Max left shift is 3000 - 3500 = -500ms.
    const nudgedLeft = nudgeSegments(segments, new Set(['2', '3']), -2000, 10000);
    expect(nudgedLeft[1].start_ms).toBe(3000);
    expect(nudgedLeft[1].end_ms).toBe(4500);
    expect(nudgedLeft[2].start_ms).toBe(5500);
    expect(nudgedLeft[2].end_ms).toBe(7500);
  });
});

