import { createSignal, createMemo, createResource, createEffect, type JSX, For, Show } from "solid-js"
import { Dialog } from "@synsci/ui/dialog"
import { useDialog } from "@synsci/ui/context/dialog"
import { useGlobalSync } from "@/context/global-sync"
import { FONT_MONO, FONT_SANS } from "@/styles/tokens"
import { validateDirectoryPath } from "@/atlas/openDirectory"
import {
  IconFolder,
  IconChevronLeft,
  IconChevronRight,
  IconArrowRight,
  IconSearch,
  IconRefresh,
  IconHome,
  IconFile,
  IconDownload,
} from "@/atlas/shared/Icon"

interface FolderEntry {
  name: string
  absolute: string
}

interface PickerProps {
  multiple?: boolean
  onSelect: (result: string | string[] | null) => void
}

const RECENT_KEY = "thesis-folder-picker-recents-v1"

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, 8) : []
  } catch {
    return []
  }
}

function pushRecent(path: string) {
  try {
    const cur = readRecents()
    const next = [path, ...cur.filter((p) => p !== path)].slice(0, 8)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

/**
 * Finder/Explorer-style folder picker:
 *   - left sidebar with quick-link shortcuts (Home, Desktop, Documents,
 *     Downloads, Applications) plus recents
 *   - main pane with breadcrumbs + folder list
 *   - single click selects, while disclosure or double-click drills in
 *   - "Add workspace" registers the selected folder without navigating
 *
 * Backed by openscience's /file endpoint, which walks the real filesystem
 * and returns absolute paths.
 */
export function FolderPicker(props: PickerProps): JSX.Element {
  const sync = useGlobalSync()
  const dialog = useDialog()

  const home = () => sync.data.path.home || "/"
  const [cwd, setCwd] = createSignal(home())
  const [selected, setSelected] = createSignal(home())
  const [filter, setFilter] = createSignal("")
  const [pathInput, setPathInput] = createSignal("")
  const [error, setError] = createSignal<string>()

  const [entries, { refetch }] = createResource(
    () => cwd(),
    async (dir): Promise<FolderEntry[]> => {
      setError(undefined)
      try {
        const response = await fetch(`/api/resolve-folder/list?path=${encodeURIComponent(dir)}`)
        const data = (await response.json()) as {
          ok?: boolean
          entries?: FolderEntry[]
          error?: string
        }
        if (!response.ok || !data.ok) throw new Error(data.error || `Couldn't read ${dir}`)
        return (data.entries ?? [])
          .filter((entry) => !entry.name.startsWith("."))
          .sort((a, b) => a.name.localeCompare(b.name))
      } catch (err) {
        // Surface the failure instead of masking it as an empty folder — an
        // empty list and a failed listing are very different states.
        setError(err instanceof Error ? err.message : String(err))
        return []
      }
    },
  )

  // Use `entries.latest` so we keep the previously-rendered rows visible
  // while a new directory is being fetched. Without this the list briefly
  // empties on every navigation, which read as a "whole page refresh".
  const filtered = createMemo(() => {
    const q = filter().toLowerCase().trim()
    const list = entries.latest ?? entries() ?? []
    if (!q) return list
    return list.filter((e) => e.name.toLowerCase().includes(q))
  })

  const crumbs = createMemo(() => {
    const path = cwd()
    const h = home()
    const segs: Array<{ label: string; path: string }> = []
    if (h && (path === h || path.startsWith(h + "/"))) {
      segs.push({ label: "~", path: h })
      const tail = path === h ? "" : path.slice(h.length + 1)
      if (tail) {
        const parts = tail.split("/")
        let acc = h
        for (const p of parts) {
          acc = acc + "/" + p
          segs.push({ label: p, path: acc })
        }
      }
    } else {
      segs.push({ label: "/", path: "/" })
      const parts = path.replace(/^\/+/, "").split("/").filter(Boolean)
      let acc = ""
      for (const p of parts) {
        acc = acc + "/" + p
        segs.push({ label: p, path: acc })
      }
    }
    return segs
  })

  const enter = (path: string) => {
    setCwd(path)
    setSelected(path)
    setFilter("")
  }

  const goUp = () => {
    const cur = cwd()
    if (cur === "/" || cur === "") return
    const i = cur.lastIndexOf("/")
    enter(i <= 0 ? "/" : cur.slice(0, i))
  }

  const drillInto = (entry: FolderEntry) => enter(entry.absolute)

  const goTo = (path: string) => enter(path)

  /** Resolve `~` / relative segments and jump there. */
  const normalizeTyped = (raw: string) => {
    const trimmed = raw.trim().replace(/\/+$/, "")
    if (!trimmed) return ""
    if (trimmed === "~") return home()
    if (trimmed.startsWith("~/")) return home() + trimmed.slice(1)
    if (!trimmed.startsWith("/")) return (cwd() === "/" ? "" : cwd()) + "/" + trimmed
    return trimmed
  }

  /** Resolve `~` / relative segments, verify it exists, and jump there. */
  const goToTyped = async (raw: string) => {
    const abs = normalizeTyped(raw)
    if (!abs) return
    const valid = await validateDirectoryPath(abs)
    if (!valid) return
    enter(valid)
    setPathInput("")
  }

  const pick = (path: string) => {
    pushRecent(path)
    props.onSelect(props.multiple ? [path] : path)
    dialog.close()
  }

  const cancel = () => {
    props.onSelect(null)
    dialog.close()
  }

  const sidebarLinks = createMemo(() => {
    const h = home()
    const links: Array<{ label: string; path: string; key: string }> = [
      { label: "Home", path: h, key: "home" },
      { label: "Desktop", path: h + "/Desktop", key: "desktop" },
      { label: "Documents", path: h + "/Documents", key: "docs" },
      { label: "Downloads", path: h + "/Downloads", key: "dl" },
      { label: "Applications", path: "/Applications", key: "apps" },
    ]
    return links
  })

  const recents = createMemo(() => readRecents())

  return (
    <Dialog
      title="Add workspace"
      description="Choose a folder to add to your project registry. You can open it from the workspace list afterward."
      size="x-large"
      class="folder-picker"
      transition
    >
      <style>{`
        [data-component="dialog"]:has(.folder-picker) [data-slot="dialog-container"] {
          height: min(calc(100vh - 48px), 680px);
        }
        [data-slot="dialog-content"].folder-picker {
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }
        .folder-picker [data-slot="dialog-header"] {
          padding: 24px 32px 8px;
        }
        .folder-picker [data-slot="dialog-description"] {
          padding: 0 32px 20px;
        }
        .folder-picker__body {
          display: grid;
          grid-template-columns: 210px minmax(0, 1fr);
          min-height: 0;
          flex: 1;
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }
        .folder-picker__sidebar {
          width: 210px;
          box-sizing: border-box;
          padding: 18px 14px;
          overflow: auto;
          border-right: 1px solid var(--color-border);
          background: var(--color-surface-solid);
        }
        .folder-picker__group + .folder-picker__group {
          margin-top: 20px;
        }
        .folder-picker__section {
          padding: 4px 8px 8px;
          color: var(--color-text-faint);
          font: 11px/1.4 ${FONT_SANS};
          font-weight: 500;
        }
        .folder-picker__side-row {
          display: flex;
          min-height: 44px;
          align-items: center;
          gap: 10px;
          box-sizing: border-box;
          padding: 7px 10px;
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--color-text);
          cursor: pointer;
          transition: background 160ms var(--ease-standard), border-color 160ms var(--ease-standard);
        }
        .folder-picker__side-row:hover {
          background: var(--color-bg-subtle);
        }
        .folder-picker__side-row--active {
          border-color: color-mix(in srgb, var(--evidence-primary, #21965f) 14%, transparent);
          background: var(--evidence-selected, #e7f6ee);
        }
        .folder-picker__side-copy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
        }
        .folder-picker__side-label {
          overflow: hidden;
          color: var(--color-text);
          font: 13px/1.4 ${FONT_SANS};
          font-weight: 500;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .folder-picker__side-path {
          overflow: hidden;
          margin-top: 2px;
          color: var(--color-text-faint);
          font: 10px/1.4 ${FONT_MONO};
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .folder-picker__browser {
          display: flex;
          min-width: 0;
          min-height: 0;
          flex-direction: column;
          padding: 10px 16px 0;
          background: var(--color-surface-solid);
        }
        .folder-picker__nav,
        .folder-picker__tools {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .folder-picker__nav {
          min-height: 40px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--color-border);
        }
        .folder-picker__tools {
          margin-top: 8px;
        }
        .folder-picker__icon,
        .folder-picker__disclosure {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          box-sizing: border-box;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text-muted);
          background: var(--color-surface-solid);
          cursor: pointer;
        }
        .folder-picker__icon:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .folder-picker__crumbs {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 5px;
          flex: 1;
          overflow: hidden;
          color: var(--color-text-faint);
          font: 12px/1.4 ${FONT_MONO};
        }
        .folder-picker__crumbs button {
          all: unset;
          overflow: hidden;
          padding: 4px 5px;
          border-radius: 6px;
          color: var(--color-text-muted);
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: pointer;
        }
        .folder-picker__crumbs button:last-of-type {
          color: var(--color-text);
          font-weight: 600;
        }
        .folder-picker__search,
        .folder-picker__path {
          display: flex;
          height: 40px;
          align-items: center;
          gap: 8px;
          box-sizing: border-box;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-surface-solid);
          color: var(--color-text-muted);
        }
        .folder-picker__search {
          flex: 1;
          padding: 0 12px;
        }
        .folder-picker__path {
          width: min(260px, 42%);
          padding-left: 12px;
        }
        .folder-picker__search input,
        .folder-picker__path input {
          all: unset;
          min-width: 0;
          flex: 1;
          color: var(--color-text);
          font: 13px/1.4 ${FONT_SANS};
        }
        .folder-picker__path input {
          font-family: ${FONT_MONO};
          font-size: 11px;
        }
        .folder-picker__go {
          all: unset;
          align-self: stretch;
          padding: 0 12px;
          border-left: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font: 12px/1 ${FONT_SANS};
          cursor: pointer;
        }
        .folder-picker__go:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .folder-picker__list-head {
          display: flex;
          justify-content: space-between;
          padding: 16px 6px 8px;
          color: var(--color-text-faint);
          font: 11px/1.4 ${FONT_SANS};
        }
        .folder-picker__list {
          position: relative;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          border-top: 1px solid var(--color-border);
          background: var(--color-surface-solid);
          transition: opacity var(--duration-fast) var(--ease-standard);
        }
        .folder-picker__row {
          display: flex;
          min-height: 46px;
          align-items: center;
          gap: 10px;
          box-sizing: border-box;
          padding: 0 10px;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text);
          font: 13px/1.4 ${FONT_SANS};
          cursor: default;
          transition: background 160ms var(--ease-standard);
        }
        .folder-picker__row:hover {
          background: var(--color-bg-subtle);
        }
        .folder-picker__row--selected,
        .folder-picker__row--selected:hover {
          background: var(--evidence-selected, #e7f6ee);
        }
        .folder-picker__row-name {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .folder-picker__check {
          display: grid;
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          place-items: center;
          border-radius: 50%;
          color: white;
          background: var(--evidence-primary, #21965f);
        }
        .folder-picker__disclosure {
          width: 28px;
          height: 28px;
          flex-basis: 28px;
          border-color: transparent;
          background: transparent;
          transition: opacity 160ms var(--ease-standard), background 160ms var(--ease-standard);
        }
        .folder-picker__disclosure:hover {
          background: color-mix(in srgb, var(--color-text) 6%, transparent);
        }
        .folder-picker__loading {
          position: absolute;
          inset: 0 auto auto 0;
          z-index: 1;
          width: 30%;
          height: 2px;
          background: var(--evidence-primary, #21965f);
          animation: atlas-loading-slide 1.1s ease-in-out infinite;
          pointer-events: none;
        }
        .folder-picker__empty {
          display: flex;
          min-height: 180px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          padding: 24px;
          color: var(--color-text-faint);
          font: 12px/1.5 ${FONT_SANS};
          text-align: center;
        }
        .folder-picker__empty--error {
          color: var(--color-error);
        }
        .folder-picker__retry {
          all: unset;
          padding: 6px 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text);
          font: 12px/1.4 ${FONT_SANS};
          cursor: pointer;
        }
        .folder-picker__footer {
          display: flex;
          min-height: 76px;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-sizing: border-box;
          padding: 12px 24px;
          background: var(--color-surface-solid);
        }
        .folder-picker__selected {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 10px;
          color: var(--color-text-muted);
          font: 11px/1.4 ${FONT_MONO};
        }
        .folder-picker__selected span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .folder-picker__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .folder-picker__cancel,
        .folder-picker__primary {
          min-height: 44px;
          box-sizing: border-box;
          padding: 0 18px;
          border-radius: 8px;
          font: 600 13px/1 ${FONT_SANS};
          cursor: pointer;
        }
        .folder-picker__cancel {
          border: 1px solid var(--color-border);
          color: var(--color-text);
          background: var(--color-surface-solid);
        }
        .folder-picker__primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--evidence-primary, #21965f);
          color: white;
          background: var(--evidence-primary, #21965f);
        }
        .folder-picker button:focus-visible,
        .folder-picker input:focus-visible,
        .folder-picker [role="button"]:focus-visible,
        .folder-picker [role="option"]:focus-visible {
          outline: 2px solid var(--evidence-primary, #21965f);
          outline-offset: 2px;
        }
        @media (max-width: 720px) {
          [data-component="dialog"]:has(.folder-picker) [data-slot="dialog-container"] {
            height: min(calc(100dvh - 16px), 680px);
          }
          .folder-picker [data-slot="dialog-header"] {
            padding: 18px 18px 6px;
          }
          .folder-picker [data-slot="dialog-description"] {
            padding: 0 18px 16px;
          }
          .folder-picker__body {
            grid-template-columns: minmax(0, 1fr);
          }
          .folder-picker__sidebar {
            display: none;
          }
          .folder-picker__browser {
            padding-inline: 12px;
          }
          .folder-picker__tools {
            align-items: stretch;
            flex-direction: column;
          }
          .folder-picker__path {
            width: 100%;
          }
          .folder-picker__footer {
            min-height: 104px;
            align-items: stretch;
            flex-direction: column;
            padding: 10px 16px 14px;
          }
          .folder-picker__actions {
            justify-content: flex-end;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .folder-picker__list,
          .folder-picker__row,
          .folder-picker__loading {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div class="folder-picker__body">
        <aside class="folder-picker__sidebar">
          <div class="folder-picker__group">
            <SectionLabel>Favorites</SectionLabel>
            <For each={sidebarLinks()}>
              {(link) => (
                <SidebarRow
                  label={link.label}
                  icon={
                    link.key === "home" ? (
                      <IconHome size={16} strokeWidth={1.5} />
                    ) : link.key === "docs" ? (
                      <IconFile size={16} strokeWidth={1.5} />
                    ) : link.key === "dl" ? (
                      <IconDownload size={16} strokeWidth={1.5} />
                    ) : (
                      <IconFolder size={16} strokeWidth={1.5} />
                    )
                  }
                  active={cwd() === link.path}
                  onClick={() => goTo(link.path)}
                />
              )}
            </For>
          </div>
          <Show when={recents().length > 0}>
            <div class="folder-picker__group">
              <SectionLabel>Recent</SectionLabel>
              <For each={recents()}>
                {(path) => (
                  <SidebarRow
                    label={path.split("/").filter(Boolean).pop() ?? "/"}
                    sublabel={path.replace(home() + "/", "~/").replace(home(), "~")}
                    active={cwd() === path}
                    onClick={() => goTo(path)}
                  />
                )}
              </For>
            </div>
          </Show>
        </aside>

        <section class="folder-picker__browser">
          <div class="folder-picker__nav">
            <button
              type="button"
              class="folder-picker__icon"
              aria-label="Parent folder"
              onClick={goUp}
              disabled={cwd() === "/" || cwd() === ""}
            >
              <IconChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <button type="button" class="folder-picker__icon" aria-label="Home" onClick={() => goTo(home())}>
              <IconHome size={16} strokeWidth={1.5} />
            </button>
            <div class="folder-picker__crumbs">
              <For each={crumbs()}>
                {(crumb, index) => (
                  <>
                    <Show when={index() > 0}>
                      <span aria-hidden="true">/</span>
                    </Show>
                    <button type="button" title={crumb.path} onClick={() => goTo(crumb.path)}>
                      {crumb.label}
                    </button>
                  </>
                )}
              </For>
            </div>
            <button type="button" class="folder-picker__icon" aria-label="Refresh" onClick={() => refetch()}>
              <IconRefresh size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div class="folder-picker__tools">
            <label class="folder-picker__search">
              <IconSearch size={16} strokeWidth={1.5} />
              <input
                value={filter()}
                onInput={(event) => setFilter(event.currentTarget.value)}
                placeholder="Search folders"
                autofocus
              />
            </label>
            <label class="folder-picker__path">
              <IconFolder size={16} strokeWidth={1.5} />
              <input
                value={pathInput()}
                onInput={(event) => setPathInput(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void goToTyped(pathInput())
                }}
                placeholder="Enter a path…"
                spellcheck={false}
              />
              <button
                type="button"
                class="folder-picker__go"
                aria-label="Go"
                onClick={() => void goToTyped(pathInput())}
                disabled={!pathInput().trim()}
              >
                Go
              </button>
            </label>
          </div>

          <div class="folder-picker__list-head">
            <span>Name</span>
            <span>
              {filtered().length} {filtered().length === 1 ? "folder" : "folders"}
            </span>
          </div>

          <div
            class="folder-picker__list atlas-scroll"
            role="listbox"
            aria-label="Folders"
            ref={(element) => {
              createEffect(() => {
                cwd()
                element.scrollTop = 0
              })
            }}
            style={{ opacity: entries.loading ? 0.55 : 1 }}
          >
            <Show when={entries.loading}>
              <div class="folder-picker__loading" />
            </Show>
            <Show
              when={filtered().length > 0}
              fallback={
                <Show when={!entries.loading}>
                  <Show
                    when={!error()}
                    fallback={
                      <div class="folder-picker__empty folder-picker__empty--error">
                        <strong>Couldn't read this folder</strong>
                        <span>{error()}</span>
                        <button type="button" class="folder-picker__retry" onClick={() => void refetch()}>
                          Retry
                        </button>
                      </div>
                    }
                  >
                    <div class="folder-picker__empty">
                      <Show when={(entries() ?? []).length === 0} fallback={<span>Nothing matches the filter.</span>}>
                        <Show
                          when={/\/(Desktop|Documents|Downloads)$/.test(cwd())}
                          fallback={<span>This folder is empty. You can still add it as a workspace.</span>}
                        >
                          <strong>macOS is blocking this folder listing.</strong>
                          <span>Enter the absolute path above to select a folder that OpenScience can access.</span>
                        </Show>
                      </Show>
                    </div>
                  </Show>
                </Show>
              }
            >
              <For each={filtered()}>
                {(entry) => (
                  <FolderRow
                    entry={entry}
                    selected={selected() === entry.absolute}
                    onSelect={() => setSelected(entry.absolute)}
                    onDrill={() => drillInto(entry)}
                  />
                )}
              </For>
            </Show>
          </div>
        </section>
      </div>

      <footer class="folder-picker__footer">
        <span class="folder-picker__selected">
          <IconFolder size={16} strokeWidth={1.5} />
          <span title={selected()}>{selected()}</span>
        </span>
        <div class="folder-picker__actions">
          <button type="button" class="folder-picker__cancel" onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            class="folder-picker__primary"
            title="add the selected folder to the workspace list"
            onClick={async () => {
              const valid = await validateDirectoryPath(selected())
              if (valid) pick(valid)
            }}
          >
            <IconArrowRight size={15} strokeWidth={2} />
            Add workspace
          </button>
        </div>
      </footer>
    </Dialog>
  )
}

function FolderRow(props: {
  entry: FolderEntry
  selected: boolean
  onSelect: () => void
  onDrill: () => void
}): JSX.Element {
  const [hover, setHover] = createSignal(false)
  return (
    <div
      role="option"
      tabindex="0"
      aria-selected={props.selected}
      onClick={props.onSelect}
      onDblClick={props.onDrill}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") props.onSelect()
        if (event.key === "ArrowRight") props.onDrill()
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={props.entry.absolute}
      class="folder-picker__row"
      classList={{ "folder-picker__row--selected": props.selected }}
    >
      <IconFolder size={16} strokeWidth={1.5} />
      <span class="folder-picker__row-name">{props.entry.name}</span>
      <Show when={props.selected}>
        <span class="folder-picker__check" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.25 6.2 4.65 8.5 9.75 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </Show>
      <button
        type="button"
        aria-label={`Open ${props.entry.name}`}
        onClick={(event) => {
          event.stopPropagation()
          props.onDrill()
        }}
        class="folder-picker__disclosure"
        style={{ opacity: hover() ? 1 : 0.55 }}
      >
        <IconChevronRight size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}

function SectionLabel(props: { children: JSX.Element }): JSX.Element {
  return (
    <div class="folder-picker__section">{props.children}</div>
  )
}

function SidebarRow(props: {
  label: string
  sublabel?: string
  icon?: JSX.Element
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <div
      role="button"
      tabindex="0"
      onClick={props.onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") props.onClick()
      }}
      class="folder-picker__side-row"
      classList={{ "folder-picker__side-row--active": props.active }}
    >
      {props.icon ?? <IconFolder size={16} strokeWidth={1.5} />}
      <div class="folder-picker__side-copy">
        <span class="folder-picker__side-label">{props.label}</span>
        <Show when={props.sublabel}>
          <span class="folder-picker__side-path">{props.sublabel}</span>
        </Show>
      </div>
    </div>
  )
}
