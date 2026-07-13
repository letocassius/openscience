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
