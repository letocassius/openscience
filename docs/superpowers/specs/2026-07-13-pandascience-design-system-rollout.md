# PandaScience Design System Rollout

## Objective

Finish the PandaScience visual rollout across the entire browser workspace using the supplied `design.md` as the visual source of truth. The current project home is the accepted baseline. This change removes the remaining company label from home, standardizes every secondary workspace surface and popup, fixes the folder-picker confirmation bug, and makes the product light-only.

This specification supersedes the dark-mode and Insilico Medicine display requirements in `2026-07-13-pandascience-evidence-desk-design.md`.

## Product Decisions

- Keep **PandaScience** as the user-facing workspace name.
- Remove the `INSILICO MEDICINE` label from the project home and do not replace it with another company label.
- Render the browser workspace exclusively in the light design defined by `design.md`.
- Remove user-facing light/dark controls and ignore a previously stored dark preference when the workspace initializes.
- Preserve all backend behavior, data models, routes, scientific tools, and runtime-agent behavior.
- Add no creator credit or self-referential attribution.

## Visual System

The product should feel calm, exact, trustworthy, and operational: a scientific workbench rather than a marketing dashboard.

### Core tokens

- Canvas: `#FAFAFA`
- Primary surface: `#FFFFFF`
- Subtle surface: `#F5F5F5`
- Primary interaction: `#21965F`
- Primary hover: `#1C8554`
- Selected and positive surface: `#E7F6EE`
- Primary text: `#212121`
- Secondary text: `#666666`
- Disabled text: `#9E9E9E`
- Quiet border: `#F2F2F2`
- Explicit border: `#E0E0E0`
- Warning: amber on `#FFF4DC`
- Error: red on `#FEECEB`

Roboto is the primary interface typeface at 400, 500, and 700 weights. Existing monospace content keeps an appropriate technical face. Normal controls use 8px corners, large workspace panels use 16px corners, and compact tags may use 4px or pill geometry only when their semantics require it.

Depth remains restrained. Panels use faint local shadows, menus and dialogs use one consistent floating shadow, and dense lists rely on alignment, tonal surfaces, and dividers instead of stacked cards. Functional motion uses the existing short transition system around 200ms and respects reduced-motion preferences.

## Implementation Strategy

Use a shared-system-first rollout:

1. Map the supplied tokens into the existing semantic theme and Atlas alias variables.
2. Make the theme root light-only and remove all theme toggles and dark-only branches.
3. Update shared UI primitives for dialogs, buttons, inputs, menus, tabs, toasts, focus, and disabled states.
4. Bring remaining self-styled workspace surfaces onto those primitives and tokens.
5. Use targeted component styles only when a surface has a distinct structural need.

Do not replace SolidJS, introduce another component library, or hard-code a separate palette into every page.

## Surface Coverage

### Project home

Keep the accepted layout, information hierarchy, project grid/list behavior, responsive behavior, and primary actions. Remove only the `INSILICO MEDICINE` label and the theme toggle, then allow shared token changes to bring the page onto the final light palette.

### Session workspace

Apply the design system to the navigation pane, transcript, composer, tabs, right/evidence pane, file tree, file preview, terminal container, skills, agents, canvas, empty states, loading, disconnected, permission, question, and error surfaces. Preserve the current pane layout, resizing, scrolling, routing, streaming, and command behavior.

### Settings and secondary panels

Unify the Settings shell, navigation, section headings, forms, selectors, help text, status feedback, and actions across General, Connectors, Specialists, Memory, Compute, Local Models, Network, Permissions, Sandbox, Credentials, Billing, and Storage. Long settings sections retain their own scroll behavior.

### Dialogs, popups, and overlays

The shared Dialog primitive defines the default scrim, white surface, 16px panel radius, title hierarchy, close affordance, padding, focus treatment, action row, responsive bounds, and motion. Apply that baseline to:

- Folder Picker
- model setup, model selection, and model management
- server selection
- Skill Library
- Settings
- File Preview and image preview
- command palette and help overlay
- Full Disk Access guidance
- release notes
- status and disconnected surfaces
- permission, question, confirmation, and destructive-action dialogs
- toasts, tooltips, dropdowns, and transient menus

Each bounded task has one visually dominant primary action. Destructive actions remain spatially separated and use semantic danger styling. Dialogs keep an obvious escape route and visible keyboard focus.

## Folder Picker Behavior

Folder navigation and project submission must be separate actions.

- Clicking, double-clicking, or pressing Enter on a folder row only drills into that folder.
- Remove the row-level hover `open` action.
- Remove the double-click-to-submit handler and its instructional text.
- Only the footer button labeled `open this folder` validates the current directory, closes the picker, and opens/adds the workspace.
- Cancel and close return no selection and create no workspace entry.

## Accessibility and Responsive Behavior

- Keep visible focus indicators and semantic names for icon-only controls.
- Do not rely on color alone for selection, status, impact, or errors.
- Normal text and controls should meet WCAG AA contrast; use the approved deep green where white on the base green would be insufficient.
- Keep primary mobile controls at practical touch sizes and avoid hover-only critical actions.
- Verify no horizontal overflow at 375px, 768px, and 1440px.
- Preserve independent scrolling for full-height workbench panels.
- Reduce or remove nonessential transitions under `prefers-reduced-motion`.

## Testing and Verification

Add focused tests before production changes:

- Double-clicking a folder row does not open or add a workspace.
- Folder rows navigate within the picker and leave it open.
- `open this folder` is the only successful submission path.
- The home page no longer renders `INSILICO MEDICINE` or a theme-toggle control.
- The workspace initializes in light mode even when a previous dark preference exists.

Then run:

- focused Playwright tests for home and folder selection
- `bun run typecheck` from `frontend/workspace`
- `bun run build` from `frontend/workspace`
- broader frontend tests in proportion to the shared-component changes
- `bun test` from `backend/cli`
- `git diff --check`

Use the existing local backend on port 4096 and frontend on port 4444 when available. Verify Home, Session, Settings, Folder Picker, Setup, Server Picker, Model Picker, Skill Library, Command Palette, Help, and representative error/empty states in the browser at desktop and narrow widths. Check console errors and preserve running user-owned processes.

## Out of Scope

- Backend or SDK behavior changes
- Scientific renderer internals beyond their surrounding chrome
- Route, storage, API, or workspace data migrations unrelated to the light-theme preference
- New product features, information architecture, or decorative branding
- Changes to the supplied `design.md`
