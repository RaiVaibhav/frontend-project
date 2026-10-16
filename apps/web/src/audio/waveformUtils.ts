import { formatTimeShort } from '../utils/time';

/**
 * Converts a playback time in seconds to a horizontal pixel coordinate.
 */
export function timeToPixel(timeSeconds: number, durationSeconds: number, width: number): number {
  if (durationSeconds <= 0 || width <= 0) return 0;
  const clamped = Math.max(0, Math.min(timeSeconds, durationSeconds));
  return (clamped / durationSeconds) * width;
}

/**
 * Converts a horizontal pixel coordinate to playback time in seconds.
 */
export function pixelToTime(pixelX: number, width: number, durationSeconds: number): number {
  if (width <= 0 || durationSeconds <= 0) return 0;
  const clamped = Math.max(0, Math.min(pixelX, width));
  return (clamped / width) * durationSeconds;
}

export interface RulerTick {
  timeSeconds: number;
  label: string;
}

/**
 * Determines an optimal ruler tick interval in seconds based on current zoom and pixel density.
 * Targets a tick marker roughly every 80 to 140 pixels.
 */
export function getAdaptiveRulerInterval(durationSeconds: number, totalWidth: number): number {
  if (durationSeconds <= 0 || totalWidth <= 0) return 20;
  const pxPerSec = totalWidth / durationSeconds;
  const targetSeconds = 100 / pxPerSec;

  if (targetSeconds <= 0.5) return 0.5;
  if (targetSeconds <= 1) return 1;
  if (targetSeconds <= 2) return 2;
  if (targetSeconds <= 5) return 5;
  if (targetSeconds <= 10) return 10;
  if (targetSeconds <= 20) return 20;
  if (targetSeconds <= 30) return 30;
  return 60;
}

/**
 * Generates ruler tick markers across a song duration.
 * Chooses an interval based on total duration (e.g. 10s, 20s, 30s) or adaptive zoom.
 */
export function calculateRulerTicks(durationSeconds: number, tickIntervalSeconds = 20): RulerTick[] {
  if (durationSeconds <= 0 || tickIntervalSeconds <= 0) return [];

  const ticks: RulerTick[] = [];
  const count = Math.floor(durationSeconds / tickIntervalSeconds);

  for (let i = 0; i <= count; i++) {
    const timeSec = i * tickIntervalSeconds;
    ticks.push({
      timeSeconds: timeSec,
      label: formatTimeShort(Math.round(timeSec * 1000)),
    });
  }

  return ticks;
}
