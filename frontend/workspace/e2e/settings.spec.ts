import { test, expect } from "./fixtures"
import { modKey } from "./utils"

test("smoke settings dialog opens, switches tabs, closes", async ({ page, gotoSession }) => {
  await page.addInitScript(() => localStorage.setItem("openscience.setup.dismissed", "1"))
  await gotoSession()

  const dialog = page.getByRole("dialog")

  await page.keyboard.press(`${modKey}+Comma`).catch(() => undefined)

  const opened = await dialog
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false)

  if (!opened) {
    await page.getByRole("button", { name: "Settings" }).first().click()
    await expect(dialog).toBeVisible()
  }

  await expect(dialog.getByText("PandaScience", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Appearance", { exact: true })).toHaveCount(0)
  await expect(dialog.getByText("Dark", { exact: true })).toHaveCount(0)

  const rail = dialog.locator("nav")
  const railStyle = await rail.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, border: style.borderRightColor }
  })
  expect(railStyle.background).toBe("rgb(245, 245, 245)")
  expect(railStyle.border).toBe("rgb(224, 224, 224)")

  const selected = rail.getByRole("button", { name: "Connectors", exact: true })
  await dialog.getByRole("button", { name: "Close" }).focus()
  for (let index = 0; index < 20; index++) {
    if (await selected.evaluate((element) => element === document.activeElement)) break
    await page.keyboard.press("Tab")
  }
  await expect.poll(() => selected.evaluate((element) => element === document.activeElement)).toBe(true)
  const shellStyle = await dialog.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, radius: style.borderRadius, font: style.fontFamily }
  })
  const selectedStyle = await selected.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      radius: style.borderRadius,
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    }
  })
  expect(shellStyle).toMatchObject({ background: "rgb(255, 255, 255)", radius: "16px" })
  expect(shellStyle.font).toContain("Roboto")
  expect(selectedStyle).toMatchObject({
    background: "rgb(231, 246, 238)",
    radius: "8px",
    outline: "solid",
    outlineWidth: "2px",
  })

  await page.emulateMedia({ reducedMotion: "reduce" })
  await expect
    .poll(() => selected.evaluate((element) => getComputedStyle(element).transitionDuration))
    .toMatch(/^0(?:\.0+)?s$/)

  for (const title of [
    "Connectors",
    "Specialists",
    "Memory",
    "Compute",
    "Local models",
    "Network",
    "Permissions",
    "Sandbox",
    "Credentials",
    "Billing",
    "Storage",
    "General",
  ]) {
    await rail.getByRole("button", { name: title, exact: true }).click()
    await expect(dialog.locator("header").getByText(title, { exact: true })).toBeVisible()
  }

  await expect(dialog.getByText(/^language$/i).first()).toBeVisible()
  await expect(dialog.getByText("Appearance", { exact: true })).toHaveCount(0)
  await expect(dialog.getByText("Dark", { exact: true })).toHaveCount(0)
  const languageHeading = dialog.getByRole("heading", { name: /^language$/i })
  const languageLabel = dialog
    .locator("span")
    .filter({ hasText: /^language$/i })
    .first()
  const languageMetadata = dialog.getByText("change the display language for OpenScience", { exact: true })
  const languageTypography = await Promise.all(
    [languageHeading, languageLabel, languageMetadata].map((element) =>
      element.evaluate((node) => getComputedStyle(node).fontSize),
    ),
  )
  expect(languageTypography).toEqual(["14px", "14px", "12px"])
  const legacyCard = dialog.locator('[class~="rounded-[4px]"]').first()
  const cardStyle = await legacyCard.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, border: style.borderColor, radius: style.borderRadius }
  })
  expect(cardStyle).toEqual({
    background: "rgb(255, 255, 255)",
    border: "rgb(224, 224, 224)",
    radius: "8px",
  })

  await page.keyboard.press("Escape")

  const closed = await dialog
    .waitFor({ state: "detached", timeout: 1500 })
    .then(() => true)
    .catch(() => false)

  if (closed) return

  await page.keyboard.press("Escape")
  const closedSecond = await dialog
    .waitFor({ state: "detached", timeout: 1500 })
    .then(() => true)
    .catch(() => false)

  if (closedSecond) return

  await page.locator('[data-component="dialog-overlay"]').click({ position: { x: 5, y: 5 } })
  await expect(dialog).toHaveCount(0)
})
