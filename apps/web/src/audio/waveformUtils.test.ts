import { describe, it, expect } from 'vitest';
import { timeToPixel, pixelToTime, calculateRulerTicks } from './waveformUtils';

describe('waveformUtils', () => {
  it('timeToPixel maps time accurately to horizontal pixels', () => {
    expect(timeToPixel(0, 100, 1000)).toBe(0);
    expect(timeToPixel(50, 100, 1000)).toBe(500);
    expect(timeToPixel(100, 100, 1000)).toBe(1000);
    expect(timeToPixel(120, 100, 1000)).toBe(1000); // clamped
    expect(timeToPixel(-10, 100, 1000)).toBe(0); // clamped
  });

  it('pixelToTime maps pixel coordinates accurately to seconds', () => {
    expect(pixelToTime(0, 1000, 100)).toBe(0);
    expect(pixelToTime(500, 1000, 100)).toBe(50);
    expect(pixelToTime(1000, 1000, 100)).toBe(100);
    expect(pixelToTime(1200, 1000, 100)).toBe(100); // clamped
    expect(pixelToTime(-50, 1000, 100)).toBe(0); // clamped
  });

  it('calculateRulerTicks creates evenly spaced ticks with M:SS labels', () => {
    const ticks = calculateRulerTicks(65, 20);
    expect(ticks.length).toBe(4);
    expect(ticks[0]).toEqual({ timeSeconds: 0, label: '0:00' });
    expect(ticks[1]).toEqual({ timeSeconds: 20, label: '0:20' });
    expect(ticks[2]).toEqual({ timeSeconds: 40, label: '0:40' });
    expect(ticks[3]).toEqual({ timeSeconds: 60, label: '1:00' });
  });

  it('handles zero or negative duration gracefully', () => {
    expect(calculateRulerTicks(0)).toEqual([]);
    expect(timeToPixel(10, 0, 500)).toBe(0);
    expect(pixelToTime(50, 0, 100)).toBe(0);
  });
});
