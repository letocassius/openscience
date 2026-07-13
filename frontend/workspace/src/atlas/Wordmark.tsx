import { type JSX, Show } from "solid-js"
import { FONT_SERIF } from "@/styles/tokens"
import { PRODUCT } from "@/brand"

interface WordmarkProps {
  size?: "sm" | "md" | "lg"
  /** Label only (no logo) for tight spaces. */
  textOnly?: boolean
  onClick?: () => void
}

export function Wordmark(props: WordmarkProps): JSX.Element {
  const size = () => props.size ?? "md"
  const px = () =>
    size() === "lg" ? { logo: 30, text: 28 } : size() === "sm" ? { logo: 22, text: 18 } : { logo: 26, text: 22 }
  return (
    <button
      onClick={props.onClick}
      aria-label={PRODUCT}
      class="atlas-wordmark"
      style={{
        all: "unset",
        cursor: props.onClick ? "pointer" : "default",
        display: "inline-flex",
        "align-items": "center",
        gap: size() === "sm" ? "8px" : "10px",
      }}
    >
      <Show when={!props.textOnly}>
        <span
          class="panda-mark"
          aria-hidden="true"
          style={{
            display: "inline-flex",
            "align-items": "center",
            "justify-content": "center",
            width: `${px().logo + 2}px`,
            height: `${px().logo + 2}px`,
            "flex-shrink": 0,
            "font-family": '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
            "font-size": `${px().logo}px`,
            "line-height": 1,
          }}
        >
          🐼
        </span>
      </Show>
      <span
        class="panda-wordmark"
        style={{
          "font-family": FONT_SERIF,
          "font-size": `${px().text}px`,
          "font-weight": 400,
          "letter-spacing": "-0.02em",
          color: "var(--color-text)",
          "white-space": "nowrap",
        }}
      >
        {PRODUCT}
      </span>
    </button>
  )
}
