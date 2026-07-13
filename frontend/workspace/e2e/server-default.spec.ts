import { test, expect } from "./fixtures"
import { serverName, serverUrl } from "./utils"

const DEFAULT_SERVER_URL_KEY = "openscience.settings.dat:defaultServerUrl"

test("can set a default server on web", async ({ page, gotoSession }) => {
  await page.addInitScript((key: string) => {
    try {
      localStorage.removeItem(key)
    } catch {
      return
    }
  }, DEFAULT_SERVER_URL_KEY)

  await gotoSession()
  await page.goto("/")
  await page.getByRole("button", { name: serverName }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  const row = dialog.locator('[data-slot="list-item"]').filter({ hasText: serverName }).first()
  await expect(row).toBeVisible()

  const menu = row.locator('[data-component="icon-button"]').last()
  await menu.click()
  await page
    .locator('[role="menuitem"]')
    .filter({ hasText: /set as default/i })
    .click()

  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), DEFAULT_SERVER_URL_KEY)).toBe(serverUrl)
  await expect(row.getByText(/^default$/i)).toBeVisible()

  await page.keyboard.press("Escape")
  const closed = await dialog
    .waitFor({ state: "detached", timeout: 1500 })
    .then(() => true)
    .catch(() => false)

  if (!closed) {
    await page.keyboard.press("Escape")
    const closedSecond = await dialog
      .waitFor({ state: "detached", timeout: 1500 })
      .then(() => true)
      .catch(() => false)

    if (!closedSecond) {
      await page.locator('[data-component="dialog-overlay"]').click({ position: { x: 5, y: 5 } })
      await expect(dialog).toHaveCount(0)
    }
  }

  await page.getByRole("button", { name: serverName }).click()
  const reopened = page.getByRole("dialog")
  await expect(
    reopened
      .locator('[data-slot="list-item"]')
      .filter({ hasText: serverName })
      .getByText(/^default$/i),
  ).toBeVisible()
})
