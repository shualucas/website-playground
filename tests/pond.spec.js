import { test, expect } from "@playwright/test";
async function ready(page, url = "/") {
  await page.goto(url);
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  return canvas;
}
test("tadpoles and lily pads draw using real ASCII glyphs and the locally served reference font", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__glyphs = 0;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (/[:;t%SX8#@]/.test(String(text))) window.__glyphs++;
      return original.call(this, text, ...args);
    };
  });
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://127.0.0.1:3000")
    )
      external.push(r.url());
  });
  const canvas = await ready(page);
  await expect(canvas).toHaveAttribute("data-rendering", "ascii-pond");
  expect(Number(await canvas.getAttribute("data-tadpoles"))).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-lilypads", "6");
  expect(
    (await canvas.getAttribute("data-kinds"))
      .split(",")
      .every((kind) => kind === "tadpole"),
  ).toBe(true);
  expect(await page.evaluate(() => window.__glyphs)).toBeGreaterThan(100);
  expect(
    await page.evaluate(() => document.fonts.check('600 16px "Geist Mono"')),
  ).toBe(true);
  expect(await page.locator("body").innerText()).toBe("");
  await expect(page.getByRole("button")).toHaveCount(0);
  const first = await canvas.evaluate((c) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(first);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("pointer and splash interactions reach the pond simulation", async ({
  page,
}) => {
  const canvas = await ready(page);
  await page.mouse.move(650, 420);
  await expect(canvas).toHaveAttribute("data-pointer", "true");
  const first = await canvas.evaluate((c) => c.toDataURL());
  await page.mouse.click(650, 420);
  await expect(canvas).toHaveAttribute("data-splashes", "1");
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(first);
  await page.mouse.move(-10, -10);
  await expect(canvas).toHaveAttribute("data-pointer", "false");
});
test("Space freezes the actual pond frame and resumes it", async ({ page }) => {
  const canvas = await ready(page);
  await canvas.focus();
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
test("reduced motion holds a populated still pond until resumed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const canvas = await ready(page);
  await expect(canvas).toHaveAttribute("data-paused", "true");
  await expect(canvas).toHaveAttribute("data-lilypads", "6");
  const still = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(180);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(still);
  await page.keyboard.press("Space");
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(still);
});
test("old species query parameters cannot introduce sharks", async ({
  page,
}) => {
  const canvas = await ready(page, "/?sharks=hammerhead,mako");
  expect(
    (await canvas.getAttribute("data-kinds"))
      .split(",")
      .every((kind) => kind === "tadpole"),
  ).toBe(true);
  expect(await page.locator("body").innerText()).toBe("");
});
test.describe("touch", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("tap splashes, layout fits and resize keeps the pond in sync", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const canvas = await ready(page);
    expect(await canvas.boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: 390,
      height: 844,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.touchscreen.tap(200, 390);
    await expect(canvas).toHaveAttribute("data-splashes", "1");
    await expect(canvas).toHaveAttribute("data-pointer", "false");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(canvas).toHaveAttribute("data-world-width", "844");
    await expect(canvas).toHaveAttribute("data-world-height", "390");
    await expect(canvas).toHaveAttribute("data-lilypads", "6");
    expect(errors).toEqual([]);
  });
});
