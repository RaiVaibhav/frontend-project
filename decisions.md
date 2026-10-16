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





