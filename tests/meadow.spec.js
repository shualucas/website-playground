import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  return canvas;
}
test("ambient wind changes the grass, can pause, and responds to breeze strength", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const canvas = await ready(page);
  expect(Number(await canvas.getAttribute("data-blades"))).toBeGreaterThan(
    5000,
  );
  const initial = await canvas.evaluate((c) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(initial);
  const pause = page.getByRole("button", { name: "Pause meadow animation" });
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  const held = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(200);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(held);
  await page.getByRole("button", { name: "gentle", exact: true }).click();
  const gentle = await canvas.evaluate((c) => c.toDataURL());
  await page.getByRole("button", { name: "gusty", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-breeze", "gusty");
  expect(await canvas.evaluate((c) => c.toDataURL())).not.toBe(gentle);
  await pause.click();
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(gentle);
  expect(errors).toEqual([]);
});
test("moving the cursor bends blades without clicking, then the wake settles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const canvas = await ready(page);
  await page.mouse.move(500, 690);
  await page.mouse.move(900, 700, { steps: 24 });
  await expect(canvas).toHaveAttribute("data-interacting", "true");
  await expect
    .poll(() => canvas.getAttribute("data-deflection").then(Number))
    .toBeGreaterThan(100);
  const bent = Number(await canvas.getAttribute("data-deflection"));
  await page.mouse.move(1380, 43);
  await expect
    .poll(() => canvas.getAttribute("data-deflection").then(Number), {
      timeout: 6000,
    })
    .toBeLessThan(bent * 0.15);
});
test("immersive view and keyboard shortcuts work", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Hide interface" }).click();
  await expect(page.locator("main")).toHaveClass(/immersive/);
  await page.getByRole("button", { name: "Show interface" }).click();
  await expect(page.locator("main")).not.toHaveClass(/immersive/);
  await page.mouse.click(400, 100);
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause meadow animation" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("h");
  await expect(page.locator("main")).toHaveClass(/immersive/);
  await page.keyboard.press("h");
  await expect(page.locator("main")).not.toHaveClass(/immersive/);
});
test("reduced motion starts still and can be explicitly resumed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await ready(page);
  const pause = page.getByRole("button", { name: "Pause meadow animation" });
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  const held = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(160);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(held);
  await pause.click();
  await expect.poll(() => canvas.evaluate((c) => c.toDataURL())).not.toBe(held);
});
test.describe("touch devices", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("touch bends the field, controls fit and resizing preserves the simulation", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const canvas = await ready(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.touchscreen.tap(210, 620);
    await expect
      .poll(() => canvas.getAttribute("data-interactions").then(Number))
      .toBeGreaterThan(0);
    await expect(
      page.getByRole("button", { name: "Pause meadow animation" }),
    ).toBeInViewport();
    await page.getByRole("button", { name: "gentle", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-breeze", "gentle");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(canvas).toHaveAttribute("data-ready", "true");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(844);
    expect(errors).toEqual([]);
  });
});
