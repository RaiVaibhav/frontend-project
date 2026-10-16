import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { AlignmentSegment, LyricLine } from '../types';
import { formatTime, formatTimeShort } from '../utils/time';
import {
  calculateSegmentBounds,
  dragTrimLeft,
  dragTrimRight,
  dragShiftSegment,
  findInterchangeTarget,
  fitDroppedSegment,
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
  onInterchangeSegments?: (sourceLineId: string, targetLineId: string) => void;
  onInterchangeGroup?: (sourceLineIds: string[], targetLineId: string) => void;
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
  onInterchangeSegments,
  onInterchangeGroup,
  onNudgeSelected,
  onSeekToTime,
  height = 68,
}: SegmentLaneProps) {
  const [activeDrag, setActiveDrag] = useState<{
    isMulti: boolean;
    lineId: string;
    shiftPx: number;
    targetInterchangeId: string | null;
  } | null>(null);
  const [html5DragTargetId, setHtml5DragTargetId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);

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
    if (durationSeconds <= 0 || totalWidth <= 0) return null;

    let minLeftPx = Infinity;
    let maxRightPx = -Infinity;

    for (const s of selectedSegs) {
      const b = calculateSegmentBounds(s, durationSeconds, totalWidth);
      if (b.leftPx < minLeftPx) minLeftPx = b.leftPx;
      const right = b.leftPx + b.widthPx;
      if (right > maxRightPx) maxRightPx = right;
    }

    if (minLeftPx === Infinity || maxRightPx === -Infinity) return null;

    const leftPx = minLeftPx;
    const widthPx = maxRightPx - minLeftPx;

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
            transform:
              activeDrag?.isMulti && activeDrag.shiftPx
                ? `translate3d(${activeDrag.shiftPx}px, 0, 0)`
                : 'none',
            zIndex: 18,
            transition: activeDrag?.isMulti ? 'none' : 'transform 0.1s ease',
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
          e.stopPropagation();
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
          e.stopPropagation();
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
          const isMulti = selectedLineIds.size > 1 && selectedLineIds.has(segment.line_id);
          const initialStart = segment.start_ms;
          const initialEnd = segment.end_ms;
          const segmentLength = initialEnd - initialStart;
          let currentTargetId: string | null = null;
          let lastDeltaX = 0;

          const selectedSegs = segments.filter((s) => selectedLineIds.has(s.line_id));
          const unselectedSegs = segments.filter((s) => !selectedLineIds.has(s.line_id));
          const groupMinStart =
            selectedSegs.length > 0 ? Math.min(...selectedSegs.map((s) => s.start_ms)) : initialStart;
          const groupMaxEnd =
            selectedSegs.length > 0 ? Math.max(...selectedSegs.map((s) => s.end_ms)) : initialEnd;

          startDrag(
            e,
            (deltaX) => {
              lastDeltaX = deltaX;
              const msPerPixel = (durationSeconds * 1000) / totalWidth;
              const deltaMs = Math.round(deltaX * msPerPixel);

              if (isMulti) {
                // Multi-verse drag: compute prospective group span
                const prospectiveGroupStart = groupMinStart + deltaMs;
                const prospectiveGroupEnd = groupMaxEnd + deltaMs;

                // Detect interchange target among unselected segments
                const target = findInterchangeTarget(
                  unselectedSegs,
                  prospectiveGroupStart,
                  prospectiveGroupEnd,
                  durationSeconds,
                  totalWidth
                );
                currentTargetId = target ? target.line_id : null;

                setActiveDrag({
                  isMulti: true,
                  lineId: segment.line_id,
                  shiftPx: deltaX,
                  targetInterchangeId: currentTargetId,
                });
                return;
              }

              // Single segment dragging: allow free movement across timeline for interchange
              const shifted = dragShiftSegment(
                initialStart,
                initialEnd,
                deltaX,
                totalWidth,
                durationSeconds
              );

              // Check if currently hovering over another segment for interchange
              const otherSegs = segments.filter((s) => s.line_id !== segment.line_id);
              const target = findInterchangeTarget(
                otherSegs,
                shifted.start_ms,
                shifted.end_ms,
                durationSeconds,
                totalWidth
              );
              currentTargetId = target ? target.line_id : null;

              setActiveDrag({
                isMulti: false,
                lineId: segment.line_id,
                shiftPx: deltaX,
                targetInterchangeId: currentTargetId,
              });
            },
            () => {
              setActiveDrag(null);
              // Click selection if mouse did not drag
              if (!isDraggingRef.current) {
                if (e.shiftKey && onSelectRange) {
                  onSelectRange(segment.line_id);
                } else {
                  onSelectLine(segment.line_id, e.metaKey || e.ctrlKey);
                }
                return;
              }

              // Drag completed:
              if (isMulti) {
                if (currentTargetId && onInterchangeGroup) {
                  // Multi-verse interchanged with target segment!
                  onInterchangeGroup(Array.from(selectedLineIds), currentTargetId);
                } else if (lastDeltaX !== 0 && onNudgeSelected) {
                  const msPerPixel = (durationSeconds * 1000) / totalWidth;
                  const finalDeltaMs = Math.round(lastDeltaX * msPerPixel);
                  if (finalDeltaMs !== 0) {
                    onNudgeSelected(finalDeltaMs);
                  }
                }
              } else {
                if (currentTargetId && onInterchangeSegments) {
                  // Single segment interchanged with another segment!
                  onInterchangeSegments(segment.line_id, currentTargetId);
                } else if (lastDeltaX !== 0) {
                  // Dropped in open space: place cleanly into gap without overlap
                  const shifted = dragShiftSegment(
                    initialStart,
                    initialEnd,
                    lastDeltaX,
                    totalWidth,
                    durationSeconds
                  );
                  const otherSegs = segments.filter((s) => s.line_id !== segment.line_id);
                  const fitted = fitDroppedSegment(
                    otherSegs,
                    shifted.start_ms,
                    Math.round(durationSeconds * 1000),
                    segmentLength
                  );
                  if (fitted) {
                    onUpdateSegment(segment.line_id, fitted.start_ms, fitted.end_ms);
                  }
                }
              }
            }
          );
        };

        const isBeingDragged =
          activeDrag &&
          ((activeDrag.isMulti && selectedLineIds.has(segment.line_id)) ||
            (!activeDrag.isMulti && activeDrag.lineId === segment.line_id));
        const isInterchangeTarget =
          activeDrag?.targetInterchangeId === segment.line_id || html5DragTargetId === segment.line_id;

        return (
          <div
            key={segment.line_id}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onSeekToTime) {
                onSeekToTime(segment.start_ms / 1000);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
              if (html5DragTargetId !== segment.line_id) {
                setHtml5DragTargetId(segment.line_id);
              }
            }}
            onDragLeave={() => {
              if (html5DragTargetId === segment.line_id) {
                setHtml5DragTargetId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setHtml5DragTargetId(null);
              const sourceLineId = e.dataTransfer.getData('text/plain');
              if (sourceLineId && sourceLineId !== segment.line_id && onInterchangeSegments) {
                onInterchangeSegments(sourceLineId, segment.line_id);
              }
            }}
            onMouseEnter={() => setHoveredLineId(segment.line_id)}
            onMouseLeave={() => setHoveredLineId((prev) => (prev === segment.line_id ? null : prev))}
            title={`${lineText} (${formatTimeShort(segment.start_ms)} - ${formatTimeShort(segment.end_ms)})`}
            style={{
              position: 'absolute',
              top: '4px',
              left: `${bounds.leftPx}px`,
              width: `${bounds.widthPx}px`,
              height: `${height - 10}px`,
              background: isInterchangeTarget
                ? 'rgba(99, 185, 140, 0.55)'
                : isSelected
                ? 'rgba(99, 185, 140, 0.45)'
                : 'rgba(99, 185, 140, 0.25)',
              border: isInterchangeTarget
                ? '2px dashed var(--accent)'
                : isSelected
                ? '2px solid var(--accent)'
                : '1px solid rgba(99, 185, 140, 0.6)',
              borderRadius: 'var(--radius)',
              pointerEvents: 'auto',
              boxSizing: 'border-box',
              cursor: isBeingDragged ? 'grabbing' : 'grab',
              boxShadow: isInterchangeTarget
                ? '0 0 16px rgba(99, 185, 140, 0.7)'
                : isBeingDragged
                ? '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px var(--accent)'
                : isSelected
                ? '0 0 10px rgba(99, 185, 140, 0.4)'
                : 'none',
              transform: isBeingDragged && activeDrag ? `translate3d(${activeDrag.shiftPx}px, 0, 0)` : 'none',
              zIndex: isBeingDragged ? 20 : isInterchangeTarget ? 15 : 2,
              transition: isBeingDragged ? 'none' : 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
              overflow: 'visible',
            }}
          >
            {/* Full Lyric Hover Preview Card */}
            {hoveredLineId === segment.line_id && !isBeingDragged && !isInterchangeTarget && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius)',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  zIndex: 50,
                  pointerEvents: 'none',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  textAlign: 'center',
                  maxWidth: '380px',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>"{lineText}"</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                  {formatTime(segment.start_ms)} – {formatTime(segment.end_ms)}
                </span>
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: '5px',
                    borderStyle: 'solid',
                    borderColor: 'var(--accent) transparent transparent transparent',
                  }}
                />
              </div>
            )}

            {/* Interchange Floating Target Badge */}
            {isInterchangeTarget && (
              <div
                style={{
                  position: 'absolute',
                  top: '-26px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 30,
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <ArrowLeftRight size={11} />
                <span>Interchange{activeDrag?.isMulti ? ' Verse' : ''}</span>
              </div>
            )}

            {/* Center Segment Body (Spans 100% full width and height, text starts directly at left boundary) */}
            <div
              onMouseDown={handleBodyDragStart}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: '0.8rem',
                color: 'var(--text)',
                fontWeight: 500,
                boxSizing: 'border-box',
                userSelect: 'none',
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

            {/* Left Trim Handle (Overlay on left edge, zero in-flow layout width) */}
            <div
              onMouseDown={handleLeftTrimStart}
              className="segment-trim-handle-left"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '8px',
                cursor: 'ew-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
                borderRadius: 'var(--radius) 0 0 var(--radius)',
              }}
              title="Drag to trim start time"
            >
              <div
                style={{
                  width: '2px',
                  height: '18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  borderRadius: '1px',
                  boxShadow: '0 0 2px rgba(0, 0, 0, 0.5)',
                }}
              />
            </div>

            {/* Right Trim Handle (Overlay on right edge, zero in-flow layout width) */}
            <div
              onMouseDown={handleRightTrimStart}
              className="segment-trim-handle-right"
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '8px',
                cursor: 'ew-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
                borderRadius: '0 var(--radius) var(--radius) 0',
              }}
              title="Drag to trim end time"
            >
              <div
                style={{
                  width: '2px',
                  height: '18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  borderRadius: '1px',
                  boxShadow: '0 0 2px rgba(0, 0, 0, 0.5)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
