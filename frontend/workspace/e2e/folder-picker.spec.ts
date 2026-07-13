import { test, expect } from "./fixtures"

const SETUP_DISMISS_KEY = "openscience.setup.dismissed"

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
})

test("folder rows navigate without adding a workspace", async ({ page, directory }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New project" }).click()

  const picker = page.locator('[data-component="dialog"]')
  await expect(picker).toBeVisible()
  await picker.getByPlaceholder(/paste any absolute path/).fill(directory)
  await picker.getByRole("button", { name: "go", exact: true }).click()

  const row = picker.getByRole("button", { name: /^frontend(?: open)?$/ })
  await expect(row).toHaveCount(1)
  await expect(row).toBeVisible()
  await row.dispatchEvent("dblclick")
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")

  await row.click()
  await expect(picker.getByTitle(`${directory}/frontend`, { exact: true })).toBeVisible()
  await expect(page).toHaveURL("/")
})

test("open this folder is the only submission action", async ({ page, directory }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New project" }).click()

  const picker = page.locator('[data-component="dialog"]')
  await picker.getByPlaceholder(/paste any absolute path/).fill(directory)
  await picker.getByRole("button", { name: "go", exact: true }).click()
  await picker.getByRole("button", { name: "open this folder", exact: true }).click()

  await expect(picker).toHaveCount(0)
  await expect(page).not.toHaveURL("/")
})
