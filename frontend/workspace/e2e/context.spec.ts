import { test, expect } from "./fixtures"
import { promptSelector } from "./utils"

test("context usage control is available for seeded messages", async ({ page, gotoSession }) => {
  await gotoSession()
  await page.getByRole("button", { name: /E2E Session/ }).click()

  const contextButton = page
    .locator('[data-component="button"]')
    .filter({ has: page.locator('[data-component="progress-circle"]').first() })
    .first()

  await expect(contextButton).toBeVisible()
  await expect(contextButton).toHaveAttribute("aria-label", "view context usage")
})
