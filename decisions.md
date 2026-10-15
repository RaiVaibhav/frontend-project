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
