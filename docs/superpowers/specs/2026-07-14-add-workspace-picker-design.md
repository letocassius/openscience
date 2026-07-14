# Add Workspace Picker Redesign

## Objective

Redesign the existing OpenScience folder picker as a compact, polished **Add workspace** modal and change its submission behavior so adding a folder registers it in the Research projects workspace list without navigating into the folder's full-screen session view.

The approved visual reference is [`2026-07-14-add-workspace-picker-concept.png`](./2026-07-14-add-workspace-picker-concept.png).

## Scope

This change covers:

- The in-app folder picker in `frontend/workspace/src/atlas/FolderPicker.tsx`
- The project-registration versus project-opening flow in `frontend/workspace/src/pages/home.tsx`
- Focused folder-picker end-to-end coverage in `frontend/workspace/e2e/folder-picker.spec.ts`
- Design-system assertions that directly describe the picker
- Responsive behavior for the picker at desktop and narrow widths

The following are out of scope:

- Replacing the server-backed folder listing or validation endpoints
- Changing folder-row browsing into project registration
- Redesigning the Research projects page or workspace cards
- Changing what happens when an existing workspace card is opened
- Adding multi-folder selection to the in-app browser picker
- Introducing a new component library or backend persistence model

## User Flow

1. The user selects **New project** on the Research projects page.
2. The **Add workspace** modal opens at the user's home directory.
3. Sidebar shortcuts, recent locations, breadcrumbs, typed paths, and folder rows navigate without registering a workspace.
4. A single click selects a folder row. Its pale-green selection surface and check indicator make the pending folder explicit.
5. The user may drill into a folder using its chevron or a double-click. Keyboard users can focus a row, select it, and use the disclosure control to navigate.
6. The footer displays the absolute path of the selected folder. With no explicit row selected, it displays the current directory and allows that directory to be added.
7. Selecting **Add workspace** validates and registers the selected folder, closes the modal, stays on `/`, and reveals the workspace in the Research projects list.
8. The workspace opens only when the user later activates its project card or list row.

The **Cancel** action and modal close action dismiss the picker without registering or navigating.

## Visual Design

### Modal Frame

- Desktop reference size: approximately 980 × 680px within the available viewport.
- The modal is centered over the dimmed Research projects page.
- Surface is true white with a crisp 1px cool-gray border, restrained shadow, and 14–16px outer radius.
- The layout has three vertical regions: header, two-column browser body, and footer.
- The browser body must consume the available height without forcing the overall page to scroll.

### Header

- Title: **Add workspace**.
- Supporting copy: **Choose a folder to add to your project registry. You can open it from the workspace list afterward.**
- A close icon sits at the top right with an accessible **Close** name.
- Title and supporting copy use the existing sans-serif UI family. Filesystem paths remain monospace.

### Sidebar

- Width is approximately 210px on desktop.
- It contains **Favorites** and **Recent** groups.
- Favorites retain Home, Desktop, Documents, Downloads, and Applications.
- Recent items retain their folder name plus abbreviated path.
- The active location uses a pale-green selection surface and must not rely on color alone.
- Sidebar rows share one compact component treatment and consistent 16–18px outline icons.

### Browser Pane

- A compact navigation toolbar contains back/up, home, breadcrumb path, and refresh controls.
- Search and **Enter a path…** share a second compact toolbar row.
- The current three separately framed controls are consolidated; the dashed full-width path panel is removed.
- The folder list is one open list surface with a small **Name** header and visible folder count.
- Rows use efficient spacing, subtle dividers, a folder icon, name, and disclosure chevron.
- Hover is restrained and does not translate rows horizontally.
- The selected row uses the approved pale-green surface and a green check indicator.
- Loading preserves the existing rows with a subtle activity indicator. Empty, filtered-empty, unreadable, macOS permission, and retry states remain explicit.

### Footer

- The left side shows a folder icon and the selected/current absolute path in monospace.
- The right side contains **Cancel** and the green **Add workspace** button.
- The primary button label is never **Open this folder**.
- Primary and secondary controls use deliberate 13–14px UI typography, 8px radius, and visible focus treatment.

### Design Tokens

The implementation should use the existing Evidence Desk semantic variables where possible. The approved concept locks the following roles:

- Canvas behind modal: dimmed existing Research projects page
- Modal and list surfaces: true white
- Primary text: existing Evidence Desk ink (`#212121` family)
- Secondary text: neutral slate (`#666666` family)
- Border: cool light gray (`#E0E0E0` family)
- Primary green: existing Evidence Desk interaction green (`#21965F` family)
- Selected surface: existing pale green (`#E7F6EE` family)
- Control radius: 8px
- Modal radius: 14–16px
- Motion: 160–200ms functional transitions with reduced-motion support

No cream tint, decorative gradient, glass effect, pill label, badge, illustration, or creator attribution is introduced.

## Component and State Design

`FolderPicker` remains the owner of filesystem browsing state:

- Current directory
- Selected folder path
- Filter query
- Typed path
- Loading and listing error state
- Recent picker locations

Folder rows need separate **select** and **drill in** affordances. The implementation must prevent a browse action from registering a project. If the selected folder is invalidated by navigation or filtering, selection resets to the current directory rather than retaining a hidden stale path.

Repeated UI should use small local component families or style primitives for:

- Sidebar rows
- Toolbar icon buttons
- Folder rows and their selected/hover states
- Footer actions

The file should remain aligned with the repository preference for straightforward local functions. Extraction is justified only where it makes interaction boundaries reusable or clearer.

## Registration and Navigation Contract

The current `openProject(directory)` function combines three responsibilities:

1. Unhide and register/touch the directory.
2. Update layout/server project state.
3. Navigate to the full-screen session route.

The new flow separates registration from opening:

- `addProject(directory)` unhides the directory, calls `layout.projects.open(directory)`, and calls `server.projects.touch(directory)`. It does not navigate.
- `openProject(directory)` reuses the registration behavior and then navigates to `/${base64Encode(directory)}/session`.
- Folder-picker and native-picker results use `addProject`.
- Existing workspace cards and rows continue to use `openProject`.

The global project event/sync pipeline remains the source of truth for the Research projects list. No duplicate client-only workspace array is introduced. After submission, the UI may show the existing toast mechanism if useful, but the list update must come from the real project state.

## Error Handling

- Directory validation failure keeps the modal open and uses the existing error toast.
- Listing failure keeps the modal open and exposes the existing retry action.
- Registration failures surfaced by existing project APIs must not navigate.
- Cancel, close, and invalid typed paths produce no project side effects.
- Re-adding an already registered workspace is idempotent from the user's perspective: the modal closes, the user remains on the registry, and the existing workspace remains a single deduplicated item.

## Accessibility and Responsive Behavior

- Every icon-only control has an accessible name and visible focus state.
- Selection is communicated by state semantics and a check icon, not only color.
- Folder row selection and disclosure are keyboard-operable without overloading Enter with two conflicting actions.
- The dialog maintains a logical focus order: close, sidebar, navigation, search/path, folder list, footer actions.
- At narrow widths, the sidebar may collapse behind a locations control or stack above the folder list; the folder list and primary action remain visible without horizontal overflow.
- Supporting copy may wrap, but the title and footer buttons must not clip.
- Motion respects `prefers-reduced-motion`.

## Verification Contract

Focused end-to-end coverage must prove:

- Clicking, double-clicking, and keyboard-navigating folder rows does not register a workspace unless **Add workspace** is activated.
- **Add workspace** closes the modal, keeps the URL at `/`, and causes the selected directory to appear once in the project list or project API result.
- Clicking the resulting workspace card still navigates to its session route.
- Cancel and close do not register a workspace.
- Invalid paths keep the modal open.
- Existing sidebar and recent navigation stay side-effect free.

Verification will include:

- Focused Playwright run for `e2e/folder-picker.spec.ts`
- Any focused design-system test changed by the picker redesign
- `bun run typecheck` in `frontend/workspace`
- `bun run build` in `frontend/workspace`
- `git diff --check`
- Browser/IAB inspection at the approved concept's native 1536 × 1024 reference viewport when practical, plus a narrow viewport
- Screenshot comparison using `view_image` on both the approved concept and the latest browser render
- A fidelity ledger covering copy, layout, typography, palette, icon treatment, spacing/container model, responsive behavior, and the add-without-navigation workflow

## Acceptance Criteria

- The implemented modal faithfully matches the approved concept without material visual drift.
- The above-the-fold/modal copy matches the approved visible strings.
- The primary action says **Add workspace**.
- Adding a folder returns the user to the Research projects registry and never opens the full-screen workspace automatically.
- The newly added workspace is visible in the real workspace list and opens only when its card or row is activated.
- Browsing remains side-effect free.
- No creator or AI attribution appears in any output.
