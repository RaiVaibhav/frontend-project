import { useState, useEffect } from 'react';
import {
  Sliders,
  Scissors,
  Trash2,
  Combine,
  Play,
} from 'lucide-react';
import type { LyricLine, AlignmentSegment } from '../types';
import { formatTime, parseTimeToMs } from '../utils/time';

export interface SegmentInspectorProps {
  lines: LyricLine[];
  segments: AlignmentSegment[];
  selectedLineIds: Set<string>;
  maxDurationMs: number;
  onUpdateSegment: (lineId: string, startMs: number, endMs: number) => void;
  onDeleteSegment: (lineId: string) => void;
  onSplitSegment: (
    lineId: string,
    splitTextFirst: string,
    splitTextSecond: string,
    splitTimeMs: number
  ) => void;
  onMergeWithNext: (lineId: string) => void;
  onMergeLines?: (firstLineId: string, secondLineId: string) => void;
  onNudgeSelected: (deltaMs: number) => void;
  onSeekToTime?: (timeSeconds: number) => void;
}

export function SegmentInspector({
  lines,
  segments,
  selectedLineIds,
  maxDurationMs,
  onUpdateSegment,
  onDeleteSegment,
  onSplitSegment,
  onMergeWithNext,
  onMergeLines,
  onNudgeSelected,
  onSeekToTime,
}: SegmentInspectorProps) {
  // Selected line and segment lookups
  const selectedLines = lines.filter((l) => selectedLineIds.has(l.id));
  const segmentMap = new Map<string, AlignmentSegment>();
  for (const s of segments) {
    segmentMap.set(s.line_id, s);
  }

  const isSingle = selectedLines.length === 1;
  const singleLine = isSingle ? selectedLines[0] : null;
  const singleSeg = singleLine ? segmentMap.get(singleLine.id) : null;

  // Editable time inputs for single selection
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);

  // Split & Merge modal / inline tool states
  const [isSplitting, setIsSplitting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [splitText1, setSplitText1] = useState('');
  const [splitText2, setSplitText2] = useState('');
  const [splitTimeMs, setSplitTimeMs] = useState(0);

  // Sync inputs when selection or segment times change
  useEffect(() => {
    if (singleSeg) {
      setStartInput(formatTime(singleSeg.start_ms));
      setEndInput(formatTime(singleSeg.end_ms));
      setTimeError(null);
    } else {
      setStartInput('');
      setEndInput('');
      setTimeError(null);
    }
    setIsSplitting(false);
    setIsMerging(false);
  }, [singleSeg?.start_ms, singleSeg?.end_ms, singleLine?.id]);

  const handleStartBlur = () => {
    if (!singleSeg || !singleLine) return;
    const parsed = parseTimeToMs(startInput);
    if (parsed === null || parsed < 0) {
      setTimeError('Invalid start time format (use M:SS.mmm)');
      setStartInput(formatTime(singleSeg.start_ms));
      return;
    }
    if (parsed >= singleSeg.end_ms - 200) {
      setTimeError('Start time must be before end time');
      setStartInput(formatTime(singleSeg.start_ms));
      return;
    }
    setTimeError(null);
    onUpdateSegment(singleLine.id, parsed, singleSeg.end_ms);
  };

  const handleEndBlur = () => {
    if (!singleSeg || !singleLine) return;
    const parsed = parseTimeToMs(endInput);
    if (parsed === null || parsed > maxDurationMs) {
      setTimeError('Invalid end time format (use M:SS.mmm)');
      setEndInput(formatTime(singleSeg.end_ms));
      return;
    }
    if (parsed <= singleSeg.start_ms + 200) {
      setTimeError('End time must be after start time');
      setEndInput(formatTime(singleSeg.end_ms));
      return;
    }
    setTimeError(null);
    onUpdateSegment(singleLine.id, singleSeg.start_ms, parsed);
  };

  const handleOpenSplit = () => {
    if (!singleLine || !singleSeg) return;
    const words = singleLine.text.trim().split(/\s+/);
    const midWord = Math.max(1, Math.floor(words.length / 2));
    setSplitText1(words.slice(0, midWord).join(' '));
    setSplitText2(words.slice(midWord).join(' '));
    setSplitTimeMs(Math.round((singleSeg.start_ms + singleSeg.end_ms) / 2));
    setIsSplitting(true);
  };

  const handleConfirmSplit = () => {
    if (!singleLine || !singleSeg) return;
    if (!splitText1.trim() || !splitText2.trim()) return;
    onSplitSegment(singleLine.id, splitText1.trim(), splitText2.trim(), splitTimeMs);
    setIsSplitting(false);
  };

  const lineIndex = singleLine ? lines.findIndex((l) => l.id === singleLine.id) : -1;
  const hasNextLine = lineIndex >= 0 && lineIndex < lines.length - 1;
  const nextLine = hasNextLine ? lines[lineIndex + 1] : null;

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: 'var(--space-4)',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      {/* Inspector Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={15} style={{ color: 'var(--accent)' }} />
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
              color: 'var(--text)',
            }}
          >
            Segment Inspector
          </h2>
        </div>

        {selectedLines.length > 0 && (
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {selectedLines.length === 1 ? '1 Line' : `${selectedLines.length} Lines`}
          </span>
        )}
      </div>

      {/* CASE 1: No Line Selected */}
      {selectedLines.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-6) var(--space-2)',
            textAlign: 'center',
            gap: 'var(--space-2)',
            color: 'var(--text-muted)',
          }}
        >
          <Sliders size={28} style={{ opacity: 0.25 }} />
          <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>No Segment Selected</div>
          <p style={{ fontSize: '0.78rem', margin: 0, lineHeight: 1.4, maxWidth: '220px' }}>
            Click a timeline segment or lyric line to inspect exact timestamps and operations.
          </p>
        </div>
      )}

      {/* CASE 2: Single Line Selected */}
      {isSingle && singleLine && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Lyric Line Header Card */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 'var(--space-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Line {lineIndex + 1}
              </span>
              {singleSeg ? (
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent)',
                    background: 'rgba(99, 185, 140, 0.15)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  Timed
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(128, 128, 128, 0.1)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Unplaced
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text)',
                lineHeight: 1.35,
              }}
            >
              "{singleLine.text}"
            </div>
          </div>

          {/* Timings Section (If placed) */}
          {singleSeg ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Start & End Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Start
                  </label>
                  <input
                    type="text"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    onBlur={handleStartBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartBlur()}
                    style={{
                      width: '100%',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.82rem',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    End
                  </label>
                  <input
                    type="text"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    onBlur={handleEndBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleEndBlur()}
                    style={{
                      width: '100%',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.82rem',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {timeError && (
                <div style={{ fontSize: '0.72rem', color: 'var(--danger)', lineHeight: 1.2 }}>
                  {timeError}
                </div>
              )}

              {/* Duration and Play Snippet Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0,0,0,0.15)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration:</span>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--accent)',
                    }}
                  >
                    {((singleSeg.end_ms - singleSeg.start_ms) / 1000).toFixed(2)}s
                  </span>
                </div>

                {onSeekToTime && (
                  <button
                    onClick={() => onSeekToTime(singleSeg.start_ms / 1000)}
                    title="Play from start of line"
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: '3px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={10} fill="currentColor" />
                    <span>Play</span>
                  </button>
                )}
              </div>

              {/* Precision Nudge Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Nudge Timing
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {[-500, -100, 100, 500].map((delta) => (
                    <button
                      key={delta}
                      onClick={() => onNudgeSelected(delta)}
                      title={`Shift line by ${delta > 0 ? `+${delta}` : delta}ms`}
                      style={{
                        padding: '4px 2px',
                        fontSize: '0.7rem',
                        fontFamily: 'ui-monospace, monospace',
                        borderRadius: '3px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              </div>

              {/* Segment Operations */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 'var(--space-3)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '2px',
                  }}
                >
                  Operations
                </span>

                {/* Merge with next */}
                {hasNextLine && nextLine ? (
                  <div
                    style={{
                      background: isMerging ? 'rgba(99, 185, 140, 0.08)' : 'var(--surface)',
                      border: isMerging ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      onClick={() => setIsMerging((prev) => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Combine size={13} color={isMerging ? 'var(--accent)' : 'currentColor'} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Merge with next line</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: isMerging ? 'var(--accent)' : 'var(--text-muted)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: 'rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        {isMerging ? 'Close' : `Line #${nextLine.index + 1}`}
                      </span>
                    </div>

                    {isMerging && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          Merging Line #{singleLine.index + 1} with Line #{nextLine.index + 1}:
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            background: 'rgba(0, 0, 0, 0.15)',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                            <strong>"{nextLine.text}"</strong>
                          </div>
                          <div
                            style={{
                              borderTop: '1px solid var(--border)',
                              paddingTop: '3px',
                              color: 'var(--accent)',
                            }}
                          >
                            <span style={{ color: 'var(--text-muted)' }}>Result: </span>
                            <strong>"{singleLine.text} {nextLine.text}"</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                          <button
                            onClick={() => {
                              onMergeWithNext(singleLine.id);
                              setIsMerging(false);
                            }}
                            style={{
                              flex: 1,
                              padding: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'var(--accent)',
                              color: 'var(--accent-contrast)',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            Confirm Merge
                          </button>
                          <button
                            onClick={() => setIsMerging(false)}
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    disabled
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      fontSize: '0.78rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed',
                      opacity: 0.5,
                    }}
                  >
                    <Combine size={13} />
                    <span>No subsequent line to merge with</span>
                  </button>
                )}

                {/* Split segment */}
                <button
                  onClick={handleOpenSplit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <Scissors size={13} />
                  <span>Split segment…</span>
                </button>

                {/* Delete / Unplace segment */}
                <button
                  onClick={() => onDeleteSegment(singleLine.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete timing (Unplace)</span>
                </button>
              </div>

              {/* Inline Split Tool Box */}
              {isSplitting && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--accent)',
                    borderRadius: 'var(--radius)',
                    padding: 'var(--space-3)',
                    marginTop: '4px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Scissors size={12} />
                    <span>Split Line & Timing</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>First Part:</label>
                    <input
                      type="text"
                      value={splitText1}
                      onChange={(e) => setSplitText1(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '0.78rem',
                        padding: '4px 6px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        borderRadius: '3px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Second Part:</label>
                    <input
                      type="text"
                      value={splitText2}
                      onChange={(e) => setSplitText2(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '0.78rem',
                        padding: '4px 6px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        borderRadius: '3px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>Split Timestamp:</span>
                      <span style={{ fontFamily: 'ui-monospace, monospace' }}>{formatTime(splitTimeMs)}</span>
                    </div>
                    <input
                      type="range"
                      min={singleSeg.start_ms + 100}
                      max={singleSeg.end_ms - 100}
                      step={50}
                      value={splitTimeMs}
                      onChange={(e) => setSplitTimeMs(Number(e.target.value))}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button
                      onClick={handleConfirmSplit}
                      style={{
                        flex: 1,
                        padding: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'var(--accent)',
                        color: 'var(--accent-contrast)',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Confirm Split
                    </button>
                    <button
                      onClick={() => setIsSplitting(false)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                padding: 'var(--space-2)',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
              }}
            >
              This line is not placed on the timeline yet. Drag it from the left lyrics sheet onto the waveform to time it!
            </div>
          )}
        </div>
      )}

      {/* CASE 3: Multi-Selection (Verse Group) */}
      {!isSingle && selectedLines.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div
            style={{
              background: 'rgba(99, 185, 140, 0.1)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius)',
              padding: 'var(--space-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
              Multi-Selection (Verse Group)
            </span>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>
              {selectedLines.length} Lyric Lines Selected
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {selectedLines.filter((l) => segmentMap.has(l.id)).length} of {selectedLines.length} placed on timeline
            </div>
          </div>

          {/* Merge 2 Selected Lines Action */}
          {selectedLines.length === 2 && (() => {
            const [firstSel, secondSel] = [...selectedLines].sort((a, b) => {
              const segA = segmentMap.get(a.id);
              const segB = segmentMap.get(b.id);
              if (segA && segB) return segA.start_ms - segB.start_ms;
              return a.index - b.index;
            });
            const segA = segmentMap.get(firstSel.id);
            const segB = segmentMap.get(secondSel.id);
            const bothPlaced = Boolean(segA && segB);

            return (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius)',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  <Combine size={14} />
                  <span>Merge 2 Selected Lines</span>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Combine both lines into one single lyric line and merge their timeline blocks:
                </div>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.15)',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Line #{firstSel.index + 1}: </span>
                    <strong>"{firstSel.text}"</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Line #{secondSel.index + 1}: </span>
                    <strong>"{secondSel.text}"</strong>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: '4px',
                      marginTop: '2px',
                      color: 'var(--accent)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Merged: </span>
                    <strong>"{firstSel.text} {secondSel.text}"</strong>
                  </div>
                  {bothPlaced && segA && segB && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Time Span: {formatTime(Math.min(segA.start_ms, segB.start_ms))} – {formatTime(Math.max(segA.end_ms, segB.end_ms))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (onMergeLines) {
                      onMergeLines(firstSel.id, secondSel.id);
                    } else {
                      onMergeWithNext(firstSel.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius)',
                    background: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Combine size={14} />
                  <span>Merge 2 Selected Lines</span>
                </button>
              </div>
            );
          })()}

          {/* Group Nudge Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Shift Selected Verse Together
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {[-500, -100, 100, 500].map((delta) => (
                <button
                  key={delta}
                  onClick={() => onNudgeSelected(delta)}
                  title={`Shift all selected segments by ${delta > 0 ? `+${delta}` : delta}ms`}
                  style={{
                    padding: '6px 2px',
                    fontSize: '0.75rem',
                    fontFamily: 'ui-monospace, monospace',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
              Shifting moves all lines in the verse while preserving their relative distances.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
