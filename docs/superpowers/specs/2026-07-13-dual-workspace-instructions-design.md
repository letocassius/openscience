# Dual Workspace Instructions Design

## Objective

Let the repository serve two distinct contexts without allowing either context to overwrite the other:

1. Codex, Claude Code, and similar external agents use the checkout as a workspace for both software development and explicitly requested scientific research.
2. OpenScience browser workspace and the OpenScience terminal CLI keep the product's native `research` agent as their default runtime.

The solution separates the responsibilities of repository instructions and product runtime prompts. It does not add a `general` runtime agent or an intent-classification layer.

## Context boundary

### External workspace agents

Codex reads the root `AGENTS.md`. Claude Code reads `CLAUDE.md`, whose entire content is an import of the same root file:

```md
@AGENTS.md
```

The root instructions define a general-purpose external workspace agent whose behavior is task-aware. They allow it to:

- develop, debug, test, refactor, and explain the project;
- perform scientific research when the user explicitly asks for it;
- choose effort proportional to the request instead of upgrading every task into a full research workflow.

### OpenScience runtime

The browser workspace and OpenScience terminal CLI continue to use the internal agent registry, provider prompts, and workflow prompts. Their default remains `research`.

The runtime also loads the root `AGENTS.md` as project instructions. That file does not select the runtime agent and must not override the already selected `research` agent or its workflow prompt. Runtime sources and tests remain authoritative for product behavior.

## Task routing for external agents

The root `AGENTS.md` defines three routes:

| User intent | External-agent behavior |
|---|---|
| Software development, UI, bugfix, refactor, repository operation | Work directly on the relevant code and run focused verification. Do not start a scientific research workflow. |
| Scientific question, literature analysis, experiment design, data analysis | Use appropriate research tools and skills, real data, and verifiable sources. Scale the workflow to the request. |
| Ambiguous or narrowly scoped request | Start with the smallest reasonable scope. Do not initialize Atlas, run a literature review, create methodology artifacts, or dispatch research agents without a clear need. |

A complete research workflow is appropriate only when the user explicitly requests comprehensive research or when the scientific task genuinely requires it.

## Instruction hierarchy

### Root `AGENTS.md`

The root file is the single canonical cross-client workspace contract. It contains:

1. A concise project description and repository map.
2. The external-workspace versus OpenScience-runtime boundary.
3. Task routing for development, research, and ambiguous requests.
4. Shared autonomy, scope-control, style, and testing rules.
5. An active-runtime rule: when OpenScience has selected its native `research` agent, follow that workflow; otherwise route external workspace work from the user's request.
6. A directory-instruction rule stating that nested files may add local technical constraints but may not redefine task routing or runtime defaults.

It must not reproduce the internal 637-line research prompt, prescribe mandatory research stages for every task, or turn the general-purpose workspace role into a native OpenScience runtime agent.

### Root `CLAUDE.md`

`CLAUDE.md` contains exactly:

```md
@AGENTS.md
```

It contains no title, architecture documentation, duplicated style guide, or Claude-specific behavioral fork.

### `backend/cli/AGENTS.md`

This file remains, but becomes a backend implementation guide only. It may define:

- Bun and TypeScript conventions;
- backend test commands;
- no-mock expectations;
- validation requirements for agent, prompt, session, server, and SDK changes.

The current ML training, GPU, RLHF, RAG, experiment-tracking, and OOM workflow guidance is removed. Product research behavior belongs in `src/agent/prompt`, skills, and runtime documentation, not in developer instructions for the backend directory.

### `frontend/workspace/AGENTS.md`

This file remains a frontend implementation guide only. It may define:

- SolidJS state and component conventions;
- the correct local backend/frontend development commands;
- focused UI verification and browser automation;
- preservation of user-owned running processes.

It may not introduce research routing or change the browser's runtime agent configuration.

## Documentation migration

The current `CLAUDE.md` contains useful product architecture material. That material moves to `ARCHITECTURE.md`:

- provider-level system prompts;
- agent workflow prompt injection;
- agent registry roles;
- the prompt-debugging path through `agent.ts`, `prompt.ts`, and `system.ts`.

`ARCHITECTURE.md` stops linking to `CLAUDE.md` for runtime details. Product documentation continues to state that `research` is the default OpenScience agent.

## Runtime invariants

This change does not modify:

- `backend/cli/src/agent/agent.ts` default-agent behavior;
- `backend/cli/src/session/prompt.ts` research prompt injection;
- `backend/cli/src/tool/plan.ts` runtime transitions;
- `frontend/workspace/src/atlas/store/ui.ts` default selection;
- `frontend/workspace/src/atlas/Composer.tsx` runtime agent options;
- `backend/cli/src/agent/prompt/research.txt` or specialist prompts.

The existing assertion that `Agent.defaultAgent()` returns `research` remains in place.

## Representative flows

### Codex or Claude Code development task

```text
user asks for an icon or code change
  -> external agent reads root AGENTS.md
  -> development route
  -> focused inspection, edit, and verification
  -> no research workflow
```

### Codex or Claude Code research task

```text
user asks a scientific research question
  -> external agent reads root AGENTS.md
  -> research route
  -> appropriate skills, evidence, analysis, and outputs
  -> workflow depth matches the request
```

### OpenScience browser or terminal task

```text
user starts OpenScience
  -> internal agent registry selects research
  -> session prompt injects the OpenScience research workflow
  -> root AGENTS.md is loaded as compatible project guidance
  -> AGENTS.md does not replace or weaken the selected runtime agent
```

## Verification

Verification covers both sides of the boundary:

1. Confirm `CLAUDE.md` contains exactly `@AGENTS.md` plus a trailing newline.
2. Confirm the root `AGENTS.md` explicitly supports both development and research while preventing automatic workflow escalation.
3. Confirm nested `AGENTS.md` files contain only directory-local implementation guidance.
4. Confirm `ARCHITECTURE.md` owns prompt architecture documentation and no longer delegates it to `CLAUDE.md`.
5. Run `bun test test/agent/agent.test.ts` from `backend/cli` and confirm the default-agent test still expects and returns `research`.
6. Run the focused instruction-loading tests and confirm root and nested `AGENTS.md` discovery remains intact.
7. Run `git diff --check`.
8. Review four instruction scenarios: a one-file icon change in an external workspace, a backend bugfix, an explicit external scientific literature request, and an OpenScience runtime research task. Each must route to the intended behavior without contradictory instructions.

## Risks and controls

- **Nested instructions override the root task boundary.** Control: state their allowed scope in both the root contract and each nested file.
- **Shared root guidance conflicts with the native research prompt.** Control: keep `AGENTS.md` free of a fixed persona, acknowledge the active runtime as authoritative, and test its instruction loading.
- **External research becomes too rigid.** Control: define evidence standards and proportionality, not mandatory stages.
- **Product runtime accidentally changes during cleanup.** Control: keep runtime files out of scope and retain the focused default-agent test.
- **Architecture knowledge is lost when simplifying `CLAUDE.md`.** Control: migrate unique material to `ARCHITECTURE.md` before replacing the file.

## Non-goals

- Adding a native `general` OpenScience agent.
- Changing browser or OpenScience CLI defaults.
- Adding automatic intent classification.
- Rewriting the research workflow or specialist prompts.
- Removing directory-level `AGENTS.md` files.

## Acceptance criteria

- Codex and Claude Code receive the same canonical workspace instructions.
- Either external agent can develop the repository or perform research according to the user's request.
- Small development tasks do not trigger full research workflows.
- OpenScience browser workspace and terminal CLI still default to `research`.
- Nested instructions add technical context without changing this division of responsibility.
