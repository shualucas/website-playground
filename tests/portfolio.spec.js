import { test, expect } from "@playwright/test";
test("immersive realm animates, pauses, changes theme, and opens case study chapters", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hey, I’m Josh." }),
  ).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const start = await canvas.evaluate((c) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(start);
  const pause = page.getByRole("button", { name: "Pause dragon animation" });
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  const still = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(150);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(still);
  const theme = page.getByRole("button", { name: "Toggle light theme" });
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(still);
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("body").click({ position: { x: 10, y: 10 } });
  await page.keyboard.press("Space");
  await expect(pause).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: "projects", exact: true }).click();
  await page.getByRole("button", { name: /Explore case study 01/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "A clearer path forward." }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: /The discovery/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "What changed your understanding?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: /Next chapter/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "What did you choose, and why?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "realm", exact: true }).click();
  await page.getByRole("button", { name: "about", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Curious by nature. Designer by choice.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close about" }).click();
  const sound = page.getByRole("button", { name: "Toggle ambient sound" });
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});
test("mobile shows full scene, visible navigation, readable intro and functioning projects", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hey, I’m Josh." }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Pause dragon animation" }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "/tmp/dragon-dark-mobile.png" });
  await page.getByRole("link", { name: "projects", exact: true }).click();
  await page.getByRole("button", { name: /Explore case study 03/ }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Built around the player." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close case study" }).click();
});
test("reduced motion starts still and can be resumed explicitly", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause dragon animation" });
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  const canvas = page.locator("canvas"),
    start = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(150);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(start);
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(start);
});
test("desktop scene fills viewport and has a usable light mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page
      .locator(".sky")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBe(900);
  await page.screenshot({ path: "/tmp/dragon-dark-desktop.png" });
  await page.getByRole("button", { name: "Toggle light theme" }).click();
  await page.screenshot({ path: "/tmp/dragon-light-desktop.png" });
});
