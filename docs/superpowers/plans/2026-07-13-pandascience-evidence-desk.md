# PandaScience Evidence Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the user-facing SolidJS workspace as PandaScience by Insilico Medicine and implement the approved Evidence Desk visual system without changing internal OpenScience contracts.

**Architecture:** Keep the current router, providers, stores, SDK handlers, and pane components intact. Introduce user-facing brand constants and an Evidence Desk semantic CSS layer, then restyle the existing home and session shells through stable class hooks so functionality remains owned by the current components.

**Tech Stack:** Bun 1.3.5, TypeScript 5.8, SolidJS 1.9, Tailwind CSS 4, Playwright 1.57, existing `@synsci/ui` components.

## Global Constraints

- Display the product name as **PandaScience** and the company as **Insilico Medicine** only in user-facing branding.
- Keep CLI commands, package scopes, API identifiers, SDK identifiers, storage keys, environment variables, technical filenames such as `openscience.json`, and source namespaces unchanged.
- Use `#21965F` for primary interaction, `#E7F6EE` for selection, `#FAFAFA` for the canvas, `#FFFFFF` for panels, `#212121` for primary text, `#666666` for secondary text, and `#E0E0E0` for explicit borders.
- Use 8px radii for controls, 16px radii for main panels, quiet shadows, and approximately 200ms functional motion.
- Preserve the existing dark semantic theme; do not invent a new PandaScience dark palette.
- Preserve project opening, sessions, streaming, composer actions, files, scientific artifacts, agents, skills, terminal, settings, dialogs, permissions, questions, and error handling.
- Do not add dependencies, mock application data, creator credits, or self-referential attribution.
- Follow the repository TypeScript style: prefer `const`, early returns, `createStore`, inference, and single-word names.

---

## File Structure

- Create `frontend/workspace/src/brand.ts`: exported user-facing product and company constants.
- Create `frontend/workspace/src/styles/evidence.css`: Evidence Desk tokens, shared shell classes, responsive rules, focus, and reduced-motion behavior.
- Modify `frontend/workspace/src/index.css`: load the new Evidence Desk stylesheet after the existing Atlas layer.
- Modify `frontend/workspace/src/styles/tokens.ts`: align exported font and radius helpers with the approved system.
- Modify `frontend/workspace/src/atlas/Wordmark.tsx`: render PandaScience branding and the restrained panda-science mark.
- Modify `frontend/workspace/src/atlas/AppHeader.tsx`: apply the 56px Evidence Desk header and shared controls.
- Modify `frontend/workspace/src/pages/home.tsx`: apply the project-registry layout and Insilico Medicine orientation copy.
- Modify `frontend/workspace/src/pages/session.tsx`: apply the three-pane Evidence Desk workbench hooks and narrow-screen behavior.
- Modify user-facing copy files under `frontend/workspace/src`: replace displayed OpenScience brand references while preserving technical identifiers.
- Modify `frontend/workspace/index.html`: set the PandaScience document title and approved light theme color.
- Create `frontend/workspace/e2e/branding.spec.ts`: verify real rendered branding and Evidence Desk shell semantics.
- Modify `frontend/workspace/e2e/home.spec.ts`: verify the redesigned home entrypoints without weakening existing behavior checks.
- Modify `frontend/workspace/e2e/session.spec.ts`: verify the real session workbench and composer remain usable.

---

### Task 1: Establish the user-facing PandaScience brand contract

**Files:**
- Create: `frontend/workspace/src/brand.ts`
- Create: `frontend/workspace/e2e/branding.spec.ts`
- Modify: `frontend/workspace/src/atlas/Wordmark.tsx`
- Modify: `frontend/workspace/index.html`
- Modify: `frontend/workspace/src/components/dialog-settings.tsx`
- Modify: `frontend/workspace/src/pages/error.tsx`

**Interfaces:**
- Consumes: Existing SolidJS rendering and Playwright fixtures.
- Produces: `PRODUCT`, `COMPANY`, and `DESKTOP` string exports used by user-facing surfaces.

- [ ] **Step 1: Write the branding end-to-end test**

```ts
import { test, expect } from "./fixtures"

test("renders the PandaScience product identity", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle("PandaScience")
  await expect(page.getByRole("button", { name: "PandaScience" }).first()).toBeVisible()
})
```

- [ ] **Step 2: Run the test and confirm the current brand fails**

Run: `cd frontend/workspace && bun run test -- e2e/branding.spec.ts`

Expected: FAIL because the document title and wordmark still say `OpenScience`.

- [ ] **Step 3: Add the brand constants**

```ts
export const PRODUCT = "PandaScience"
export const COMPANY = "Insilico Medicine"
export const DESKTOP = `${PRODUCT} Desktop`
```

- [ ] **Step 4: Render the PandaScience wordmark**

Update `Wordmark.tsx` to import `PRODUCT`, preserve the existing `size`, `textOnly`, and `onClick` API, set `aria-label={PRODUCT}`, replace the old image with a CSS-rendered restrained circular panda mark, and render `{PRODUCT}` as the visible label. The mark must use `aria-hidden="true"` and no external image request.

```tsx
<span class="panda-mark" aria-hidden="true">
  <span class="panda-mark__ear panda-mark__ear--left" />
  <span class="panda-mark__ear panda-mark__ear--right" />
  <span class="panda-mark__face" />
</span>
<span class="panda-wordmark">{PRODUCT}</span>
```

- [ ] **Step 5: Update immediately visible product names**

Set `<title>PandaScience</title>` in `frontend/workspace/index.html`; replace the visible settings-dialog footer brand and error-page brand with `PRODUCT`. Keep GitHub URLs, `openscience.json`, theme preload ids, and client constructor names unchanged.

- [ ] **Step 6: Run the focused branding test**

Run: `cd frontend/workspace && bun run test -- e2e/branding.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit the brand contract**

```bash
git add frontend/workspace/src/brand.ts frontend/workspace/src/atlas/Wordmark.tsx frontend/workspace/index.html frontend/workspace/src/components/dialog-settings.tsx frontend/workspace/src/pages/error.tsx frontend/workspace/e2e/branding.spec.ts
git commit -m "feat: introduce PandaScience workspace branding"
```

---

### Task 2: Build the Evidence Desk semantic style layer

**Files:**
- Create: `frontend/workspace/src/styles/evidence.css`
- Modify: `frontend/workspace/src/index.css`
- Modify: `frontend/workspace/src/styles/tokens.ts`
- Modify: `frontend/workspace/src/atlas/AppHeader.tsx`

**Interfaces:**
- Consumes: Existing `--background-*`, `--surface-*`, `--text-*`, and dark-mode semantic tokens.
- Produces: `.evidence-root`, `.evidence-header`, `.evidence-panel`, `.evidence-control`, `.evidence-primary`, `.evidence-label`, `.evidence-home`, `.evidence-workbench`, `.evidence-nav`, `.evidence-main`, and `.evidence-side` class hooks.

- [ ] **Step 1: Extend the branding test with computed-style assertions**

```ts
const canvas = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--evidence-canvas").trim())
expect(canvas).toBe("#fafafa")
const header = page.locator(".evidence-header")
await expect(header).toHaveCSS("min-height", "56px")
```

- [ ] **Step 2: Run the test and confirm the missing style layer fails**

Run: `cd frontend/workspace && bun run test -- e2e/branding.spec.ts`

Expected: FAIL because the Evidence Desk classes and values are absent.

- [ ] **Step 3: Add the semantic Evidence Desk variables and primitives**

Create `evidence.css` with the approved light values and semantic aliases. Dark mode must inherit the current runtime theme values rather than hard-code a new palette.

```css
:root {
  --evidence-primary: #21965f;
  --evidence-primary-hover: #1c8554;
  --evidence-selected: #e7f6ee;
  --evidence-canvas: #fafafa;
  --evidence-panel: #ffffff;
  --evidence-ink: #212121;
  --evidence-slate: #666666;
  --evidence-border: #e0e0e0;
  --evidence-radius-control: 8px;
  --evidence-radius-panel: 16px;
  --evidence-shadow-panel: 0 1px 2px rgba(16, 24, 40, 0.03), 0 2px 6px rgba(16, 24, 40, 0.03);
  --evidence-motion: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.evidence-root {
  background: var(--evidence-canvas);
  color: var(--evidence-ink);
}

.evidence-panel {
  background: var(--color-surface-solid);
  border: 1px solid var(--color-border);
  border-radius: var(--evidence-radius-panel);
  box-shadow: var(--evidence-shadow-panel);
}
```

- [ ] **Step 4: Load the stylesheet and align exported helpers**

Append `@import "./styles/evidence.css";` after `atlas.css` in `index.css`. Change `FONT_SANS` to the locally supported UI sans stack and `RADIUS` to `8`; retain `FONT_CODE` for technical content and make `FONT_SERIF` an intentional heading fallback, not the default for controls.

- [ ] **Step 5: Convert the shared header**

Add `evidence-header` to `AppHeader`, set a 56px minimum height, use 16px horizontal padding, and apply the `evidence-control` hook to icon buttons. Preserve all current callback props and titles.

- [ ] **Step 6: Add reduced-motion and focus rules**

```css
@media (prefers-reduced-motion: reduce) {
  .evidence-root *,
  .evidence-root *::before,
  .evidence-root *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

Retain the existing global `:focus-visible` ring and ensure the green primary button pair uses a contrast-safe dark hover value.

- [ ] **Step 7: Run style and type gates**

Run: `cd frontend/workspace && bun run typecheck && bun run test -- e2e/branding.spec.ts`

Expected: Typecheck and the Evidence Desk token/header assertions pass.

- [ ] **Step 8: Commit the style layer**

```bash
git add frontend/workspace/src/styles/evidence.css frontend/workspace/src/index.css frontend/workspace/src/styles/tokens.ts frontend/workspace/src/atlas/AppHeader.tsx frontend/workspace/e2e/branding.spec.ts
git commit -m "feat: add Evidence Desk design system"
```

---

### Task 3: Redesign the project home as a research registry

**Files:**
- Modify: `frontend/workspace/src/pages/home.tsx`
- Modify: `frontend/workspace/e2e/home.spec.ts`
- Modify: `frontend/workspace/e2e/branding.spec.ts`

**Interfaces:**
- Consumes: `PRODUCT`, `COMPANY`, existing `useGlobalSync`, `useLayout`, `projectPrefs`, `chooseProject`, search, grid/list view, and server health.
- Produces: A functional `.evidence-home` page and company orientation label.

- [ ] **Step 1: Strengthen home behavior assertions**

```ts
test("home renders the Evidence Desk project registry", async ({ page }) => {
  await page.goto("/")

  await expect(page.locator(".evidence-root")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Research projects" })).toBeVisible()
  await expect(page.getByPlaceholder("Search projects")).toBeVisible()
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible()
  await expect(page.getByText("Insilico Medicine", { exact: true })).toBeVisible()
})
```

- [ ] **Step 2: Run home tests and confirm the new structure fails**

Run: `cd frontend/workspace && bun run test -- e2e/home.spec.ts e2e/branding.spec.ts`

Expected: FAIL on the new heading, placeholder, button label, company label, and Evidence Desk root.

- [ ] **Step 3: Apply stable class hooks to the existing page**

Change the page root to `class="atlas-root evidence-root evidence-home"`; keep every existing provider hook and action. Add semantic classes to the search control, primary new-project action, project list/grid containers, cards, rows, and empty states instead of cloning their logic.

- [ ] **Step 4: Add the research-registry orientation block**

Render the following hierarchy above the project collection when projects exist and adapt the same copy into `EmptyHero` when none exist:

```tsx
<div class="evidence-home__intro">
  <div>
    <div class="evidence-label">{COMPANY}</div>
    <h1>Research projects</h1>
    <p>Open a workspace to continue an analysis, review evidence, or begin a new scientific inquiry.</p>
  </div>
  <div class="evidence-home__count" aria-label={`${projects().length} projects`}>
    <strong>{projects().length}</strong>
    <span>active workspaces</span>
  </div>
</div>
```

- [ ] **Step 5: Restyle existing project cards and rows**

Use 16px panels, 16–24px content padding, pale-green selected/hover cues, stable metadata order, and current favorite/hide actions. Preserve grid/list persistence, deduplication, search filtering, folder selection, server selection, and navigation.

- [ ] **Step 6: Add responsive home rules**

At widths below 760px, collapse header search into a full-width second row, hide nonessential header text, use a single project column, and keep new-project and server actions reachable with accessible labels.

- [ ] **Step 7: Run focused home and branding tests**

Run: `cd frontend/workspace && bun run test -- e2e/home.spec.ts e2e/branding.spec.ts`

Expected: PASS.

- [ ] **Step 8: Commit the home redesign**

```bash
git add frontend/workspace/src/pages/home.tsx frontend/workspace/e2e/home.spec.ts frontend/workspace/e2e/branding.spec.ts
git commit -m "feat: redesign PandaScience project registry"
```

---

### Task 4: Redesign the session as a three-pane Evidence Desk workbench

**Files:**
- Modify: `frontend/workspace/src/pages/session.tsx`
- Modify: `frontend/workspace/src/atlas/RightPane.tsx`
- Modify: `frontend/workspace/e2e/session.spec.ts`
- Modify: `frontend/workspace/e2e/sidebar.spec.ts`

**Interfaces:**
- Consumes: Existing session sync, routing, `SessionsSidebar`, `CenterTabStrip`, `SessionTurn`, `PromptInput`, `RightPane`, center tabs, pane toggles, and responsive state.
- Produces: `.evidence-workbench`, `.evidence-nav`, `.evidence-main`, and `.evidence-side` presentation hooks with unchanged behavior.

- [ ] **Step 1: Add real session-shell assertions**

After `gotoSession(sessionID)`, assert:

```ts
await expect(page.locator(".evidence-workbench")).toBeVisible()
await expect(page.locator(".evidence-nav")).toBeVisible()
await expect(page.locator(".evidence-main")).toBeVisible()
await expect(page.locator(".evidence-side")).toBeVisible()
await expect(page.locator(promptSelector)).toBeEditable()
```

Keep the existing text-entry assertion and sidebar collapse assertions.

- [ ] **Step 2: Run session tests and confirm the hooks fail**

Run: `cd frontend/workspace && bun run test -- e2e/session.spec.ts e2e/sidebar.spec.ts`

Expected: FAIL only on missing Evidence Desk class hooks; existing behavior remains green.

- [ ] **Step 3: Apply the three-pane shell hooks**

Set the root to `atlas-root evidence-root`, the post-header flex shell to `evidence-workbench`, `SessionsSidebar` outermost element to `evidence-nav evidence-panel`, the center workspace wrapper to `evidence-main evidence-panel`, and the `RightPane` outermost surface to `evidence-side evidence-panel`.

- [ ] **Step 4: Tune navigation and center workspace hierarchy**

Use a 320px default navigation width constrained by the current resize/collapse behavior, 8px pane gaps, 16px outer padding, independent scrolling, and a neutral canvas around white panels. Restyle selected sessions with pale green plus a 3px indicator and explicit text state.

- [ ] **Step 5: Tune transcript and composer**

Keep `SessionTurn`, streaming, compaction, revert, scroll-follow, and prompt handlers unchanged. Increase the reading measure only enough for scientific output, make assistant/tool surfaces use borders and tonal fills instead of repeated elevation, and make the composer an 8–12px radius controlled surface with a green send action.

- [ ] **Step 6: Tune evidence pane tabs and status**

Preserve all current `RightPane` tabs and mounts. Use the Evidence Desk label style for tabs, pale semantic surfaces for state, and independent scrolling for files, agents, skills, terminal, and artifacts.

- [ ] **Step 7: Implement narrow-screen pane behavior**

Below 900px, keep the transcript primary; make navigation and evidence panes overlay from their existing toggles with a backdrop, close on Escape, and do not render both side panes as stacked document flow. Preserve visible focus and accessible toggle names.

- [ ] **Step 8: Run session behavior tests**

Run: `cd frontend/workspace && bun run test -- e2e/session.spec.ts e2e/sidebar.spec.ts e2e/sidebar-session-links.spec.ts e2e/file-open.spec.ts e2e/terminal.spec.ts`

Expected: PASS.

- [ ] **Step 9: Commit the workbench redesign**

```bash
git add frontend/workspace/src/pages/session.tsx frontend/workspace/src/atlas/RightPane.tsx frontend/workspace/e2e/session.spec.ts frontend/workspace/e2e/sidebar.spec.ts
git commit -m "feat: redesign PandaScience session workbench"
```

---

### Task 5: Complete the user-facing branding sweep

**Files:**
- Modify: `frontend/workspace/src/i18n/*.ts`
- Modify: `frontend/workspace/src/atlas/DisconnectedPanel.tsx`
- Modify: `frontend/workspace/src/atlas/FileExplorer.tsx`
- Modify: `frontend/workspace/src/atlas/OpenScienceFileTree.tsx`
- Modify: `frontend/workspace/src/atlas/FolderPicker.tsx`
- Modify: `frontend/workspace/src/atlas/FdaBanner.tsx`
- Modify: `frontend/workspace/src/components/settings/*.tsx`
- Modify: Other `frontend/workspace/src/**/*.tsx` files containing visible `OpenScience` copy.
- Modify: `frontend/workspace/e2e/branding.spec.ts`

**Interfaces:**
- Consumes: Existing translated string dictionaries and technical identifiers.
- Produces: Consistent PandaScience display copy across supported locales and settings surfaces.

- [ ] **Step 1: Add a rendered settings branding assertion**

Open settings through the existing settings control and assert the dialog contains `PandaScience` and no visible exact `OpenScience` brand label. Do not assert against technical help text that correctly contains `openscience.json` or `openscience` CLI commands.

- [ ] **Step 2: Run the branding test and confirm visible legacy copy fails**

Run: `cd frontend/workspace && bun run test -- e2e/branding.spec.ts`

Expected: FAIL where settings or other rendered product labels still display `OpenScience`.

- [ ] **Step 3: Replace display-brand strings in all locale dictionaries**

Mechanically replace capitalized product-name occurrences inside user-facing i18n values with `PandaScience`. Preserve lowercase `openscience.json`, CLI commands, localStorage keys, environment variables, theme ids, JavaScript identifiers, comments, and GitHub URLs.

- [ ] **Step 4: Replace remaining directly rendered brand copy**

Import `PRODUCT` where a component directly renders the brand and use template expressions such as `` `${PRODUCT} cannot read this directory` ``. Update user-facing settings descriptions, restart messages, server labels, and full-disk-access instructions while keeping system application paths and technical filenames intact.

- [ ] **Step 5: Audit the branding boundary**

Run:

```bash
rg -n 'OpenScience' frontend/workspace/src -g '*.{tsx,ts}'
rg -n 'PandaScience|Insilico Medicine' frontend/workspace/src frontend/workspace/index.html -g '*.{tsx,ts,html}'
```

Expected: Remaining `OpenScience` occurrences are internal names, comments, technical filenames, client constructors, ids, or URLs; all displayed product labels use PandaScience.

- [ ] **Step 6: Run branding and settings tests**

Run: `cd frontend/workspace && bun run test -- e2e/branding.spec.ts e2e/settings.spec.ts e2e/settings-providers.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit the branding sweep**

```bash
git add frontend/workspace/src/i18n frontend/workspace/src/atlas frontend/workspace/src/components frontend/workspace/e2e/branding.spec.ts
git commit -m "feat: complete PandaScience display branding"
```

---

### Task 6: Verify and polish the complete redesign

**Files:**
- Modify only files already in scope when verification exposes a concrete defect.

**Interfaces:**
- Consumes: Completed PandaScience Evidence Desk implementation.
- Produces: A verified branch ready for user review.

- [ ] **Step 1: Run static frontend gates**

Run: `cd frontend/workspace && bun run typecheck && bun run build`

Expected: Both commands exit 0.

- [ ] **Step 2: Run focused frontend tests**

Run: `cd frontend/workspace && bun run test -- e2e/branding.spec.ts e2e/home.spec.ts e2e/session.spec.ts e2e/sidebar.spec.ts e2e/sidebar-session-links.spec.ts e2e/file-open.spec.ts e2e/settings.spec.ts e2e/terminal.spec.ts`

Expected: All selected Playwright tests pass.

- [ ] **Step 3: Run the required backend suite**

Run: `cd backend/cli && bun test`

Expected: The suite exits 0 with no new failures.

- [ ] **Step 4: Inspect the app in a browser without restarting existing processes**

Check whether ports 4096 and 4444 already have the required backend and frontend processes. Start only missing processes using the documented commands. Inspect the home and session views at 1440×900, 1024×768, and 390×844. Verify project opening, session selection, prompt entry, right-pane tabs, settings, theme toggle, keyboard focus, and drawer behavior.

- [ ] **Step 5: Run repository hygiene checks**

Run: `git diff --check && git status --short && git diff --stat main...HEAD`

Expected: No whitespace errors; only the design spec, implementation plan, Evidence Desk frontend files, and related tests are changed.

- [ ] **Step 6: Commit any verification fixes**

If verification required changes, stage only the affected in-scope files and run:

```bash
git commit -m "fix: polish PandaScience evidence desk"
```

If no fixes were required, do not create an empty commit.
