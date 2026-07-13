import { test, expect } from "./fixtures"

const SETUP_DISMISS_KEY = "openscience.setup.dismissed"

test("renders the PandaScience product identity", async ({ page }) => {
  await page.addInitScript((key: string) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
  await page.goto("/")

  await expect(page).toHaveTitle("PandaScience")
  await expect(page.getByRole("button", { name: "PandaScience" }).first()).toBeVisible()

  const canvas = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--evidence-canvas").trim(),
  )
  expect(canvas).toBe("#fafafa")
  const header = page.locator(".evidence-header")
  await expect(header).toHaveCSS("min-height", "56px")
})
