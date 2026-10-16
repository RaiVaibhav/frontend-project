import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, CircleDashed, Trash2, Crosshair, GripVertical, Plus } from 'lucide-react';
import type { LyricLine, AlignmentSegment } from '../types';
import type { AudioController } from '../audio/player';
import { formatTimeShort } from '../utils/time';
import {
  findActiveLineId,
  getLineSegmentMap,
  countPlacementStats,
} from './lyricsUtils';

export interface LyricsListProps {
  lines: LyricLine[];
  segments: AlignmentSegment[];
  selectedLineIds: Set<string>;
  controller: AudioController;
  onSelectLine: (lineId: string, isMulti: boolean) => void;
  onSelectRange?: (lineId: string) => void;
  onDeleteSegment: (lineId: string) => void;
  onSeekToTime: (timeSeconds: number) => void;
  onStampActiveLine?: (lineId: string) => void;
  onSetLines?: (lines: LyricLine[]) => void;
  onAddLine?: (text?: string) => void;
}

type FilterMode = 'all' | 'placed' | 'unplaced';

export function LyricsList({
  lines,
  segments,
  selectedLineIds,
  controller,
  onSelectLine,
  onSelectRange,
  onDeleteSegment,
  onSeekToTime,
  onSetLines,
  onAddLine,
}: LyricsListProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [pastedText, setPastedText] = useState('');
  const lineRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Segment lookup map and statistics
  const segmentMap = useMemo(() => getLineSegmentMap(segments), [segments]);
  const stats = useMemo(() => countPlacementStats(lines, segments), [lines, segments]);

  const handleAddAllLines = () => {
    if (!pastedText.trim() || !onSetLines) return;
    const parsedLines: LyricLine[] = pastedText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `line-${idx + 1}-${Date.now()}`,
        index: idx,
        text,
      }));
    onSetLines(parsedLines);
    setPastedText('');
  };

  const handleAddSingleLine = () => {
    const text = pastedText.trim();
    if (onAddLine) {
      onAddLine(text || 'New lyric line');
      setPastedText('');
    }
  };

  // Subscribe to playback time without 60fps React state churn:
  // Only trigger a React state change when the active line ID transitions!
  useEffect(() => {
    let lastActiveId: string | null = null;

    return controller.subscribeTime((timeSec) => {
      const timeMs = Math.round(timeSec * 1000);
      const currentActiveId = findActiveLineId(segments, timeMs);

      if (currentActiveId !== lastActiveId) {
        lastActiveId = currentActiveId;
        setActiveLineId(currentActiveId);
      }
    });
  }, [controller, segments]);

  // Smooth scroll active line into view during playback
  useEffect(() => {
    if (autoScroll && activeLineId) {
      const el = lineRefs.current.get(activeLineId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeLineId, autoScroll]);

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (filter === 'placed') {
      return lines.filter((l) => segmentMap.has(l.id));
    }
    if (filter === 'unplaced') {
      return lines.filter((l) => !segmentMap.has(l.id));
    }
    return lines;
  }, [lines, segmentMap, filter]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Header with Title and Ingestion Controls */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          background: 'rgba(128,128,128,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Lyrics</h2>

          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            style={{
              background: autoScroll ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              color: autoScroll ? 'var(--accent)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '3px 8px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            title="Auto-scroll to active lyric during playback"
          >
            <Crosshair size={13} />
            <span>Follow</span>
          </button>
        </div>

        {/* Paste Lyrics Input Box */}
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddSingleLine();
            }
          }}
          placeholder="Paste full lyrics or type a line and press Enter..."
          rows={2}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '0.8rem',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            resize: 'vertical',
            lineHeight: 1.4,
          }}
        />

        {/* Ingestion Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            disabled={!pastedText.trim()}
            onClick={handleAddAllLines}
            style={{
              flex: 1,
              fontSize: '0.8rem',
              fontWeight: 600,
              background: pastedText.trim() ? 'var(--accent)' : 'rgba(128,128,128,0.1)',
              color: pastedText.trim() ? 'var(--accent-contrast)' : 'var(--text-muted)',
              padding: '6px 10px',
              borderRadius: 'var(--radius)',
              border: 'none',
              cursor: pastedText.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add all lines
          </button>
          <button
            onClick={handleAddSingleLine}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem',
              padding: '6px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Plus size={13} />
            <span>Add line</span>
          </button>
        </div>

        {/* Wireframe subheader: LINES · 18 (left) 9 placed (right) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            fontWeight: 600,
            paddingTop: '2px',
          }}
        >
          <span>LINES · {stats.total}</span>
          <span style={{ color: stats.placed > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
            {stats.placed} placed
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem' }}>
          {(['all', 'placed', 'unplaced'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              style={{
                background: filter === mode ? 'var(--accent)' : 'rgba(128,128,128,0.08)',
                color: filter === mode ? 'var(--accent-contrast)' : 'var(--text)',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontWeight: filter === mode ? 600 : 400,
                textTransform: 'capitalize',
                fontSize: '0.75rem',
              }}
            >
              {mode} ({mode === 'all' ? stats.total : mode === 'placed' ? stats.placed : stats.unplaced})
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Lyric Lines List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minHeight: 0,
        }}
      >
        {filteredLines.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            No {filter} lines found
          </div>
        ) : (
          filteredLines.map((line) => {
            const segment = segmentMap.get(line.id);
            const isSelected = selectedLineIds.has(line.id);
            const isActivePlaying = activeLineId === line.id;

            return (
              <div
                key={line.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', line.id);
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                ref={(el) => {
                  if (el) lineRefs.current.set(line.id, el);
                  else lineRefs.current.delete(line.id);
                }}
                onClick={(e) => {
                  if (e.shiftKey && onSelectRange) {
                    onSelectRange(line.id);
                  } else {
                    onSelectLine(line.id, e.metaKey || e.ctrlKey);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius)',
                  background: isActivePlaying
                    ? 'rgba(34, 197, 94, 0.12)'
                    : isSelected
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid var(--accent)'
                    : isActivePlaying
                    ? '1px solid rgba(34, 197, 94, 0.4)'
                    : '1px solid rgba(128,128,128,0.15)',
                  cursor: 'grab',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  userSelect: 'none',
                  gap: 'var(--space-2)',
                }}
              >
                {/* Drag Handle ≡ & Text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'grab',
                    }}
                    title="Drag onto waveform to place"
                  >
                    <GripVertical size={14} />
                  </span>

                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: isActivePlaying ? 'var(--accent)' : 'var(--text)',
                      fontWeight: isActivePlaying ? 600 : isSelected ? 500 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {line.text}
                  </span>
                </div>

                {/* Timing Badge or Unplaced status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  {segment ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeekToTime(segment.start_ms / 1000);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                        }}
                        title="Click to seek and play line"
                      >
                        <Play size={10} fill="currentColor" />
                        <span>
                          {formatTimeShort(segment.start_ms)} - {formatTimeShort(segment.end_ms)}
                        </span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSegment(line.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '4px',
                          cursor: 'pointer',
                          borderRadius: '3px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Un-place line"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(128,128,128,0.06)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      <CircleDashed size={11} />
                      <span>Unplaced</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
