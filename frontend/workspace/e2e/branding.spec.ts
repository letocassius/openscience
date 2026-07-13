import { test, expect } from "./fixtures"

const SETUP_DISMISS_KEY = "openscience.setup.dismissed"

test("renders the PandaScience product identity", async ({ page }) => {
  await page.addInitScript((key: string) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
  await page.goto("/")

  await expect(page).toHaveTitle("PandaScience")
  await expect(page.getByRole("button", { name: "PandaScience" }).first()).toBeVisible()
  await expect(page.locator(".panda-mark")).toHaveText("🐼")
  await expect(page.getByText("Insilico Medicine", { exact: true })).toBeVisible()

  const canvas = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--evidence-canvas").trim(),
  )
  expect(canvas).toBe("#fafafa")
  const header = page.locator(".evidence-header")
  await expect(header).toHaveCSS("min-height", "56px")
})

test("uses green structural accents on the project registry", async ({ page }) => {
  await page.addInitScript((key: string) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
  await page.goto("/")
  await page.getByTitle("grid view").click()
  await expect(page.locator(".evidence-home__card").first()).toBeVisible()

  const colors = await page.evaluate(() => {
    const primary = document.querySelector<HTMLElement>(".evidence-home__primary")
    const label = document.querySelector<HTMLElement>(".evidence-label")
    const panel = document.querySelector<HTMLElement>(".evidence-home__count, .evidence-home__empty")
    const card = document.querySelector<HTMLElement>(".evidence-home__card")
    if (!primary || !label || !panel || !card) return undefined
    return {
      primary: getComputedStyle(primary).backgroundColor,
      label: getComputedStyle(label).color,
      panel: getComputedStyle(panel).borderTopColor,
      shadow: getComputedStyle(card).boxShadow,
    }
  })

  expect(colors).toBeDefined()
  expect(colors?.label).toBe(colors?.primary)
  expect(colors?.panel).toBe(colors?.primary)
  expect(colors?.shadow).toBe("none")
})

test("uses the runtime on-brand foreground in dark mode", async ({ page }) => {
  await page.addInitScript((key: string) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
  await page.goto("/")

  const colors = await page.evaluate(() => {
    const root = document.documentElement
    const scheme = root.getAttribute("data-color-scheme")
    const button = document.createElement("button")
    const sample = document.createElement("span")
    root.setAttribute("data-color-scheme", "dark")
    button.className = "evidence-primary"
    sample.style.color = "var(--text-on-brand-base)"
    document.body.append(button, sample)
    const result = [getComputedStyle(button).color, getComputedStyle(sample).color]
    button.remove()
    sample.remove()
    if (scheme === null) root.removeAttribute("data-color-scheme")
    if (scheme !== null) root.setAttribute("data-color-scheme", scheme)
    return result
  })

  expect(colors[0]).toBe(colors[1])
})

test("uses the supported UI sans stack for Evidence Desk surfaces", async ({ page }) => {
  await page.addInitScript((key: string) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
  await page.goto("/")

  const font = await page.evaluate(() => {
    const sample = document.createElement("div")
    sample.className = "evidence-root"
    document.body.append(sample)
    const result = getComputedStyle(sample).fontFamily
    sample.remove()
    return result
  })

  expect(font).toContain("ui-sans-serif")
})
