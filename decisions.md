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

