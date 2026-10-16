import React, { useMemo, useRef } from 'react';
import type { AlignmentSegment, LyricLine } from '../types';
import { formatTimeShort } from '../utils/time';
import {
  calculateSegmentBounds,
  dragTrimLeft,
  dragTrimRight,
  dragShiftSegment,
} from './segmentUtils';

export interface SegmentLaneProps {
  segments: AlignmentSegment[];
  lines: LyricLine[];
  durationSeconds: number;
  totalWidth: number;
  selectedLineIds: Set<string>;
  onSelectLine: (lineId: string, isMulti: boolean) => void;
  onUpdateSegment: (lineId: string, startMs: number, endMs: number) => void;
  onSeekToTime?: (timeSeconds: number) => void;
  height?: number;
}

export function SegmentLane({
  segments,
  lines,
  durationSeconds,
  totalWidth,
  selectedLineIds,
  onSelectLine,
  onUpdateSegment,
  onSeekToTime,
  height = 48,
}: SegmentLaneProps) {
  // Line text map for fast lookup
  const lineMap = useMemo(() => {
    const map = new Map<string, LyricLine>();
    for (const line of lines) {
      map.set(line.id, line);
    }
    return map;
  }, [lines]);

  const isDraggingRef = useRef(false);

  const startDrag = (
    e: React.MouseEvent,
    onMove: (deltaX: number) => void,
    onEnd?: () => void
  ) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = false;
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 2) {
        isDraggingRef.current = true;
      }
      onMove(deltaX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      if (onEnd) onEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: `${totalWidth}px`,
        height: `${height}px`,
        pointerEvents: 'none', // Empty lane clicks pass through to waveform seek
        userSelect: 'none',
      }}
    >
      {segments.map((segment) => {
        const line = lineMap.get(segment.line_id);
        const isSelected = selectedLineIds.has(segment.line_id);
        const bounds = calculateSegmentBounds(segment, durationSeconds, totalWidth);
        const lineNum = line ? String(line.index + 1).padStart(2, '0') : '';
        const lineText = line ? line.text : `Line ${segment.line_id}`;

        const handleLeftTrimStart = (e: React.MouseEvent) => {
          document.body.style.cursor = 'ew-resize';
          const initialStart = segment.start_ms;
          startDrag(e, (deltaX) => {
            const newStart = dragTrimLeft(
              initialStart,
              segment.end_ms,
              deltaX,
              totalWidth,
              durationSeconds
            );
            onUpdateSegment(segment.line_id, newStart, segment.end_ms);
          });
        };

        const handleRightTrimStart = (e: React.MouseEvent) => {
          document.body.style.cursor = 'ew-resize';
          const initialEnd = segment.end_ms;
          const maxMs = durationSeconds * 1000;
          startDrag(e, (deltaX) => {
            const newEnd = dragTrimRight(
              segment.start_ms,
              initialEnd,
              deltaX,
              totalWidth,
              durationSeconds,
              maxMs
            );
            onUpdateSegment(segment.line_id, segment.start_ms, newEnd);
          });
        };

        const handleBodyDragStart = (e: React.MouseEvent) => {
          document.body.style.cursor = 'grabbing';
          const initialStart = segment.start_ms;
          const initialEnd = segment.end_ms;

          startDrag(
            e,
            (deltaX) => {
              const shifted = dragShiftSegment(
                initialStart,
                initialEnd,
                deltaX,
                totalWidth,
                durationSeconds
              );
              onUpdateSegment(segment.line_id, shifted.start_ms, shifted.end_ms);
            },
            () => {
              // If mouse didn't drag, treat as click selection
              if (!isDraggingRef.current) {
                onSelectLine(segment.line_id, e.metaKey || e.ctrlKey || e.shiftKey);
              }
            }
          );
        };

        return (
          <div
            key={segment.line_id}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onSeekToTime) {
                onSeekToTime(segment.start_ms / 1000);
              }
            }}
            title={`${lineNum}: ${lineText} (${formatTimeShort(segment.start_ms)} - ${formatTimeShort(segment.end_ms)})`}
            style={{
              position: 'absolute',
              top: '4px',
              left: `${bounds.leftPx}px`,
              width: `${bounds.widthPx}px`,
              height: `${height - 8}px`,
              background: isSelected ? 'rgba(99, 185, 140, 0.45)' : 'rgba(99, 185, 140, 0.25)',
              border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(99, 185, 140, 0.6)',
              borderRadius: 'var(--radius)',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              cursor: 'grab',
              boxShadow: isSelected ? '0 0 8px rgba(99, 185, 140, 0.4)' : 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              overflow: 'hidden',
            }}
          >
            {/* Left Trim Handle */}
            <div
              onMouseDown={handleLeftTrimStart}
              style={{
                width: '8px',
                height: '100%',
                cursor: 'ew-resize',
                background: 'rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title="Drag to trim start time"
            >
              <div
                style={{
                  width: '2px',
                  height: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '1px',
                }}
              />
            </div>

            {/* Center Segment Body (Drag to shift, Click to select) */}
            <div
              onMouseDown={handleBodyDragStart}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 4px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: '0.75rem',
                color: 'var(--text)',
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  opacity: 0.8,
                  flexShrink: 0,
                }}
              >
                {lineNum}
              </span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {lineText}
              </span>
            </div>

            {/* Right Trim Handle */}
            <div
              onMouseDown={handleRightTrimStart}
              style={{
                width: '8px',
                height: '100%',
                cursor: 'ew-resize',
                background: 'rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title="Drag to trim end time"
            >
              <div
                style={{
                  width: '2px',
                  height: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '1px',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
