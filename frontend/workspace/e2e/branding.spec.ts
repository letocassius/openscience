import { test, expect } from "./fixtures"

test("renders the PandaScience product identity", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle("PandaScience")
  await expect(page.getByRole("button", { name: "PandaScience" }).first()).toBeVisible()
})
