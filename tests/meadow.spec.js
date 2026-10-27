import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  return canvas;
}
test("the entire viewport is a text-free top-down ASCII field with ambient wind", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__glyphs = { count: 0, nonASCII: false };
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.__glyphs.count++;
      if (/[^\x00-\x7f]/.test(String(text))) window.__glyphs.nonASCII = true;
      return original.call(this, text, ...args);
    };
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const canvas = await ready(page);
  expect(await page.locator("body").innerText()).toBe("");
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.locator("main > *")).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-view", "top-down");
  const glyphs = await page.evaluate(() => window.__glyphs);
  expect(glyphs.count).toBeGreaterThan(100);
  expect(glyphs.nonASCII).toBe(false);
  const first = await canvas.evaluate((c) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(first);
  expect(errors).toEqual([]);
});
test("cursor movement parts the grass without a click and the wake recovers after leaving", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const canvas = await ready(page);
  await page.mouse.move(500, 430);
  await page.mouse.move(900, 480, { steps: 24 });
  await expect(canvas).toHaveAttribute("data-interacting", "true");
  await expect
    .poll(() => canvas.getAttribute("data-deflection").then(Number))
    .toBeGreaterThan(100);
  const bent = Number(await canvas.getAttribute("data-deflection"));
  await page.mouse.move(-10, -10);
  await expect(canvas).toHaveAttribute("data-interacting", "false");
  await expect
    .poll(() => canvas.getAttribute("data-deflection").then(Number), {
      timeout: 6000,
    })
    .toBeLessThan(bent * 0.15);
});
test("Space pauses and resumes with no visible interface", async ({ page }) => {
  const canvas = await ready(page);
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-paused", "true");
  const still = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(200);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(still);
  await page.keyboard.press("Space");
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(still);
  expect(await page.locator("body").innerText()).toBe("");
});
test("reduced motion starts still and permits deliberate resume", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await ready(page);
  await expect(canvas).toHaveAttribute("data-paused", "true");
  const still = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(150);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(still);
  await page.keyboard.press("Space");
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(still);
});
test.describe("touch", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("touch pressure, edge coverage, and resize work without overlays", async ({
    page,
  }) => {
    const canvas = await ready(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    const rect = await canvas.boundingBox();
    expect(rect).toEqual({ x: 0, y: 0, width: 390, height: 844 });
    await page.touchscreen.tap(200, 430);
    await expect
      .poll(() => canvas.getAttribute("data-deflection").then(Number))
      .toBeGreaterThan(0);
    await expect
      .poll(() => canvas.getAttribute("data-interactions").then(Number))
      .toBeGreaterThan(0);
    expect(await page.locator("body").innerText()).toBe("");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(canvas).toHaveAttribute("data-ready", "true");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(844);
  });
});
