# Decisions Log

This document records architectural, design, and implementation decisions made during the development of the Lyric Alignment tool, in accordance with the repository instructions.

Each decision records:

- **Commit SHA**: The commit associated with the decision
- **Context**: The problem or requirement prompting the decision
- **Decision**: What was decided and implemented
- **Rationale & Trade-offs**: Why this approach was chosen and what trade-offs were weighed
- **Alternatives Rejected**: What other options were considered and why they were not chosen
- **Assumptions**: What was inferred or assumed where the brief left room for interpretation

---

## Decision 001: Selection and Installation of Agent Skills from `mattpocock/skills`

- **Commit SHA**: `a959e480beefd14977e7a619e0ef285ec0385f80` (`a959e48`)
- **Date**: 2026-10-15

### Context

The repository setup requires integrating relevant agent skills from `mattpocock/skills` into the project's agent configuration (`.agents/skills/`) to guide engineering discipline, testing, code design, and alignment workflows.

### Decision

Curated and installed 10 highly relevant skills into `.agents/skills/`:

1. `tdd` (engineering): Test-driven development with red-green-refactor vertical slices and pre-agreed seams.
2. `codebase-design` (engineering): Deep modules with simple interfaces and clean architectural seams.
3. `code-review` (engineering): Two-axis code review checking standards and spec faithfulness.
4. `diagnosing-bugs` (engineering): Systematic bug diagnosis and regression testing loop.
5. `prototype` (engineering): Throwaway prototypes for rapid UX/audio interaction validation.
6. `grill-me` (productivity): Relentless questioning to eliminate ambiguity and stress-test assumptions.
7. `grilling` (productivity): Core interview primitive powering structured requirement grilling.
8. `to-spec` (engineering): Synthesizing conversations and requirements into crisp technical specifications.
9. `to-tickets` (engineering): Breaking specifications into incremental tracer-bullet tickets.
10. `implement` (engineering): Systematic ticket implementation driving TDD at pre-agreed seams.

### Rationale & Trade-offs

- **High leverage**: We focused exclusively on skills that directly enhance frontend architecture quality, audio/timing precision, test coverage (Playwright/Vitest), and user interaction design.
- **Minimal cognitive load**: Avoided installing the entire repository bulk, keeping agent context fast and focused.

### Alternatives Rejected

- **Installing all skills wholesale**: Rejected because it pulls in irrelevant tooling (e.g., cloud infra bash wizards (`wizard`), GitHub/GitLab issue tracker triage automations (`triage`), interactive teaching/courseware creation (`teach`), workshop exercises (`scaffold-exercises`), and shell guardrails specific to other CLI tools (`git-guardrails-claude-code`)).
- **Installing via npm global package only**: Rejected because project-local `.agents/skills` makes the workflow self-contained, reproducible, and tracked in version control for any agent or developer running in this repo.

### Assumptions

- The Antigravity agent discovers workspace skills located under `.agents/skills/<skill-name>/SKILL.md` as specified in the customization guide.

---

## Decision 002: Streamlining Agent Skills by Removing Issue-Tracker Dependencies

- **Commit SHA**: `ec50cac81ad1db91264dd8b95fbce261e4efc3ee` (`ec50cac`)
- **Date**: 2026-10-15

### Context

Upon reviewing the installed skills and the project scope, several skills (`to-tickets`, `to-spec`, and `implement`) presupposed an external multi-developer issue-tracker environment (e.g., GitHub/GitLab issues with `ready-for-agent` triage labels and ticket-deconstruction ceremonies). The take-home task requires fast, cohesive frontend development guided directly by vertical architectural slices documented in `decisions.md`.

### Decision

Pruned `.agents/skills/` to remove:

1. `to-tickets`: Ticket generation for external issue trackers.
2. `to-spec`: Issue-tracker specification generation and label publishing.
3. `implement`: Ticket-by-ticket orchestrator geared towards external issue trackers.

Retained the core engineering and design skills:

- `tdd`: Red-green-refactor for pure algorithmic logic (time math, collision clamping, LRC export).
- `codebase-design`: Clean, deep module boundaries (audio engine, state store, canvas renderer, UI).
- `diagnosing-bugs`: Systematic debugging for browser audio sync and Web Audio APIs.
- `prototype`: Rapid UI and interaction throwaway testing.
- `grilling` / `grill-me`: Rigorous design review and assumption stress-testing.
- `code-review`: Two-axis verification against repo standards and spec requirements.

### Rationale & Trade-offs

- **Zero Process Overhead**: Eliminates ticket file clutter and bureaucratic ceremonies that slow down pair programming.
- **Tighter Feedback Loop**: Aligns our development process directly with the repository's `decisions.md` requirement—each architectural or interaction choice is made, implemented, committed, and logged in real-time.
- **Trade-off**: Without `to-tickets`, tracking is maintained via atomic git commits and `decisions.md` entries rather than standalone markdown ticket artifacts.

### Alternatives Rejected

- **Keeping `to-tickets` and `to-spec`**: Rejected because creating simulated issue tracker tickets adds administrative noise without adding value to the candidate submission or grader review.

### Assumptions

- Development proceeds via feature/architectural slices committed incrementally with corresponding `decisions.md` entries.

---

## Decision 003: Establishing Frontend Engineering Standards & Workspace Rules in `.agents/AGENTS.md`

- **Commit SHA**: `336ebb970f5e182390a775f0a0669c2794eb38e8` (`336ebb9`)
- **Date**: 2026-10-15

### Context

Before writing core UI or business logic, frontend industry standards require establishing explicit workspace boundaries, type safety guardrails, and architectural conventions. Without these instructions, AI assistants and developers risk introducing conflicting libraries (e.g., ad-hoc CSS utility collisions), leaking `any` types, triggering 60fps React re-render churn during audio playback, or breaking the single units boundary.

### Decision

Created [`.agents/AGENTS.md`](.agents/AGENTS.md) defining strict engineering standards:

1. **Monorepo & Package Management**: Clear boundaries in `pnpm` workspace (`apps/api`, `apps/web`), running scripts via `pnpm --filter`, and preserving the single-origin `/api` Vite proxy model.
2. **Strict TypeScript & Domain Integrity**: Zero `any` types allowed; strict interfaces for domain models and API payloads.
3. **Single Units Boundary Enforcement**: Audio duration in float seconds (`duration_seconds`), segments in integer milliseconds (`start_ms`, `end_ms`).
4. **Styling & Component Boundaries**: Unified CSS custom property design system without injecting external conflicting CSS or UI frameworks; deep modules with clean seams.
5. **Real-time Audio Performance**: Decoupling 60Hz playback animation/scrubbing from top-level React state to prevent component churn; decoding peaks once via Web Audio API.
6. **Pre-commit Verification Gates**: Requiring typecheck (`pnpm --filter @fixture/web run typecheck`) and Playwright tests (`pnpm test`) before commits.

### Rationale & Trade-offs

- **High Consistency & Safety**: Prevents common AI hallucinations, regressions, and performance degradation during rapid iterative development.
- **Auditable Quality**: Codifies industry best practices directly into the repository customization layer recognized by the agent.
- **Trade-off**: Requires discipline in strictly typing all API and audio boundaries, avoiding quick-and-dirty `any` assertions.

### Alternatives Rejected

- **Relying on ad-hoc developer memory**: Rejected because context can be lost across chat turns and different AI agent sessions.
- **Scaffolding heavy Husky/lint-staged dependencies**: Rejected because adding external pre-commit hook packages would mutate the project's lockfile and dependencies unnecessarily when `pnpm --filter @fixture/web run typecheck && pnpm test` provides the exact same verification gate in our commit protocol.

### Assumptions

- `.agents/AGENTS.md` is loaded by the agent as the authoritative workspace instructions document per Antigravity customization specifications.

---

## Decision 004: UI Component Architecture with Radix UI Primitives & Lucide Icons (React 18)

- **Commit SHA**: `2488bdbdf7ef20ad2c286d99ef835ddc7b275bf1` (`2488bdb`)
- **Date**: 2026-10-15

### Context

To build an accessible, responsive, and tactile audio alignment interface (dialogs for song loading, timeline zoom sliders, tooltips for keyboard shortcuts, context menus for segment operations) without library bloat or conflicting CSS frameworks, we require headless primitives that adhere strictly to React 18 without requiring a framework version bump.

### Decision

Installed Radix UI primitives and Lucide icons in `apps/web`:
- `@radix-ui/react-dialog` (`^1.3.1`): For accessible "Load Song / Bring Your Own Track" modals.
- `@radix-ui/react-slider` (`^1.6.1`): For smooth timeline zoom, scrub control, and playback volume.
- `@radix-ui/react-tooltip` (`^1.4.1`): For keyboard shortcut discoverability (e.g., `Space: Play/Pause`, `Enter: Stamp`).
- `@radix-ui/react-dropdown-menu` (`^2.2.1`): For contextual segment and export actions.
- `lucide-react` (`^1.57.0`): Clean, consistent SVG icon set for audio transport and editing controls.

### Rationale & Trade-offs

- **Headless & Flexible**: Radix UI primitives provide fully accessible WAI-ARIA compliant state and keyboard navigation while leaving 100% of the styling to our CSS design system.
- **Zero Style Pollution**: Avoids heavy, opinionated CSS frameworks that clash with our sleek custom property theme or cause specificity wars.
- **React 18 Stability**: Maintains full compatibility with the existing React 18 setup without forcing unnecessary React 19 / framework migration steps.
- **Trade-off**: Requires writing custom CSS for the dialog, slider, and tooltip components rather than using pre-baked component themes.

### Alternatives Rejected

- **Material UI (MUI) / Ant Design**: Rejected due to bundle weight, rigid runtime CSS-in-JS overhead, and potential performance impact during high-frequency audio playback.
- **Upgrading to React 19**: Rejected because the assignment scaffold is pinned to React 18.3.1; keeping dependencies stable reduces upgrade churn and potential compatibility risks with test harnesses.
- **Building accessible modal and slider primitives from scratch**: Rejected because edge cases (focus trapping, screen readers, keyboard navigation, portal management) are already solved and hardened in Radix UI.

### Assumptions

- Radix UI primitives will be styled exclusively using our project CSS custom properties in `apps/web/src/styles.css`.

---

## Decision 005: Domain Modeling, Time Seam Architecture & LRC Serialization (Step 1)

- **Commit SHA**: `76a150a2e260907fc29433989c7ce42eaeb384c1` (`76a150a`)
- **Date**: 2026-10-15

### Context

To avoid scattering time math and loose types across React components, modern frontend engineering requires establishing an authoritative domain model and isolating unit conversion at pure presentation seams. Furthermore, the single units boundary specified in the project rules requires strict differentiation between audio float seconds and segment integer milliseconds.

### Decision

Implemented Step 1 of the vertical slice roadmap:
1. **Domain Types** ([`apps/web/src/types.ts`](apps/web/src/types.ts)): Defined complete interfaces (`LyricLine`, `AlignmentSegment`, `TrackData`, `PutAlignmentPayload`, `PutAlignmentResponse`, `ConflictErrorBody`, `SelectionState`, `HistorySnapshot`).
2. **Pure Time Math Module** ([`apps/web/src/utils/time.ts`](apps/web/src/utils/time.ts)):
   - `formatTime`: Converts integer ms to `M:SS.mmm`.
   - `formatTimeShort`: Converts integer ms to `M:SS` for timeline rulers.
   - `parseTimeToMs`: Flexible parser for user manual inputs (`M:SS.mmm`, `M:SS`, `SS.mmm`).
   - `clampSegment`: Clamps segment ranges within `[0, maxDurationMs]` respecting `minLengthMs`.
   - `nudgeSegments`: Pure multi-segment shifting utility that offsets selected segments by `deltaMs` while strictly respecting timeline boundaries.
3. **LRC Export & Parser** ([`apps/web/src/utils/lrc.ts`](apps/web/src/utils/lrc.ts)):
   - `exportLrc`: Generates standard `[mm:ss.xx]` synchronized lyric files with header metadata.
   - `parseLrc`: Parses imported `.lrc` files into timed line structures.
4. **Unit Test Harness with Vitest** ([`time.test.ts`](apps/web/src/utils/time.test.ts), [`lrc.test.ts`](apps/web/src/utils/lrc.test.ts)): Installed Vitest 2.x and established 10 unit tests covering edge cases.

### Rationale & Trade-offs

- **Zero Leakage of Time Conversions**: Pure utility functions guarantee that components never perform ad-hoc `Math.round(sec * 1000)` or string manipulation inline.
- **TDD Safety Net**: Unit tests immediately exposed and fixed a boundary edge case in `clampSegment` before it could ever hit UI code.
- **Trade-off**: Added Vitest as a devDependency in `apps/web` to provide sub-second unit test execution for pure algorithmic logic without incurring Playwright browser startup overhead.

### Alternatives Rejected

- **Using Date or moment/dayjs**: Rejected because audio timestamps represent relative elapsed offsets rather than calendar dates; native integer millisecond arithmetic is faster, zero-dependency, and exact.
- **Relying solely on Playwright E2E for unit math**: Rejected because spinning up Chromium for basic string formatting and clamping tests slows the developer feedback loop from ~280ms to several seconds.

### Assumptions

- The minimum segment duration is set to 200ms (`minLengthMs = 200`) to prevent zero-width or unclickable timeline blocks.

---

## Decision 006: Contract-First OpenAPI Specification & Automated Type Generation via `openapi-typescript`

- **Commit SHA**: `a845f0629bc1e43486c9d09c3fb46e10aa2da9c0` (`a845f06`)
- **Date**: 2026-10-16

### Context

Hand-written TypeScript types for backend endpoints can drift over time and risk subtle regressions when server schemas change. To establish contract fidelity across the `apps/api` and `apps/web` monorepo boundaries, modern frontend engineering relies on an OpenAPI contract paired with automated code generation.

### Decision

Implemented contract-first type synchronization:
1. **OpenAPI 3.1 Contract** ([`apps/api/openapi.yaml`](apps/api/openapi.yaml)):
   - Formally documented all endpoints: `GET /api/v1`, `GET /api/v1/track`, `PUT /api/v1/track/alignment`.
   - Defined strict component schemas for `LyricLine`, `AlignmentSegment`, `AlignmentData`, `TrackPayload`, `PutAlignmentRequest`, `PutAlignmentResponse`, `BadRequestError` (400), and `ConflictError` (409).
2. **Type Generation via `openapi-typescript`** ([`apps/web/src/api-schema.d.ts`](apps/web/src/api-schema.d.ts)):
   - Installed `openapi-typescript` (`^7.13.0`) in `apps/web`.
   - Added npm script `"typegen:api"` in `apps/web/package.json` and root `package.json`.
3. **Bound Domain Types to Generated Schemas** ([`apps/web/src/types.ts`](apps/web/src/types.ts)):
   - Re-exported domain models (`LyricLine`, `AlignmentSegment`, `TrackData`, `PutAlignmentPayload`, etc.) directly from `components['schemas']`.

### Rationale & Trade-offs

- **Zero Type Drift**: Any modification to the API contract immediately cascades into compile-time TypeScript errors on the frontend, catching mismatched payloads before runtime.
- **Self-Documenting API**: Provides an exact, machine-readable specification of the fixture server's behavior, errors, and units.
- **Trade-off**: Requires running `pnpm typegen:api` if the API schema is modified, though generation executes in under 40ms.

### Alternatives Rejected

- **Manual dual-maintenance of types**: Rejected because manually maintaining matching types in two separate applications leads to drift and silent bugs.
- **Heavy runtime schema validators (e.g., Zod / tRPC)**: Rejected because introducing full RPC or heavy runtime parsing libraries adds bundle weight and alters the lightweight Node HTTP fixture server unnecessarily.

### Assumptions

- The backend routes in `apps/api/src/server.js` strictly conform to the schemas specified in `apps/api/openapi.yaml`.

---

## Decision 007: Audio Peak Extraction & Downsampling Seam (Micro-Step 2A)

- **Commit SHA**: `adb70af4b706c624647900b740523297a7605e7e` (`adb70af`)
- **Date**: 2026-10-16

### Context

An uncompressed 2-minute audio file decoded in the browser contains over 5 million floating-point PCM audio samples (`AudioBuffer.getChannelData`). Attempting to draw raw audio data directly onto an HTML5 canvas would freeze the UI and degrade performance. A fast, pure mathematical downsampling function is needed to extract peak amplitudes into a fixed number of visual waveform bars (e.g. 400-1200 bars).

### Decision

Implemented pure audio downsampling utilities:
1. **Peak Extractor** ([`apps/web/src/audio/peaks.ts`](apps/web/src/audio/peaks.ts)):
   - `extractPeaks(channelData: Float32Array, targetBarCount: number): Float32Array`: Partitions the millions of raw PCM samples into `targetBarCount` discrete buckets, finds the peak absolute amplitude per bucket, and clamps to `[0.0, 1.0]`.
   - `mergeStereoToMono(leftChannel: Float32Array, rightChannel?: Float32Array): Float32Array`: Combines stereo channels by averaging sample amplitudes.
2. **Unit Tests with Vitest** ([`apps/web/src/audio/peaks.test.ts`](apps/web/src/audio/peaks.test.ts)):
   - Verified bucket downsampling, peak absolute detection, clamping, edge cases (empty buffers, small sample sets), and stereo-to-mono downmixing.

### Rationale & Trade-offs

- **Decoupled Math**: Isolate numerical audio calculations from DOM canvas rendering and Web Audio lifecycle methods, enabling instant unit testing and predictable caching.
- **Microsecond Rendering**: Reducing 5,000,000 samples to 800 float values allows the canvas to render the entire song waveform in under 1 millisecond.
- **Trade-off**: High-frequency transients that occur within a single bucket are represented by their peak amplitude rather than RMS (root-mean-square) energy, which is standard for lyric alignment waveforms where peak visual prominence is preferred.

### Alternatives Rejected

- **Computing peaks on every frame**: Rejected because recalculating 5 million samples at 60fps causes severe UI stutter.
- **Third-party waveform extraction libraries**: Rejected to avoid unnecessary dependency weight when peak extraction is cleanly expressed in ~30 lines of pure TypeScript.

### Assumptions

- The primary audio visualization displays normalized amplitude bars from 0.0 to 1.0.

---

## Decision 008: Web Audio Decoding Pipeline & Peak In-Memory Cache (Micro-Step 2B)

- **Commit SHA**: `9f20f3377755f1ee5b56574f8a706599b47e5033` (`9f20f33`)
- **Date**: 2026-10-16

### Context

After implementing pure peak downsampling (Decision 007), the application requires an asynchronous decoding pipeline that converts raw audio file bytes (from a remote HTTP URL or a user-dropped local `File` object) into an uncompressed `AudioBuffer`, processes the stereo channels, and caches the resulting peak arrays so subsequent track switches don't trigger redundant network requests or audio decoding cycles.

### Decision

Implemented [`apps/web/src/audio/decode.ts`](apps/web/src/audio/decode.ts):
1. **Shared AudioContext Manager** (`getAudioContext`): Lazily instantiates and shares a single `AudioContext` across the application, handling browser autoplay policies (`state === 'suspended' -> resume()`).
2. **Buffer Decoding Seam** (`decodeAudioBuffer`): Wraps `audioCtx.decodeAudioData` cleanly into a standard Promise.
3. **Audio Buffer Processing** (`processAudioBuffer`): Unpacks multi-channel data, applies `mergeStereoToMono`, and runs `extractPeaks(monoSamples, targetBarCount)`.
4. **URL & File Ingestion Seams** (`decodeAudioFromUrl`, `decodeAudioFromFile`): Ingests remote URLs and local dropped files, caching results in an in-memory `Map`.
5. **Unit Tests with Vitest** ([`apps/web/src/audio/decode.test.ts`](apps/web/src/audio/decode.test.ts)): Verified buffer processing, channel averaging, duration extraction, and cache management.

### Rationale & Trade-offs

- **Zero Duplicate Decoding**: Caching precomputed peaks ensures that zooming the timeline or switching between songs returns instantaneously.
- **BYOT Ready**: Having both `decodeAudioFromUrl` and `decodeAudioFromFile` satisfies the Bring-Your-Own-Track requirement seamlessly.
- **Trade-off**: In-memory caching retains lightweight Float32Array peak buffers (800 floats = ~3.2 KB per song), which has negligible RAM overhead while eliminating CPU-intensive re-decoding.

### Alternatives Rejected

- **Creating a new AudioContext per request**: Rejected because browsers enforce strict limits (usually 6 concurrent AudioContext instances) and throw errors if too many are created.
- **Re-decoding on every zoom level change**: Rejected because downsampling from pre-decoded audio or a fixed high-resolution peak buffer is hundreds of times faster than re-running `decodeAudioData`.

### Assumptions

- The default waveform resolution of 800 peak bars provides ideal visual fidelity across common desktop display widths.

---

## Decision 009: Audio Controller & Decoupled 60fps Playback Hook (Micro-Step 2C)

- **Commit SHA**: `4961ce410dd4df8d41cf83dbdf7b4946059d0473` (`4961ce4`)
- **Date**: 2026-10-16

### Context

Audio playback clocks tick at high frequency (60Hz / `requestAnimationFrame`). Storing the current playback timestamp directly in top-level React state causes 60 full-component re-renders per second, degrading scrubbing performance and causing jank in interactive canvas elements. A mechanism is needed to decouple high-frequency playback ticks from React re-renders while still providing reactive controls for transport actions (play, pause, seek, load).

### Decision

Implemented an isolated audio transport architecture:
1. **AudioController Class** ([`apps/web/src/audio/player.ts`](apps/web/src/audio/player.ts)):
   - Encapsulates native `HTMLAudioElement` transport operations (`play`, `pause`, `togglePlay`, `seek`, `load`).
   - Runs an independent `requestAnimationFrame` loop during playback that broadcasts to `timeListeners` via `subscribeTime((timeSeconds) => void)`.
   - Emits low-frequency state transitions (`isPlaying`, `duration`) only when playback status changes.
2. **`useAudioPlayer` Hook** ([`apps/web/src/audio/useAudioPlayer.ts`](apps/web/src/audio/useAudioPlayer.ts)):
   - Connects `AudioController` to React component lifecycles.
   - Exposes reactive `isPlaying` and `duration` states, stable action callbacks, and direct time subscription.
3. **Unit Tests with Vitest** ([`apps/web/src/audio/player.test.ts`](apps/web/src/audio/player.test.ts)):
   - Verified event listener setups, play/pause state transitions, time subscription notifications, and cleanup upon unmount/destroy.

### Rationale & Trade-offs

- **Zero 60fps React State Churn**: Canvas playheads and clock tickers subscribe directly to the controller's time emitter, completely bypassing React reconciliation cycles during playback.
- **Unified Transport API**: Standardizes playback control across local files and remote backend tracks.
- **Trade-off**: Requires components rendering high-frequency playheads to use `subscribeTime` or ref-based animation rather than consuming a reactive `currentTime` state prop.

### Alternatives Rejected

- **`audio.ontimeupdate` in React state**: Rejected because HTMLAudioElement's native `timeupdate` fires at an irregular 4Hz-15Hz (too jerky for smooth 60fps playheads) and still causes unwanted React component re-renders.

### Assumptions

- Canvas waveforms and scrubbers will register direct listeners to `subscribeTime` to update visual indicators smoothly.

---

## Decision 010: Waveform Canvas Rendering & Hardware-Accelerated Playhead (Micro-Step 2D)

- **Commit SHA**: `b45b32a6886e8e89574d7df6ce15fa25916053f3` (`b45b32a`)
- **Date**: 2026-10-16

### Context

The application wireframe depicts an audio timeline featuring: (1) a time ruler with formatted interval ticks (`0:00`, `0:20`, `0:40`...), (2) a vertical mirrored waveform reflecting track amplitude, and (3) an interactive playhead needle showing the current playback position that allows click-and-drag seeking. Rendering must support High-DPI screens without blurring while guaranteeing 60fps playhead motion without React re-render penalties.

### Decision

Implemented [`apps/web/src/audio/WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx) and [`apps/web/src/audio/waveformUtils.ts`](apps/web/src/audio/waveformUtils.ts):
1. **Waveform Geometry Math** (`waveformUtils.ts`):
   - `timeToPixel` and `pixelToTime`: Pure, boundary-clamped coordinate conversion functions.
   - `calculateRulerTicks`: Dynamically generates timestamped tick markers (`0:00`, `0:20`, `0:40`...) based on track duration.
2. **High-DPI Canvas Peak Painter** (`WaveformCanvas.tsx`):
   - Renders symmetric amplitude bars around a vertical centerline matching the design aesthetic in `docs/wireframe.png`.
   - Scales canvas coordinate space by `window.devicePixelRatio` to ensure sharp rendering on Retina displays.
   - Paints time ruler ticks and borders in a dedicated upper lane (`rulerHeight = 24px`).
3. **GPU-Composited 60fps Playhead Overlay**:
   - Subscribes directly to `controller.subscribeTime(time => ...)` to update a playhead needle element via `transform: translate3d(x, 0, 0)`.
   - Bypasses React Virtual DOM reconciliation completely, keeping frame rendering cost on the GPU compositor.
4. **Interactive Seek & Drag**:
   - `onMouseDown` and drag-to-scrub listener computes horizontal offset and calls `controller.seek(targetSeconds)`.
5. **Unit Tests with Vitest** ([`apps/web/src/audio/waveformUtils.test.ts`](apps/web/src/audio/waveformUtils.test.ts)):
   - Verified time-to-pixel mappings, pixel-to-time reverse calculations, boundary clamping, and ruler tick generation.

### Rationale & Trade-offs

- **Peak Static Canvas + GPU Dynamic Needle**: Separating the static peak drawing (runs on track load or resize) from the dynamic playhead needle (runs on GPU `translate3d`) avoids clearing and repainting the entire canvas on every frame.
- **Pure Utility Seams**: Extracting geometry conversion into pure testable functions guarantees that mouse clicks and segment coordinates align with mathematical precision.
- **Trade-off**: Requires synchronizing the canvas container's responsive width via `ResizeObserver`.

### Alternatives Rejected

- **Repainting the entire waveform canvas on every 60fps tick**: Rejected because continuous 60fps `clearRect` + 800-bar path operations consume substantial CPU/battery when the audio wave itself is completely static.
- **SVG-based waveform**: Rejected because generating thousands of DOM `<rect>` elements causes high DOM memory overhead compared to a single `<canvas>`.

### Assumptions

- The playhead needle operates over the combined container width, with horizontal scrolling enabled when zoom factor > 1.

---

## Decision 011: Waveform & Audio Transport Mounting in App (Micro-Step 2E)

- **Commit SHA**: `593f0ec7a96163351ec946e6a1d0d939c43e4985` (`593f0ec`)
- **Date**: 2026-10-16

### Context

With the Web Audio decoding pipeline (Decision 008), the decoupled audio controller (Decision 009), and the waveform canvas (Decision 010) created and unit-tested in isolation, the main application view (`apps/web/src/App.tsx`) needed to be upgraded from the initial placeholder to wire together live track fetching, audio streaming, waveform peak rendering, transport controls (Play/Pause), and a direct 60fps clock readout.

### Decision

Mounted the audio and waveform subsystems into [`apps/web/src/App.tsx`](apps/web/src/App.tsx):
1. **Track Ingestion & Audio Buffer Decoding**:
   - Fetches the active track via `api<TrackData>('/api/v1/track')`.
   - Passes `track.audio_url` into `useAudioPlayer.load()`.
   - Asynchronously decodes the audio via `decodeAudioFromUrl(track.audio_url)` to populate waveform `peaks`.
2. **Decoupled Live Clock Readout** ([`apps/web/src/audio/TimeClock.tsx`](apps/web/src/audio/TimeClock.tsx)):
   - Implemented `TimeClock` component that registers directly with `controller.subscribeTime` to update its DOM `textContent` (`M:SS.mmm / M:SS.mmm`) on 60fps clock ticks without triggering `App` component re-renders.
3. **Mounted Waveform Canvas**:
   - Renders `WaveformCanvas` with track duration and peaks, providing instant visual feedback and click-to-seek scrubbing.
4. **Transport Controls**:
   - Added accessible Play/Pause toggle with Lucide icons (`Play`, `Pause`, `Music`).

### Rationale & Trade-offs

- **Immediate User Feedback**: The user can now see real audio waveform peaks, press play, see the red playhead needle sweep across the screen, and click to seek.
- **Strict Performance Boundary Maintained**: Neither audio playback ticks nor the time clock trigger React state changes or re-renders in `App`.
- **Trade-off**: Peak extraction requires an initial fetch and decode upon track load (~150ms for a 2-minute MP3), during which a subtle "Decoding audio peaks..." indicator is displayed.

### Alternatives Rejected

- **Keeping native browser `<audio controls>` widget**: Rejected because native audio widgets cannot be synchronized with custom waveform playheads or styled to match the wireframe design.

### Assumptions

- The backend serves audio files with byte-range and CORS support, enabling `decodeAudioData` in the browser.

---

## Decision 012: Alignment State Management with `alignmentReducer` & Undo/Redo (Micro-Step 3A)

- **Commit SHA**: `2e951c6e14b0b8c6e2bb7a88e99ef3f80c653ceb` (`2e951c6`)
- **Date**: 2026-10-16

### Context

Managing lyric lines and alignment segments requires handling complex user interactions: placing segments onto the timeline, adjusting start/end boundaries, nudging multiple segments together, splitting or merging lines, maintaining selection states, and supporting undo/redo. Furthermore, the API contract requires tracking server `version` and gracefully handling `409 Conflict` errors via state reconciliation. Scattering this state across components creates synchronization bugs; a centralized, pure state machine is needed.

### Decision

Implemented [`apps/web/src/store/alignmentReducer.ts`](apps/web/src/store/alignmentReducer.ts) and [`apps/web/src/store/useAlignmentStore.ts`](apps/web/src/store/useAlignmentStore.ts):
1. **Pure Reducer State Model**:
   - `lines: LyricLine[]`: The ordered list of lyric lines with their text and line indices.
   - `segments: AlignmentSegment[]`: Time-stamped segments (`line_id`, `start_ms`, `end_ms`).
   - `version: number`: The optimistic concurrency version matching the server API.
   - `selectedLineIds: Set<string>`: Set of selected line identifiers for single- or multi-select operations.
   - `history: { past: StateSnapshot[]; future: StateSnapshot[] }`: Immutable undo/redo stacks capped at 50 snapshots.
2. **Action Handlers**:
   - `INIT`: Populates initial lines, segments, and version.
   - `SET_LINES` / `REORDER_LINES`: Updates or reorders lines and updates zero-based line indices.
   - `SET_SEGMENT`: Creates or updates a segment, enforcing `clampSegment` boundaries.
   - `DELETE_SEGMENT`: Removes a timing segment while keeping the lyric line.
   - `NUDGE_SELECTED`: Offsets all currently selected segments forward or backward by `deltaMs`.
   - `SPLIT_SEGMENT`: Splits a single line and its timing into two sequential lines.
   - `MERGE_WITH_NEXT`: Merges a line with the adjacent subsequent line and combines timing boundaries.
   - `SELECT_LINE` / `SELECT_MULTIPLE` / `CLEAR_SELECTION`: Flexible selection management with multi-select toggle.
   - `UNDO` / `REDO`: Rolls back or steps forward through historical state snapshots.
   - `RECONCILE_CONFLICT`: Incorporates incoming server lines, segments, and version upon HTTP 409.
3. **Unit Tests with Vitest** ([`apps/web/src/store/alignmentReducer.test.ts`](apps/web/src/store/alignmentReducer.test.ts)):
   - 7 unit tests verifying state initialization, segment clamping, undo/redo cycles, multi-segment nudging, line split, line merge, and line reordering.

### Rationale & Trade-offs

- **Zero External Dependencies**: Implemented using React's native `useReducer` and TypeScript instead of adding third-party state managers (Redux, Zustand, MobX), avoiding dependency bloat.
- **Pure Testability**: Because the reducer is 100% pure TypeScript without DOM or React hooks, all mutations and edge cases execute in Vitest in under 30ms.
- **Linear Undo/Redo**: Snapshotting line and segment arrays enables flawless undo/redo for all editing operations.
- **Trade-off**: Capped undo history at 50 snapshots to prevent memory overhead during extended alignment sessions.

### Alternatives Rejected

- **Zustand / Redux Toolkit**: Rejected because native `useReducer` provides identical ergonomics for local document editing with zero bundle weight and full type safety.
- **Component-level local state**: Rejected because synchronizing selection, timeline blocks, lyrics lists, keyboard shortcuts, and export actions across separate component trees would introduce race conditions and state fragmentation.

### Assumptions

- Lyric lines and segments maintain referential mapping via immutable `line_id` strings.

---

## Decision 013: Lyrics Pane Component (`LyricsList`), Placement Statistics & Transport Undo/Redo (Micro-Step 3B)

- **Commit SHA**: `639f0a49bc42bbd92305372338ff9eb7ba1bf137` (`639f0a4`)
- **Date**: 2026-10-16

### Context

The application layout requires a dedicated left pane presenting the song's lyric lines, their indexed order, placement status (`[ 0:14 - 0:18 ]` vs `Unplaced`), quick preview triggers, and selection states. During playback, the active line being sung must be highlighted and automatically scrolled into view. However, directly querying playback time on every 60fps tick could cause re-renders of all 28 lines 60 times a second.

### Decision

Implemented [`apps/web/src/lyrics/lyricsUtils.ts`](apps/web/src/lyrics/lyricsUtils.ts) and [`apps/web/src/lyrics/LyricsList.tsx`](apps/web/src/lyrics/LyricsList.tsx), mounted into [`apps/web/src/App.tsx`](apps/web/src/App.tsx):
1. **Pure Geometry & Placement Helpers** (`lyricsUtils.ts`):
   - `getLineSegmentMap`: Creates an O(1) map of `line_id -> AlignmentSegment`.
   - `findActiveLineId`: Determines which line segment encompasses `timeMs`.
   - `countPlacementStats`: Computes counts for total, placed, and unplaced lines.
2. **Decoupled Playback Tracking in `LyricsList`**:
   - Subscribes to `controller.subscribeTime`.
   - Updates React `activeLineId` state *only* when the song transitions between line boundaries (occurring once every 2–5 seconds, ~0.3Hz), eliminating 60fps React churn while providing reactive UI styling.
3. **Interactive Features**:
   - Filter tabs: `All`, `Placed`, and `Unplaced` with real-time count badges.
   - Follow Toggle: Smoothly auto-scrolls the active playing line into view via `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.
   - Quick Play Snippet: Clicking any placed line pill immediately seeks audio to `segment.start_ms / 1000`.
   - Line Selection: Primary click selects a line; `Cmd`/`Ctrl`/`Shift` toggles multi-selection.
   - Line Un-placement: Direct delete button to un-place any segment.
4. **Transport Controls & Keyboard Shortcuts**:
   - Added Undo and Redo buttons to the top transport bar with disabled states (`canUndo`, `canRedo`).
   - Wired global keyboard shortcuts: `Space` for play/pause, `Cmd+Z` / `Ctrl+Z` for undo, `Cmd+Shift+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` for redo.
5. **Unit Tests with Vitest** ([`apps/web/src/lyrics/lyricsUtils.test.ts`](apps/web/src/lyrics/lyricsUtils.test.ts)):
   - 3 unit tests verifying segment mapping, active line identification, and placement statistics (totaling 37 passing unit tests).

### Rationale & Trade-offs

- **Strict 60fps Rule Compliance**: Restricting state updates to line boundary transitions preserves 60fps rendering budgets for canvas playheads and waveforms.
- **Two-Column Responsive Grid**: Sets up a layout (`minmax(320px, 380px) 1fr`) matching the wireframe design.
- **Trade-off**: Scrolling during manual user interaction is suppressed unless the user leaves `Follow` enabled.

### Alternatives Rejected

- **Updating `activeLineId` on every 60fps frame**: Rejected because running React reconciliations across 28 line items at 60Hz wastes CPU and battery.
- **Single column stacked layout**: Rejected because lyrics sheet and audio timeline must be simultaneously visible for interactive stamping and alignment.

### Assumptions

- Audio playback durations are non-negative and track line IDs remain stable throughout a session.

---

## Decision 014: Interactive Segment Lane & Timeline Drag Handles (Micro-Step 3C)

- **Commit SHA**: `12c78641eb1b4bb1eb4852e9ef4599723ec0872d` (`12c7864`)
- **Date**: 2026-10-16

### Context

The application wireframe depicts placed lyric segments rendered directly below the waveform peaks along the audio timeline. Users need visual feedback on placed segments, with the ability to: (1) drag the left edge to trim `start_ms`, (2) drag the right edge to trim `end_ms`, (3) drag the block body to shift the segment along the timeline, and (4) double-click to preview playback from that line's start time. Empty space on the track must still allow click-to-seek without interference.

### Decision

Implemented [`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts) and [`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx), integrated into [`apps/web/src/audio/WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx):
1. **Pure Geometry & Drag Helpers** (`segmentUtils.ts`):
   - `calculateSegmentBounds`: Maps millisecond start/end times to timeline pixel coordinates with a guaranteed minimum visible width (16px) for unhampered clicking and trimming.
   - `dragTrimLeft`: Clamps start edge trim to `[0, end_ms - minLengthMs]`.
   - `dragTrimRight`: Clamps right edge trim to `[start_ms + minLengthMs, maxDurationMs]`.
   - `dragShiftSegment`: Moves `start_ms` and `end_ms` together while strictly preserving duration and clamping within `[0, durationMs]`.
2. **Interactive `SegmentLane` Component**:
   - Left trim handle (`ew-resize` cursor): Live edge trimming.
   - Right trim handle (`ew-resize` cursor): Live edge trimming.
   - Segment body (`grab` / `grabbing` cursor): Drags to shift segment along the timeline; click selects line; double-click seeks to start and triggers audio preview.
   - Set `pointerEvents: 'none'` on the lane container with `pointerEvents: 'auto'` on individual segment blocks, allowing clicks on empty timeline spaces to bubble directly to `WaveformCanvas` for playhead seeking.
3. **Waveform Canvas Integration**:
   - Updated `WaveformCanvas` to accept `segmentLaneHeight = 50px` and render a dedicated track baseline and background lane.
   - Enhanced children rendering to support `children?: React.ReactNode | ((totalWidth: number) => React.ReactNode)`, seamlessly supplying the dynamic, zoom-aware `totalWidth` to overlay lanes.
4. **Unit Tests with Vitest** ([`apps/web/src/audio/segmentUtils.test.ts`](apps/web/src/audio/segmentUtils.test.ts)):
   - 8 unit tests verifying pixel coordinate conversion, minimum width guarantees, left trim clamping, right trim clamping, and segment shifting (totaling 45 passing unit tests).

### Rationale & Trade-offs

- **DOM Overlays vs. Canvas Path Rendering**: Rendering segment blocks as styled DOM elements over the static canvas provides native text rendering, crisp rounded corners, accessible tooltips, and responsive cursor switching (`ew-resize` vs `grab`) without re-painting the canvas on drag.
- **Function Children Pattern**: Exposing `totalWidth` directly to children guarantees that segment coordinates always match the canvas geometry.
- **Trade-off**: Requires synchronizing drag listeners on `window` to prevent cursor loss during fast scrubbing.

### Alternatives Rejected

- **Drawing segment blocks directly inside Canvas 2D context**: Rejected because implementing hit testing, text clipping, multi-state cursors, and selection highlights in 2D canvas is more bug-prone than native HTML/CSS elements.

### Assumptions

- The minimum segment duration remains 200ms to avoid zero-width segment states.

---

## Decision 015: Left Sidebar Lyric Ingestion & Drag-to-Place on Waveform (Micro-Step 3D)

- **Commit SHA**: `37da020615fb3e89bf8ef877085a6a3aeafcaae3` (`37da020`)
- **Date**: 2026-10-16

### Context

The application wireframe features a dedicated ingestion box at the top of the left sidebar containing a `"Paste full lyrics..."` textarea, an `Add all lines` batch parser, a `+ Add line` button, and line drag handles (`≡`) annotated with *"drag line onto waveform to place"*. This enables quick lyric entry and intuitive spatial placement onto the audio track without tedious manual time entry.

### Decision

Implemented full sidebar ingestion and timeline drag-and-drop:
1. **Reducer & Store Extension**:
   - Added `ADD_LINE` action to [`alignmentReducer.ts`](apps/web/src/store/alignmentReducer.ts) with full undo/redo history recording and automated zero-based index assignment.
   - Added unit test in [`alignmentReducer.test.ts`](apps/web/src/store/alignmentReducer.test.ts) (totaling 46 passing unit tests).
   - Exposed `addLine` in [`useAlignmentStore.ts`](apps/web/src/store/useAlignmentStore.ts).
2. **`LyricsList` Ingestion UI** ([`apps/web/src/lyrics/LyricsList.tsx`](apps/web/src/lyrics/LyricsList.tsx)):
   - Added dashed `"Paste full lyrics..."` textarea matching the wireframe aesthetic.
   - Added `Add all lines` (splits text by line breaks, strips empty lines, and batch updates the store) and `+ Add line` buttons.
   - Added `LINES · N` and `N placed` wireframe subheaders.
   - Added `GripVertical` (`≡`) drag handles and native HTML5 `draggable` attributes to line cards (`e.dataTransfer.setData('text/plain', line.id)`).
3. **Timeline Drag-and-Drop Ingestion** ([`apps/web/src/audio/WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx)):
   - Added `handleDragOver` and `handleDrop` handlers to the canvas container.
   - Converts the drop event's horizontal coordinate (`e.clientX`) into an exact timestamp (`pixelToTime`).
   - Automatically initializes a clamped segment spanning `[dropMs, dropMs + 3500ms]` and selects the dropped line.

### Rationale & Trade-offs

- **Zero External Drag-and-Drop Dependencies**: Leveraging native HTML5 drag-and-drop (`draggable`, `dataTransfer`) allows dragging elements across disconnected React component trees (`LyricsList` -> `WaveformCanvas`) with zero bundle size cost.
- **Immediate User Feedback**: Dropping a line onto the waveform creates a visible segment block instantly, updates the placed count badge, and selects the block for immediate trimming.
- **Trade-off**: Dropped segments default to a reasonable 3.5-second initial duration, which the user can immediately refine using the left/right trim handles.

### Alternatives Rejected

- **External drag libraries (`dnd-kit`, `react-beautiful-dnd`)**: Rejected to avoid large third-party runtime bundles when native HTML5 drag-and-drop handles cross-container dragging seamlessly.

### Assumptions

- Pasted lyrics contain one lyric line per line break.













