import { test, expect } from "./fixtures"

const SETUP_DISMISS_KEY = "openscience.setup.dismissed"
const RECENT_KEY = "thesis-folder-picker-recents-v1"

test.beforeEach(async ({ page, directory }) => {
  await page.addInitScript(
    (input: { setup: string; recent: string; directory: string }) => {
      localStorage.setItem(input.setup, "1")
      localStorage.setItem(input.recent, JSON.stringify([input.directory]))
    },
    { setup: SETUP_DISMISS_KEY, recent: RECENT_KEY, directory },
  )
})

test("folder row interactions navigate without adding a workspace", async ({ page, directory }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New project" }).click()

  const picker = page.locator('[data-component="dialog"]')
  await expect(picker).toBeVisible()
  await picker.getByPlaceholder(/paste any absolute path/).fill(directory)
  await picker.getByRole("button", { name: "go", exact: true }).click()

  const rowTitle = `${directory}/frontend · click to enter`
  let row = picker.getByTitle(rowTitle, { exact: true })
  await expect(picker.getByRole("button", { name: "frontend", exact: true })).toHaveCount(1)
  await expect(row).toHaveCount(1)
  await expect(row).toBeVisible()
  await expect(picker.getByRole("button", { name: "open", exact: true })).toHaveCount(0)
  await expect(picker.getByTitle("open this folder as a project", { exact: true })).toHaveCount(0)

  await row.click()
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")
  await expect(picker.getByTitle(`${directory}/frontend`, { exact: true })).toBeVisible()

  await picker.getByPlaceholder(/paste any absolute path/).fill(directory)
  await picker.getByRole("button", { name: "go", exact: true }).click()
  await expect(picker.getByTitle(directory, { exact: true })).toBeVisible()
  row = picker.getByTitle(rowTitle, { exact: true })
  await row.dblclick()
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")
  await expect(picker.getByTitle(`${directory}/frontend`, { exact: true })).toBeVisible()

  await picker.getByPlaceholder(/paste any absolute path/).fill(directory)
  await picker.getByRole("button", { name: "go", exact: true }).click()
  await expect(picker.getByTitle(directory, { exact: true })).toBeVisible()
  row = picker.getByTitle(rowTitle, { exact: true })
  await expect(row).toBeVisible()
  await row.focus()
  await expect(row).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")
  await expect(picker.getByTitle(`${directory}/frontend`, { exact: true })).toBeVisible()
})

test("favorite row interactions never add a workspace", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New project" }).click()

  const picker = page.locator('[data-component="dialog"]')
  const row = picker.getByRole("button", { name: "Home", exact: true })
  await expect(row).toBeVisible()

  await row.click()
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")

  await row.dblclick()
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")

  await row.press("Enter")
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")
})

test("recent row interactions never add a workspace", async ({ page, directory }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New project" }).click()

  const picker = page.locator('[data-component="dialog"]')
  const row = picker.getByRole("button").filter({ hasText: directory })
  await expect(row).toHaveCount(1)
  await expect(row).toBeVisible()

  await row.click()
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")

  await row.dblclick()
  await expect(picker).toBeVisible()
  await expect(page).toHaveURL("/")

  await row.press("Enter")
  await expect(picker).toBeVisible()
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
