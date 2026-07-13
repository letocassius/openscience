import { test, expect } from "./fixtures"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("openscience.setup.dismissed", "1"))
})

test("workspace exposes the Document Reviewer design tokens", async ({ page }) => {
  await page.goto("/")
  const values = await page.locator("html").evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      primary: style.getPropertyValue("--evidence-primary").trim().toLowerCase(),
      canvas: style.getPropertyValue("--color-bg").trim().toLowerCase(),
      panel: style.getPropertyValue("--color-surface-solid").trim().toLowerCase(),
      controlRadius: style.getPropertyValue("--radius").trim(),
      panelRadius: style.getPropertyValue("--radius-lg").trim(),
      font: style.getPropertyValue("--font-family-sans"),
    }
  })
  expect(values).toMatchObject({
    primary: "#21965f",
    canvas: "#fafafa",
    panel: "#ffffff",
    controlRadius: "8px",
    panelRadius: "16px",
  })
  expect(values.font).toContain("Roboto")
})
