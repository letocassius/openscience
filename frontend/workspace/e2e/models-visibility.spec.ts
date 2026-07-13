import { test, expect } from "./fixtures"
import { modKey } from "./utils"

test("model picker and local model settings remain available without a provider", async ({ page, gotoSession }) => {
  await gotoSession()

  await page.getByRole("button", { name: "select model" }).click()

  const picker = page.getByRole("dialog")
  await expect(picker).toBeVisible()
  await expect(picker.getByText("No results", { exact: true })).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(picker).toHaveCount(0)

  const settings = page.getByRole("dialog")

  await page.keyboard.press(`${modKey}+Comma`).catch(() => undefined)
  const opened = await settings
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false)

  if (!opened) {
    await page.getByRole("button", { name: "Settings" }).first().click()
    await expect(settings).toBeVisible()
  }

  await settings.getByRole("button", { name: "Local models", exact: true }).click()
  await expect(settings.locator("header").getByText("Local models", { exact: true })).toBeVisible()
  await expect(settings.getByRole("heading", { name: "Custom endpoint", exact: true })).toBeVisible()
  await expect(settings.getByRole("heading", { name: "Configured", exact: true })).toBeVisible()

  await page.keyboard.press("Escape")
  const closed = await settings
    .waitFor({ state: "detached", timeout: 1500 })
    .then(() => true)
    .catch(() => false)
  if (!closed) {
    await page.keyboard.press("Escape")
    const closedSecond = await settings
      .waitFor({ state: "detached", timeout: 1500 })
      .then(() => true)
      .catch(() => false)
    if (!closedSecond) {
      await page.locator('[data-component="dialog-overlay"]').click({ position: { x: 5, y: 5 } })
      await expect(settings).toHaveCount(0)
    }
  }
})
