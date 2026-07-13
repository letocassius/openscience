# Architecture

This document explains how OpenScience is put together, so you can find your way around the codebase and know where a change belongs.

## The shape of the system

When you run `openscience`, the CLI starts a local server and opens a workspace in your browser. Everything runs on your machine.

```
  Browser workspace  (frontend/workspace, SolidJS)
        |  HTTP + SSE, localhost only
        v
  Local server       (backend/cli/src/server)
        |
        +--  Agent runtime      sessions, message loop, model routing
        +--  Tool layer         shell, edit, LSP, MCP, science connectors
        +--  Skills             bundled and user-installed skill packs
        +--  Providers          Anthropic, OpenAI, Google, and 75+ more
        |
        +--  Atlas client       optional: managed models, wallet, graph
```

The server binds to `127.0.0.1` and enforces a Host and Origin allowlist. There is no remote mode.

## Repository layout

```
backend/cli          The CLI, server, agent runtime, tools, and skills
frontend/workspace   The workspace UI (SolidJS), served by the CLI
frontend/ui          Shared UI components, themes, and fonts
frontend/docs        The documentation and session-share site (Astro)
frontend/landing     The marketing site (openscience.sh)
tooling/sdk/js       The TypeScript SDK, generated from the server contract
tooling/plugin       The plugin runtime (@synsci/plugin)
tooling/launcher     The `npx synsci` installer
tooling/repo         Release automation
tooling/script       Build helper used across packages
tooling/util         Shared TypeScript utilities (@synsci/util)
tooling/patches      Dependency patches applied at install time
```

## Backend (`backend/cli`)

The backend is a Bun and TypeScript application compiled to a single native binary per platform.

- `src/index.ts` registers the CLI commands and boots the process. Running `openscience` with no subcommand opens the workspace (`src/cli/cmd/web.ts`).
- `src/server` is a Hono server. It serves the embedded workspace UI, exposes the session and tool APIs, and streams events back to the browser over SSE.
- `src/session` is the agent runtime: the message loop, tool dispatch, compaction, provenance, and an optional blind reviewer gate that runs at finalize.
- `src/agent` holds the agent registry and prompts. The default agent is `research`; `biology`, `physics`, and `ml` are specialists; `plan` is a read-only mode.
- `src/provider` routes each request to a model. Model definitions come from [models.dev](https://models.dev), cached locally with a bundled snapshot as a fallback.
- `src/tool` and `src/science` implement the tools the agent can call, including the shell, editor, LSP bridge, MCP client, and the scientific database connectors.
- `src/openscience` is the Atlas client. It is optional; the base install and every bring-your-own-key flow work without it.

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
        src/session/instruction.ts loads the winning filename class from the
        active directory through the worktree, plus applicable on-read guidance
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

When experimental plan mode is disabled, `insertReminders` also injects `src/session/prompt/plan.txt` for `plan` and injects `build-switch.txt` after prior plan activity when the active agent is no longer `plan`. When experimental plan mode is enabled, it injects `build-switch.txt` on exit from `plan` only when the session's plan file exists. Separately, `src/session/prompt.ts` appends `max-steps.txt` as assistant-role content on an agent's final allowed step.

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

`src/session/instruction.ts` checks these filename classes in order. For each class, `systemPaths()` walks upward from `Instance.directory` through `Instance.worktree`, then stops after the first class with matches:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `CONTEXT.md` (deprecated)

`systemPaths()` includes every matching file for the winning filename class along that directory-to-worktree walk. A session launched in `backend/cli`, for example, can initially load both `backend/cli/AGENTS.md` and the root `AGENTS.md`. When a tool reads a file, `resolve()` walks from the file's directory upward through `Instance.directory` and adds only applicable unclaimed instructions that were not already system-loaded or message-loaded. Neither path changes the active agent selected by the registry.

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
| Wrong project instructions appear | Filename-class precedence or directory-to-worktree discovery loaded another file | `src/session/instruction.ts` |

### Skills

Skills are instruction bundles the agent loads on demand (`src/skill`). Released builds fetch the catalog from the Atlas skill index and cache it; running from source loads the bundled `skills/` tree directly. A small set of system skills (for example `initialize-atlas-graph`) is embedded so it resolves even when the catalog omits it. See [docs/notes/skills.md](docs/notes/skills.md) for the full source order.

## Frontend

- `frontend/workspace` is the workspace UI. It talks to the local server over the same API the SDK exposes, and renders sessions, files, a terminal, and inline scientific views (molecules, structures, genomes, plots). The CLI build embeds the compiled UI into the binary.
- `frontend/ui` is the shared component and theme library used by the app and the docs site.
- `frontend/docs` is the Astro documentation and share site.

## SDK and plugins

- `tooling/sdk/js` is generated from the server's OpenAPI contract. Run `./tooling/repo/generate.ts` after changing the server API to regenerate it.
- `tooling/plugin` is the plugin runtime. Plugins receive a typed client and can add tools, providers, and hooks.

## Configuration and state

Global config lives in `~/.config/openscience/openscience.json`; project config in `openscience.json` or a `.openscience/` directory at the repo root. On-disk state (sessions, auth, caches) lives under the XDG data, config, cache, and state directories, resolved in `src/global/index.ts`. Installs made before the OpenScience rename migrate automatically from the legacy `synsc` directories on first run.

## Atlas integration

Atlas is a separate, closed platform. Only its client lives here. The CLI talks to it over a documented wire contract: the `synsci` model provider id, `thk_` wallet keys, and the `/api/cli/*` endpoints, with `app.syntheticsciences.ai` as the default managed base URL (`src/endpoints.ts`). Billing classification (`byok`, `managed`, `oauth-free`) is decided client-side in `src/session/billing-gate.ts`; the server is the billing authority. None of the Atlas server, its secrets, or its internal endpoints are part of this repository.

## Build and release

`backend/cli/script/build.ts` fetches the model catalog, builds the workspace UI, and compiles the CLI to native binaries for Linux, macOS, and Windows. Each platform binary is published as its own npm package (`@synsci/openscience-<platform>`), and a small meta package (`@synsci/openscience`) selects the right one at install time. The `npx synsci` launcher installs that meta package. Releases run through `.github/workflows/publish.yml`.
