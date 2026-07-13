import { test, expect } from "./fixtures"
import { serverName } from "./utils"

const SETUP_DISMISS_KEY = "openscience.setup.dismissed"

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key: string) => localStorage.setItem(key, "1"), SETUP_DISMISS_KEY)
})

test("home renders the Evidence Desk project registry", async ({ page }) => {
  await page.goto("/")

  await expect(page.locator(".evidence-root")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Research projects" })).toBeVisible()
  await expect(page.getByPlaceholder("Search projects")).toBeVisible()
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible()
  await expect(page.getByText("Insilico Medicine", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: serverName })).toBeVisible()
})

test("server picker dialog opens from home", async ({ page }) => {
  await page.goto("/")

  const trigger = page.getByRole("button", { name: serverName })
  await expect(trigger).toBeVisible()
  await trigger.click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("textbox").first()).toBeVisible()
})

test("mobile empty registry keeps its folder action readable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 805 })
  await page.goto("/")
  await page.getByTitle("grid view").click()

  const count = await page.locator(".evidence-home__card").count()
  for (const _ of Array.from({ length: count })) {
    const card = page.locator(".evidence-home__card").first()
    await card.hover()
    await card.getByTitle("remove from list").click()
  }

  const action = page.getByRole("button", { name: "Choose project folder" })
  await expect(action).toBeVisible()
  const box = await action.boundingBox()
  expect(box?.width).toBeGreaterThan(180)
})
