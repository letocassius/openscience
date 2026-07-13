# Dual Workspace Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository a general-purpose Codex/Claude Code workspace for development and explicitly requested research while preserving OpenScience browser and terminal CLI's native `research` runtime.

**Architecture:** Root `AGENTS.md` becomes the canonical cross-client contract and root `CLAUDE.md` imports it verbatim. Nested instruction files provide directory-local engineering rules only, while `ARCHITECTURE.md` owns product prompt documentation. Runtime agent selection and research prompt injection remain unchanged and are protected by focused tests.

**Tech Stack:** Markdown instruction files, Bun, TypeScript, Bun test

## Global Constraints

- Root `AGENTS.md` is the only canonical cross-client workspace contract.
- Root `CLAUDE.md` contains exactly `@AGENTS.md` followed by one newline.
- External Codex, Claude Code, and similar agents act as general-purpose workspace agents and route from explicit user intent.
- Development requests must not automatically initialize Atlas, run literature reviews, create research artifacts, or dispatch research agents.
- Explicit research requests use real data, evidence, and sources with effort proportional to the request.
- OpenScience browser workspace and terminal CLI continue to default to the native `research` runtime.
- The active OpenScience runtime prompt remains authoritative when that runtime has selected `research`.
- Nested `AGENTS.md` files may add local technical constraints but may not redefine task routing or runtime defaults.
- Do not modify runtime selection, prompt injection, specialist prompts, or frontend agent-selection sources.
- Never add self-referential or AI attribution to generated project output.
- Preserve the existing repository style guide and no-mock testing rule.

## File Map

- Modify `AGENTS.md`: canonical general-purpose workspace contract, routing rules, shared engineering rules, repository map, and instruction precedence.
- Modify `CLAUDE.md`: single-line import of the canonical root contract.
- Modify `backend/cli/AGENTS.md`: backend-only Bun, TypeScript, runtime-boundary, and testing guidance.
- Modify `frontend/workspace/AGENTS.md`: frontend-only SolidJS, local development, process-safety, and UI verification guidance.
- Modify `ARCHITECTURE.md`: authoritative prompt layers, agent registry, instruction loading, and prompt-debugging documentation.
- Verify `backend/cli/test/agent/agent.test.ts`: existing default-agent invariant remains `research`.
- Verify `backend/cli/test/session/instruction.test.ts`: existing root and nested instruction discovery remains intact.

---

### Task 1: Establish the canonical root workspace contract

**Files:**
- Modify: `AGENTS.md:1-84`
- Modify: `CLAUDE.md:1-136`

**Interfaces:**
- Consumes: OpenScience runtime's existing instruction discovery order: `AGENTS.md`, then `CLAUDE.md`, then deprecated `CONTEXT.md`.
- Produces: One canonical general-purpose workspace contract consumed directly by Codex, imported by Claude Code, and loaded as compatible project guidance by OpenScience.

- [ ] **Step 1: Record the current contract mismatch**

Run from the repository root:

```bash
bun -e 'const text = await Bun.file("CLAUDE.md").text(); if (text === "@AGENTS.md\n") process.exit(1); console.log("CLAUDE.md still duplicates project guidance")'
rg -n "research workflow|general-purpose|active runtime|narrowest reasonable scope" AGENTS.md
```

Expected: the Bun command prints `CLAUDE.md still duplicates project guidance`; `rg` exits with status 1 because the root file does not yet define the context boundary.

- [ ] **Step 2: Replace `AGENTS.md` with the canonical shared contract**

Replace the entire file with:

````markdown
# OpenScience Workspace

OpenScience is an open-source, model-agnostic research agent. This repository is also a normal software workspace: external agents may develop the product or perform research here according to the user's request.

## Context and Task Routing

- Codex, Claude Code, and similar external agents are general-purpose workspace agents in this checkout.
- For software development, UI work, debugging, refactoring, repository operations, or code explanation, work directly on the relevant files and run focused verification. Do not start a scientific research workflow merely because this is OpenScience.
- For explicit scientific research, literature analysis, experiment design, or data analysis, use appropriate research tools and skills, real data, and verifiable sources. Scale the workflow to the requested depth.
- For ambiguous or narrowly scoped requests, begin with the narrowest reasonable scope. Do not initialize Atlas, run a literature review, create methodology artifacts, or dispatch research agents without a clear need.
- A comprehensive research workflow is appropriate only when the user explicitly requests comprehensive research or the scientific task genuinely requires it.
- When the OpenScience browser workspace or OpenScience terminal CLI has already selected its native `research` runtime, follow that active runtime and its research workflow. This file provides project guidance; it does not select, replace, or weaken the runtime agent.
- The OpenScience browser workspace and terminal CLI defaulting to `research` is a product runtime invariant.

## Instruction Scope

- This root `AGENTS.md` is the single canonical cross-client workspace contract.
- Root `CLAUDE.md` only imports this file so Claude Code receives the same contract.
- Nested `AGENTS.md` files may add directory-local implementation guidance. They may not redefine task routing, introduce a different persona, or change OpenScience runtime defaults.

## Repository Map

```text
frontend/          browser workspace, documentation/share site, landing site, and shared UI
backend/           CLI/server, agent runtime, skills, sessions, and provider integrations
tooling/           SDK, plugin runtime, repository automation, launcher, utilities, and patches
```

See `ARCHITECTURE.md` for system and prompt architecture.

## Workflow

- To regenerate the JavaScript SDK, run `./tooling/repo/generate.ts` from the repository root.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch is `main`.
- Prefer automation: execute requested reversible actions without confirmation unless blocked by missing information, safety, or irreversibility.
- Preserve user-owned changes and running processes.
- Never add attribution such as "designed by Codex", "generated by Claude", or similar self-referential AI credits to project output.

## Style Guide

- Keep things in one function unless composable or reusable.
- Avoid unnecessary destructuring. Prefer `obj.a` and `obj.b` over `const { a, b } = obj` to preserve context.
- Avoid `try`/`catch` where possible.
- Avoid the `any` type.
- Prefer single-word names when they remain clear.
- Use Bun APIs when possible, such as `Bun.file()`.
- Rely on type inference; avoid explicit annotations or interfaces unless necessary for exports or clarity.
- Prefer `const` over `let`, especially instead of mutation across `if`/`else` branches.
- Avoid `else`; use early returns or an IIFE when appropriate.

Preferred conditional assignment:

```ts
const foo = condition ? 1 : 2
```

Preferred early return:

```ts
function foo() {
  if (condition) return 1
  return 2
}
```

## Testing

- Avoid mocks as much as possible.
- Tests must exercise the actual implementation rather than duplicating its logic.
- Run the backend suite with `bun test` from `backend/cli`.
- Start with focused checks for the changed surface, then expand verification in proportion to risk.
````

- [ ] **Step 3: Reduce `CLAUDE.md` to the import placeholder**

Replace the entire file with exactly:

```markdown
@AGENTS.md
```

- [ ] **Step 4: Verify the root contract and exact Claude import**

Run:

```bash
bun -e 'const text = await Bun.file("CLAUDE.md").text(); if (text !== "@AGENTS.md\n") throw new Error(JSON.stringify(text)); console.log("CLAUDE.md import is exact")'
rg -n 'general-purpose workspace agents|narrowest reasonable scope|native `research` runtime|single canonical' AGENTS.md
git diff --check
```

Expected: the Bun command prints `CLAUDE.md import is exact`; all four routing phrases are found in `AGENTS.md`; `git diff --check` exits 0.

- [ ] **Step 5: Review the two external-agent routes**

Read `AGENTS.md` once using these two concrete prompts as acceptance cases:

```text
Change one frontend icon and run the focused UI check.
Research the evidence for a named scientific hypothesis and cite primary sources.
```

Expected: the first request routes directly to frontend development without Atlas or research artifacts; the second routes to proportionate research. Neither route changes the OpenScience runtime default.

- [ ] **Step 6: Commit the canonical contract**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: unify workspace agent instructions"
```

Expected: commit succeeds with only `AGENTS.md` and `CLAUDE.md` staged.

---

### Task 2: Restrict nested instructions to local engineering guidance

**Files:**
- Modify: `backend/cli/AGENTS.md:1-121`
- Modify: `frontend/workspace/AGENTS.md:1-30`

**Interfaces:**
- Consumes: Task 1's root routing and instruction-scope contract.
- Produces: Backend and frontend implementation guidance that can be safely injected when files in those directories are read, without changing task routing or the active runtime.

- [ ] **Step 1: Confirm the backend file currently contains conflicting workflow defaults**

Run:

```bash
rg -n "ML Workflow Defaults|RLHF|GPU|OOM|RAG" backend/cli/AGENTS.md
```

Expected: matches are returned for ML workflow routing, GPU checks, RAG, and OOM handling.

- [ ] **Step 2: Replace `backend/cli/AGENTS.md` with a backend-only guide**

Replace the entire file with:

````markdown
# Backend CLI

## Scope

- These instructions apply only under `backend/cli` and inherit the root `AGENTS.md` contract.
- This file defines backend implementation practices only. It does not select an agent, require a research workflow, or change task routing.

## Development

- Use Bun and TypeScript.
- Run commands from `backend/cli` unless a command explicitly says otherwise.
- Start the CLI in development with `bun run dev`.
- Typecheck with `bun run typecheck`.
- Run focused tests with `bun test <test-file>` and the full suite with `bun test`.
- Build native targets with `bun run build` only when the changed surface requires build verification.
- Avoid mocks as much as possible; test the actual implementation.

## Agent and Prompt Boundaries

- The native default agent is defined by `src/agent/agent.ts`; it remains `research` unless the user explicitly requests a product behavior change.
- Agent workflow prompts live under `src/agent/prompt`, and prompt injection lives in `src/session/prompt.ts`.
- Project instruction discovery lives in `src/session/instruction.ts`. Root and nested instruction files add project context but do not choose the runtime agent.
- For changes to agent selection, prompts, sessions, instructions, or tools, run the closest focused tests before the full suite.
- Preserve the distinction between primary agents, specialists, subagents, and system agents described in `ARCHITECTURE.md`.

## API Changes

- After changing the server API, run `./tooling/repo/generate.ts` from the repository root to regenerate the JavaScript SDK.
- Include generated SDK changes in the same change as the API contract that produced them.
````

- [ ] **Step 3: Replace `frontend/workspace/AGENTS.md` with a frontend-only guide**

Replace the entire file with:

````markdown
# Workspace Frontend

## Scope

- These instructions apply only under `frontend/workspace` and inherit the root `AGENTS.md` contract.
- This file defines frontend implementation practices only. It does not select a research workflow or change the browser's runtime agent configuration.

## Process Safety

- Never restart or stop an app or server process owned by the user.
- Reuse an existing development environment when available; otherwise start only the process needed for verification.

## Local Development

- `openscience dev web` proxies `https://app.syntheticsciences.ai`, so local UI and CSS changes do not appear there.
- For local UI changes, run the backend and frontend development servers separately.
- Backend, from `backend/cli`: `bun run --conditions=browser ./src/index.ts serve --port 4096`.
- Frontend, from `frontend/workspace`: `bun dev -- --port 4444`.
- Open `http://localhost:4444`; it targets the backend at `http://localhost:4096`.

## SolidJS

- Prefer `createStore` over multiple `createSignal` calls when state belongs together.
- Follow existing component, styling, and localization patterns in the touched feature.

## Verification

- Typecheck with `bun run typecheck`.
- Build with `bun run build` when the change can affect bundling or production assets.
- Run the smallest relevant Playwright test with `bun run test:e2e -- <test-file>`.
- Use `agent-browser` for browser automation when appropriate: open the URL, take an interactive snapshot, act on stable element references, and re-snapshot after state changes.
````

- [ ] **Step 4: Verify nested files cannot redefine the shared routing contract**

Run:

```bash
if rg -n "RLHF|GRPO|DPO|CUDA|GPU|OOM|RAG|experiment tracking" backend/cli/AGENTS.md; then exit 1; fi
rg -n 'implementation practices only|does not select an agent|remains `research`' backend/cli/AGENTS.md
rg -n 'frontend implementation practices only|does not select a research workflow|Never restart' frontend/workspace/AGENTS.md
git diff --check
```

Expected: the conflict scan prints nothing and exits 0; the scope and runtime-boundary phrases are present in both nested files; `git diff --check` exits 0.

- [ ] **Step 5: Commit the scoped nested guides**

```bash
git add backend/cli/AGENTS.md frontend/workspace/AGENTS.md
git commit -m "docs: scope nested agent instructions"
```

Expected: commit succeeds with only the two nested `AGENTS.md` files staged.

---

### Task 3: Move prompt architecture ownership and verify runtime invariants

**Files:**
- Modify: `ARCHITECTURE.md:54-56`
- Verify: `backend/cli/src/agent/agent.ts:416-430`
- Verify: `backend/cli/src/session/instruction.ts:12-18,70-109,115-129,167-190`
- Test: `backend/cli/test/agent/agent.test.ts:519-528`
- Test: `backend/cli/test/session/instruction.test.ts:7-49`

**Interfaces:**
- Consumes: Task 1's canonical root contract and Task 2's directory-local boundaries.
- Produces: One authoritative architecture explanation showing how runtime prompts and repository instructions coexist, plus verification evidence that native `research` selection is unchanged.

- [ ] **Step 1: Confirm architecture documentation still delegates to `CLAUDE.md`**

Run:

```bash
rg -n "See \[CLAUDE.md\]|Prompt architecture" ARCHITECTURE.md
```

Expected: the prompt architecture heading and the link delegating routing details to `CLAUDE.md` are both returned.

- [ ] **Step 2: Replace the prompt architecture subsection in `ARCHITECTURE.md`**

Replace the existing `### Prompt architecture` subsection, stopping immediately before `### Skills`, with:

````markdown
### Prompt architecture

OpenScience assembles prompts from runtime behavior and project context. These responsibilities are related but distinct:

```text
User request with an active agent name, such as research
  |
  +-- SYSTEM role: runtime base prompt
  |     src/session/llm.ts uses Agent.Info.prompt when present;
  |     otherwise src/session/system.ts selects by model
  |
  +-- USER role injection: agent workflow reminder
  |     src/session/prompt.ts selects by active agent name
  |
  +-- Project guidance: repository instruction files
        src/session/instruction.ts loads root and directory-local instructions
```

Repository instructions add project context. They do not select or replace the active runtime agent.

#### Provider-level system prompts

For agents without an `Agent.Info.prompt`, `src/session/llm.ts` calls `SystemPrompt.provider(model)` in `src/session/system.ts`. Codex OAuth sessions send `codex_header.txt` through provider options instead of the system-message array.

| File | Purpose |
| --- | --- |
| `anthropic.txt` | Claude models |
| `beast.txt` | GPT-4o, o1, and o3 models |
| `codex_header.txt` | GPT-5 and Codex models |
| `gemini.txt` | Gemini models |
| `qwen.txt` | Qwen and fallback models |

#### Agent workflow prompts

##### User-role workflow reminders

`src/session/prompt.ts` imports these prompts and `insertReminders` appends them as synthetic text to the latest user message according to the active agent name:

| File | Agent role |
| --- | --- |
| `src/agent/prompt/research.txt` | `research`, the default harness |
| `src/agent/prompt/biology.txt` | `biology` specialist |
| `src/agent/prompt/physics.txt` | `physics` specialist |
| `src/agent/prompt/ml.txt` | `ml` specialist |
| `src/agent/prompt/write.txt` | `write` subagent |

When experimental plan mode is disabled, `insertReminders` also injects `src/session/prompt/plan.txt` for `plan`; it injects `build-switch.txt` when leaving plan mode in either flow. Separately, `src/session/prompt.ts` appends `max-steps.txt` as assistant-role content on an agent's final allowed step.

##### Registry-owned system prompts

`src/agent/agent.ts` assigns these files to `Agent.Info.prompt`. In `src/session/llm.ts`, a populated `input.agent.prompt` is delivered in the system prompt and takes the place of `SystemPrompt.provider(model)`:

| File | Agent role |
| --- | --- |
| `src/agent/prompt/explore.txt` | `explore` subagent |
| `src/agent/prompt/literature-review.txt` | `literature-review` subagent |
| `src/agent/prompt/critique.txt` | `critique` subagent |
| `src/agent/prompt/physics-critique.txt` | `physics-critique` subagent |
| `src/agent/prompt/reviewer.txt` | `reviewer` subagent |

The agent registry in `src/agent/agent.ts` defines each `Agent.Info`: name, mode, visibility, model, prompt, permissions, temperature, and step limit. `research` is the single user-facing default and the plan-exit target. `biology`, `physics`, and `ml` are specialists; `plan` is read-only; hidden task, exploration, review, critique, writing, compaction, and title agents support the runtime. Custom agents can be configured through the `agent` key in `openscience.json`.

#### Repository instruction loading

`src/session/instruction.ts` searches the project root in this order and stops after the first filename with matches:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `CONTEXT.md` (deprecated)

The root `AGENTS.md` is therefore loaded into OpenScience sessions as project guidance. When a tool reads a file below a nested directory, applicable unclaimed nested instruction files are loaded from the file's directory upward as additional local guidance. Neither path changes the active agent selected by the registry.

#### Prompt debugging

Trace unexpected behavior in this order:

1. Check the active agent in `src/agent/agent.ts`, including its mode, model, prompt, permissions, and step limit.
2. If the registry supplies `Agent.Info.prompt`, follow its system-prompt delivery in `src/session/llm.ts`; otherwise follow provider selection in `src/session/system.ts`.
3. For user-role workflow reminders, follow `insertReminders` in `src/session/prompt.ts`.
4. Check root and nested project guidance through `src/session/instruction.ts`.

| Symptom | Likely cause | Where to inspect |
| --- | --- | --- |
| Agent ignores skills | Skill catalog is missing or truncated | `src/agent/prompt/{agent}.txt` toolkit section |
| Wrong model is used | Agent or model configuration is incorrect | `src/agent/agent.ts` and the `agent` config in `openscience.json` |
| Agent skips stages | Workflow gates are advisory or absent | `src/agent/prompt/{agent}.txt` |
| Critique is not triggered | Parent prompt does not require critique | `src/agent/prompt/critique.txt` and the parent prompt |
| Subagent returns empty | Context exhaustion or an inadequate step limit | Subagent configuration in `src/agent/agent.ts` |
| Custom agent is missing | Invalid config, mode, or visibility | `openscience.json` and `src/agent/agent.ts` |
| Wrong project instructions appear | Root precedence or nested discovery loaded another file | `src/session/instruction.ts` |
````

- [ ] **Step 3: Verify documentation ownership and instruction hierarchy**

Run from the repository root:

```bash
if rg -n '\[CLAUDE\.md\]\([^)]*\)' ARCHITECTURE.md; then exit 1; fi
rg -n "Provider-level system prompts|Agent workflow prompts|Repository instruction loading|Prompt debugging" ARCHITECTURE.md
rg -n '"AGENTS.md"|"CLAUDE.md"|"CONTEXT.md"' backend/cli/src/session/instruction.ts
git diff --check
```

Expected: `ARCHITECTURE.md` has no `CLAUDE.md` link; all four architecture subsections are present; instruction source order remains `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`; `git diff --check` exits 0.

- [ ] **Step 4: Run focused runtime regression tests**

Run from `backend/cli`:

```bash
bun test test/session/instruction.test.ts test/agent/agent.test.ts
```

Expected: exit 0; instruction tests confirm the root `AGENTS.md` is already included in `systemPaths()` and nested `AGENTS.md` is discovered separately; the no-config default-agent test confirms `research`.

- [ ] **Step 5: Run the required backend suite**

Run from `backend/cli`:

```bash
bun test
```

Expected in a complete local environment: exit 0. If environment-dependent browser, token-refresh, or temporary-port tests fail, record their names and compare them with `main`; do not claim a clean suite unless the command exits 0, and do not treat a pre-existing identical baseline as a regression from this documentation-only change.

- [ ] **Step 6: Audit the final diff against all four contexts**

Run from the repository root:

```bash
git diff --check
git diff --name-only 42448f1
git diff 42448f1 -- AGENTS.md CLAUDE.md backend/cli/AGENTS.md frontend/workspace/AGENTS.md ARCHITECTURE.md docs/superpowers/plans/2026-07-13-dual-workspace-instructions.md
git diff --quiet 42448f1 -- backend/cli/src/agent backend/cli/src/session frontend/workspace/src/atlas
git status --short
```

Review the diff against these cases:

```text
External Codex/Claude development: direct, focused engineering workflow.
External Codex/Claude research: proportionate evidence-based research workflow.
OpenScience browser workspace: native research runtime remains authoritative.
OpenScience terminal CLI: native research runtime remains authoritative.
```

Expected: the diff from implementation base `42448f1` lists exactly the five instruction/documentation files plus this corrected implementation plan; the runtime-source `git diff --quiet` command exits 0; the working tree contains no unrelated changes.

- [ ] **Step 7: Commit the architecture migration**

```bash
git add ARCHITECTURE.md
git commit -m "docs: document workspace and runtime prompt layers"
```

Expected: commit succeeds with only `ARCHITECTURE.md` staged.

- [ ] **Step 8: Verify the branch history and final state**

```bash
git status --short --branch
git log -5 --oneline --decorate
```

Expected: the working tree is clean on `codex/dual-workspace-instructions`; the implementation commits follow the approved design and plan commits; no merge or push has occurred.
