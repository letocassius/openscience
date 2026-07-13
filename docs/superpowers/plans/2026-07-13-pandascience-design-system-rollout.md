# PandaScience Design System Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the `design.md` light-only visual system across the OpenScience browser workspace, remove the home company label and theme controls, and require explicit footer confirmation before a picked folder becomes a workspace.

**Architecture:** Extend the shared theme provider with an optional locked color scheme, then lock only the workspace application to light mode. Put the supplied palette, typography, radius, elevation, and motion values into the existing semantic theme and Atlas alias layers so Session, Settings, dialogs, menus, and self-styled Atlas surfaces inherit one system; use narrow component edits only for hard-coded exceptions.

**Tech Stack:** Bun 1.3.x, SolidJS 1.9, Vite 7, Kobalte dialogs, `@synsci/ui`, Playwright, CSS semantic tokens, `@fontsource/roboto` 5.2.10.

## Global Constraints

- `design.md` is the visual source of truth: `#21965F` primary, `#1C8554` hover, `#E7F6EE` selected surface, `#FAFAFA` canvas, `#FFFFFF` panels, `#212121` primary text, `#666666` secondary text, `#E0E0E0` explicit borders.
- The browser workspace is light-only; ignore a stored dark preference and expose no light/dark control.
- Keep the accepted Home layout; remove `INSILICO MEDICINE` and the theme button without redesigning the page structure.
- Folder rows navigate only; only the footer `open this folder` action may submit a project.
- Preserve backend behavior, providers, routes, SDK calls, scientific renderer internals, independent scrolling, and user-owned processes.
- Use Roboto 400/500/700 for interface text and keep the existing configured monospace face for code and technical labels.
- Keep 8px control radii, 16px major panel/dialog radii, restrained shadows, one dominant action per bounded task, visible focus, and reduced-motion behavior.
- Do not add creator attribution, another component library, mock application data, or a new dark palette.

## File Map

- `frontend/ui/src/theme/context.tsx`: optional application-level color-scheme lock.
- `frontend/ui/src/theme/themes/openscience.json`: exact PandaScience light semantic palette.
- `frontend/ui/src/styles/theme.css`: Roboto family, type scale, radii, shadows, and motion defaults consumed by shared primitives.
- `frontend/ui/src/components/dialog.css`, `button.css`, `dropdown-menu.css`, `toast.css`: shared popup/control presentation.
- `frontend/workspace/src/app.tsx`: applies the light lock.
- `frontend/workspace/src/index.css`, `styles/atlas.css`, `styles/evidence.css`, `styles/tokens.ts`: workspace font imports and design aliases.
- `frontend/workspace/src/pages/home.tsx`, `pages/session.tsx`: remove company/theme controls and retain the accepted structures.
- `frontend/workspace/src/components/settings-general.tsx`, `components/dialog-settings.tsx`, `components/settings/_shared.tsx`: remove appearance switching and align all Settings panels.
- `frontend/workspace/src/atlas/FolderPicker.tsx`: separate navigation from project submission and align picker styling.
- `frontend/workspace/src/atlas/SetupDialog.tsx`, `CommandPalette.tsx`, `HelpOverlay.tsx`, `FdaBanner.tsx`, `SkillsBrowser.tsx`, `FilePreview.tsx`: hard-coded popup exceptions.
- `frontend/workspace/src/components/dialog-select-server.tsx`, `dialog-select-model.tsx`, `dialog-select-model-unpaid.tsx`, `dialog-manage-models.tsx`, `dialog-release-notes.tsx`: shared-dialog content alignment.
- `frontend/workspace/e2e/home.spec.ts`, `folder-picker.spec.ts`, `design-system.spec.ts`, `settings.spec.ts`, `palette.spec.ts`: behavioral and visual-contract regression coverage.

---

### Task 1: Lock the workspace to light mode and remove obsolete branding controls

**Files:**
- Modify: `frontend/workspace/e2e/home.spec.ts`
- Modify: `frontend/ui/src/theme/context.tsx`
- Modify: `frontend/workspace/src/app.tsx`
- Modify: `frontend/workspace/src/pages/home.tsx`
- Modify: `frontend/workspace/src/pages/session.tsx`
- Modify: `frontend/workspace/src/components/settings-general.tsx`
- Modify: `frontend/workspace/src/brand.ts`

**Interfaces:**
- Consumes: existing `ThemeProvider`, `useTheme`, and local-storage key `openscience-color-scheme`.
- Produces: `ThemeProvider` prop `lockedColorScheme?: "light" | "dark"`; workspace DOM always has `data-color-scheme="light"`.

- [ ] **Step 1: Write the failing Home/light-mode contract**

Add this test to `e2e/home.spec.ts` and invert the old company expectation in the existing home test:

```ts
test("workspace ignores a saved dark preference and exposes no theme controls", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("openscience-color-scheme", "dark"))
  await page.goto("/")

  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "light")
  await expect(page.getByText("Insilico Medicine", { exact: true })).toHaveCount(0)
  await expect(page.getByTitle("toggle theme")).toHaveCount(0)
})
```

Change the existing assertion to:

```ts
await expect(page.getByText("Insilico Medicine", { exact: true })).toHaveCount(0)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/home.spec.ts --grep "saved dark preference"
```

Expected: FAIL because the provider restores `dark`, the company label is rendered, and `toggle theme` exists.

- [ ] **Step 3: Add a backwards-compatible theme lock**

In `frontend/ui/src/theme/context.tsx`, extend the provider init props and initial state:

```ts
init: (props: { defaultTheme?: string; lockedColorScheme?: "light" | "dark" }) => {
  const locked = props.lockedColorScheme
  const initialScheme: ColorScheme = locked ?? "system"
  const [store, setStore] = createStore({
    themes: DEFAULT_THEMES as Record<string, DesktopTheme>,
    themeId: props.defaultTheme ?? "openscience",
    colorScheme: initialScheme,
    mode: initialScheme === "system" ? getSystemMode() : initialScheme,
    previewThemeId: null as string | null,
    previewScheme: null as ColorScheme | null,
  })
```

In `onMount`, only attach the system listener and restore the saved scheme when `locked` is absent; when locked, persist and apply it:

```ts
if (!locked) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  const handler = () => {
    if (store.colorScheme === "system") setStore("mode", getSystemMode())
  }
  mediaQuery.addEventListener("change", handler)
  onCleanup(() => mediaQuery.removeEventListener("change", handler))
}

const savedScheme = localStorage.getItem(STORAGE_KEYS.COLOR_SCHEME) as ColorScheme | null
if (locked) {
  localStorage.setItem(STORAGE_KEYS.COLOR_SCHEME, locked)
  setStore("colorScheme", locked)
  setStore("mode", locked)
} else if (savedScheme) {
  setStore("colorScheme", savedScheme)
  setStore("mode", savedScheme === "system" ? getSystemMode() : savedScheme)
}
```

Clamp public scheme-changing and preview methods to the lock:

```ts
const setColorScheme = (scheme: ColorScheme) => {
  const next = locked ?? scheme
  setStore("colorScheme", next)
  localStorage.setItem(STORAGE_KEYS.COLOR_SCHEME, next)
  setStore("mode", next === "system" ? getSystemMode() : next)
}
```

Use `locked ?? scheme` inside `previewColorScheme`, and do not commit a preview scheme when `locked` is present.

- [ ] **Step 4: Lock the application and remove user-facing switches**

In `app.tsx`:

```tsx
<ThemeProvider lockedColorScheme="light">
  {children}
</ThemeProvider>
```

In `home.tsx`, remove `useTheme`, `COMPANY`, `IconMoon`, `IconSun`, `isDark`, `cycleScheme`, the header theme button, and both `<div class="evidence-label">{COMPANY}</div>` elements.

In `session.tsx`, remove `useTheme`, `IconMoon`, `IconSun`, `isDark`, `isDark`/`onToggleTheme` Header props, and the header theme button.

In `settings-general.tsx`, remove `ColorScheme`, the `useTheme()` dependency, `themeSwatches`, `colorSchemeOptions`, and the color-scheme/theme-picker blocks. Keep sound, notification, update, and font-size controls intact.

In `brand.ts`, leave only:

```ts
export const PRODUCT = "PandaScience"
export const DESKTOP = `${PRODUCT} Desktop`
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/home.spec.ts
bun run typecheck
```

Expected: Home tests PASS, the saved dark value is replaced with light, and TypeScript reports no unused imports or prop errors.

Commit:

```bash
git add frontend/ui/src/theme/context.tsx frontend/workspace/src/app.tsx frontend/workspace/src/pages/home.tsx frontend/workspace/src/pages/session.tsx frontend/workspace/src/components/settings-general.tsx frontend/workspace/src/brand.ts frontend/workspace/e2e/home.spec.ts
git commit -m "fix(ui): lock PandaScience to light mode"
```

### Task 2: Require explicit Folder Picker confirmation

**Files:**
- Create: `frontend/workspace/e2e/folder-picker.spec.ts`
- Modify: `frontend/workspace/src/atlas/FolderPicker.tsx`

**Interfaces:**
- Consumes: `FolderPicker` callbacks `onSelect`, `drillInto`, and `pick`.
- Produces: `FolderRow` with only `entry` and `onDrill`; `SidebarRow` double-click never calls `pick`.

- [ ] **Step 1: Write failing picker behavior tests**

Create `e2e/folder-picker.spec.ts`:

```ts
import { test, expect } from "./fixtures"

const SETUP_DISMISS_KEY = "openscience.setup.dismissed"

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
})

test("folder rows navigate without adding a workspace", async ({ page, directory }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New project" }).click()

  const picker = page.locator('[data-component="dialog"]')
  await expect(picker).toBeVisible()
  await picker.getByPlaceholder(/paste any absolute path/).fill(directory)
  await picker.getByRole("button", { name: "go", exact: true }).click()

  const row = picker.getByRole("button").filter({ has: picker.getByText("frontend", { exact: true }) })
  await expect(row).toHaveCount(1)
  await expect(row).toBeVisible()
  await row.dispatchEvent("dblclick")
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")

  await row.click()
  await expect(picker.getByTitle(`${directory}/frontend`)).toBeVisible()
  await expect(page).toHaveURL("/")
})

test("open this folder is the only submission action", async ({ page, directory }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New project" }).click()

  const picker = page.locator('[data-component="dialog"]')
  await picker.getByPlaceholder(/paste any absolute path/).fill(directory)
  await picker.getByRole("button", { name: "go", exact: true }).click()
  await picker.getByRole("button", { name: "open this folder", exact: true }).click()

  await expect(picker).toHaveCount(0)
  await expect(page).not.toHaveURL("/")
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/folder-picker.spec.ts
```

Expected: first test FAIL because the current `dblclick` handler calls `pick`, closes the picker, and navigates.

- [ ] **Step 3: Remove every row-level submission path**

Render folder rows as:

```tsx
<For each={filtered()}>{(entry) => <FolderRow entry={entry} onDrill={() => drillInto(entry)} />}</For>
```

Change the component signature and interaction text:

```tsx
function FolderRow(props: { entry: FolderEntry; onDrill: () => void }): JSX.Element {
  const [hover, setHover] = createSignal(false)
  return (
    <div
      role="button"
      tabindex="0"
      onClick={props.onDrill}
      onKeyDown={(event) => {
        if (event.key === "Enter") props.onDrill()
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${props.entry.absolute} · click to enter`}
      style={{
        cursor: "pointer",
        display: "flex",
        "align-items": "center",
        gap: "10px",
        padding: "8px 12px",
        "border-bottom": "1px solid var(--color-border)",
        background: hover() ? "var(--color-accent-subtle)" : "transparent",
        transform: hover() ? "translateX(2px)" : "translateX(0)",
        transition: "background 160ms ease, transform 160ms ease",
      }}
    >
      <IconFolder size={13} strokeWidth={1.5} />
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          "text-overflow": "ellipsis",
          "white-space": "nowrap",
          "font-family": FONT_MONO,
          "font-size": "12px",
          color: "var(--color-text)",
        }}
      >
        {props.entry.name}
      </span>
      <IconChevronRight
        size={11}
        strokeWidth={1.5}
        style={{
          opacity: hover() ? 1 : 0.5,
          transform: hover() ? "translateX(2px)" : "translateX(0)",
          transition: "opacity 160ms ease, transform 160ms ease",
        }}
      />
    </div>
  )
}
```

Delete the nested hover `open` button and `onDblClick={props.onPick}`. Remove `onDblClick={() => pick(path)}` from recent sidebar rows and remove the optional `onDblClick` prop/handler from `SidebarRow`. Leave the footer validation and `pick(valid)` unchanged.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/folder-picker.spec.ts
bun run typecheck
```

Expected: both tests PASS and no row-level `onPick`/`onDblClick` path remains.

Commit:

```bash
git add frontend/workspace/src/atlas/FolderPicker.tsx frontend/workspace/e2e/folder-picker.spec.ts
git commit -m "fix(ui): require folder picker confirmation"
```

### Task 3: Install Roboto and make the supplied tokens authoritative

**Files:**
- Modify: `frontend/workspace/package.json`
- Modify: `bun.lock`
- Create: `frontend/workspace/e2e/design-system.spec.ts`
- Modify: `frontend/workspace/src/index.css`
- Modify: `frontend/workspace/src/styles/tokens.ts`
- Modify: `frontend/workspace/src/styles/atlas.css`
- Modify: `frontend/workspace/src/styles/evidence.css`
- Modify: `frontend/ui/src/styles/theme.css`
- Modify: `frontend/ui/src/theme/themes/openscience.json`

**Interfaces:**
- Consumes: existing semantic variables and Atlas `--color-*` aliases.
- Produces: exact design tokens and self-hosted Roboto 400/500/700 throughout workspace and portaled UI.

- [ ] **Step 1: Add a failing computed-style contract**

Create `e2e/design-system.spec.ts`:

```ts
import { test, expect } from "./fixtures"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("openscience.setup.dismissed", "1"))
})

test("workspace exposes the Document Reviewer design tokens", async ({ page }) => {
  await page.goto("/")
  const values = await page.locator("html").evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      primary: style.getPropertyValue("--evidence-primary").trim().toLowerCase(),
      canvas: style.getPropertyValue("--color-bg").trim().toLowerCase(),
      panel: style.getPropertyValue("--color-surface-solid").trim().toLowerCase(),
      controlRadius: style.getPropertyValue("--radius").trim(),
      panelRadius: style.getPropertyValue("--radius-lg").trim(),
      font: style.getPropertyValue("--font-family-sans"),
    }
  })
  expect(values).toMatchObject({
    primary: "#21965f",
    canvas: "#fafafa",
    panel: "#ffffff",
    controlRadius: "8px",
    panelRadius: "16px",
  })
  expect(values.font).toContain("Roboto")
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/design-system.spec.ts
```

Expected: FAIL because the semantic canvas is cream, radii are 4/8px, and the shared font is Computer Modern.

- [ ] **Step 3: Add the self-hosted font dependency**

Run from the repository root:

```bash
bun add --cwd frontend/workspace @fontsource/roboto@5.2.10
```

At the top of `frontend/workspace/src/index.css`, before the Tailwind import:

```css
@import "@fontsource/roboto/400.css";
@import "@fontsource/roboto/500.css";
@import "@fontsource/roboto/700.css";
```

- [ ] **Step 4: Replace typography, radii, motion, and palette tokens**

Set the shared families in `frontend/ui/src/styles/theme.css` and workspace tokens:

```css
--font-family-sans: "Roboto", sans-serif;
--font-family-serif: "Roboto", sans-serif;
--radius-xs: 0.5rem;
--radius-sm: 0.5rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
--duration-fast: 150ms;
--duration-slow: 200ms;
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
```

```ts
export const FONT_SANS = '"Roboto", sans-serif'
export const FONT_SERIF = '"Roboto", sans-serif'
```

Update the light overrides in `openscience.json` to the exact values below while retaining required generated semantic keys:

```json
{
  "background-base": "#FAFAFA",
  "background-weak": "#F5F5F5",
  "background-strong": "#FAFAFA",
  "background-stronger": "#FFFFFF",
  "surface-raised-strong": "#FFFFFF",
  "surface-raised-strong-hover": "#FFFFFF",
  "surface-raised-stronger": "#FFFFFF",
  "surface-raised-stronger-hover": "#FFFFFF",
  "surface-strong": "#FFFFFF",
  "surface-raised-stronger-non-alpha": "#FFFFFF",
  "border-weaker-base": "#F2F2F2",
  "border-weak-base": "#F2F2F2",
  "border-base": "#E0E0E0",
  "border-strong-base": "#C8C8C8",
  "text-base": "#212121",
  "text-weak": "#666666",
  "text-weaker": "#9E9E9E",
  "text-strong": "#212121",
  "text-interactive-base": "#1C8554",
  "surface-brand-base": "#21965F",
  "surface-brand-hover": "#1C8554",
  "surface-base-interactive-active": "#E7F6EE",
  "surface-success-weak": "#E7F6EE",
  "surface-warning-weak": "#FFF4DC",
  "surface-critical-weak": "#FEECEB"
}
```

In `atlas.css`, point `--color-accent`, focus, radii, shadows, and font aliases to these values; delete the dark-only override blocks. In `evidence.css`, add the missing subtle/disabled/semantic tokens, use Roboto, and remove its dark override block.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/design-system.spec.ts
bun run typecheck
bun run build
```

Expected: the contract PASSes and Vite bundles the three local Roboto weights.

Commit:

```bash
git add bun.lock frontend/workspace/package.json frontend/workspace/src/index.css frontend/workspace/src/styles/tokens.ts frontend/workspace/src/styles/atlas.css frontend/workspace/src/styles/evidence.css frontend/ui/src/styles/theme.css frontend/ui/src/theme/themes/openscience.json frontend/workspace/e2e/design-system.spec.ts
git commit -m "feat(ui): apply PandaScience design tokens"
```

### Task 4: Standardize shared dialogs and transient controls

**Files:**
- Modify: `frontend/workspace/e2e/design-system.spec.ts`
- Modify: `frontend/ui/src/components/dialog.css`
- Modify: `frontend/ui/src/components/button.css`
- Modify: `frontend/ui/src/components/dropdown-menu.css`
- Modify: `frontend/ui/src/components/toast.css`

**Interfaces:**
- Consumes: semantic tokens from Task 3 and existing `data-component`/`data-slot` contracts.
- Produces: one shared dialog/control visual contract for every portaled surface.

- [ ] **Step 1: Add a failing representative-dialog contract**

Append to `design-system.spec.ts`:

```ts
test("shared dialogs use the PandaScience surface contract", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: /localhost|127\.0\.0\.1/ }).click()

  const dialog = page.getByRole("dialog")
  const content = dialog.locator('[data-slot="dialog-content"]')
  await expect(content).toBeVisible()
  const style = await content.evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      radius: computed.borderRadius,
      background: computed.backgroundColor,
      font: computed.fontFamily,
    }
  })
  expect(style.radius).toBe("16px")
  expect(style.background).toBe("rgb(255, 255, 255)")
  expect(style.font).toContain("Roboto")
})
```

- [ ] **Step 2: Run and verify RED**

Run `bun run test:e2e:local -- e2e/design-system.spec.ts --grep "shared dialogs"` from `frontend/workspace`.

Expected: FAIL on the old shared dialog radius/font or surface.

- [ ] **Step 3: Update the shared component CSS**

In `dialog.css`, use:

```css
[data-component="dialog-overlay"] {
  background: rgba(33, 33, 33, 0.52);
  animation: overlayShow 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

[data-slot="dialog-content"] {
  border: 1px solid var(--border-weak-base);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  font-family: var(--font-family-sans);
}

[data-slot="dialog-header"] { padding: 20px 24px 12px; }
[data-slot="dialog-title"] { font-size: 18px; font-weight: 700; line-height: 1.35; }
[data-slot="dialog-description"] { padding: 0 24px 16px; color: var(--text-weak); }
```

Add a 375px media rule that limits containers to `calc(100vw - 16px)` and `calc(100dvh - 16px)`. Add reduced-motion rules for overlay/content animations.

In `button.css`, `dropdown-menu.css`, and `toast.css`, replace old sharp radii and cream surfaces with shared 8px controls, 10px toasts, `#FFFFFF` surfaces, pale semantic feedback surfaces, 150–200ms color/opacity transitions, and visible focus styles. Do not change component structure or event handling.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/design-system.spec.ts e2e/palette.spec.ts e2e/server-default.spec.ts
bun run typecheck
```

Expected: shared dialog, palette, and server flows PASS.

Commit:

```bash
git add frontend/ui/src/components/dialog.css frontend/ui/src/components/button.css frontend/ui/src/components/dropdown-menu.css frontend/ui/src/components/toast.css frontend/workspace/e2e/design-system.spec.ts
git commit -m "feat(ui): unify PandaScience dialogs and controls"
```

### Task 5: Align Settings and Session workbench surfaces

**Files:**
- Modify: `frontend/workspace/e2e/settings.spec.ts`
- Modify: `frontend/workspace/src/components/dialog-settings.tsx`
- Modify: `frontend/workspace/src/components/settings/_shared.tsx`
- Modify: `frontend/workspace/src/components/settings/General.tsx`
- Modify: `frontend/workspace/src/styles/evidence.css`
- Modify: `frontend/workspace/src/pages/session.tsx`
- Modify: `frontend/workspace/src/atlas/AppHeader.tsx`
- Modify: `frontend/workspace/src/atlas/RightPane.tsx`
- Modify: `frontend/workspace/src/atlas/SkillsPage.tsx`

**Interfaces:**
- Consumes: shared tokens and Dialog CSS from Tasks 3–4.
- Produces: consistent workbench panels and Settings navigation without changing panel registration or data behavior.

- [ ] **Step 1: Add Settings/workbench assertions**

Extend `settings.spec.ts` after the dialog opens:

```ts
await expect(dialog.getByText("PandaScience", { exact: true })).toBeVisible()
await expect(dialog.getByText("Appearance", { exact: true })).toHaveCount(0)
await expect(dialog.getByText("Dark", { exact: true })).toHaveCount(0)

const rail = dialog.locator("nav")
const railStyle = await rail.evaluate((element) => {
  const style = getComputedStyle(element)
  return { background: style.backgroundColor, border: style.borderRightColor }
})
expect(railStyle.background).toBe("rgb(245, 245, 245)")
expect(railStyle.border).toBe("rgb(224, 224, 224)")
```

- [ ] **Step 2: Run Settings test and verify RED**

Run `bun run test:e2e:local -- e2e/settings.spec.ts` from `frontend/workspace`.

Expected: FAIL because Appearance/theme controls remain and the rail uses the old alpha surface.

- [ ] **Step 3: Update Settings composition**

In `dialog-settings.tsx`, change the rail to `background: var(--color-bg-subtle)`, explicit `var(--color-border)`, 8px navigation rows, pale-green selected state, and a 16px outer dialog supplied by the shared primitive. Keep history, expand, close, lazy panel loading, and internal scrolling unchanged.

In `_shared.tsx`, use:

```tsx
export const Card: ParentComponent = (props) => (
  <div class="border border-border-base rounded-[8px] overflow-hidden bg-surface-raised-stronger-non-alpha">
    {props.children}
  </div>
)
```

Use 14px body/labels, 12px metadata, 8px controls, `#F5F5F5` borderless inputs only where containment is already clear, and pale-green active states. In `General.tsx`, rename the remaining section comments/copy so no removed theme picker is advertised.

- [ ] **Step 4: Align the workbench chrome**

In `evidence.css`, make `.evidence-workbench` use `#FAFAFA`, 8px pane gaps, and 16px outer padding; make `.evidence-nav`, `.evidence-main`, and `.evidence-side` white 16px panels with the approved faint shadow and independent overflow. Update `AppHeader`, `RightPane`, `SkillsPage`, and Session hard-coded 4px surface radii to the 8/16px tokens while preserving tab, resize, routing, and streaming behavior.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/settings.spec.ts e2e/navigation.spec.ts e2e/context.spec.ts
bun run typecheck
```

Expected: Settings, session routing, and context pane tests PASS.

Commit:

```bash
git add frontend/workspace/e2e/settings.spec.ts frontend/workspace/src/components/dialog-settings.tsx frontend/workspace/src/components/settings/_shared.tsx frontend/workspace/src/components/settings/General.tsx frontend/workspace/src/styles/evidence.css frontend/workspace/src/pages/session.tsx frontend/workspace/src/atlas/AppHeader.tsx frontend/workspace/src/atlas/RightPane.tsx frontend/workspace/src/atlas/SkillsPage.tsx
git commit -m "feat(ui): align PandaScience workbench surfaces"
```

### Task 6: Bring self-styled popups onto the shared system

**Files:**
- Modify: `frontend/workspace/e2e/design-system.spec.ts`
- Modify: `frontend/workspace/src/atlas/FolderPicker.tsx`
- Modify: `frontend/workspace/src/atlas/SetupDialog.tsx`
- Modify: `frontend/workspace/src/atlas/CommandPalette.tsx`
- Modify: `frontend/workspace/src/atlas/HelpOverlay.tsx`
- Modify: `frontend/workspace/src/atlas/FdaBanner.tsx`
- Modify: `frontend/workspace/src/atlas/SkillsBrowser.tsx`
- Modify: `frontend/workspace/src/atlas/FilePreview.tsx`
- Modify: `frontend/workspace/src/components/dialog-select-server.tsx`
- Modify: `frontend/workspace/src/components/dialog-select-model.tsx`
- Modify: `frontend/workspace/src/components/dialog-select-model-unpaid.tsx`
- Modify: `frontend/workspace/src/components/dialog-manage-models.tsx`
- Modify: `frontend/workspace/src/components/dialog-release-notes.tsx`

**Interfaces:**
- Consumes: shared Dialog/data-slot styles and design tokens.
- Produces: no popup-local competing palette, typeface, radius, or elevation system.

- [ ] **Step 1: Expand the representative popup test**

Add a helper in `design-system.spec.ts`:

```ts
async function expectDialogSurface(dialog: import("@playwright/test").Locator) {
  const value = await dialog.locator('[data-slot="dialog-content"]').evaluate((element) => {
    const style = getComputedStyle(element)
    return { radius: style.borderRadius, font: style.fontFamily, background: style.backgroundColor }
  })
  expect(value).toEqual({ radius: "16px", font: expect.stringContaining("Roboto"), background: "rgb(255, 255, 255)" })
}
```

Use it after opening Folder Picker, Server Picker, Settings, and the command palette. Assert each primary action has `border-radius: 8px` and that no visible child uses Computer Modern.

- [ ] **Step 2: Run and verify RED on hard-coded exceptions**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/design-system.spec.ts e2e/palette.spec.ts
```

Expected: at least Folder Picker or palette fails the font/radius contract because of inline 4px/Computer Modern styles.

- [ ] **Step 3: Replace popup-local visual exceptions**

For each listed component:

- use `FONT_SANS` for titles, body, controls, and navigation labels;
- reserve `FONT_MONO` for paths, commands, counts, and technical metadata;
- replace ordinary `"4px"` control/card radii with `var(--evidence-radius-control)`;
- use `var(--evidence-radius-panel)` only for large local containers;
- replace saturated or unrelated selection fills with `var(--evidence-selected)` plus text/icon state;
- replace local panel shadows with `var(--evidence-shadow-panel)` or the shared Dialog shadow;
- keep warning/error states on `--color-warning-muted`/`--color-error-muted` with readable text;
- keep one green primary action and render cancel/back/close as outlined or text actions;
- preserve component event handlers, SDK calls, validation, focus management, and scrolling.

In `FolderPicker`, also remove the stale comment that says row double-click opens a project and make the footer the visually dominant action. In Setup, Server, Model, and Skill dialogs, use 14px body/labels and 12px metadata. In Help and Command Palette, keep shortcut keys monospace but make section headings/body Roboto.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/design-system.spec.ts e2e/folder-picker.spec.ts e2e/palette.spec.ts e2e/server-default.spec.ts e2e/models-visibility.spec.ts
bun run typecheck
```

Expected: popup contracts and existing interaction flows PASS.

Commit:

```bash
git add frontend/workspace/e2e/design-system.spec.ts frontend/workspace/src/atlas/FolderPicker.tsx frontend/workspace/src/atlas/SetupDialog.tsx frontend/workspace/src/atlas/CommandPalette.tsx frontend/workspace/src/atlas/HelpOverlay.tsx frontend/workspace/src/atlas/FdaBanner.tsx frontend/workspace/src/atlas/SkillsBrowser.tsx frontend/workspace/src/atlas/FilePreview.tsx frontend/workspace/src/components/dialog-select-server.tsx frontend/workspace/src/components/dialog-select-model.tsx frontend/workspace/src/components/dialog-select-model-unpaid.tsx frontend/workspace/src/components/dialog-manage-models.tsx frontend/workspace/src/components/dialog-release-notes.tsx
git commit -m "feat(ui): finish PandaScience popup styling"
```

### Task 7: Full verification and browser QA

**Files:**
- Modify only if verification reveals a scoped regression in a file already listed above.

**Interfaces:**
- Consumes: completed Tasks 1–6.
- Produces: fresh evidence that the full design rollout builds and behaves correctly.

- [ ] **Step 1: Run static and build gates**

```bash
cd frontend/workspace
bun run typecheck
bun run build
cd ../../backend/cli
bun test
cd ../..
git diff --check
```

Expected: all commands exit 0, with no TypeScript errors, Vite errors, backend test failures, or whitespace errors.

- [ ] **Step 2: Run the focused frontend regression set**

```bash
cd frontend/workspace
bun run test:e2e:local -- e2e/home.spec.ts e2e/folder-picker.spec.ts e2e/design-system.spec.ts e2e/settings.spec.ts e2e/palette.spec.ts e2e/server-default.spec.ts e2e/models-visibility.spec.ts e2e/navigation.spec.ts e2e/context.spec.ts
```

Expected: all selected Playwright tests PASS with zero failures.

- [ ] **Step 3: Inspect the running application at representative widths**

Reuse the existing backend on `4096` and frontend on `4444`. In the browser, verify at 1440px, 768px, and 375px:

- Home: no company label or theme switch; search, add, grid/list, favorites, and server action remain usable.
- Folder Picker: row click drills, double-click never submits, footer submits, cancel closes, no horizontal overflow.
- Session: header, session rail, transcript, composer, tabs, right pane, files, skills, and terminal remain readable and independently scrollable.
- Settings: all 12 registry panels open without frame jumps; no appearance/theme chooser remains.
- Setup, Server, Model, Skill Library, File Preview, Command Palette, Help, FDA guidance, toasts, menus, and representative errors use the same light surface, Roboto, radii, focus, and action hierarchy.

Check browser console errors after each representative flow. Do not stop or restart user-owned processes.

- [ ] **Step 4: Review the final diff and leave no unverified correction**

```bash
git status --short
git diff --stat
git diff --check
```

Expected: the worktree contains only the intended implementation commits and no generated E2E artifacts or `.env.local` file. If Step 3 exposes a defect, do not patch it inside this verification task: return to the task that owns that file, add or tighten its failing test, repeat that task's RED/GREEN cycle, and use that task's explicit commit command.
