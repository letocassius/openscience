import { test, expect } from "./fixtures"
import { dirPath, promptSelector } from "./utils"

test("project route redirects to /session", async ({ page, directory, slug }) => {
  await page.goto(dirPath(directory))

  await expect(page).toHaveURL(new RegExp(`/${slug}/session`))
  await expect(page.locator(promptSelector)).toBeVisible()
})

test("right pane resize handle stays inside the clipped pane", async ({ page, gotoSession }) => {
  await page.addInitScript(() => {
    localStorage.setItem("openscience.setup.dismissed", "1")
    localStorage.setItem("thesis-rightpane-open-v1", "1")
  })
  await gotoSession()

  const handle = page.locator('.evidence-side > [role="separator"][aria-orientation="vertical"]')
  await expect(handle).toBeVisible()
  const bounds = await handle.evaluate((element) => {
    const pane = element.parentElement!
    const handleRect = element.getBoundingClientRect()
    const paneRect = pane.getBoundingClientRect()
    return {
      left: handleRect.left - paneRect.left,
      right: paneRect.right - handleRect.right,
      width: handleRect.width,
    }
  })
  expect(bounds.width).toBe(6)
  expect(bounds.left).toBeGreaterThanOrEqual(0)
  expect(bounds.right).toBeGreaterThanOrEqual(0)
})
