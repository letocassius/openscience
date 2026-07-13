import { onMount, onCleanup, createEffect } from "solid-js"
import { createStore } from "solid-js/store"
import type { DesktopTheme } from "./types"
import { resolveThemeVariant, themeToCss } from "./resolve"
import { DEFAULT_THEMES } from "./default-themes"
import { createSimpleContext } from "../context/helper"

export type ColorScheme = "light" | "dark" | "system"

const STORAGE_KEYS = {
  THEME_ID: "openscience-theme-id",
  COLOR_SCHEME: "openscience-color-scheme",
  THEME_CSS_LIGHT: "openscience-theme-css-light",
  THEME_CSS_DARK: "openscience-theme-css-dark",
} as const

const THEME_STYLE_ID = "openscience-theme"

function ensureThemeStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null
  if (existing) return existing
  const element = document.createElement("style")
  element.id = THEME_STYLE_ID
  document.head.appendChild(element)
  return element
}

function getSystemMode(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyThemeCss(theme: DesktopTheme, themeId: string, mode: "light" | "dark") {
  const isDark = mode === "dark"
  const variant = isDark ? theme.dark : theme.light
  const tokens = resolveThemeVariant(variant, isDark)
  const css = themeToCss(tokens)

  if (themeId !== "openscience-1") {
    try {
      localStorage.setItem(isDark ? STORAGE_KEYS.THEME_CSS_DARK : STORAGE_KEYS.THEME_CSS_LIGHT, css)
    } catch {}
  }

  const fullCss = `:root {
  color-scheme: ${mode};
  --text-mix-blend-mode: ${isDark ? "plus-lighter" : "multiply"};
  ${css}
}`

  document.getElementById("openscience-theme-preload")?.remove()
  ensureThemeStyleElement().textContent = fullCss
  document.documentElement.dataset.theme = themeId
  document.documentElement.dataset.colorScheme = mode
}

function cacheThemeVariants(theme: DesktopTheme, themeId: string) {
  if (themeId === "openscience-1") return
  for (const mode of ["light", "dark"] as const) {
    const isDark = mode === "dark"
    const variant = isDark ? theme.dark : theme.light
    const tokens = resolveThemeVariant(variant, isDark)
    const css = themeToCss(tokens)
    try {
      localStorage.setItem(isDark ? STORAGE_KEYS.THEME_CSS_DARK : STORAGE_KEYS.THEME_CSS_LIGHT, css)
    } catch {}
  }
}

export const { use: useTheme, provider: ThemeProvider } = createSimpleContext({
  name: "Theme",
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

    onMount(() => {
      if (!locked) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handler = () => {
          if (store.colorScheme === "system") setStore("mode", getSystemMode())
        }
        mediaQuery.addEventListener("change", handler)
        onCleanup(() => mediaQuery.removeEventListener("change", handler))
      }

      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME_ID)
      const savedScheme = localStorage.getItem(STORAGE_KEYS.COLOR_SCHEME) as ColorScheme | null
      if (savedTheme && store.themes[savedTheme]) {
        setStore("themeId", savedTheme)
      }
      if (locked) {
        localStorage.setItem(STORAGE_KEYS.COLOR_SCHEME, locked)
        setStore("colorScheme", locked)
        setStore("mode", locked)
      } else if (savedScheme) {
        setStore("colorScheme", savedScheme)
        setStore("mode", savedScheme === "system" ? getSystemMode() : savedScheme)
      }
      const currentTheme = store.themes[store.themeId]
      if (currentTheme) {
        cacheThemeVariants(currentTheme, store.themeId)
      }
    })

    createEffect(() => {
      const theme = store.themes[store.themeId]
      if (theme) {
        applyThemeCss(theme, store.themeId, store.mode)
      }
    })

    const setTheme = (id: string) => {
      const theme = store.themes[id]
      if (!theme) {
        console.warn(`Theme "${id}" not found`)
        return
      }
      setStore("themeId", id)
      localStorage.setItem(STORAGE_KEYS.THEME_ID, id)
      cacheThemeVariants(theme, id)
    }

    const setColorScheme = (scheme: ColorScheme) => {
      const next = locked ?? scheme
      setStore("colorScheme", next)
      localStorage.setItem(STORAGE_KEYS.COLOR_SCHEME, next)
      setStore("mode", next === "system" ? getSystemMode() : next)
    }

    return {
      themeId: () => store.themeId,
      colorScheme: () => store.colorScheme,
      mode: () => store.mode,
      themes: () => store.themes,
      setTheme,
      setColorScheme,
      registerTheme: (theme: DesktopTheme) => setStore("themes", theme.id, theme),
      previewTheme: (id: string) => {
        const theme = store.themes[id]
        if (!theme) return
        setStore("previewThemeId", id)
        const previewMode = store.previewScheme
          ? store.previewScheme === "system"
            ? getSystemMode()
            : store.previewScheme
          : store.mode
        applyThemeCss(theme, id, previewMode)
      },
      previewColorScheme: (scheme: ColorScheme) => {
        const next = locked ?? scheme
        setStore("previewScheme", next)
        const previewMode = next === "system" ? getSystemMode() : next
        const id = store.previewThemeId ?? store.themeId
        const theme = store.themes[id]
        if (theme) {
          applyThemeCss(theme, id, previewMode)
        }
      },
      commitPreview: () => {
        if (store.previewThemeId) {
          setTheme(store.previewThemeId)
        }
        if (store.previewScheme && !locked) {
          setColorScheme(store.previewScheme)
        }
        setStore("previewThemeId", null)
        setStore("previewScheme", null)
      },
      cancelPreview: () => {
        setStore("previewThemeId", null)
        setStore("previewScheme", null)
        const theme = store.themes[store.themeId]
        if (theme) {
          applyThemeCss(theme, store.themeId, store.mode)
        }
      },
    }
  },
})
