# Workspace Rules & Frontend Engineering Standards

This document establishes the architectural boundaries, engineering guardrails, and coding conventions for both human developers and AI assistants working in this repository.

---

## 1. Monorepo & Package Management
- **Workspace Architecture**: Managed with `pnpm` workspaces (`pnpm-workspace.yaml` with `apps/api` and `apps/web`).
- **Dependency Hygiene**: Never install conflicting packages across apps. Always run scripts from the repo root or targeted via `pnpm --filter <app> <script>`.
- **Single Origin API Proxying**: The browser only talks to Vite (`http://localhost:5173`), which proxies `/api` requests to the backend (`http://localhost:4000`), avoiding CORS issues and cookie/auth fragmentation.

---

## 2. Build Tooling & Runtime Environment
- **Runtime**: Node.js >= 22.5.0 with native SQLite (`node:sqlite`).
- **Frontend Stack**: Vite + React 18 + TypeScript. Fast HMR, minimal overhead, optimized for high-performance audio scrubbing and canvas rendering.
- **Strict TypeScript**: `tsc --noEmit` must pass with zero errors.

---

## 3. Engineering Boundaries & Code Safety Guardrails

### Type Safety & Domain Modeling
- **Zero `any` Types**: Never use `any` or loose untyped shapes. Use strict discriminated unions and complete TypeScript interfaces.
- **Units Boundary**: Adhere strictly to the project's single units boundary:
  - Audio playback duration: **float seconds** (`duration_seconds`).
  - Segment times: **integer milliseconds** (`start_ms`, `end_ms`).
  - Display times: Format explicitly (e.g., `M:SS.mmm`) only at presentation seams.

### Component & Styling Architecture
- **No Library Pollution**: Do not mix incompatible CSS libraries (e.g. do not inject Tailwind utility spaghetti into custom CSS variables, or mix external heavy UI frameworks).
- **CSS Design System**: Maintain sleek, modern CSS custom properties (`--bg-primary`, `--accent`, `--border`, etc.) with dark mode support, semantic HTML, and fluid layouts.
- **Deep Modules with Simple Interfaces**: Keep business logic, audio decoding, and timeline math separated from presentation components.

### Performance & Real-Time Audio Guarantees
- **No 60fps React State Churn**: Never pump high-frequency audio playback clock ticks (60Hz / `requestAnimationFrame`) directly into top-level React state that forces the entire component tree to re-render.
- **Waveform Rendering**: Offload peak extraction to Web Audio `AudioContext.decodeAudioData` once upon track load; render waveform via `<canvas>` or optimized SVG paths.
- **Optimistic Concurrency & Conflict Handling**: Always handle API `409 Conflict` gracefully by reconciling server state without discarding user edits.

---

## 4. Verification & Commit Discipline
- **Pre-commit Quality Checks**:
  1. `pnpm --filter @fixture/web run typecheck` (no TypeScript errors)
  2. `pnpm test` (Playwright test harness green)
- **Decisions Log Protocol**:
  - Every architectural or design decision is committed to git.
  - The commit SHA is recorded in `decisions.md` under a structured entry (`Commit SHA`, `Date`, `Context`, `Decision`, `Rationale & Trade-offs`, `Alternatives Rejected`, `Assumptions`).
  - Updates to `decisions.md` are then committed, keeping the repository audit trail complete and transparent.
