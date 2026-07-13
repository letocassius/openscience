/**
 * Shared top header shell so the home and session views use one consistent
 * strip (height, padding, border) and one icon-button treatment instead of
 * two hand-rolled headers that drift apart.
 */
import { type JSX } from "solid-js"

export function AppHeader(props: { children: JSX.Element }): JSX.Element {
  return (
    <header
      class="g-strip evidence-header"
      style={{
        display: "flex",
        "align-items": "center",
        gap: "12px",
        padding: "10px 16px",
        "flex-shrink": 0,
        position: "relative",
        "z-index": 10,
      }}
    >
      {props.children}
    </header>
  )
}

export function HeaderIconButton(props: { onClick: () => void; title: string; children: JSX.Element }): JSX.Element {
  return (
    <button
      class="evidence-control"
      onClick={props.onClick}
      title={props.title}
      style={{
        all: "unset",
        "box-sizing": "border-box",
        cursor: "pointer",
        width: "28px",
        height: "28px",
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        "border-radius": "var(--radius)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-muted)",
        background: "var(--color-surface-solid)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-bg-elevated)"
        e.currentTarget.style.color = "var(--color-text)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-surface-solid)"
        e.currentTarget.style.color = "var(--color-text-muted)"
      }}
    >
      {props.children}
    </button>
  )
}

export function HeaderDivider(): JSX.Element {
  return <span style={{ width: "1px", height: "16px", background: "var(--color-border)" }} />
}
