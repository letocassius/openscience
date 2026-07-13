import { test, expect } from "./fixtures"
test("search palette opens and closes", async ({ page, gotoSession }) => {
  await gotoSession()

  await page.getByTitle("command palette").click()

  const palette = page
    .locator(".atlas-modal")
    .filter({ has: page.getByPlaceholder("search projects, sessions, actions…") })
  await expect(palette).toBeVisible()
  await expect(palette.getByRole("textbox")).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(palette).toHaveCount(0)
})
