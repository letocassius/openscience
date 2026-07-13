# General Agent Routing Plan

## Goal

Make `general` the highest-level and default OpenScience agent so ordinary coding, UI, repository, explanation, and operational requests are handled directly. Keep `research` as an explicit scientific specialist instead of silently applying its 637-line workflow to every task.

This plan intentionally does not add an automatic intent classifier. Routing remains visible and deterministic: the user starts in `general`, can explicitly select a specialist, and `general` may delegate to specialists through the existing task tool.

## Proposed architecture

- `general` is a native, visible, primary agent and the default when no agent is specified.
- `general` uses the normal provider system prompt and receives no research workflow reminder.
- `research` remains visible, becomes `mode: "all"`, and therefore works both as a user-selected primary agent and as a specialist delegated by `general`.
- `biology`, `physics`, and `ml` remain explicit specialists.
- `plan` remains read-only; approving a plan returns to the configured/default agent instead of hard-coding `research`.
- The backend owns agent availability and ordering. The workspace renders the backend list rather than maintaining a second hard-coded registry.
- Existing sessions retain the agent stored on each user message. The new default affects new messages without an explicit agent and the refreshed workspace default.

## Request flow after the change

```text
new request
  -> general (default)
     -> direct answer/edit/tool use for ordinary work
     -> optional task delegation to research/biology/physics/ml

explicit research selection
  -> research
     -> inject the existing scientific research workflow

plan approval
  -> Agent.defaultAgent()
     -> configured default, otherwise general
```

## Scope boundaries

- Do not create a separate `build` agent; `general` owns ordinary execution.
- Do not delete or substantially rewrite the scientific workflow in this change.
- Do not add LLM-based intent classification or hidden automatic mode switching.
- Do not change model selection, provider routing, permissions unrelated to agent roles, or persisted historical messages.
- Do not require subagent-driven implementation; the tasks below can be executed directly and sequentially.

---

## Task 1: Establish `general` as the backend default

**Files:**

- Modify `backend/cli/src/agent/agent.ts`
- Modify `backend/cli/test/agent/agent.test.ts`
- Modify `backend/cli/src/config/config.ts`
- Modify `backend/cli/src/cli/cmd/github.ts`

### Steps

- [ ] Add a single exported default name in the `Agent` namespace:

```ts
export const DEFAULT = "general"
```

- [ ] Add a native `general` entry before the specialist entries. It must be visible, `mode: "primary"`, use the normal default permissions, allow questions and entering plan mode, and have no research prompt.

```ts
general: {
  name: "general",
  description: "General-purpose agent for coding, analysis, repository work, explanations, and task orchestration.",
  options: {},
  color: "#64748b",
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      question: "allow",
      plan_enter: "allow",
    }),
    user,
  ),
  mode: "primary",
  native: true,
},
```

- [ ] Change `research.mode` from `"primary"` to `"all"` so it remains user-selectable and becomes delegable.
- [ ] Make `Agent.list()` sort the configured default first, otherwise `Agent.DEFAULT` first.
- [ ] Make `Agent.defaultAgent()` return the configured agent when valid; when unset, return the visible `general` agent. Preserve the existing fallback to the next visible primary agent only when `general` has been explicitly disabled.
- [ ] Update the config schema description to say that an unset default uses `general`; invalid configured values still produce the current validation error.
- [ ] Update the GitHub command comment that currently says omitted agents fall back to research.
- [ ] Change the existing tests before implementation so they expect:
  - no config -> `general`
  - configured `plan` -> `plan`
  - disabled `general` -> `research`
  - `research` is `mode: "all"`
  - invalid, hidden, and subagent defaults still throw
- [ ] Run:

```bash
cd backend/cli
bun test test/agent/agent.test.ts
bun run typecheck
```

Expected: the focused agent tests and backend typecheck pass.

- [ ] Commit:

```bash
git add backend/cli/src/agent/agent.ts backend/cli/test/agent/agent.test.ts backend/cli/src/config/config.ts backend/cli/src/cli/cmd/github.ts
git commit -m "feat: make general the default agent"
```

## Task 2: Remove hard-coded research transitions

**Files:**

- Modify `backend/cli/src/tool/plan.ts`
- Modify `backend/cli/src/session/prompt.ts`

### Steps

- [ ] Import `Agent` in `plan.ts` and resolve the target with `await Agent.defaultAgent()` before constructing the synthetic post-approval user message.
- [ ] Replace `agent: "research"` with the resolved default. Update user-visible plan-exit wording from “build agent” to “general agent” or “default agent” so the UI describes the actual target.
- [ ] Keep research prompt injection conditional on `input.agent.name === "research"`; verify there is no general-to-research fallthrough.
- [ ] Consolidate the duplicated workflow-reminder insertion into one small lookup/helper if it can be done without changing plan-mode behavior. The intended mapping is:

```ts
const prompts = {
  write: PROMPT_WRITE,
  ml: PROMPT_ML,
  research: PROMPT_RESEARCH,
  biology: PROMPT_BIOLOGY,
  physics: PROMPT_PHYSICS,
}
```

`general` is deliberately absent.

- [ ] Add or extend a real session-level test proving a message created without an explicit agent records `general`, while an explicit `research` message still records `research`. Do not duplicate routing logic inside the test and do not mock `Agent.defaultAgent()`.
- [ ] Run:

```bash
cd backend/cli
bun test test/agent/agent.test.ts test/session
bun run typecheck
```

Expected: agent/session tests pass and TypeScript reports no errors. If the repository-wide sandbox/browser baseline failures recur, record them separately; they are not a reason to weaken the focused routing assertions.

- [ ] Commit:

```bash
git add backend/cli/src/tool/plan.ts backend/cli/src/session/prompt.ts backend/cli/test
git commit -m "fix: return plan execution to the default agent"
```

## Task 3: Make workspace agent selection backend-driven

**Files:**

- Modify `frontend/workspace/src/atlas/Composer.tsx`
- Modify `frontend/workspace/src/atlas/store/ui.ts`
- Modify `frontend/workspace/src/context/local.tsx`
- Create `frontend/workspace/e2e/agent-routing.spec.ts`

### Steps

- [ ] Remove the hard-coded `AgentName` union and `AGENT_OPTIONS` array from `Composer.tsx`.
- [ ] Derive visible options from `globalSync.data.agent`, preserving the backend order and using each agent's `description` as the picker hint:

```ts
const agents = createMemo(() =>
  globalSync.data.agent.filter((item) => item.mode !== "subagent" && !item.hidden),
)
```

- [ ] Treat the first backend-provided visible agent as the default. Since `Agent.list()` puts the configured/default agent first, this keeps the backend authoritative without adding another frontend default registry.
- [ ] In `ui.ts`, remove `VALID_AGENTS`. Persist a plain agent name, reconcile it against the live backend list in `Composer`, and use a versioned storage key so installations that inherited the old implicit `research` default start cleanly in `general`.
- [ ] Keep explicit user selections persistent. If a saved custom agent no longer exists, select the first visible backend agent.
- [ ] Update the composer placeholder:
  - `general`: “ask anything · / for skills”
  - `research`: “ask a research question · / for skills”
  - `plan`: retain the plan-specific placeholder
- [ ] In `context/local.tsx`, replace the two hard-coded `"research"` restore fallbacks with the first visible/default agent. Preserve the research and biology cycling behavior.
- [ ] Add a Playwright test that uses the real rendered workspace and asserts:
  - the initial agent button says `general`
  - the picker includes `research`
  - selecting `research` updates the button and research placeholder
  - reloading preserves the explicit selection
  - clearing the versioned preference returns to `general`
- [ ] Run:

```bash
cd frontend/workspace
bun run typecheck
bun run test -- e2e/agent-routing.spec.ts
bun run build
```

Expected: typecheck/build exit 0 and the new routing test passes.

- [ ] Commit:

```bash
git add frontend/workspace/src/atlas/Composer.tsx frontend/workspace/src/atlas/store/ui.ts frontend/workspace/src/context/local.tsx frontend/workspace/e2e/agent-routing.spec.ts
git commit -m "feat: drive agent selection from the backend"
```

## Task 4: Align project guidance and complete regression verification

**Files:**

- Modify `CLAUDE.md`
- Modify `ARCHITECTURE.md` only if it currently documents the default agent

### Steps

- [ ] Update the prompt architecture documentation so `general` is described as the default top-level agent and `research` as an explicit/delegable specialist.
- [ ] Add a concise developer-assistant boundary: runtime agent prompts are product implementation details, not instructions that an external coding assistant should apply to repository maintenance tasks.
- [ ] Add the small-task rule: icon, color, spacing, copy, and single-component fixes should be handled directly with focused verification unless the user explicitly requests design/research/planning workflows.
- [ ] Run the complete routing regression set:

```bash
cd backend/cli
bun test test/agent/agent.test.ts test/session
bun run typecheck

cd ../../frontend/workspace
bun run typecheck
bun run test -- e2e/agent-routing.spec.ts e2e/branding.spec.ts e2e/home.spec.ts
bun run build

cd ../..
git diff --check
```

- [ ] Run the repository-required backend suite once and report its exact baseline independently:

```bash
cd backend/cli
bun test
```

Current known baseline in this environment: `1093 pass`, `1 skip`, `11 fail`, with failures in sandbox/browser/token-refresh/temporary-port tests. The implementation must not introduce additional failures.

- [ ] Commit:

```bash
git add CLAUDE.md ARCHITECTURE.md
git commit -m "docs: clarify general and research agent roles"
```

## Approval criteria

Approve this plan if the intended product behavior is:

1. Every new ordinary task starts in `general`.
2. Scientific workflow is opt-in through explicit `research` selection or delegation.
3. Plan approval returns to the configured default, normally `general`.
4. The frontend no longer owns a duplicate hard-coded agent registry.
5. No hidden classifier decides the mode.

Implementation must stop and request a new decision if any of these five points changes.
