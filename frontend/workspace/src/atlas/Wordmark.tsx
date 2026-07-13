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
        <style>{`
          .panda-mark {
            position: relative;
            display: inline-block;
            color: var(--color-text);
          }
          .panda-mark__ear {
            position: absolute;
            top: 2%;
            width: 35%;
            height: 35%;
            border-radius: 50%;
            background: currentColor;
          }
          .panda-mark__ear--left {
            left: 3%;
          }
          .panda-mark__ear--right {
            right: 3%;
          }
          .panda-mark__face {
            position: absolute;
            inset: 13% 4% 2%;
            border: 2px solid currentColor;
            border-radius: 50%;
            background: var(--background-base);
          }
          .panda-mark__face::before,
          .panda-mark__face::after {
            position: absolute;
            top: 36%;
            width: 18%;
            height: 27%;
            border-radius: 50%;
            background: currentColor;
            content: "";
          }
          .panda-mark__face::before {
            left: 22%;
            transform: rotate(20deg);
          }
          .panda-mark__face::after {
            right: 22%;
            transform: rotate(-20deg);
          }
        `}</style>
        <span
          class="panda-mark"
          aria-hidden="true"
          style={{
            width: `${px().logo}px`,
            height: `${px().logo}px`,
            "flex-shrink": 0,
          }}
        >
          <span class="panda-mark__ear panda-mark__ear--left" />
          <span class="panda-mark__ear panda-mark__ear--right" />
          <span class="panda-mark__face" />
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
