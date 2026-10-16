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

---

## Decision 016: Timeline Collision Prevention, Verse Shift-Selection, Dynamic Add-Line, and Segment Lane Expansion

- **Commit SHA**: `81972134a6ef2f3274296767667bfeb75ca0a133` (`8197213`)
- **Date**: 2026-10-16

### Context

During manual and wireframe alignment testing, several UX bugs and wireframe discrepancies were identified:
1. Adding a new line from the left sidebar ingestion box repeatedly displayed `"New lyric line"` regardless of what the user entered.
2. In the timeline segment lane, segments were able to overlap each other during trimming, dragging, or dropping, violating music alignment continuity rules.
3. Users lacked the ability to shift-select an entire verse (range of lines/segments) and drag the verse as a unified block.
4. The timeline segment lane height was too cramped for comfortable trimming and grabbing.
5. The `01, 02, 03...` line index badges in the left sidebar cluttered the view and deviated from the wireframe design.

### Decision

Implemented a comprehensive suite of fixes and wireframe enhancements:

1. **Dynamic Line Ingestion** ([`apps/web/src/lyrics/LyricsList.tsx`](apps/web/src/lyrics/LyricsList.tsx)):
   - Replaced hardcoded default string with `pastedText.trim()`, allowing custom line creation from the textarea.
   - Added `onKeyDown` shortcut to allow submitting a line with `Enter` (without `Shift`).
   - Cleaned up line card presentation by removing the `01, 02, 03...` numeric index badges from both the sidebar and segment blocks.

2. **Strict Timeline Collision Prevention** ([`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts), [`apps/web/src/utils/time.ts`](apps/web/src/utils/time.ts)):
   - Left edge trimming (`dragTrimLeft`): Clamped to `prevSegmentEndMs`, preventing back-trimming across preceding segments.
   - Right edge trimming (`dragTrimRight`): Clamped to `nextSegmentStartMs`, preventing forward-trimming across following segments.
   - Single segment dragging (`dragShiftSegment`): Bounded between `[prevSegmentEndMs, nextSegmentStartMs]`.
   - Multi-segment group dragging (`nudgeSegments`): Added collision detection against unselected neighbor segments so shifting a verse never overlaps preceding or succeeding unselected blocks.
   - Collision-free drop placement (`fitDroppedSegment`): Automatically calculates non-overlapping bounds within available timeline gaps when lines are dropped from the sidebar.

3. **Verse Shift-Selection & Group Drag** ([`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx), [`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Implemented `getLineIdRange` and `anchorLineIdRef` to support standard OS-style Shift-click range selection across lines and segments.
   - Rendered the wireframe dashed multi-selection grouping box (`"N segments selected"`) with subtle border styling.
   - Dragging any segment inside the active multi-selection shifts all selected segments together via `nudgeSelected`.

4. **Expanded Segment Lane Height**:
   - Increased `segmentLaneHeight` to `68px` (overall canvas height `220px`), providing ample room for 20px trim grips and legible lyric text.

5. **Unit Tests with Vitest** ([`apps/web/src/audio/segmentUtils.test.ts`](apps/web/src/audio/segmentUtils.test.ts), [`apps/web/src/utils/time.test.ts`](apps/web/src/utils/time.test.ts)):
   - Added unit tests for `getLineIdRange`, `fitDroppedSegment`, and collision-bounded `nudgeSegments` (expanding suite to 51 passing tests).

### Rationale & Trade-offs

- **Strict Boundary Invariants vs. Overlapping Tolerance**: Audio lyrics alignment is strictly sequential and non-overlapping. Enforcing collision clamping at the calculation seam prevents invalid time states before they ever reach the state machine.
- **Unified Shift-Selection**: Supporting Shift-click in both the left sidebar and timeline allows users to naturally group verses from either perspective.
- **Trade-off**: Dropping a line into a narrow gap between two existing segments truncates the initial duration to fit the gap (with a 200ms minimum threshold).

### Alternatives Rejected

- **Allowing segments to overlap on different vertical sub-lanes**: Rejected because standard lyric alignment (and `.lrc` format) is strictly linear; multi-lane tracks complicate scrubbing and export.

### Assumptions

- Lyric lines in a song occur sequentially without concurrent overlapping voices on the primary track.

---

## Decision 017: Interchangeable Drag-and-Drop for Timeline Segments and Sidebar Lyrics

- **Commit SHA**: `cb119702fa1fb0c8a66699317578021c97a544ba` (`cb11970`)
- **Date**: 2026-10-16

### Context

While the non-overlapping constraints implemented in Decision 016 successfully prevented segment collisions, clamping `dragShiftSegment` strictly between immediate neighbors (`prevSegmentEndMs` and `nextSegmentStartMs`) inadvertently locked segments between their neighbors. Users were unable to drag a segment across the timeline past other segments to swap or interchange their positions. In real-world lyric alignment, users frequently need to correct the order of lines by swapping them directly on the timeline or dropping a line onto an existing segment to replace/interchange it.

### Decision

Implemented fully interchangeable drag-and-drop across the timeline and the lyrics sheet:

1. **Atomic State Action `INTERCHANGE_SEGMENTS`** ([`apps/web/src/store/alignmentReducer.ts`](apps/web/src/store/alignmentReducer.ts), [`apps/web/src/store/useAlignmentStore.ts`](apps/web/src/store/useAlignmentStore.ts)):
   - Swaps timing intervals between two placed segments atomically in a single state transition with full undo/redo support.
   - If one of the lines is unplaced, cleanly transfers the timing slot to the new line while unplacing the previous one.

2. **Interchange Target Detection** ([`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts)):
   - Implemented `findInterchangeTarget(otherSegments, currentStartMs, currentEndMs)` to detect if the dragged segment's center falls inside another segment or has >= 30% overlap.
   - Released in open space: clamps smoothly into the available gap using `fitDroppedSegment` with zero overlap.

3. **Interactive Timeline Interchange in `SegmentLane`** ([`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Enabled free horizontal dragging across the timeline (`[0, durationMs]`) with elevated GPU-accelerated styling (`translate3d`, `z-index: 20`, shadow).
   - Displayed active visual swap cues on the hovered target: dashed accent outline, highlight glow, and a floating `⇄ Interchange` badge.
   - On mouse release over a target, instantly swaps their timing slots via `onInterchangeSegments`.

4. **HTML5 Drag-and-Drop Ingestion Interchange** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx), [`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Dropping a line from the left sidebar directly onto an existing timeline segment triggers `onInterchangeSegments`, replacing/swapping the lines.
   - Dropping onto empty waveform canvas space places the line cleanly into the gap.

5. **Sidebar Drag-and-Drop Reordering** ([`apps/web/src/lyrics/LyricsList.tsx`](apps/web/src/lyrics/LyricsList.tsx)):
   - Added `onDragOver`, `onDragLeave`, and `onDrop` to sidebar line items, calling `reorderLines` to easily interchange and re-sequence lyrics in the sidebar.

6. **Unit Tests with Vitest** ([`apps/web/src/store/alignmentReducer.test.ts`](apps/web/src/store/alignmentReducer.test.ts), [`apps/web/src/audio/segmentUtils.test.ts`](apps/web/src/audio/segmentUtils.test.ts)):
   - Added unit tests for `INTERCHANGE_SEGMENTS` reducer cases (placed-placed swap, placed-unplaced transfer, undo/redo) and `findInterchangeTarget` overlap detection (totaling 56 passing tests).

### Rationale & Trade-offs

- **Direct Visual Swapping vs. Static Locking**: Allowing free drag across the timeline with proactive target detection provides fluid, responsive feedback while eliminating the frustration of rigid neighbor boundaries.
- **Atomic Undo**: Recording the interchange as a single history snapshot ensures that pressing <kbd>⌘Z</kbd> reverses the swap in one click rather than leaving half-updated segments.
- **Trade-off**: Requires distinguishing between center body drag (which allows interchanging) and edge trim drag (which remains clamped to prevent unintentional collisions).

### Alternatives Rejected

- **Allowing overlapping segment blocks without swapping**: Rejected because having two concurrent segments on the same audio stream violates the linear alignment model.

### Assumptions

- When users drop one segment onto another, their intent is to exchange their assigned timing intervals.

---

## Decision 018: Enforce Minimum Segment Width and Duration Preservation on Drop

- **Commit SHA**: `d0e9fe060f78d910fe2d057705fe0e7fa82b0d0c` (`d0e9fe0`)
- **Date**: 2026-10-16

### Context

When users dragged a lyric line from the left sidebar and dropped it onto the timeline, the resulting segment block frequently appeared too narrow (e.g. 16px–28px, or even narrower if dropped near the end of an open gap). Because each segment block contains two 10px trim handles, narrow blocks caused the handles to overlap and eclipse the text, making it difficult to read the lyric or grab the block for dragging.

### Decision

1. **Guaranteed Minimum Visual Width** ([`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts), [`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Increased `minBlockWidthPx` default from `16px` to `72px` in `calculateSegmentBounds`.
   - Added `minWidth: '72px'` directly to the segment block style in `SegmentLane.tsx`.
   - Guaranteed at least 52px of readable text area between the left (10px) and right (10px) trim handles.
   - Added container clamping (`clampedLeftPx = Math.max(0, Math.min(leftPx, totalWidth - widthPx))`) to prevent segments with minimum width from overflowing past the track container's right boundary.

2. **Duration Preservation in Gap Fitting** ([`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts), [`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Updated `fitDroppedSegment` so that dropping near the end of an available gap shifts the segment's start timestamp leftward (`start = Math.max(gap.start, Math.min(targetMs, gap.end - duration))`), preserving the full healthy duration (preferred `4500ms`) instead of truncating into a narrow sliver.
   - Set `minLengthMs = 500ms` so that gaps are guaranteed to accommodate a substantial segment.

3. **Unit Tests** ([`apps/web/src/audio/segmentUtils.test.ts`](apps/web/src/audio/segmentUtils.test.ts)):
   - Updated minimum pixel width test to verify $\ge 72\text{px}$.
   - Verified that dropping at the tail of an open interval shifts start left to preserve the full 3500ms–4500ms segment duration (all 56 unit tests passing).

### Rationale & Trade-offs

- **Usability Over Strict Pixel-to-Ms Scaling**: A segment representing 1 second on a 2-minute track is only 8px wide mathematically. Enforcing a 72px visual floor ensures that every lyric line remains legible and interactable without distorting the underlying playback timestamps.
- **Trade-off**: For extremely short segments in dense clusters, the visual width floor may cause visual borders to touch; trimming and dragging remain bounded by the underlying timestamps.

### Assumptions

- The minimum usable interactive touch/mouse target for a timeline segment block with dual handles is 72px.

---

## Decision 019: Pixel-Accurate Interchange Target Detection on Drag

- **Commit SHA**: `9068c5d2b63ea5d8d3ecda2a68cffae45b347b71` (`9068c5d`)
- **Date**: 2026-10-16

### Context

Users observed that the timeline segment interchange hover badge appeared inconsistently: sometimes it triggered the instant two segments overlapped, and other times it failed to trigger even when segments appeared to overlap on screen. Investigation revealed that the previous detection logic relied on a proportional millisecond threshold (`overlapMs >= targetLength * 0.3`). For short segments (e.g. 800ms), 30% was only 240ms (instant trigger), whereas for long segments (e.g. 6000ms), 30% required 1800ms of overlap before triggering. Furthermore, because visual blocks have a 72px minimum width floor, visual pixel overlap did not match raw millisecond overlap on screen.

### Decision

1. **Pixel-Coordinate Geometry Detection** ([`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts), [`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Updated `findInterchangeTarget` to accept `durationSeconds` and `totalWidth` to compute exact visual pixel bounds on the canvas container.
   - Evaluates visual pixel overlap (`overlapPx >= 8px`) and center-point containment (`draggedCenterPx >= segLeft && draggedCenterPx <= segRight`), matching 100% of what the human user sees on screen regardless of track length or segment duration.
   - Preserves pure millisecond fallback for headless test runners.

2. **Unit Tests with Vitest**:
   - All 56 unit tests passing cleanly across 9 test files.

### Rationale & Trade-offs

- **WYSIWYG ("What You See Is What You Get") Alignment**: Users interact with visual DOM elements on a screen. Evaluating overlap in rendered pixel coordinates guarantees that the visual hover cues behave with 100% predictability and zero perceived lag.
- **Trade-off**: Requires passing container width and duration into the calculation function.

### Assumptions

- An overlap of 8 pixels or center-point containment indicates clear user intent to interchange with the target segment.

---

## Decision 020: Compact Segment Min Width, Pixel-Accurate Verse Outline, and Multi-Verse Interchange

- **Commit SHA**: `841e728`
- **Date**: 2026-10-16

### Context

Three usability bugs were identified in timeline segment interaction:
1. **Excessive Segment Width for Short Lyrics**: Setting `minBlockWidthPx = 72` and CSS `minWidth: 72px` caused short syllables (e.g. "Oh", 300ms–500ms) to stretch to ~3.6s of visual timeline space, misleading the user on syllable duration.
2. **Multi-Verse Outline Misalignment**: When Shift-selecting or multi-selecting segments, the dashed selection box did not fully overlap all segments. Because the outline width was calculated using raw millisecond offsets (`(maxEnd - minStart) / durationMs * totalWidth`), it failed to account for the visual width of the rightmost segment (`bounds.leftPx + bounds.widthPx`), causing the outline to cut through the last segment.
3. **Multi-Verse Dragging Lacked Interchange**: Dragging a multi-verse group did not support interchanging with other segments; it previously dispatched continuous `nudgeSelected` actions on mousemove, flooding undo history.

### Decision

1. **Compact Minimum Segment Width** ([`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts), [`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Reduced `minBlockWidthPx` default and CSS `minWidth` from `72px` to `28px`.
   - Accommodates both 10px trim handles plus an 8px text/spacer area without inflating short lyrics into large blocks.
   - Updated unit test expectation in `segmentUtils.test.ts`.

2. **Pixel-Accurate Multi-Verse Outline** ([`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Replaced millisecond-based outline calculations with rendered visual geometry: computes `minLeftPx` (leftmost pixel of any selected segment) and `maxRightPx` (rightmost `leftPx + widthPx` of any selected segment).
   - Renders bounding box at `left: minLeftPx - 4px` and `width: (maxRightPx - minLeftPx) + 8px`, guaranteeing complete 4px padding overlap around all selected segments without clipping.
   - Added GPU-accelerated `transform: translate3d` so the dashed outline glides in sync with the segments during multi-drag.

3. **Multi-Verse Drag & Interchange** ([`apps/web/src/store/alignmentReducer.ts`](apps/web/src/store/alignmentReducer.ts), [`apps/web/src/store/useAlignmentStore.ts`](apps/web/src/store/useAlignmentStore.ts), [`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Added `INTERCHANGE_GROUP` action to `alignmentReducer`: swaps the prospective span of a multi-segment verse group with a target segment, shifting the target to the verse's original start timestamp while preserving all relative intervals between lines in the verse.
   - Supported interactive multi-drag in `SegmentLane.tsx`: computes prospective group bounds and detects interchange targets among unselected segments with the floating `"Interchange Verse"` badge.
   - If dropped in open space, commits a single clean `nudgeSelected` offset on mouseup (no history spamming).
   - Added comprehensive unit tests in `alignmentReducer.test.ts` (all 57 unit tests passing).

### Rationale & Trade-offs

- **Direct Visual Alignment**: Calculating the multi-verse outline from visual segment coordinates ensures 100% geometric consistency across all zoom and aspect ratios.
- **Atomic History**: Moving multi-verse drag commitments to `mouseup` ensures a single <kbd>⌘Z</kbd> reverses the entire move or interchange.

### Assumptions

- When dragging a multi-verse group over an unselected segment, the user's intent is to interchange the group's timing span with that target segment.

---

## Decision 021: Waveform Zoom Controls, Keyboard Shortcuts, and Viewport Tracking

- **Commit SHA**: `aa886c8`
- **Date**: 2026-10-16

### Context

The low-fidelity design wireframe specifies a `"Zoom [-] [+]"` control for the waveform and timeline area. On longer tracks, placing segments or making fine-grained millisecond adjustments to trim handles requires expanding the horizontal time scale.

### Decision

1. **Zoom State & UI Controls** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Added `zoom` state (`1.0x` to `5.0x`, step `0.5x`) mounted directly in the Waveform header matching the wireframe layout.
   - Built a segmented control group with `ZoomOut` (<kbd>-</kbd>), clickable zoom level readout (`1.0x` click-to-reset), and `ZoomIn` (<kbd>+</kbd>).
   - Added global hotkeys in `handleKeyDown`: <kbd>=</kbd>/<kbd>+</kbd> to zoom in, <kbd>-</kbd>/<kbd>_</kbd> to zoom out, and <kbd>0</kbd> to reset zoom to 1.0x.

2. **Auto-Scrolling Viewport Playhead Follow** ([`apps/web/src/audio/WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx)):
   - When zoomed in (`totalWidth > containerWidth`), the container enables horizontal scrolling (`overflowX: auto`).
   - Extended the 60fps needle subscriber callback in `WaveformCanvas` to automatically scroll the container whenever the playhead advances past the visible viewport threshold (`pixelX > scrollLeft + viewportW - 80`), ensuring the active playback position remains in view without user intervention.

3. **Responsive Scaling Across Children**:
   - `WaveformCanvas` passes the computed `totalWidth` directly to `SegmentLane`, automatically expanding segment blocks, trim handles, and ruler ticks in exact 1:1 synchronization with the audio peaks.

### Rationale & Trade-offs

- **Linear Zoom Scaling**: Scaling `totalWidth = Math.max(containerWidth, Math.floor(containerWidth * zoom))` preserves exact pixel-to-time ratios across both waveform and segment lanes.
- **Auto-Follow without React Re-renders**: The scroll follow runs inside the decoupled `subscribeTime` callback, avoiding React state updates during high-frequency playback.

### Assumptions

- 1.0x to 5.0x zoom range provides optimal granularity from macro full-song overview down to sub-100ms precision adjustments.

---

## Decision 022: 3-Line Karaoke Teleprompter Banner (Micro-Step 3E)

- **Commit SHA**: `f317ef4`
- **Date**: 2026-10-16

### Context

The low-fidelity design wireframe specifies a live teleprompter readout positioned below the waveform: *"A karaoke readout along the bottom — the line playing now, with the ones either side of it for context."* This enables users to immediately verify real-time alignment against the singer's vocal delivery without visual hunting.

### Decision

1. **3-Line Context Helper & Unit Tests** ([`apps/web/src/lyrics/lyricsUtils.ts`](apps/web/src/lyrics/lyricsUtils.ts), [`apps/web/src/lyrics/lyricsUtils.test.ts`](apps/web/src/lyrics/lyricsUtils.test.ts)):
   - Implemented `getKaraokeContext(lines, segments, timeMs)`: returns `prevLine`, `currentLine` (if active at `timeMs`), and `nextLine`.
   - Handled non-singing gaps (instrumental intro, interludes, or track ending) gracefully by previewing upcoming or preceding lines while displaying a soft `♪ (Instrumental — next line coming up) ♪` status.
   - Added unit test suite covering active playback, intro gaps, and post-track playback (all 60 unit tests passing).

2. **Decoupled Playback Teleprompter Component** ([`apps/web/src/lyrics/KaraokeBanner.tsx`](apps/web/src/lyrics/KaraokeBanner.tsx)):
   - Subscribes to `controller.subscribeTime` directly from the audio controller.
   - Evaluates a composite context transition key (`${prev?.id}|${curr?.id}|${next?.id}`). React state updates only when the active line changes (~0.2–0.3Hz), eliminating 60fps clock churn while maintaining crisp UI reactivity.
   - Visual Hierarchy:
     - Top line: `prevLine.text` (muted, 55% opacity, `0.85rem`).
     - Center line: `currentLine.text` (prominent, bold `1.2rem`, emerald text shadow, active time badge `[ 0:14 – 0:18 ]`).
     - Bottom line: `nextLine.text` (muted, 55% opacity, `0.85rem`).
   - Click-to-Seek: Clicking any line in the prompter instantly seeks audio playback to that line's start timestamp.

3. **Mounting in Layout** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Mounted directly beneath the Waveform & Timeline section in the center workspace column matching the wireframe layout.

### Rationale & Trade-offs

- **Cognitive Clarity**: Presenting the current singing line with 1 line of preceding and succeeding context matches standard teleprompter UX, allowing instant verification of whether a line started too early or late.
- **Performance Seam**: Using transition-key comparison inside `subscribeTime` guarantees 0 unnecessary re-renders during playback.

### Assumptions

- The teleprompter displays lyrics based on their sequential order in `lines`, synchronizing with timestamps defined in `segments`.

---

## Decision 023: Right-Sidebar Segment Precision Inspector Panel (Micro-Step 3F)

- **Commit SHA**: `d96b460`
- **Date**: 2026-10-16

### Context

The low-fidelity design wireframe specifies a dedicated right-hand precision inspector panel for the active selection: *"An inspector for the current selection — exact start and end, the resulting duration, and the operations that do not fit naturally into dragging: merge, split, delete."* While mouse-dragging on the waveform is ideal for macro placement, users need millisecond-accurate numerical entry and operations like split, merge, and deletion.

### Decision

1. **SegmentInspector Component** ([`apps/web/src/segment/SegmentInspector.tsx`](apps/web/src/segment/SegmentInspector.tsx)):
   - **Single-Segment Mode**:
     - Line header quoting text: e.g. `Line 4: "First line..."` with placement status badge (`Timed` vs `Unplaced`).
     - Precision inputs: `Start` and `End` timestamps formatted as `M:SS.mmm` with parsing and validation via `parseTimeToMs`.
     - Calculated duration readout (`4.30s`).
     - Quick Play Snippet button (`Play` icon): seeks playback directly to the line's start timestamp.
     - Precision Nudge grid: `[-500ms]`, `[-100ms]`, `[+100ms]`, `[+500ms]` for surgical alignment adjustments.
     - Operations:
       - `Merge with next line`: combines current line text with subsequent line, merging their timestamps or creating a unified segment.
       - `Split segment…`: opens an inline split tool allowing customized two-part text splitting and split timestamp scrubbing.
       - `Delete timing (Unplace)`: un-places the line while retaining the text in the lyric sheet.
   - **Multi-Selection Mode**:
     - Displays total selected line count and placed segment count.
     - Bulk verse nudge grid: `[-500ms]`, `[-100ms]`, `[+100ms]`, `[+500ms]`, shifting the entire selected verse together while preserving internal spacing.
   - **Empty State**:
     - Clean guidance card when no line or segment is selected.

2. **3-Column Studio Layout** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Updated main grid layout to `minmax(280px, 320px) 1fr minmax(280px, 320px)` with `maxWidth: 1480px`.
   - Col 1: Lyrics pane (`LyricsList`).
   - Col 2: Waveform & timeline (`WaveformCanvas`, `SegmentLane`) + Karaoke readout (`KaraokeBanner`).
   - Col 3: Segment Inspector (`SegmentInspector`).

### Rationale & Trade-offs

- **Direct Numerical Precision**: Trimming handles on a waveform can be constrained by screen resolution or zoom. Providing numeric input fields with `M:SS.mmm` validation ensures users can input exact timestamps down to 1 millisecond.
- **Unified 3-Column Ergonomics**: Arranging the 4 wireframe regions into 3 persistent desktop columns eliminates modal dialogs and keeps all alignment tools visible at a single glance.

### Assumptions

- Edits made in the inspector commit directly to the central `alignmentReducer` and push snapshots to the undo/redo history.

---

## Decision 024: Transparent Line Merging, 2-Line Multi-Selection Merge, and Smooth Momentum Waveform Scrolling

- **Commit SHA**: `24291ed74ed774c76ed8d3e7dfa7aa2c892bedf7` (`24291ed`)
- **Date**: 2026-10-16

### Context

Users reported two usability friction points in the editor:
1. **Ambiguous and Destructive Feeling of "Merge with next line"**:
   - The Inspector previously displayed a single button labeled `"Merge with next line"` that immediately merged lines with zero visual preview of what text or timestamps would result.
   - When users selected two segments on the timeline (e.g. via Shift-click or multi-select), the Inspector only provided verse-shift controls with no way to merge the two selected lines.
2. **Jittery Waveform Horizontal Scrolling**:
   - During audio playback when zoomed in, the 60fps playhead tracking ticker forcefully overwrote `container.scrollLeft` on every animation frame, violently fighting user attempts to manually scroll or inspect the timeline.
   - Standard vertical mouse wheels jumped abruptly without interpolation, and trackpad horizontal gestures lacked `overscroll-behavior-x: contain`, risking unwanted browser back/forward history navigation on macOS.

### Decision

1. **Transparent Line Merging with Interactive Previews** ([`apps/web/src/segment/SegmentInspector.tsx`](apps/web/src/segment/SegmentInspector.tsx)):
   - **Single-Line Mode**: Clicking "Merge with next line" expands an interactive preview card displaying:
     - Target line index and text (e.g. `Target: "Watching shadows fade away"`).
     - Resulting combined text (e.g. `Result: "Standing in the doorway Watching shadows fade away"`).
     - Explicit `[Confirm Merge]` and `[Cancel]` buttons, completely eliminating accidental line loss.
   - **Multi-Selection Mode (2 lines selected)**:
     - Prominently displays a dedicated `"Merge 2 Selected Lines"` card in the Inspector whenever exactly 2 lines/segments are selected.
     - Displays formatted previews of both lines, the resulting merged text, and the merged timestamp span (`[0:04.000 – 0:13.200]`).
     - Directly calls `onMergeLines(firstId, secondId)` to merge the selected segments in one click.

2. **Atomic `MERGE_LINES` Reducer Action** ([`apps/web/src/store/alignmentReducer.ts`](apps/web/src/store/alignmentReducer.ts), [`apps/web/src/store/useAlignmentStore.ts`](apps/web/src/store/useAlignmentStore.ts)):
   - Implemented `executeMergeTwoLines` helper:
     - Automatically resolves chronological ordering (if both lines have segments on the timeline, earliest `start_ms` is placed first; otherwise document index order is respected).
     - Merges segments into a unified span `[min(start_ms), max(end_ms)]`. If only one line was placed, preserves its segment for the merged line.
     - Re-indexes all subsequent lines cleanly (`index: idx`) and records a single history snapshot for immediate Undo/Redo.
   - Added unit tests in [`apps/web/src/store/alignmentReducer.test.ts`](apps/web/src/store/alignmentReducer.test.ts) covering arbitrary ID ordering, placed-unplaced merging, and undo/redo (totaling 62 passing unit tests).

3. **Smooth Waveform Horizontal Scrolling & Non-Interfering Auto-Follow** ([`apps/web/src/audio/WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx), [`apps/web/src/styles.css`](apps/web/src/styles.css)):
   - **User Cooldown Auto-Follow**: Tracks `lastUserScrollTimeRef`. While audio is playing, if the user scrolls (mouse wheel, trackpad, or scrollbar drag), auto-tracking pauses for a 1.8s cooldown period, preventing the 60fps playhead from fighting the user's hand. Seeking immediately re-engages centering.
   - **Friction-Damped Momentum Wheel**: Intercepts vertical mouse wheel events and maps them to horizontal translation via RAF velocity damping (`wheelVelocity *= 0.84`), delivering smooth, silky deceleration like native macOS inertia.
   - **Trackpad Native Support & Navigation Shield**: Added `overscrollBehaviorX: 'contain'` to prevent macOS trackpad history navigation while preserving native two-finger horizontal swipe physics.
   - **Middle-Click / Alt-Drag Pan**: Pressing Middle Mouse Button (wheel click) or <kbd>Alt</kbd> + Left Click allows free drag-to-pan across the timeline with a `grabbing` cursor.
   - **Sleek DAW Scrollbar**: Styled `.waveform-scroll-container` with a subtle 6px dark-mode scrollbar with accent hover feedback.

### Rationale & Trade-offs

- **Clarity and Predictability**: Showing exact before/after previews turns a potentially destructive text-and-timing merge operation into a clear, trustworthy experience.
- **Natural Multi-Selection Workflow**: Users naturally select two items when they want to join them; offering `"Merge 2 Selected Lines"` aligns with standard DAW and video editing paradigms.
- **Glide Physics**: Using RAF momentum damping for notched mice provides fluid horizontal scrubbing without sacrificing native trackpad performance.

### Assumptions

- Merging lines combines text with a single intervening space and preserves the earliest line's identifier.

---

## Decision 025: Decouple Playhead Needle Drag from Auto-Scroll & Controlled Edge Auto-Pan

- **Commit SHA**: `390a4b829cef9be7660726a7d0dbfdf2c384f28d` (`390a4b8`)
- **Date**: 2026-10-16

### Context

When zoomed in (e.g. 2x, 3x, or 5x), dragging the playhead needle to scrub along the timeline caused the viewport to violently and uncontrollably rocket across the track. Investigation revealed a positive feedback loop:
1. `handleSeekFromEvent` computed timestamp from `e.clientX - canvas.getBoundingClientRect().left`.
2. Calling `controller.seek(targetSeconds)` synchronously triggered `subscribeTime`.
3. `subscribeTime` was not checking whether a manual drag was active (`isDraggingRef.current`), so it immediately forced `container.scrollLeft = pixelX - viewportW * 0.38`.
4. As the container scrolled right, `canvas.getBoundingClientRect().left` shifted left by hundreds of pixels.
5. On the very next 1px mouse movement, `e.clientX - rect.left` jumped by hundreds of pixels, triggering another scroll, accelerating the playhead exponentially to the end of the track.

### Decision

1. **Decouple Manual Drag from Viewport Auto-Centering** ([`apps/web/src/audio/WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx)):
   - Added `if (isDraggingRef.current) return;` inside `subscribeTime`. When the user is manually dragging the playhead, the 60fps playback centering ticker never overrides or jerks the viewport.
   - Restricted auto-centering strictly to when audio is actively playing (`controller.isPlaying`).

2. **Absolute Viewport-to-Canvas Coordinate Conversion**:
   - Implemented `getTimeFromClientX(clientX: number)`:
     ```ts
     const mouseXInViewport = clientX - containerRect.left;
     const canvasX = Math.max(0, Math.min(totalWidth, mouseXInViewport + container.scrollLeft));
     return pixelToTime(canvasX, totalWidth, durationSeconds);
     ```
   - Completely decouples mouse-coordinate math from the shifting bounding rect of the inner canvas, eliminating the runaway feedback loop.

3. **Smooth, Controlled Edge Auto-Pan Loop**:
   - Implemented RAF-driven edge auto-panning (`startEdgePan` / `stopEdgePan`).
   - Safe zone: When dragging within the visible viewport (`edgeZone > 60px`), the container stays completely still, giving the user 100% stable 1:1 needle control.
   - Edge zone: When the user intentionally scrubs within 60px of the left or right edge, the viewport glides smoothly at a comfortable, proportional speed (2px to 10px per frame, ~120–600px/s) and continuously synchronizes playback seek under the cursor.
   - Cleanly terminates on `mouseup` or component unmount.

### Rationale & Trade-offs

- **Zero Runaway Feedback**: Calculating coordinates relative to the outer container and disabling playback auto-follow during user drag restores surgical, predictable scrubbing at all zoom levels (1x–5x).
- **Proportional Edge Scrolling**: Emulating professional DAW edge-panning gives users the ability to scrub continuously through minutes of audio without releasing the mouse.

### Assumptions

- An edge activation boundary of 60px provides an intuitive balance between stable on-screen scrubbing and smooth continuous track navigation.

---

## Decision 026: Full Lyric Hover Tooltip, Light/Dark Theme Switcher, and Local Audio Upload with LRC Export

- **Commit SHA**: `ccbe58d8b50a634e00ef99ceab1589f6db667ec1` (`ccbe58d`)
- **Date**: 2026-10-16

### Context

Users requested three core usability and workflow capabilities:
1. **Full Lyric Visibility for Truncated Sentences**: When lyric sentences are long, the timeline segment blocks truncate the text with an ellipsis (`...`). Users need to inspect the full, untruncated sentence and exact timing boundaries directly on the timeline without hunting through the sidebar.
2. **Light and Dark Theme Switcher**: Users need an explicit, intuitive way to toggle between Light and Dark interface themes, persisting their preference across page refreshes.
3. **Bring Your Own Track (BYOT) & LRC Export Workflow**: Users need to upload arbitrary local audio files (`.mp3`, `.wav`, `.ogg`, `.flac`, etc.) directly into the editor without backend uploading, align the lyrics, and export standard time-coded `.lrc` files (with both one-click file download and copy-to-clipboard functionality).

### Decision

1. **Full Lyric Hover Tooltip** ([`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx)):
   - Added hover state tracking (`hoveredLineId`) with mouse enter/leave events.
   - Rendered an elevated floating card tooltip (`bottom: calc(100% + 8px)`) showing:
     - The complete quoted line text in bold.
     - The exact start and end millisecond timestamps (`formatTime(segment.start_ms)} – {formatTime(segment.end_ms)}`).
     - A centered downward indicator arrow styled with CSS borders.
   - Set `pointerEvents: 'none'` and `z-index: 50` to ensure smooth scrubbing and zero layout shifts.
   - Retained the native `title` attribute for browser accessibility.

2. **Light & Dark Theme Switcher** ([`apps/web/src/styles.css`](apps/web/src/styles.css), [`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Defined structured `:root, [data-theme='light']` and `[data-theme='dark']` CSS variable blocks for colors, borders, surfaces, text, and `color-scheme`.
   - Initialized React `theme` state (`'light' | 'dark'`) reading from `localStorage.getItem('theme')` or system `window.matchMedia('(prefers-color-scheme: dark)')`.
   - Toggling sets `document.documentElement.setAttribute('data-theme', nextTheme)` and persists to `localStorage`.
   - Added accessible theme toggle button in the header with `Sun` and `Moon` Lucide icons.

3. **Local Audio Upload Pipeline** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Added hidden `<input type="file" accept="audio/*" />` ref triggered via an "Upload Audio" button in the header.
   - Leveraged our pure `decodeAudioFromFile(file, 800)` Web Audio decoding pipeline:
     - Decodes raw PCM audio into an `AudioBuffer`.
     - Downmixes multi-channel audio to mono and extracts 800 visual amplitude peaks.
     - Creates a local blob Object URL for seamless streaming playback in `AudioController`.
     - Updates application track metadata (`title`, `duration`, `peaks`) and resets alignment state for the new track.

4. **LRC Export & Preview Modal** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx), [`apps/web/src/utils/lrc.ts`](apps/web/src/utils/lrc.ts)):
   - Added an "Export .LRC" header action opening an accessible preview modal.
   - Serializes placed segments into standard `[mm:ss.xx]` synchronized lyric lines sorted chronologically.
   - Provides a read-only monospaced preview of the `.lrc` file contents.
   - Includes "Copy to Clipboard" with animated checkmark feedback.
   - Includes "Download .LRC" which triggers a native browser download as `<song-title>.lrc`.

### Rationale & Trade-offs

- **Zero-Latency Audio Decoding**: Utilizing client-side Web Audio `decodeAudioData` allows users to load any local audio file instantly without uploading multi-megabyte media files to a remote server.
- **Floating Hover Tooltip vs. Expanding Segment Height**: Floating tooltips preserve the uniform timeline height and prevent jittery layout shifts while allowing users to read arbitrarily long lyric sentences.
- **Trade-off**: Local file Object URLs are ephemeral to the browser session, which is standard for client-side fixture tooling.

### Assumptions

- Exported `.lrc` files adhere to standard millisecond-hundredth timestamp formatting (`[mm:ss.xx]`) compatible with media players like VLC, Apple Music, and Spotify.

---

## Decision 027: Multi-Line Word Wrapping for Long Sentences in Karaoke Teleprompter

- **Commit SHA**: `f987f604108ad324849719ee11d8f404cfe993fe` (`f987f60`)
- **Date**: 2026-10-16

### Context

When long lyric sentences played in the Karaoke Teleprompter banner (`KaraokeBanner.tsx`), the active singing line and context lines were forcibly constrained to a single line via `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, and `textOverflow: 'ellipsis'`. This truncated longer lines with ellipses (`...`) and caused text clipping, preventing users from seeing the full sentence as it was being sung.

### Decision

1. **Balanced Multi-Line Wrapping** ([`apps/web/src/lyrics/KaraokeBanner.tsx`](apps/web/src/lyrics/KaraokeBanner.tsx)):
   - Replaced `whiteSpace: 'nowrap'` with `whiteSpace: 'normal'` and added `wordBreak: 'break-word'` and `overflowWrap: 'break-word'`.
   - Removed `overflow: 'hidden'` and `textOverflow: 'ellipsis'` from the active, previous, and upcoming line elements.
   - Set fluid responsive font sizing for the active line (`clamp(1.1rem, 1.8vw, 1.25rem)`) with `lineHeight: 1.38` and generous horizontal padding (`0 var(--space-3)`).
   - Expanded container `minHeight: '90px'` and `gap: '6px'`, allowing the banner to expand dynamically to accommodate multi-line lyrics with zero text clipping.
   - Enhanced `title` attributes on all three lines to display full quotes for clarity and screen reader accessibility.

### Rationale & Trade-offs

- **Teleprompter Readability**: Users singing or reviewing lyrics need the complete text visible at all times. Natural word wrapping preserves typography rhythm while preventing truncation.
- **Fluid Layout**: Allowing the teleprompter card to dynamically adapt its height to longer lines avoids hardcoded clipping without degrading adjacent layout areas.

### Assumptions

- Long sentences wrap based on standard word boundaries, maintaining center alignment for visual balance.

---

## Decision 028: Zero-Width Overlay Trim Handles and Exact Lyric Start/End Timeline Positioning

- **Commit SHA**: `1fc2212cb55af38256352cbd46667128333770c8` (`1fc2212`)
- **Date**: 2026-10-16

### Context

Users observed that timeline segment blocks had left and right slider handles occupying in-flow layout pixels (10px each, 20px total) inside the segment container. This produced two critical visual errors:
1. The lyric text was pushed 10px inward from the left boundary (`start_ms`) and cut off 10px before the right boundary (`end_ms`), causing the playhead needle to reach the segment 10–16 pixels before the lyric appeared to start, and leaving the lyric 10 pixels before the segment ended.
2. Short words (e.g. "Oh" or quick syllables) suffered from width inflation caused by artificial `minWidth: 28px` constraints required to accommodate the in-flow handles, displacing neighboring timing alignment.

### Decision

1. **Zero-Width Overlay Trim Handles** ([`apps/web/src/audio/SegmentLane.tsx`](apps/web/src/audio/SegmentLane.tsx), [`apps/web/src/styles.css`](apps/web/src/styles.css)):
   - Replaced in-flow flex trim slider elements with `position: 'absolute'` overlay grips positioned directly at `left: 0` and `right: 0` (`width: 8px`, `zIndex: 5`).
   - Handles feature a 2px vertical grip pill matching the low-fi DAW aesthetic in `docs/wireframe.png`, with subtle illumination on hover (`.segment-trim-handle-left:hover`, `.segment-trim-handle-right:hover`).
   - Added `e.stopPropagation()` on handle mousedown so edge trimming does not trigger body drag or selection toggling.
2. **Full-Span Segment Body**:
   - The segment body spans 100% width and height of the segment container with minimal padding (`padding: '0 8px'`).
   - The lyric text starts directly at the left boundary of the segment (`start_ms`), and ends at the right boundary (`end_ms`), completely eliminating the 10px offset dead zone.
3. **Exact Pixel Bounds without Inflation** ([`apps/web/src/audio/segmentUtils.ts`](apps/web/src/audio/segmentUtils.ts), [`apps/web/src/audio/segmentUtils.test.ts`](apps/web/src/audio/segmentUtils.test.ts)):
   - Removed `minWidth: '28px'` from the segment container in `SegmentLane.tsx`.
   - Updated `minBlockWidthPx` default to `8px` in `calculateSegmentBounds`, ensuring natural width scaling down to short syllables while maintaining clickable targets for sub-pixel clips.

### Rationale & Trade-offs

- **1:1 Audio & Visual Alignment**: When the playhead needle touches the left border of a segment, the audio and lyric start simultaneously with zero dead zone.
- **Zero Layout Squeeze**: Overlay handles occupy zero layout flow width, allowing short segments to display their lyrics without being pushed out of the box.

### Assumptions

- An 8px interactive edge overlay provides a comfortable mouse grab zone while preserving the central body for segment shifting and selection.

---

## Decision 029: 16x High-Detail Zoom, Zoom Presets, 1-Click "Place at Playhead", and Real-Time Rhythm Stamping

- **Commit SHA**: `421a1cdfce77ded85067d4612f39f22ddc558165` (`421a1cd`)
- **Date**: 2026-10-17

### Context

For standard songs (e.g. 3m 42s / 222 seconds), 1x zoom compresses the entire song into ~4.5 pixels per second, making fast or short lyric phrases (1–2 seconds) only 5–9 pixels wide. Even at the previous 5x zoom cap (~22px/s), users found it difficult to segment short phrases without extreme precision. Furthermore, mapping lyrics exclusively via manual mouse drag-and-drop across the entire screen from the left sidebar to the timeline was tedious and unergonomic.

### Decision

1. **Expanded 16x High-Detail Zoom & Preset Pills** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx), [`apps/web/src/audio/WaveformCanvas.tsx`](apps/web/src/audio/WaveformCanvas.tsx)):
   - Increased max zoom from 5x to **16x**, providing up to **~72px per second of audio**. A 1.5s phrase spans ~108px, revealing individual vocal transients, syllables, and beats clearly.
   - Added instant zoom preset buttons: `[1x]`, `[2x]`, `[4x]`, `[8x]`, `[16x]`, allowing users to jump directly to deep resolution with a single click.
   - Added `Ctrl + Wheel` / `Cmd + Wheel` smooth pinch/wheel zooming on the canvas container centered over the cursor.
   - Implemented `getAdaptiveRulerInterval` ([`apps/web/src/audio/waveformUtils.ts`](apps/web/src/audio/waveformUtils.ts)), rendering dense, adaptive tick marks (down to 1s or 2s intervals at high zoom) rather than rigid 20s gaps.

2. **1-Click "Place at Playhead" on Unplaced Lyrics** ([`apps/web/src/lyrics/LyricsList.tsx`](apps/web/src/lyrics/LyricsList.tsx), [`apps/web/src/segment/SegmentInspector.tsx`](apps/web/src/segment/SegmentInspector.tsx)):
   - Added a direct `[+ Place at Playhead]` action button to every unplaced lyric card in the sidebar and inspector.
   - Clicking immediately places the lyric at the current playhead millisecond timestamp (`controller.getCurrentTime() * 1000`) without requiring drag-and-drop.

3. **Real-Time Rhythm Stamping (<kbd>Enter</kbd> / "Stamp Line")** ([`apps/web/src/App.tsx`](apps/web/src/App.tsx)):
   - Added a prominent `[⚡ Stamp Line (↵ Enter)]` button to the transport header.
   - Pressing <kbd>Enter</kbd> (when not typing in a text field) while listening to audio stamps the next unplaced lyric at the playhead timestamp in real-time, capping the preceding segment if still playing.

4. **"Focus in Timeline" Feature**:
   - Added `[Focus]` action buttons to placed lyric cards in `LyricsList` and `SegmentInspector`.
   - Clicking ensures zoom is at least 4x and smoothly scrolls the viewport to center directly on that segment.

### Rationale & Trade-offs

- **Multiple Fast Ingestion Paths**: Providing 1-click placement, real-time rhythm stamping, and 16x zoom gives users professional DAW ergonomics tailored to both fast rough drafting (stamping in real-time) and surgical millisecond alignment (at 16x zoom).
- **Adaptive Ticks**: Scaling ticks with pixel density prevents ruler clutter at 1x while providing sub-second precision marks at 16x.

### Assumptions

- 16x zoom is sufficient for all common vocal phrases down to sub-100ms consonant onsets.





















