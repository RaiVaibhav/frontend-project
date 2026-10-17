# Engineering Notes & Architecture Walkthrough

A candid walkthrough of how I approached this challenge. While [`decisions.md`](./decisions.md) captures the commit-by-commit log and mechanical trade-offs we documented while working with the agent, these notes are my human-to-human explanation of the mental model, the component architecture, why certain trade-offs were made, what I intentionally left out, and a few fun gotchas I ran into along the way.

---

## 1. The Core Philosophy: Where Does Time Actually Go?

The prompt had one sentence that immediately set the direction for everything I built:

> _"Someone should be able to put the track on, listen once through, land each line where it belongs, fix the ones they fumbled, and save the result — without fighting the interface."_

When you sit down to time 28 lines of lyrics manually, dragging cards across the screen 28 times from a sidebar into a timeline is tedious and slow. If you fumble three lines, fixing them one by one feels like manual data entry.

To fix that, I designed **three distinct velocity tiers**:

1. **Tier 1: Real-time Rhythm Stamping (<kbd>Enter</kbd> / `[⚡ Stamp Line]`)**
   You hit <kbd>Space</kbd> to play the song and press <kbd>Enter</kbd> every time a singer starts a new line. Each tap instantly stamps the timestamp, drops the next line onto the timeline, and caps the previous segment. You can draft an entire 2-minute song on your first listen in exactly 2 minutes.
2. **Tier 2: 1-Click "Place at Playhead"**
   If you pause at a vocal onset or scrub the needle to a specific transient, you just click `[+ Place at Playhead]` on any unplaced lyric card. No drag-and-drop gymnastics across a wide monitor.
3. **Tier 3: Surgical Trimming & Timeline Nudging**
   For fine-tuning: drag to move, drag edges to trim, select multiple blocks to shift an entire verse at once, or use the inspector to split and merge.

---

## 2. System Architecture & Component Seams

Here is how the system is organized under `apps/web/src`:

```
apps/web/src/
├── audio/
│   ├── player.ts            # Vanilla AudioController class (decoupled clock)
│   ├── useAudioPlayer.ts    # React hook bridge for playback status
│   ├── TimeClock.tsx        # Direct 60fps DOM ticker (bypasses React renders)
│   ├── decode.ts            # Web Audio API AudioContext decoding
│   ├── peaks.ts             # Positive/negative waveform min-max bucket calculation
│   ├── WaveformCanvas.tsx   # Hardware-accelerated <canvas> waveform + needle
│   ├── SegmentLane.tsx      # Timeline lane, selection boxes, trim handles
│   ├── segmentUtils.ts      # Pure math: collision detection, snapping, fit logic
│   └── waveformUtils.ts     # Pure math: adaptive ruler intervals, pixel conversions
├── lyrics/
│   ├── LyricsList.tsx       # Sidebar: unplaced / placed lines, reordering
│   ├── KaraokeBanner.tsx    # Bottom teleprompter (prev / active / next lines)
│   └── lyricsUtils.ts       # Text parsing, merging, splitting helpers
├── segment/
│   └── SegmentInspector.tsx # Detail inspector for active selection
├── store/
│   ├── alignmentReducer.ts  # Pure reducer: undo/redo, CRUD, optimistic updates
│   └── useAlignmentStore.ts # Central state store & server sync
└── utils/
    ├── lrc.ts               # RFC-compliant LRC file parser & exporter
    └── time.ts              # Single units boundary (ms <-> seconds <-> M:SS.mmm)
```

### The Decoupled 60fps Audio Clock (Zero React State Churn)

The most common performance trap in audio web apps is storing playback time in top-level React state (e.g. `const [currentTime, setCurrentTime] = useState(0)` updated via `requestAnimationFrame` or `timeupdate`).

At 60 frames per second, pushing high-frequency clock ticks through React forces the entire tree—canvas, 28 lyric cards, inspector, and timeline segments—to re-evaluate 60 times a second. That causes stutter and sluggish drag interactions.

Instead, I decoupled the audio clock:

- [`player.ts`](apps/web/src/audio/player.ts) encapsulates the native `<audio>` element inside a clean `AudioController`.
- High-frequency listeners register directly with the controller.
- [`TimeClock.tsx`](apps/web/src/audio/TimeClock.tsx) and the waveform's playhead needle update their own DOM nodes and CSS transforms directly on tick.
- React components only re-render when actual state changes (a line is selected, a segment is trimmed, or play/pause toggles). The result is 60fps scrubbing with near-zero CPU overhead.

### Pure Canvas Waveform

Rather than importing a massive library like `wavesurfer.js` or `peaks.js` (which bring heavy bundle weight, custom DOM wrappers, and rigid styling), I wrote the peak extraction and canvas renderer directly:

- [`decode.ts`](apps/web/src/audio/decode.ts) decodes the audio file with native `AudioContext.decodeAudioData`.
- [`peaks.ts`](apps/web/src/audio/peaks.ts) samples the raw PCM buffer into 800 min/max peak buckets.
- [`WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx) renders the waveform to an HTML5 `<canvas>` with theme-aware gradient fills.

---

## 3. What I Chose vs. What I Deliberately Skipped

### What I Chose

- **16x High-Detail Zoom & Adaptive Ticks**: At 1x zoom on a 222-second song, 1 second of audio is only ~4 pixels wide. Rapid vocal phrases or 1-second lines were simply too small to grab. I expanded zoom up to 16x (~72px/s) and added preset jump pills (`1x`, `2x`, `4x`, `8x`, `16x`) plus `Cmd/Ctrl + Wheel` zooming. Ruler ticks dynamically adapt from 20s gaps down to 1s/2s marks.
- **Full Keyboard Ergonomics**: <kbd>Space</kbd> for play/pause, <kbd>Enter</kbd> to stamp lines, <kbd>Cmd+Z</kbd>/<kbd>Cmd+Y</kbd> for undo/redo, <kbd>Delete</kbd> to remove segments, <kbd>←</kbd>/<kbd>→</kbd> to nudge.
- **Bring-Your-Own-Track (File Picker & Paste Box)**: The README flagged this as the one pass/fail requirement. I built direct local audio file loading (via `URL.createObjectURL`) and lyric sheet pasting, so you can drop any MP3/WAV and align it immediately.
- **LRC Import & Export**: Any timing work done in the app can be downloaded as standard `.lrc` files compatible with Spotify, Apple Music, and media players.
- **Optimistic Concurrency & 409 Handling**: The store tracks the server `version` and handles version conflicts gracefully without wiping in-flight user edits.

### What I Deliberately Skipped

- **Machine Learning Auto-Alignment**: The brief mentioned there is no machine guess. I resisted the urge to fake an alignment heuristic or call an external Whisper/STT API. The user is the timing authority; the job was to make human alignment frictionless.
- **Heavy UI Component Libraries**: No Material UI, AntD, or Tailwind. Clean CSS custom properties (`--bg-primary`, `--accent`, `--border`, etc.) with dark and light mode support keep bundle size tiny and HMR instant.
- **Server-Side Waveform Precomputation**: Keeping peak extraction client-side keeps the backend simple, stateless, and portable.

---

## 4. Surprises & Gotchas (War Stories)

1. **The Trim Handle Hitbox Problem**:
   Initially, segment blocks had left and right grab handles taking up 8px of width on each side. On short 1.2-second vocal phrases at low zoom, the left and right handles overlapped, leaving zero space to click or drag the segment body itself!
   _Fix_: I converted them to zero-width invisible overlay zones with hover indicator borders (`.segment-trim-handle-left/right`). This preserves the entire segment body for clicking and dragging while keeping trim grabs comfortable.
2. **The Units Boundary**:
   The HTML5 `<audio>` element reports time in floating-point seconds, whereas the backend API and segment data model mandate integer milliseconds. Keeping this boundary razor-sharp inside [`time.ts`](apps/web/src/utils/time.ts) prevented subtle 1ms rounding errors and canvas drift.
3. **Pinch-to-Zoom Event Capturing**:
   When zooming in from 1.0x with trackpad pinch or mouse wheel (`Cmd + Wheel`), standard scroll container handlers early-exited because `scrollWidth <= clientWidth`. We had to explicitly intercept meta/ctrl wheel events before the scroll check to enable natural cursor-centered zoom.

---

## 5. If I Had More Time (Next Steps)

- **Word-Level / Syllable Timing**: Sub-dividing line segments into individual syllable timestamps (for bouncing-ball karaoke).
- **Spectrogram View**: An optional FFT frequency view behind the waveform to see vocal formant frequencies visually.
- **Multi-Track Backend Support**: Expanding `apps/api` with SQLite tables to store multiple user-uploaded songs.

---

Thanks again for reading, and I hope you enjoy playing with the editor!
