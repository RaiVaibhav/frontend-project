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
  onSelectRange?: (lineId: string) => void;
  onUpdateSegment: (lineId: string, startMs: number, endMs: number) => void;
  onNudgeSelected?: (deltaMs: number) => void;
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
  onSelectRange,
  onUpdateSegment,
  onNudgeSelected,
  onSeekToTime,
  height = 68,
}: SegmentLaneProps) {
  // Line text map for fast lookup
  const lineMap = useMemo(() => {
    const map = new Map<string, LyricLine>();
    for (const line of lines) {
      map.set(line.id, line);
    }
    return map;
  }, [lines]);

  // Sort segments by start time to enforce non-overlapping boundaries
  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => a.start_ms - b.start_ms);
  }, [segments]);

  const sortedIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedSegments.forEach((s, idx) => map.set(s.line_id, idx));
    return map;
  }, [sortedSegments]);

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

  // Group selection bounds for the wireframe dashed multi-selection box
  const selectedBounds = useMemo(() => {
    if (selectedLineIds.size <= 1) return null;
    const selectedSegs = segments.filter((s) => selectedLineIds.has(s.line_id));
    if (selectedSegs.length <= 1) return null;

    let minStart = Infinity;
    let maxEnd = -Infinity;
    for (const s of selectedSegs) {
      if (s.start_ms < minStart) minStart = s.start_ms;
      if (s.end_ms > maxEnd) maxEnd = s.end_ms;
    }

    if (minStart === Infinity || durationSeconds <= 0 || totalWidth <= 0) return null;

    const durationMs = durationSeconds * 1000;
    const leftPx = (minStart / durationMs) * totalWidth;
    const widthPx = ((maxEnd - minStart) / durationMs) * totalWidth;

    return { leftPx, widthPx, count: selectedSegs.length };
  }, [selectedLineIds, segments, durationSeconds, totalWidth]);

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
      {/* Dashed group bounding outline when multiple segments are selected */}
      {selectedBounds && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: `${selectedBounds.leftPx - 4}px`,
            width: `${selectedBounds.widthPx + 8}px`,
            height: `${height - 4}px`,
            border: '2px dashed var(--accent)',
            borderRadius: 'var(--radius)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              position: 'absolute',
              bottom: '-18px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
              background: 'var(--surface)',
              padding: '0 6px',
              borderRadius: '3px',
              border: '1px solid var(--border)',
            }}
          >
            {selectedBounds.count} segments selected
          </span>
        </div>
      )}

      {segments.map((segment) => {
        const line = lineMap.get(segment.line_id);
        const isSelected = selectedLineIds.has(segment.line_id);
        const bounds = calculateSegmentBounds(segment, durationSeconds, totalWidth);
        const lineText = line ? line.text : `Line ${segment.line_id}`;

        // Adjacent neighbors for non-overlapping bounds
        const sortIdx = sortedIndexMap.get(segment.line_id) ?? 0;
        const prevSeg = sortIdx > 0 ? sortedSegments[sortIdx - 1] : null;
        const nextSeg = sortIdx < sortedSegments.length - 1 ? sortedSegments[sortIdx + 1] : null;

        const prevEndMs = prevSeg ? prevSeg.end_ms : 0;
        const nextStartMs = nextSeg ? nextSeg.start_ms : Math.round(durationSeconds * 1000);

        const handleLeftTrimStart = (e: React.MouseEvent) => {
          document.body.style.cursor = 'ew-resize';
          const initialStart = segment.start_ms;
          startDrag(e, (deltaX) => {
            const newStart = dragTrimLeft(
              initialStart,
              segment.end_ms,
              deltaX,
              totalWidth,
              durationSeconds,
              200,
              prevEndMs
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
              maxMs,
              200,
              nextStartMs
            );
            onUpdateSegment(segment.line_id, segment.start_ms, newEnd);
          });
        };

        const handleBodyDragStart = (e: React.MouseEvent) => {
          document.body.style.cursor = 'grabbing';
          const initialStart = segment.start_ms;
          const initialEnd = segment.end_ms;
          let lastShiftMs = 0;

          startDrag(
            e,
            (deltaX) => {
              // If multiple segments are selected, offset the whole group together!
              if (selectedLineIds.size > 1 && selectedLineIds.has(segment.line_id) && onNudgeSelected) {
                const msPerPixel = (durationSeconds * 1000) / totalWidth;
                const currentShiftMs = Math.round(deltaX * msPerPixel);
                const stepDelta = currentShiftMs - lastShiftMs;
                if (Math.abs(stepDelta) >= 10) {
                  lastShiftMs = currentShiftMs;
                  onNudgeSelected(stepDelta);
                }
              } else {
                const shifted = dragShiftSegment(
                  initialStart,
                  initialEnd,
                  deltaX,
                  totalWidth,
                  durationSeconds,
                  prevEndMs,
                  nextStartMs
                );
                onUpdateSegment(segment.line_id, shifted.start_ms, shifted.end_ms);
              }
            },
            () => {
              // Click selection if mouse did not drag
              if (!isDraggingRef.current) {
                if (e.shiftKey && onSelectRange) {
                  onSelectRange(segment.line_id);
                } else {
                  onSelectLine(segment.line_id, e.metaKey || e.ctrlKey);
                }
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
            title={`${lineText} (${formatTimeShort(segment.start_ms)} - ${formatTimeShort(segment.end_ms)})`}
            style={{
              position: 'absolute',
              top: '4px',
              left: `${bounds.leftPx}px`,
              width: `${bounds.widthPx}px`,
              height: `${height - 10}px`,
              background: isSelected ? 'rgba(99, 185, 140, 0.45)' : 'rgba(99, 185, 140, 0.25)',
              border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(99, 185, 140, 0.6)',
              borderRadius: 'var(--radius)',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              cursor: 'grab',
              boxShadow: isSelected ? '0 0 10px rgba(99, 185, 140, 0.4)' : 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              overflow: 'hidden',
            }}
          >
            {/* Left Trim Handle */}
            <div
              onMouseDown={handleLeftTrimStart}
              style={{
                width: '10px',
                height: '100%',
                cursor: 'ew-resize',
                background: 'rgba(0, 0, 0, 0.18)',
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
                  height: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
                gap: '6px',
                padding: '0 6px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: '0.8rem',
                color: 'var(--text)',
                fontWeight: 500,
              }}
            >
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
                width: '10px',
                height: '100%',
                cursor: 'ew-resize',
                background: 'rgba(0, 0, 0, 0.18)',
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
                  height: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
