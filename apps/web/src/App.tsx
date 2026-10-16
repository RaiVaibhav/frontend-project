import { useEffect, useState, useRef } from "react";
import { Play, Pause, Music, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";
import { api, ApiError } from "./api";
import type { TrackData } from "./types";
import { useAudioPlayer } from "./audio/useAudioPlayer";
import { decodeAudioFromUrl } from "./audio/decode";
import { WaveformCanvas } from "./audio/WaveformCanvas";
import { TimeClock } from "./audio/TimeClock";
import { useAlignmentStore } from "./store/useAlignmentStore";
import { LyricsList } from "./lyrics/LyricsList";
import { SegmentLane } from "./audio/SegmentLane";
import { getLineIdRange, fitDroppedSegment } from "./audio/segmentUtils";

export default function App() {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const { isPlaying, togglePlay, load, controller } = useAudioPlayer();

  const {
    state: alignmentState,
    canUndo,
    canRedo,
    init,
    setLines,
    addLine,
    reorderLines,
    selectLine,
    selectMultiple,
    setSegment,
    deleteSegment,
    nudgeSelected,
    interchangeSegments,
    interchangeGroup,
    undo,
    redo,
  } = useAlignmentStore();

  const anchorLineIdRef = useRef<string | null>(null);

  const handleSelectLine = (lineId: string, isMulti: boolean) => {
    anchorLineIdRef.current = lineId;
    selectLine(lineId, isMulti);
  };

  const handleSelectRange = (lineId: string) => {
    const fromId = anchorLineIdRef.current || lineId;
    const range = getLineIdRange(alignmentState.lines, fromId, lineId);
    selectMultiple(range);
  };

  // Fetch initial track from API and initialize alignment store
  useEffect(() => {
    let live = true;

    api<TrackData>("/api/v1/track")
      .then((t) => {
        if (!live) return;
        setTrack(t);
        init(t.lines, t.alignment?.segments ?? [], t.version);
        load(t.audio_url);

        // Fetch and decode audio samples for waveform visualization
        setIsDecodingAudio(true);
        decodeAudioFromUrl(t.audio_url)
          .then((res) => {
            if (live) {
              setPeaks(res.peaks);
              setIsDecodingAudio(false);
            }
          })
          .catch((err) => {
            console.error("Audio decode failed:", err);
            if (live) setIsDecodingAudio(false);
          });
      })
      .catch((e: unknown) => {
        if (!live) return;
        setError(
          e instanceof ApiError
            ? `${e.message} ${JSON.stringify(e.body)}`
            : String(e),
        );
      });

    return () => {
      live = false;
    };
  }, [load, init]);

  // Global Keyboard Shortcuts (Space for play/pause, Ctrl+Z/Y for undo/redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Space to toggle play/pause
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }

      // Undo / Redo
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if (cmdOrCtrl && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        if (canRedo) redo();
      }

      // Zoom + / - / 0 shortcuts
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((prev) => Math.min(5, Math.round((prev + 0.5) * 10) / 10));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((prev) => Math.max(1, Math.round((prev - 0.5) * 10) / 10));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, canUndo, canRedo, undo, redo]);

  if (error)
    return (
      <p style={{ color: "var(--danger)", padding: "var(--space-4)" }}>
        {error}
      </p>
    );
  if (!track)
    return <p style={{ padding: "var(--space-4)" }}>Loading track…</p>;

  return (
    <div
      style={{
        maxWidth: "1360px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        height: "calc(100vh - 48px)",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header & Transport Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--surface)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          flexWrap: "wrap",
          gap: "var(--space-3)",
        }}
      >
        {/* Track Title and Artist */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius)",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-contrast)",
            }}
          >
            <Music size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", margin: 0 }}>{track.title}</h1>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              {track.artist} · {track.lines.length} lines
            </p>
          </div>
        </div>

        {/* Center Playback Transport & Undo/Redo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => togglePlay()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "8px 16px",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              fontWeight: 600,
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <TimeClock
            controller={controller}
            durationSeconds={track.duration_seconds}
          />

          <div
            style={{
              height: "20px",
              width: "1px",
              background: "var(--border)",
              margin: "0 var(--space-1)",
            }}
          />

          {/* Undo / Redo controls */}
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z / ⌘Z)"
              style={{
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.8rem",
              }}
            >
              <Undo2 size={14} />
              <span>Undo</span>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z / ⌘⇧Z)"
              style={{
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.8rem",
              }}
            >
              <Redo2 size={14} />
              <span>Redo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Workspace */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 380px) 1fr",
          gap: "var(--space-4)",
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Column: Lyrics Sheet */}
        <LyricsList
          lines={alignmentState.lines}
          segments={alignmentState.segments}
          selectedLineIds={alignmentState.selectedLineIds}
          controller={controller}
          onSelectLine={handleSelectLine}
          onSelectRange={handleSelectRange}
          onDeleteSegment={deleteSegment}
          onSeekToTime={(timeSec) => controller.seek(timeSec)}
          onSetLines={setLines}
          onAddLine={addLine}
          onReorderLines={reorderLines}
        />

        {/* Right Column: Waveform Timeline & Workspace */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {/* Waveform Section */}
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              background: "var(--surface)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "var(--space-2)",
              }}
            >
              <h2
                style={{
                  fontSize: "0.95rem",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                Waveform & Timeline
              </h2>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                {isDecodingAudio && (
                  <span
                    style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                  >
                    Decoding audio peaks…
                  </span>
                )}

                {/* Zoom Controls matching wireframe: Zoom [-] [1.0x] [+] */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    background: "rgba(0,0,0,0.2)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                      marginRight: "4px",
                    }}
                  >
                    Zoom
                  </span>
                  <button
                    onClick={() => setZoom((prev) => Math.max(1, Math.round((prev - 0.5) * 10) / 10))}
                    disabled={zoom <= 1}
                    title="Zoom out (-)"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      padding: 0,
                      background: "transparent",
                      border: "none",
                      color: zoom <= 1 ? "var(--text-muted)" : "var(--text)",
                      cursor: zoom <= 1 ? "not-allowed" : "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    <ZoomOut size={13} />
                  </button>

                  <button
                    onClick={() => setZoom(1)}
                    title="Click to reset zoom (1.0x)"
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: "ui-monospace, monospace",
                      fontWeight: 600,
                      color: zoom > 1 ? "var(--accent)" : "var(--text)",
                      padding: "2px 4px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      minWidth: "32px",
                      textAlign: "center",
                    }}
                  >
                    {zoom.toFixed(1)}x
                  </button>

                  <button
                    onClick={() => setZoom((prev) => Math.min(5, Math.round((prev + 0.5) * 10) / 10))}
                    disabled={zoom >= 5}
                    title="Zoom in (+)"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      padding: 0,
                      background: "transparent",
                      border: "none",
                      color: zoom >= 5 ? "var(--text-muted)" : "var(--text)",
                      cursor: zoom >= 5 ? "not-allowed" : "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>
            </div>

            {peaks ? (
              <WaveformCanvas
                peaks={peaks}
                durationSeconds={track.duration_seconds}
                controller={controller}
                zoom={zoom}
                height={220}
                segmentLaneHeight={68}
                onDropLine={(lineId, dropSeconds) => {
                  const dropMs = Math.round(dropSeconds * 1000);
                  const durationMs = Math.round(track.duration_seconds * 1000);
                  // Check if drop lands on an existing segment -> interchange them!
                  const targetSeg = alignmentState.segments.find(
                    (s) => s.line_id !== lineId && dropMs >= s.start_ms && dropMs <= s.end_ms
                  );
                  if (targetSeg) {
                    interchangeSegments(lineId, targetSeg.line_id);
                  } else {
                    const otherSegments = alignmentState.segments.filter((s) => s.line_id !== lineId);
                    const fitted = fitDroppedSegment(otherSegments, dropMs, durationMs, 4500, 500);
                    if (fitted) {
                      setSegment(lineId, fitted.start_ms, fitted.end_ms, durationMs);
                      handleSelectLine(lineId, false);
                    }
                  }
                }}
              >
                {(totalWidth) => (
                  <SegmentLane
                    segments={alignmentState.segments}
                    lines={alignmentState.lines}
                    durationSeconds={track.duration_seconds}
                    totalWidth={totalWidth}
                    selectedLineIds={alignmentState.selectedLineIds}
                    onSelectLine={handleSelectLine}
                    onSelectRange={handleSelectRange}
                    onUpdateSegment={(lineId, startMs, endMs) =>
                      setSegment(
                        lineId,
                        startMs,
                        endMs,
                        Math.round(track.duration_seconds * 1000)
                      )
                    }
                    onInterchangeSegments={interchangeSegments}
                    onInterchangeGroup={interchangeGroup}
                    onNudgeSelected={(deltaMs) =>
                      nudgeSelected(
                        deltaMs,
                        Math.round(track.duration_seconds * 1000)
                      )
                    }
                    onSeekToTime={(timeSec) => controller.seek(timeSec)}
                    height={68}
                  />
                )}
              </WaveformCanvas>
            ) : (
              <div
                style={{
                  height: "220px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(128,128,128,0.05)",
                  borderRadius: "var(--radius)",
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                }}
              >
                {isDecodingAudio
                  ? "Extracting waveform peaks…"
                  : "Loading audio…"}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
