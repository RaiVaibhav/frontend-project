import { useEffect, useRef } from 'react';
import type { AudioController } from './player';
import { formatTime } from '../utils/time';

export interface TimeClockProps {
  controller: AudioController;
  durationSeconds: number;
}

/**
 * High-performance clock readout.
 * Updates DOM text directly via subscribeTime without causing React component re-renders.
 */
export function TimeClock({ controller, durationSeconds }: TimeClockProps) {
  const clockRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return controller.subscribeTime((timeSec) => {
      if (clockRef.current) {
        const currentFormatted = formatTime(timeSec * 1000);
        const totalFormatted = formatTime(durationSeconds * 1000);
        clockRef.current.textContent = `${currentFormatted} / ${totalFormatted}`;
      }
    });
  }, [controller, durationSeconds]);

  return (
    <span
      ref={clockRef}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--text-muted)',
        letterSpacing: '0.02em',
      }}
    >
      0:00.000 / {formatTime(durationSeconds * 1000)}
    </span>
  );
}
