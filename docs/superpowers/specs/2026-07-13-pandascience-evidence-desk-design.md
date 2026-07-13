# PandaScience Evidence Desk Redesign

## Objective

Redesign the existing SolidJS workspace as **PandaScience**, an Insilico Medicine product, using the calm, exact, green-accented Evidence Desk direction derived from `design.md`. The redesign must improve visual hierarchy and sustained scientific work without changing the application's backend behavior or internal OpenScience identifiers.

## Scope

The redesign covers the user-facing workspace under `frontend/workspace`:

- Project home and empty state
- Application header and product wordmark
- Session navigation, transcript, composer, and center workspace
- Files, evidence, skills, agents, terminal, and other right-pane surfaces
- Settings, dialogs, command palette, notifications, status, loading, and error surfaces
- Responsive behavior for narrow screens

The following are explicitly out of scope:

- CLI names and commands
- Package names and scopes
- API routes, request or response shapes, and SDK identifiers
- Storage keys, environment variables, internal namespaces, and source paths
- Backend behavior and scientific renderers beyond their surrounding presentation
- Repository or GitHub repository renaming

## Product Branding

- Display the product name as **PandaScience** in all user-facing workspace branding.
- Display **Insilico Medicine** as the company identity where a company label is appropriate, such as the home orientation surface or product information area.
- Do not replace internal `openscience` identifiers merely because they are visible in source code.
- Do not add creator credits or self-referential attribution.
- Use a restrained PandaScience mark that fits the Evidence Desk system. Avoid cartoon imagery or playful mascot styling that would weaken the scientific-workbench tone.

## Visual Direction

Evidence Desk is a light, desktop-first scientific workbench. It should feel calm, trustworthy, precise, and operational.

- Canvas: `#FAFAFA`
- Primary surfaces: white
- Primary interaction: `#21965F`
- Selected surface: `#E7F6EE`
- Primary text: `#212121`
- Secondary text: `#666666`
- Explicit borders: `#E0E0E0`
- Default controls: 8px radius
- Main panels: 16px radius
- Motion: short, functional transitions around 200ms
- Shadows: faint and local, never a field of floating cards

The supplied design system names Roboto as its base face. The implementation may use the closest already-supported UI font or a locally available equivalent if adding a remote font would introduce a network dependency. Monospace labels remain reserved for compact technical wayfinding.

Dark mode remains functional through the current semantic theme system. The redesign will not invent a separate PandaScience dark palette; existing dark semantic values continue to render the same component hierarchy.

## Information Architecture

### Project Home

The home page becomes a quiet project registry rather than a marketing landing page.

- A 56px header contains PandaScience branding, search, primary new-project action, theme, settings, and server status.
- The main surface introduces the current research workspace and lists recent projects in a compact, scan-friendly grid or list.
- Project identity, path, last activity, favorite state, and actions remain visible in a stable order.
- Empty state language explains the first action clearly and identifies Insilico Medicine without becoming promotional.

### Session Workspace

The session screen uses three coordinated regions:

1. **Navigation pane**: project identity, sessions, and session actions.
2. **Primary pane**: transcript, active task state, scientific output, and composer.
3. **Evidence pane**: files, artifacts, agents, skills, terminal, and other existing workspace tabs.

The current center-tab behavior remains intact. The evidence pane may collapse, and sustained side-by-side work continues to use resizable boundaries where the existing application supports them.

### Narrow Screens

Complex panes do not stack into an unusable vertical page. On narrow screens:

- The transcript remains the principal surface.
- Navigation and evidence surfaces become controlled drawers or tabbed overlays.
- Secondary header actions compress or move into menus.
- Interactive controls retain accessible names and visible focus states.

## Component Treatment

- Primary buttons use PandaScience green with white text; a darker green may be used when required for WCAG AA contrast at normal text sizes.
- Secondary actions use outlined or text treatments.
- Inputs use white or subtle neutral surfaces, 8px corners, and visible labels.
- Selected navigation uses pale green plus text or an indicator, never color alone.
- Status chips use readable text labels with pale semantic surfaces.
- Transcript and artifact content favor alignment, dividers, and whitespace over card proliferation.
- Tool calls, permissions, questions, errors, warnings, and progress states retain their current semantics.
- Loading and arrival animations clarify state changes and respect reduced-motion preferences.

## Behavior and Data Flow

The redesign is presentation-only. Existing providers, stores, routes, SDK calls, and event streams remain the source of truth.

Representative flow:

1. A project is opened from the PandaScience home page.
2. Existing routing and directory decoding load the selected workspace.
3. Existing sync providers hydrate sessions, messages, tools, files, and runtime state.
4. The redesigned panes render those existing states without duplicating them.
5. Composer submissions, permissions, questions, file actions, terminal actions, and settings continue through their current handlers.

No mock data or parallel UI-only state model will be introduced for real application behavior.

## Error Handling and Accessibility

- Preserve existing error boundaries, disconnected-state handling, toasts, and retry paths.
- Do not hide failures behind visual placeholders.
- Keyboard focus must remain visible on every interactive element.
- Icon-only controls require accessible names and tooltips where appropriate.
- Status, severity, and selection must not rely on color alone.
- Normal text and control contrast should meet WCAG AA.
- Motion must degrade cleanly under `prefers-reduced-motion`.

## Implementation Boundaries

- Prefer shared semantic CSS variables for the Evidence Desk tokens.
- Reuse existing SolidJS components and stores; extract a component only when it is reusable or materially clarifies a large surface.
- Follow the repository rules: prefer `createStore`, avoid unnecessary `let`, `else`, destructuring, explicit types, and multiword names.
- Do not introduce a second component library.
- Do not change backend code unless a frontend verification failure proves a pre-existing interface contract is broken.

## Verification

Verification will include:

- `bun run typecheck` in `frontend/workspace`
- `bun run build` in `frontend/workspace`
- Focused frontend tests relevant to changed components
- `bun test` in `backend/cli`, as required by repository instructions
- `git diff --check`
- Browser inspection at representative desktop and narrow widths using the local frontend and backend development servers, without restarting an existing user process
- Functional spot checks for project opening, session selection, transcript rendering, composer controls, evidence-pane navigation, dialogs, settings, theme toggle, and disconnected/error states

## Delivery

- Implementation branch: `codex/pandascience-evidence-desk`
- The branch contains only the selected Evidence Desk implementation.
- B · Research Journal and C · Lab Console are not implemented.
