import { test, expect } from "./fixtures"
import type { Locator } from "@playwright/test"

async function expectPopupSurface(surface: Locator) {
  const value = await surface.evaluate((element) => {
    const style = getComputedStyle(element)
    const fonts = Array.from(element.querySelectorAll<HTMLElement>("*")).map(
      (child) => getComputedStyle(child).fontFamily,
    )
    return {
      radius: style.borderRadius,
      font: style.fontFamily,
      background: style.backgroundColor,
      hasLegacyFont: fonts.some((font) => font.includes("Computer Modern")),
    }
  })
  expect(value).toEqual({
    radius: "16px",
    font: expect.stringContaining("Roboto"),
    background: "rgb(255, 255, 255)",
    hasLegacyFont: false,
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("openscience.setup.dismissed", "1"))
})

test("workspace exposes the Document Reviewer design tokens", async ({ page }) => {
  await page.goto("/")
  const values = await page.locator("html").evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      primary: style.getPropertyValue("--evidence-primary").trim().toLowerCase(),
      hover: style.getPropertyValue("--color-accent-hover").trim().toLowerCase(),
      selected: style.getPropertyValue("--color-accent-subtle").trim().toLowerCase(),
      canvas: style.getPropertyValue("--color-bg").trim().toLowerCase(),
      panel: style.getPropertyValue("--color-surface-solid").trim().toLowerCase(),
      text: style.getPropertyValue("--color-text").trim().toLowerCase(),
      secondary: style.getPropertyValue("--color-text-muted").trim().toLowerCase(),
      disabled: style.getPropertyValue("--color-text-faint").trim().toLowerCase(),
      border: style.getPropertyValue("--color-border").trim().toLowerCase(),
      warning: style.getPropertyValue("--color-warning-muted").trim().toLowerCase(),
      error: style.getPropertyValue("--color-error-muted").trim().toLowerCase(),
      controlRadius: style.getPropertyValue("--radius").trim(),
      panelRadius: style.getPropertyValue("--radius-lg").trim(),
      fast: style.getPropertyValue("--duration-fast").trim(),
      slow: style.getPropertyValue("--duration-slow").trim(),
      easing: style.getPropertyValue("--ease-standard").trim(),
      font: style.getPropertyValue("--font-family-sans"),
    }
  })
  expect(values).toMatchObject({
    primary: "#21965f",
    hover: "#1c8554",
    selected: "#e7f6ee",
    canvas: "#fafafa",
    panel: "#ffffff",
    text: "#212121",
    secondary: "#666666",
    disabled: "#9e9e9e",
    border: "#e0e0e0",
    warning: "#fff4dc",
    error: "#feeceb",
    controlRadius: "8px",
    panelRadius: "16px",
    fast: "150ms",
    slow: "200ms",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  })
  expect(values.font).toContain("Roboto")

  const weights = await page.evaluate(async () => {
    const faces = await Promise.all([
      document.fonts.load('500 16px "Roboto"', "A"),
      document.fonts.load('700 16px "Roboto"', "A"),
    ])
    return faces.map((matches) =>
      matches.map((face) => ({ family: face.family, status: face.status, weight: face.weight })),
    )
  })
  expect(weights).toEqual([
    [{ family: "Roboto", status: "loaded", weight: "500" }],
    [{ family: "Roboto", status: "loaded", weight: "700" }],
  ])
})

test("finite Atlas motion consumes the shared duration and easing tokens", async ({ page }) => {
  await page.goto("/")
  const values = await page.evaluate(() => {
    const mount = (className: string) => {
      const element = document.createElement("div")
      element.className = className
      document.body.append(element)
      return getComputedStyle(element)
    }
    const markdown = document.createElement("div")
    markdown.className = "atlas-md"
    const link = document.createElement("a")
    markdown.append(link)
    document.body.append(markdown)

    const transitions = [
      mount("g-composer"),
      mount("atlas-btn"),
      mount("atlas-input"),
      mount("atlas-textarea"),
      mount("atlas-nav-item"),
      mount("atlas-rn"),
      getComputedStyle(link),
      mount("atlas-tile"),
      mount("atlas-agent-orbit"),
    ].map((style) => ({ duration: style.transitionDuration, easing: style.transitionTimingFunction }))
    const entrances = [
      mount("atlas-fade-in"),
      mount("atlas-slide-up"),
      mount("atlas-stagger"),
      mount("atlas-pop-up"),
      mount("atlas-overlay"),
      mount("atlas-modal"),
      mount("atlas-drawer-right"),
    ].map((style) => style.animationDuration)

    return { transitions, entrances }
  })

  expect(values.transitions).toEqual([
    {
      duration: "0.15s, 0.15s",
      easing: "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
    },
    ...Array.from({ length: 8 }, () => ({
      duration: "0.15s",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    })),
  ])
  expect(values.entrances).toEqual(Array.from({ length: 7 }, () => "0.2s"))
})

test("shared dialogs use the PandaScience surface contract", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: /localhost|127\.0\.0\.1/ }).click()

  const dialog = page.getByRole("dialog")
  const content = dialog.and(page.locator('[data-slot="dialog-content"]'))
  await expect(content).toBeVisible()
  const style = await content.evaluate((element) => {
    const computed = getComputedStyle(element)
    const header = getComputedStyle(element.querySelector<HTMLElement>('[data-slot="dialog-header"]')!)
    const title = getComputedStyle(element.querySelector<HTMLElement>('[data-slot="dialog-title"]')!)
    return {
      radius: computed.borderRadius,
      background: computed.backgroundColor,
      border: computed.border,
      shadow: computed.boxShadow,
      font: computed.fontFamily,
      headerPadding: header.padding,
      titleSize: title.fontSize,
      titleWeight: title.fontWeight,
      titleLineHeight: title.lineHeight,
    }
  })
  expect(style).toMatchObject({
    radius: "16px",
    background: "rgb(255, 255, 255)",
    border: "1px solid rgb(242, 242, 242)",
    shadow: "rgba(0, 0, 0, 0.08) 0px 4px 24px 0px",
    headerPadding: "20px 24px 12px",
    titleSize: "18px",
    titleWeight: "700",
    titleLineHeight: "24.3px",
  })
  expect(style.font).toContain("Roboto")

  const overlay = await page.locator('[data-component="dialog-overlay"]').evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      background: computed.backgroundColor,
      duration: computed.animationDuration,
      easing: computed.animationTimingFunction,
    }
  })
  expect(overlay).toEqual({
    background: "rgba(33, 33, 33, 0.52)",
    duration: "0.15s",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  })
})

test("representative popups share the PandaScience surface and action hierarchy", async ({ page, gotoSession }) => {
  await page.goto("/")

  await page.getByRole("button", { name: "New project" }).click()
  let dialog = page.locator('[data-component="dialog"] [data-slot="dialog-content"]')
  await expectPopupSurface(dialog)
  await expect(dialog.getByRole("button", { name: "open this folder", exact: true })).toHaveCSS("border-radius", "8px")
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: /localhost|127\.0\.0\.1/ }).click()
  dialog = page.getByRole("dialog")
  await expectPopupSurface(dialog)
  await page.keyboard.press("Escape")

  await gotoSession()
  await page.getByTitle("command palette").click()
  const palette = page
    .locator(".atlas-modal")
    .filter({ has: page.getByPlaceholder("search projects, sessions, actions…") })
  await expect(palette).toBeVisible()
  await expectPopupSurface(palette)
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Settings" }).first().click()
  dialog = page.getByRole("dialog")
  await expectPopupSurface(dialog)
})
