import { createMemo, createSignal, For, Show, type JSX } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@synsci/util/encode"
import { DateTime } from "luxon"
import { useDialog } from "@synsci/ui/context/dialog"
import { FolderPicker } from "@/atlas/FolderPicker"
import { FdaBanner } from "@/atlas/FdaBanner"
import { DialogSelectServer } from "@/components/dialog-select-server"
import { useServer } from "@/context/server"
import { useGlobalSync } from "@/context/global-sync"
import { useLayout } from "@/context/layout"
import { usePlatform } from "@/context/platform"
import { useLanguage } from "@/context/language"
import { Wordmark } from "@/atlas/Wordmark"
import { AppHeader, HeaderIconButton } from "@/atlas/AppHeader"
import { toast } from "@/atlas/Toast"
import { ToastContainer } from "@/atlas/Toast"
import { DialogSettings } from "@/components/dialog-settings"
import { DisconnectedPanel } from "@/atlas/DisconnectedPanel"
import { uiStore } from "@/atlas/store/ui"
import { useGlobalKeys } from "@/atlas/useGlobalKeys"
import { CommandPalette } from "@/atlas/CommandPalette"
import { HelpOverlay } from "@/atlas/HelpOverlay"
import { projectPrefs } from "@/atlas/store/projectPrefs"
import { IconStar, IconStarFilled, IconTrash } from "@/atlas/shared/Icon"
import {
  IconArrowRight,
  IconClock,
  IconFolder,
  IconPlus,
  IconSearch,
  IconSettings,
} from "@/atlas/shared/Icon"
import { FONT_CODE, FONT_MONO, FONT_SANS, FONT_SERIF } from "@/styles/tokens"

/** 26px bordered icon button shared by the hover action clusters in grid cards and list rows. */
const ACTION_BUTTON: JSX.CSSProperties = {
  all: "unset",
  cursor: "pointer",
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  width: "26px",
  height: "26px",
  "border-radius": "4px",
  background: "var(--color-surface-solid)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-faint)",
  transition: "all var(--duration-fast) var(--ease-standard)",
}

/**
 * Home page — Evidence Desk project registry backed by openscience's GlobalSync.
 *
 * The research registry presentation sits on top of the unchanged data and
 * navigation flow:
 *  - useGlobalSync.data.project for the recent projects list
 *  - useLayout.projects.open + server.projects.touch for "opened" tracking
 *  - navigate("/${base64(dir)}/session") to land in the working chat
 */
export default function Home(): JSX.Element {
  const sync = useGlobalSync()
  const layout = useLayout()
  const platform = usePlatform()
  const dialog = useDialog()
  const navigate = useNavigate()
  const server = useServer()
  const language = useLanguage()
  const homedir = createMemo(() => sync.data.path.home)
  const [filter, setFilter] = createSignal("")
  const VIEW_KEY = "thesis-projects-view-v1"
  const [view, setViewRaw] = createSignal<"grid" | "list">(
    (() => {
      try {
        return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"
      } catch {
        return "grid"
      }
    })(),
  )
  const setView = (v: "grid" | "list") => {
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {}
    setViewRaw(v)
  }

  // Favorites bubble to the top, hidden projects drop out, the rest sort by
  // last-updated. The sort is stable so within each band order is preserved.
  // OpenScience occasionally registers two project entries for the same worktree
  // (different IDs, same path); collapse those to the most-recently-updated
  // entry per worktree so each card shows once.
  const projects = createMemo(() => {
    const fav = projectPrefs.favorites()
    const hide = projectPrefs.hidden()
    const byWorktree = new Map<string, (typeof sync.data.project)[number]>()
    for (const p of sync.data.project) {
      if (!p.worktree || hide.has(p.worktree)) continue
      const existing = byWorktree.get(p.worktree)
      if (!existing) {
        byWorktree.set(p.worktree, p)
        continue
      }
      const cur = p.time.updated ?? p.time.created ?? 0
      const old = existing.time.updated ?? existing.time.created ?? 0
      if (cur > old) byWorktree.set(p.worktree, p)
    }
    return Array.from(byWorktree.values()).sort((a, b) => {
      const af = fav.has(a.worktree) ? 1 : 0
      const bf = fav.has(b.worktree) ? 1 : 0
      if (af !== bf) return bf - af
      return (b.time.updated ?? b.time.created) - (a.time.updated ?? a.time.created)
    })
  })

  const filtered = createMemo(() => {
    const q = filter().toLowerCase().trim()
    const all = projects()
    if (!q) return all
    return all.filter((p) => p.worktree.toLowerCase().includes(q))
  })

  function openProject(directory: string) {
    // Visiting a path also un-hides it, so a previously-deleted card
    // re-appears on the home grid as soon as the user opens it again.
    projectPrefs.unhide(directory)
    layout.projects.open(directory)
    server.projects.touch(directory)
    // Opening a folder (or a session) creates no Atlas state. The atlas CLI
    // handles projects and nodes on demand when the agent uses it.
    navigate(`/${base64Encode(directory)}/session`)
  }

  /**
   * "open folder…" / "+ new project" — pick a directory and open it.
   *
   * Path priority:
   *   1. desktop app (Tauri NSOpenPanel) — gives absolute paths native.
   *   2. web with showDirectoryPicker (Chromium) — opens the real OS
   *      Finder/Explorer dialog. The browser hides the absolute path
   *      for security so we resolve via /api/resolve-folder, which
   *      walks the user's home dirs on the dev server side and returns
   *      the matching absolute path. Disambiguation hint = the first
   *      child entry name we read from the picked directory handle.
   *   3. fallback — our in-app FolderPicker (openscience /file backed).
   */
  async function chooseProject() {
    function resolveResult(result: string | string[] | null) {
      if (Array.isArray(result)) {
        for (const directory of result) openProject(directory)
      } else if (result) {
        openProject(result)
      }
    }
    // Tauri desktop wrapper still uses the native NSOpenPanel — it returns
    // absolute paths directly and keeps the desktop app feeling native.
    if (platform.openDirectoryPickerDialog && server.isLocal()) {
      const result = await platform.openDirectoryPickerDialog?.({
        title: language.t("command.project.open"),
        multiple: true,
      })
      resolveResult(result)
      return
    }
    // Browser: always use the in-app Finder-style FolderPicker for visual
    // consistency with the rest of the UI. The OS-native browser picker
    // (showDirectoryPicker / osascript dialog) is intentionally bypassed.
    // `lite` mode skips the modal backdrop and body scroll lock so the
    // picker glides in over the page instead of triggering a reflow.
    dialog.show(() => <FolderPicker onSelect={resolveResult} />, { onClose: () => resolveResult(null), lite: true })
  }

  useGlobalKeys({ onNew: () => void chooseProject() })

  return (
    <div
      class="atlas-root evidence-root evidence-home"
      style={{
        flex: 1,
        display: "flex",
        "flex-direction": "column",
        "min-height": 0,
        overflow: "hidden",
        background: "var(--evidence-canvas)",
      }}
    >
      <style>{`
        .evidence-home .evidence-header {
          flex-wrap: nowrap;
        }
        .evidence-home__spacer {
          flex: 1;
        }
        .evidence-home__search {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-sizing: border-box;
          width: min(280px, 24vw);
          min-width: 220px;
          height: 36px;
          padding: 0 12px;
          color: var(--evidence-slate);
          background: var(--evidence-panel);
          border: 1px solid var(--evidence-border);
        }
        .evidence-home__search:focus-within {
          border-color: var(--evidence-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--evidence-primary) 14%, transparent);
        }
        .evidence-home__search input::placeholder {
          color: var(--evidence-slate);
        }
        .evidence-home__primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          box-sizing: border-box;
          height: 36px;
          padding: 0 15px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          box-shadow: var(--evidence-shadow-panel);
        }
        .evidence-home__server {
          border-radius: var(--evidence-radius-control) !important;
        }
        .evidence-home__main {
          flex: 1;
          box-sizing: border-box;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 48px 32px 80px;
          overflow-y: auto;
        }
        .evidence-home__intro {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 32px;
          margin-bottom: 28px;
        }
        .evidence-home__intro h1 {
          margin: 7px 0 8px;
          color: var(--evidence-ink);
          font-family: inherit;
          font-size: clamp(26px, 3vw, 34px);
          font-weight: 650;
          letter-spacing: -0.035em;
          line-height: 1.12;
        }
        .evidence-home__intro p {
          max-width: 650px;
          margin: 0;
          color: var(--evidence-slate);
          font-size: 14px;
          line-height: 1.6;
        }
        .evidence-home__count {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          min-width: 126px;
          padding: 14px 16px;
          background: var(--evidence-panel);
          border: 1px solid var(--evidence-border);
          border-radius: var(--evidence-radius-panel);
          box-shadow: var(--evidence-shadow-panel);
        }
        .evidence-home__count strong {
          color: var(--evidence-ink);
          font-size: 22px;
          font-weight: 650;
          line-height: 1;
        }
        .evidence-home__count span {
          margin-top: 6px;
          color: var(--evidence-slate);
          font-size: 11px;
        }
        .evidence-home__toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }
        .evidence-home__toolbar-title {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--evidence-slate);
          font-size: 12px;
          font-weight: 600;
        }
        .evidence-home__toolbar-title::before {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--evidence-primary);
          content: "";
        }
        .evidence-home__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .evidence-home__list {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .evidence-home__card,
        .evidence-home__row {
          transition: background var(--evidence-motion), border-color var(--evidence-motion);
        }
        .evidence-home__card {
          box-shadow: none;
        }
        .evidence-home__card:focus-visible,
        .evidence-home__row:focus-visible {
          outline: 2px solid var(--evidence-primary);
          outline-offset: 2px;
        }
        .evidence-home__empty {
          border-radius: var(--evidence-radius-panel) !important;
        }
        .evidence-home__grid > .evidence-home__empty {
          border-color: var(--evidence-accent-line) !important;
          color: var(--evidence-primary) !important;
          background: var(--evidence-accent-soft) !important;
        }
        @media (max-width: 760px) {
          .evidence-home .evidence-header {
            flex-wrap: wrap;
            gap: 8px;
          }
          .evidence-home__spacer {
            display: none;
          }
          .evidence-home .atlas-wordmark {
            margin-right: auto;
          }
          .evidence-home__fda,
          .evidence-home__server-name {
            display: none;
          }
          .evidence-home__server {
            width: 34px !important;
            height: 32px !important;
            justify-content: center;
            padding: 0 !important;
          }
          .evidence-home__search {
            order: 10;
            flex: 1 0 100%;
            width: 100%;
            min-width: 0;
          }
          .evidence-home__main {
            padding: 32px 16px 56px;
          }
          .evidence-home__intro {
            align-items: stretch;
            gap: 18px;
          }
          .evidence-home__count {
            min-width: 112px;
          }
          .evidence-home__grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .evidence-home__row-path {
            display: none;
          }
        }
        @media (max-width: 520px) {
          .evidence-home__primary--header {
            width: 36px;
            justify-content: center;
            padding: 0;
          }
          .evidence-home__primary--header .evidence-home__primary-text {
            display: none;
          }
          .evidence-home__intro {
            flex-direction: column;
          }
          .evidence-home__count {
            min-width: 0;
          }
        }
      `}</style>
      <ToastContainer />
      <HelpOverlay open={uiStore.helpOpen()} onClose={() => uiStore.setHelpOpen(false)} />
      <CommandPalette open={uiStore.paletteOpen()} onClose={() => uiStore.setPaletteOpen(false)} />
      <DisconnectedPanel />
      <AppHeader>
        <Wordmark size="md" />
        <span class="evidence-home__spacer" />
        <div class="evidence-control evidence-home__search">
          <IconSearch size={12} strokeWidth={1.5} />
          <input
            value={filter()}
            onInput={(e) => setFilter(e.currentTarget.value)}
            placeholder="Search projects"
            style={{
              all: "unset",
              flex: 1,
              "font-family": FONT_SANS,
              "font-size": "13px",
              color: "var(--color-text)",
            }}
          />
        </div>
        <span class="evidence-home__fda">
          <FdaBanner />
        </span>
        <button
          class="evidence-primary evidence-home__primary evidence-home__primary--header"
          aria-label="New project"
          onClick={chooseProject}
          title="open folder (⌘O)"
          style={{
            cursor: "pointer",
            border: "1px solid var(--evidence-primary)",
            "font-family": FONT_SANS,
          }}
        >
          <IconPlus size={12} strokeWidth={2} />
          <span class="evidence-home__primary-text">New project</span>
        </button>
        <HeaderIconButton onClick={() => dialog.show(() => <DialogSettings />)} title="settings">
          <IconSettings size={13} strokeWidth={1.5} />
        </HeaderIconButton>
        <button
          class="evidence-control evidence-home__server"
          aria-label={server.name}
          onClick={() => dialog.show(() => <DialogSelectServer />)}
          title={`server · ${server.name}`}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "inline-flex",
            "align-items": "center",
            gap: "6px",
            height: "32px",
            "box-sizing": "border-box",
            padding: "0 10px",
            "border-radius": "8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-solid)",
            "font-family": FONT_MONO,
            "font-size": "10px",
            color: "var(--color-text-muted)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              "border-radius": "50%",
              background:
                server.healthy() === true
                  ? "var(--color-success)"
                  : server.healthy() === false
                    ? "var(--color-error)"
                    : "var(--color-text-faint)",
            }}
          />
          <span class="evidence-home__server-name">{server.name}</span>
        </button>
      </AppHeader>

      <main class="atlas-scroll evidence-home__main">
        <Show when={projects().length > 0} fallback={<EmptyHero onChoose={chooseProject} />}>
          <div class="evidence-home__intro">
            <div>
              <h1>Research projects</h1>
              <p>Open a workspace to continue an analysis, review evidence, or begin a new scientific inquiry.</p>
            </div>
            <div class="evidence-home__count" aria-label={`${projects().length} projects`}>
              <strong>{projects().length}</strong>
              <span>active workspaces</span>
            </div>
          </div>
          <div class="evidence-home__toolbar">
            <span class="evidence-home__toolbar-title">Project registry</span>
            <ViewToggle view={view()} onChange={setView} />
          </div>
          <Show
            when={filtered().length > 0}
            fallback={<NoProjectMatches query={filter()} onClear={() => setFilter("")} onChoose={chooseProject} />}
          >
            <Show
              when={view() === "grid"}
              fallback={
                <div class="evidence-panel evidence-home__list">
                  <For each={filtered()}>
                    {(p, i) => (
                      <ProjectRow
                        worktree={p.worktree}
                        homedir={homedir()}
                        updatedAt={p.time.updated ?? p.time.created}
                        last={i() === filtered().length - 1}
                        isFavorite={projectPrefs.isFavorite(p.worktree)}
                        onOpen={() => openProject(p.worktree)}
                        onToggleFavorite={() => {
                          projectPrefs.toggleFavorite(p.worktree)
                          toast.info(projectPrefs.isFavorite(p.worktree) ? "favorited" : "unfavorited", p.worktree)
                        }}
                        onHide={() => {
                          projectPrefs.hide(p.worktree)
                          toast.info("removed from list", p.worktree)
                        }}
                      />
                    )}
                  </For>
                </div>
              }
            >
              <div class="evidence-home__grid">
                <For each={filtered()}>
                  {(p) => (
                    <ProjectCard
                      worktree={p.worktree}
                      homedir={homedir()}
                      updatedAt={p.time.updated ?? p.time.created}
                      isFavorite={projectPrefs.isFavorite(p.worktree)}
                      onOpen={() => openProject(p.worktree)}
                      onToggleFavorite={() => {
                        projectPrefs.toggleFavorite(p.worktree)
                        toast.info(projectPrefs.isFavorite(p.worktree) ? "favorited" : "unfavorited", p.worktree)
                      }}
                      onHide={() => {
                        projectPrefs.hide(p.worktree)
                        toast.info("removed from list", p.worktree)
                      }}
                    />
                  )}
                </For>
                <NewProjectCard onClick={chooseProject} />
              </div>
            </Show>
          </Show>
        </Show>
      </main>
    </div>
  )
}

function NoProjectMatches(props: { query: string; onClear: () => void; onChoose: () => void }): JSX.Element {
  return (
    <div
      class="evidence-panel evidence-home__empty"
      style={{
        padding: "42px 20px",
        border: "1px dashed var(--color-border-strong)",
        background: "var(--color-surface-solid)",
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        gap: "12px",
        "text-align": "center",
      }}
    >
      <div style={{ "font-family": FONT_SERIF, "font-size": "24px", color: "var(--color-text)" }}>
        No matching projects
      </div>
      <div
        style={{
          "font-family": FONT_SANS,
          "font-size": "13px",
          color: "var(--color-text-muted)",
          "line-height": 1.5,
        }}
      >
        Nothing matched <code style={{ "font-family": FONT_CODE }}>{props.query}</code>.
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button class="evidence-control" type="button" onClick={props.onClear} style={emptyButton()}>
          Clear search
        </button>
        <button class="evidence-primary" type="button" onClick={props.onChoose} style={emptyButton(true)}>
          Choose folder
        </button>
      </div>
    </div>
  )
}

function emptyButton(primary = false): JSX.CSSProperties {
  return {
    all: "unset",
    cursor: "pointer",
    padding: "6px 12px",
    "border-radius": "8px",
    border: primary ? "1px solid var(--evidence-primary)" : "1px solid var(--evidence-border)",
    background: primary ? "var(--evidence-primary)" : "var(--evidence-panel)",
    color: primary ? "var(--evidence-on-primary)" : "var(--evidence-ink)",
    "font-family": FONT_MONO,
    "font-size": "11px",
    "font-weight": 400,
  }
}

function ProjectCard(props: {
  worktree: string
  homedir?: string
  updatedAt: number
  isFavorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onHide: () => void
}): JSX.Element {
  const [hover, setHover] = createSignal(false)
  const display = () => (props.homedir ? props.worktree.replace(props.homedir, "~") : props.worktree)
  const name = () => {
    const segs = props.worktree.split("/").filter(Boolean)
    return segs[segs.length - 1] ?? props.worktree
  }
  return (
    <div
      role="button"
      tabindex="0"
      onClick={props.onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          props.onOpen()
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      class="atlas-stagger evidence-panel evidence-home__card"
      style={{
        cursor: "pointer",
        display: "flex",
        "flex-direction": "column",
        gap: "14px",
        padding: "20px",
        background: hover() || props.isFavorite ? "var(--evidence-selected)" : "var(--evidence-panel)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", "align-items": "center", gap: "9px", position: "relative" }}>
        <FolderGlyph />
        <div style={{ flex: 1, "min-width": 0 }}>
          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                "font-family": FONT_SANS,
                "font-size": "15px",
                "font-weight": 400,
                color: "var(--color-text)",
                overflow: "hidden",
                "text-overflow": "ellipsis",
                "white-space": "nowrap",
                "min-width": 0,
                flex: 1,
              }}
            >
              {name()}
            </span>
            <Show when={props.isFavorite}>
              <span
                style={{
                  display: "inline-flex",
                  color: "var(--color-warning)",
                  "flex-shrink": 0,
                }}
                title="favorite"
              >
                <IconStarFilled size={12} />
              </span>
            </Show>
          </div>
          <div
            style={{
              "font-family": FONT_MONO,
              "font-size": "11px",
              color: "var(--color-text-faint)",
              "margin-top": "1px",
              overflow: "hidden",
              "text-overflow": "ellipsis",
              "white-space": "nowrap",
            }}
          >
            {display()}
          </div>
        </div>
      </div>

      {/* Hover-revealed action cluster — top-right corner */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          display: "flex",
          gap: "4px",
          opacity: hover() || props.isFavorite ? 1 : 0,
          transform: hover() ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 160ms ease, transform 160ms ease",
          "pointer-events": hover() || props.isFavorite ? "auto" : "none",
        }}
      >
        <button
          type="button"
          title={props.isFavorite ? "unfavorite" : "favorite"}
          onClick={(e) => {
            e.stopPropagation()
            props.onToggleFavorite()
          }}
          style={{
            ...ACTION_BUTTON,
            color: props.isFavorite ? "var(--color-warning)" : "var(--color-text-faint)",
          }}
          onMouseEnter={(el) => {
            el.currentTarget.style.borderColor = "var(--color-border-strong)"
            if (!props.isFavorite) el.currentTarget.style.color = "var(--color-warning)"
          }}
          onMouseLeave={(el) => {
            el.currentTarget.style.borderColor = "var(--color-border)"
            if (!props.isFavorite) el.currentTarget.style.color = "var(--color-text-faint)"
          }}
        >
          <Show when={props.isFavorite} fallback={<IconStar size={12} strokeWidth={1.5} />}>
            <IconStarFilled size={12} />
          </Show>
        </button>
        <button
          type="button"
          title="remove from list"
          onClick={(e) => {
            e.stopPropagation()
            props.onHide()
          }}
          style={ACTION_BUTTON}
          onMouseEnter={(el) => {
            el.currentTarget.style.borderColor = "var(--color-error)"
            el.currentTarget.style.color = "var(--color-error)"
          }}
          onMouseLeave={(el) => {
            el.currentTarget.style.borderColor = "var(--color-border)"
            el.currentTarget.style.color = "var(--color-text-faint)"
          }}
        >
          <IconTrash size={12} strokeWidth={1.5} />
        </button>
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          "align-items": "center",
          gap: "12px",
          "font-family": FONT_MONO,
          "font-size": "11px",
          color: "var(--color-text-faint)",
        }}
      >
        <span style={{ display: "inline-flex", "align-items": "center", gap: "5px" }}>
          <IconClock size={11} strokeWidth={1.5} />
          {DateTime.fromMillis(props.updatedAt).toRelative() ?? "—"}
        </span>
        <span style={{ flex: 1 }} />
        <Show when={hover()}>
          <span
            style={{
              display: "inline-flex",
              "align-items": "center",
              gap: "4px",
              color: "var(--color-text)",
              "font-weight": 400,
            }}
          >
            open
            <IconArrowRight size={11} strokeWidth={1.5} />
          </span>
        </Show>
      </div>
    </div>
  )
}

function ViewToggle(props: { view: "grid" | "list"; onChange: (v: "grid" | "list") => void }): JSX.Element {
  const btn = (active: boolean): JSX.CSSProperties => ({
    all: "unset",
    cursor: "pointer",
    display: "inline-flex",
    "align-items": "center",
    "justify-content": "center",
    width: "28px",
    height: "26px",
    "border-radius": "4px",
    color: active ? "var(--color-text)" : "var(--color-text-faint)",
    background: active ? "var(--color-surface-solid)" : "transparent",
    border: active ? "1px solid var(--color-border)" : "1px solid transparent",
  })
  return (
    <div
      class="evidence-control"
      style={{
        display: "inline-flex",
        gap: "2px",
        padding: "2px",
        "border-radius": "4px",
        background: "var(--color-bg-subtle)",
        border: "1px solid var(--color-border)",
      }}
    >
      <button type="button" title="grid view" style={btn(props.view === "grid")} onClick={() => props.onChange("grid")}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.2" />
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <rect x="3" y="14" width="7" height="7" rx="1.2" />
          <rect x="14" y="14" width="7" height="7" rx="1.2" />
        </svg>
      </button>
      <button type="button" title="list view" style={btn(props.view === "list")} onClick={() => props.onChange("list")}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>
      </button>
    </div>
  )
}

function ProjectRow(props: {
  worktree: string
  homedir?: string
  updatedAt: number
  last?: boolean
  isFavorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onHide: () => void
}): JSX.Element {
  const [hover, setHover] = createSignal(false)
  const display = () => (props.homedir ? props.worktree.replace(props.homedir, "~") : props.worktree)
  const name = () => {
    const segs = props.worktree.split("/").filter(Boolean)
    return segs[segs.length - 1] ?? props.worktree
  }
  return (
    <div
      class="evidence-home__row"
      role="button"
      tabindex="0"
      onClick={props.onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          props.onOpen()
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        display: "flex",
        "align-items": "center",
        gap: "10px",
        padding: "14px 18px",
        "border-bottom": props.last ? "none" : "1px solid var(--color-border)",
        background: hover() || props.isFavorite ? "var(--evidence-selected)" : "transparent",
      }}
    >
      <FolderGlyph />
      <span
        style={{
          "font-family": FONT_SANS,
          "font-size": "13px",
          "font-weight": 400,
          color: "var(--color-text)",
          "flex-shrink": 0,
        }}
      >
        {name()}
      </span>
      <Show when={props.isFavorite}>
        <span style={{ display: "inline-flex", color: "var(--color-warning)", "flex-shrink": 0 }}>
          <IconStarFilled size={12} />
        </span>
      </Show>
      <span
        class="evidence-home__row-path"
        style={{
          flex: 1,
          "min-width": 0,
          "font-family": FONT_MONO,
          "font-size": "11px",
          color: "var(--color-text-faint)",
          overflow: "hidden",
          "text-overflow": "ellipsis",
          "white-space": "nowrap",
        }}
      >
        {display()}
      </span>
      <span
        style={{ "font-family": FONT_MONO, "font-size": "11px", color: "var(--color-text-faint)", "flex-shrink": 0 }}
      >
        {DateTime.fromMillis(props.updatedAt).toRelative() ?? "—"}
      </span>
      <div
        style={{
          display: "flex",
          gap: "4px",
          "flex-shrink": 0,
          opacity: hover() || props.isFavorite ? 1 : 0,
          "pointer-events": hover() || props.isFavorite ? "auto" : "none",
          transition: "opacity 140ms ease",
        }}
      >
        <button
          type="button"
          title={props.isFavorite ? "unfavorite" : "favorite"}
          onClick={(e) => {
            e.stopPropagation()
            props.onToggleFavorite()
          }}
          style={{
            ...ACTION_BUTTON,
            color: props.isFavorite ? "var(--color-warning)" : "var(--color-text-faint)",
          }}
          onMouseEnter={(el) => {
            el.currentTarget.style.borderColor = "var(--color-border-strong)"
            if (!props.isFavorite) el.currentTarget.style.color = "var(--color-warning)"
          }}
          onMouseLeave={(el) => {
            el.currentTarget.style.borderColor = "var(--color-border)"
            if (!props.isFavorite) el.currentTarget.style.color = "var(--color-text-faint)"
          }}
        >
          <Show when={props.isFavorite} fallback={<IconStar size={12} strokeWidth={1.5} />}>
            <IconStarFilled size={12} />
          </Show>
        </button>
        <button
          type="button"
          title="remove from list"
          onClick={(e) => {
            e.stopPropagation()
            props.onHide()
          }}
          style={ACTION_BUTTON}
          onMouseEnter={(el) => {
            el.currentTarget.style.borderColor = "var(--color-error)"
            el.currentTarget.style.color = "var(--color-error)"
          }}
          onMouseLeave={(el) => {
            el.currentTarget.style.borderColor = "var(--color-border)"
            el.currentTarget.style.color = "var(--color-text-faint)"
          }}
        >
          <IconTrash size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function NewProjectCard(props: { onClick: () => void }): JSX.Element {
  const [hover, setHover] = createSignal(false)
  return (
    <button
      onClick={props.onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      class="atlas-stagger evidence-home__empty"
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "justify-content": "center",
        gap: "6px",
        padding: "20px",
        background: "transparent",
        border: hover() ? "1px dashed var(--color-text-faint)" : "1px dashed var(--color-border-strong)",
        "border-radius": "16px",
        color: hover() ? "var(--color-text)" : "var(--color-text-faint)",
        transition: "border-color 160ms ease, color 160ms ease",
      }}
    >
      <IconPlus size={15} strokeWidth={2} />
      <span style={{ "font-family": FONT_SANS, "font-size": "13px", "font-weight": 600 }}>Add project</span>
    </button>
  )
}

function EmptyHero(props: { onChoose: () => void }): JSX.Element {
  return (
    <div
      class="atlas-fade-in evidence-panel evidence-home__empty"
      style={{
        display: "flex",
        "flex-direction": "column",
        "align-items": "flex-start",
        "justify-content": "center",
        gap: "14px",
        padding: "clamp(32px, 7vw, 72px)",
      }}
    >
      <h1
        style={{
          "font-family": FONT_SANS,
          "font-size": "clamp(30px, 5vw, 44px)",
          "font-weight": 650,
          "letter-spacing": "-0.04em",
          "line-height": 1.1,
          margin: 0,
          color: "var(--evidence-ink)",
        }}
      >
        Research projects
      </h1>
      <p
        style={{
          "font-family": FONT_SANS,
          "font-size": "15px",
          "line-height": 1.55,
          color: "var(--evidence-slate)",
          "max-width": "650px",
          margin: 0,
        }}
      >
        Open a workspace to continue an analysis, review evidence, or begin a new scientific inquiry.
      </p>
      <div style={{ display: "flex", gap: "10px", "margin-top": "12px" }}>
        <button
          class="evidence-primary evidence-home__primary"
          aria-label="Choose project folder"
          onClick={props.onChoose}
          style={{
            cursor: "pointer",
            display: "inline-flex",
            "align-items": "center",
            gap: "8px",
            padding: "12px 18px",
            "border-radius": "8px",
            background: "var(--evidence-primary)",
            color: "var(--evidence-on-primary)",
            "font-family": FONT_SANS,
            "font-size": "14px",
            "font-weight": 400,
            "box-shadow": "var(--evidence-shadow-panel)",
          }}
        >
          <IconFolder size={14} strokeWidth={1.5} />
          Choose project folder
        </button>
      </div>
    </div>
  )
}

function FolderGlyph(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={{ "flex-shrink": 0, color: "var(--color-text-faint)" }}
    >
      <path d="M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4l1.8 2H19.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
    </svg>
  )
}
