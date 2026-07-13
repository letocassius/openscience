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
