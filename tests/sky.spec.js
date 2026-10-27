import { test, expect } from "@playwright/test";

async function openSky(page) {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
}
async function state(page) {
  return page.locator("canvas").evaluate((canvas) => ({
    balloons: JSON.parse(canvas.dataset.balloonStates),
    clouds: JSON.parse(canvas.dataset.cloudStates),
    targets: JSON.parse(canvas.dataset.targets),
    time: Number(canvas.dataset.time),
  }));
}
async function clickTarget(page, type, tap = false) {
  const target = (await state(page)).targets.find((t) => t.type === type);
  expect(target).toBeTruthy();
  if (tap) await page.touchscreen.tap(target.x, target.y);
  else await page.mouse.click(target.x, target.y);
  return target;
}

test("draws a local, text-free ASCII sky and clouds drift slower than balloons", async ({
  page,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:3000/") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
  });
  await page.addInitScript(() => {
    window.glyphCount = 0;
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      window.glyphCount++;
      return draw.apply(this, args);
    };
  });
  await openSky(page);
  expect(await page.locator("body").innerText()).toBe("");
  await expect(page.locator("button, a")).toHaveCount(0);
  expect(
    await page.evaluate(() => document.fonts.check('600 16px "Geist Mono"')),
  ).toBe(true);
  expect(await page.evaluate(() => window.glyphCount)).toBeGreaterThan(100);
  const before = await state(page),
    image = await page.locator("canvas").screenshot();
  expect(before.balloons).toHaveLength(4);
  expect(before.clouds).toHaveLength(6);
  await expect
    .poll(async () => (await state(page)).time - before.time)
    .toBeGreaterThan(1);
  const after = await state(page),
    dt = after.time - before.time;
  const balloonDrifts = after.balloons.map(
    (b, i) => (b.x - before.balloons[i].x) / dt,
  );
  const cloudDrifts = after.clouds.map(
    (c, i) => (c.x - before.clouds[i].x) / dt,
  );
  expect(Math.max(...cloudDrifts)).toBeLessThan(Math.min(...balloonDrifts));
  expect(Math.min(...cloudDrifts)).toBeGreaterThan(0);
  expect(Math.max(...balloonDrifts)).toBeLessThan(10);
  expect(await page.locator("canvas").screenshot()).not.toEqual(image);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("clicking a balloon visibly lifts it and repeated clicks add lift", async ({
  page,
}) => {
  await openSky(page);
  const before = await state(page),
    image = await page.locator("canvas").screenshot();
  const target = await clickTarget(page, "balloon");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-last-action",
    `balloon:${target.id}`,
  );
  await expect
    .poll(
      async () =>
        (await state(page)).balloons.find((b) => b.id === target.id).y,
    )
    .toBeLessThan(before.balloons.find((b) => b.id === target.id).y - 15);
  const lifted = (await state(page)).balloons.find((b) => b.id === target.id);
  expect(lifted.lifts).toBe(1);
  expect(lifted.liftVelocity).toBeLessThan(0);
  expect(await page.locator("canvas").screenshot()).not.toEqual(image);
  await clickTarget(page, "balloon");
  expect(
    (await state(page)).balloons.find((b) => b.id === target.id).lifts,
  ).toBe(2);
});

test("a clicked cloud separates into fading puffs and eventually reforms off-screen", async ({
  page,
}) => {
  await openSky(page);
  const before = await state(page),
    image = await page.locator("canvas").screenshot();
  const target = await clickTarget(page, "cloud");
  const original = before.clouds.find((c) => c.id === target.id);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-last-action",
    `cloud:${target.id}`,
  );
  await expect
    .poll(
      async () =>
        (await state(page)).clouds.find((c) => c.id === target.id).spread,
    )
    .toBeGreaterThan(original.spread + 8);
  const split = (await state(page)).clouds.find((c) => c.id === target.id);
  expect(split.dispersing).toBe(true);
  expect(split.splits).toBe(1);
  await expect
    .poll(
      async () =>
        (await state(page)).clouds.find((c) => c.id === target.id).opacity,
    )
    .toBeLessThan(original.opacity - 0.1);
  expect(await page.locator("canvas").screenshot()).not.toEqual(image);
  await expect
    .poll(
      async () =>
        (await state(page)).clouds.find((c) => c.id === target.id).dispersing,
      { timeout: 10000 },
    )
    .toBe(false);
  expect(
    (await state(page)).clouds.find((c) => c.id === target.id).x,
  ).toBeLessThan(0);
});

test("empty sky clicks do nothing; pause freezes pixels and keyboard can lift a selected balloon", async ({
  page,
}) => {
  await openSky(page);
  await page.mouse.click(1, 1);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-last-action",
    "none",
  );
  await page.keyboard.press("Space");
  await expect(page.locator("canvas")).toHaveAttribute("data-paused", "true");
  const image = await page.locator("canvas").screenshot(),
    before = await state(page);
  await page.waitForTimeout(200);
  expect(await page.locator("canvas").screenshot()).toEqual(image);
  expect((await state(page)).time).toBe(before.time);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  expect((await state(page)).balloons[0].lifts).toBe(1);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await state(page)).time)
    .toBeGreaterThan(before.time + 0.1);
});

test("reduced motion starts still and preferences can resume animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSky(page);
  await expect(page.locator("canvas")).toHaveAttribute("data-paused", "true");
  const image = await page.locator("canvas").screenshot();
  await page.waitForTimeout(150);
  expect(await page.locator("canvas").screenshot()).toEqual(image);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(0.1);
});

test("touch targets work on mobile and the sky follows viewport resizing", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await openSky(page);
  await clickTarget(page, "balloon", true);
  expect((await state(page)).balloons[0].lifts).toBe(1);
  const cloud = await clickTarget(page, "cloud", true);
  expect(
    (await state(page)).clouds.find((c) => c.id === cloud.id).dispersing,
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-world-width",
    "844",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-world-height",
    "390",
  );
  await context.close();
});
