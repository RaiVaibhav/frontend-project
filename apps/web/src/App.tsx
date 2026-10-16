import { useEffect, useState, useRef } from "react";
import {
  Play,
  Pause,
  Music,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Upload,
  Download,
  Check,
  Copy,
  FileText,
  X,
} from "lucide-react";
import { api, ApiError } from "./api";
import type { TrackData } from "./types";
import { useAudioPlayer } from "./audio/useAudioPlayer";
import { decodeAudioFromUrl, decodeAudioFromFile } from "./audio/decode";
import { exportLrc } from "./utils/lrc";
import { WaveformCanvas } from "./audio/WaveformCanvas";
import { TimeClock } from "./audio/TimeClock";
import { useAlignmentStore } from "./store/useAlignmentStore";
import { LyricsList } from "./lyrics/LyricsList";
import { SegmentLane } from "./audio/SegmentLane";
import { KaraokeBanner } from "./lyrics/KaraokeBanner";
import { SegmentInspector } from "./segment/SegmentInspector";
import { getLineIdRange, fitDroppedSegment } from "./audio/segmentUtils";

export default function App() {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Theme state: persists to localStorage and applies data-theme attribute
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("lyric-theme") : null;
    if (saved === "dark" || saved === "light") return saved;
    return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lyric-theme", theme);
  }, [theme]);

  // Audio upload state
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // LRC Export modal state
  const [lrcExportModalOpen, setLrcExportModalOpen] = useState(false);
  const [lrcContent, setLrcContent] = useState("");
  const [copiedLrc, setCopiedLrc] = useState(false);

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
    splitSegment,
    mergeWithNext,
    mergeLines,
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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAudio(true);
      setError(null);

      const decoded = await decodeAudioFromFile(file);
      const objectUrl = URL.createObjectURL(file);
      load(objectUrl);

      const title = file.name.replace(/\.[^/.]+$/, '');
      const newTrack: TrackData = {
        id: `local-${Date.now()}`,
        title,
        artist: 'User Track',
        audio_url: objectUrl,
        duration_seconds: decoded.durationSeconds,
        lines: alignmentState.lines.length > 0 ? alignmentState.lines : track?.lines || [],
        version: track?.version ?? 0,
        alignment: { segments: alignmentState.segments },
      };

      setTrack(newTrack);
      setPeaks(decoded.peaks);
    } catch (err) {
      console.error('Audio upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to decode audio file');
    } finally {
      setIsUploadingAudio(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleOpenExportLrc = () => {
    if (!track) return;
    const content = exportLrc(
      { title: track.title, artist: track.artist },
      alignmentState.lines,
      alignmentState.segments
    );
    setLrcContent(content);
    setLrcExportModalOpen(true);
  };

  const handleDownloadLrc = () => {
    if (!lrcContent || !track) return;
    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.title || 'lyrics'}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLrc = async () => {
    if (!lrcContent) return;
    try {
      await navigator.clipboard.writeText(lrcContent);
      setCopiedLrc(true);
      setTimeout(() => setCopiedLrc(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
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
        maxWidth: "1480px",
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

        {/* Right Action Tools: Upload Audio, Export LRC, Theme Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {/* Audio Upload File Input */}
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
            onChange={handleAudioUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isUploadingAudio}
            title="Upload custom audio track (MP3, WAV, OGG, FLAC)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <Upload size={14} />
            <span>{isUploadingAudio ? "Decoding Audio..." : "Upload Audio"}</span>
          </button>

          {/* Export LRC Button */}
          <button
            onClick={handleOpenExportLrc}
            title="Export timed lyrics as a standard .LRC file"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <Download size={14} />
            <span>Export .LRC</span>
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 11px",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            <span style={{ fontSize: "0.78rem" }}>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Workspace */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 320px) 1fr minmax(280px, 320px)",
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

          {/* 3-Line Karaoke Teleprompter Banner matching wireframe */}
          <KaraokeBanner
            lines={alignmentState.lines}
            segments={alignmentState.segments}
            controller={controller}
            onSeekToTime={(timeSec) => controller.seek(timeSec)}
          />
        </div>

        {/* Right Column: Segment Inspector matching wireframe */}
        <SegmentInspector
          lines={alignmentState.lines}
          segments={alignmentState.segments}
          selectedLineIds={alignmentState.selectedLineIds}
          maxDurationMs={Math.round(track.duration_seconds * 1000)}
          onUpdateSegment={(lineId, startMs, endMs) =>
            setSegment(lineId, startMs, endMs, Math.round(track.duration_seconds * 1000))
          }
          onDeleteSegment={deleteSegment}
          onSplitSegment={splitSegment}
          onMergeWithNext={mergeWithNext}
          onMergeLines={mergeLines}
          onNudgeSelected={(deltaMs) =>
            nudgeSelected(deltaMs, Math.round(track.duration_seconds * 1000))
          }
          onSeekToTime={(timeSec) => controller.seek(timeSec)}
        />
      </div>

      {/* Export LRC Modal */}
      {lrcExportModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)",
          }}
          onClick={() => setLrcExportModalOpen(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3) var(--space-4)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Export Standard .LRC File</h3>
              </div>
              <button
                onClick={() => setLrcExportModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: LRC Preview */}
            <div
              style={{
                padding: "var(--space-4)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                overflow: "hidden",
                flex: 1,
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                Standard time-coded LRC file generated from your {alignmentState.segments.length} placed lyric lines:
              </p>
              <textarea
                readOnly
                value={lrcContent}
                style={{
                  width: "100%",
                  height: "260px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  padding: "var(--space-3)",
                  background: "rgba(0, 0, 0, 0.15)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--text)",
                  resize: "none",
                  whiteSpace: "pre",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3) var(--space-4)",
                borderTop: "1px solid var(--border)",
                background: "rgba(0, 0, 0, 0.04)",
              }}
            >
              <button
                onClick={handleCopyLrc}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  fontSize: "0.82rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                {copiedLrc ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
                <span>{copiedLrc ? "Copied!" : "Copy to Clipboard"}</span>
              </button>

              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  onClick={() => setLrcExportModalOpen(false)}
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadLrc}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    borderRadius: "var(--radius)",
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    cursor: "pointer",
                  }}
                >
                  <Download size={14} />
                  <span>Download .LRC</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
