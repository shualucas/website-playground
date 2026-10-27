import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  return canvas;
}
test("painterly grass fills the screen without text or controls and ambient motion changes the actual image", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const canvas = await ready(page);
  expect(await page.locator("body").innerText()).toBe("");
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.locator("main > *")).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-view", "top-down");
  await expect(canvas).toHaveAttribute("data-rendering", "painterly-webgl");
  const initial = await canvas.evaluate((c) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(initial);
  expect(errors).toEqual([]);
});
test("cursor pressure changes the rendered field and its wake settles after leaving", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const canvas = await ready(page);
  await page.keyboard.press("Space");
  const still = await canvas.evaluate((c) => c.toDataURL());
  await page.mouse.move(800, 450);
  expect(await canvas.evaluate((c) => c.toDataURL())).not.toBe(still);
  await page.keyboard.press("Space");
  await page.mouse.move(900, 480, { steps: 8 });
  await expect(canvas).toHaveAttribute("data-interacting", "true");
  const bent = Number(await canvas.getAttribute("data-deflection"));
  expect(bent).toBeGreaterThan(100);
  await page.mouse.move(-10, -10);
  await expect(canvas).toHaveAttribute("data-interacting", "false");
  await expect
    .poll(() => canvas.getAttribute("data-deflection").then(Number), {
      timeout: 6000,
    })
    .toBeLessThan(bent * 0.15);
});
test("Space freezes and resumes the wind, grain and glints", async ({
  page,
}) => {
  const canvas = await ready(page);
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-paused", "true");
  const still = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(180);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(still);
  await page.keyboard.press("Space");
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(still);
});
test("reduced motion starts still and permits explicit resume", async ({
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
test("without WebGL the grainy local fallback still animates and reacts", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const canvas = await ready(page);
  await expect(canvas).toHaveAttribute("data-rendering", "painterly-fallback");
  const first = await canvas.evaluate((c) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(first);
  await page.mouse.move(700, 400);
  await expect(canvas).toHaveAttribute("data-interacting", "true");
  expect(errors).toEqual([]);
});
test.describe("touch", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("touch, edge coverage and resizing work with no overlays", async ({
    page,
  }) => {
    const canvas = await ready(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    expect(await canvas.boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: 390,
      height: 844,
    });
    await page.touchscreen.tap(200, 430);
    await expect
      .poll(() => canvas.getAttribute("data-deflection").then(Number))
      .toBeGreaterThan(0);
    expect(await page.locator("body").innerText()).toBe("");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(canvas).toHaveAttribute("data-ready", "true");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(844);
  });
});
