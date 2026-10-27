import { test, expect } from "@playwright/test";
const stage = (page) => page.locator(".book-stage");
async function state(page) {
  return stage(page).evaluate((el) => ({ ...el.dataset }));
}
async function openBook(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 25000,
  });
}
async function points(page) {
  const data = await state(page);
  return { right: JSON.parse(data.rightGrab), left: JSON.parse(data.leftGrab) };
}
async function waitReady(page) {
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 15000,
  });
}

test("only the spellbook remains, with a working portal and case-study reading view", async ({
  page,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:3000/") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await openBook(page);
  await expect(
    page.locator(
      "header.site-header, footer, .edition-label, .book-navigation, .mobile-reading",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Your first great adventure.",
  );
  const data = await state(page);
  expect(Number(data.bindingThickness)).toBeGreaterThan(1);
  expect(Number(data.pageCount)).toBeGreaterThan(200);
  await page.getByRole("button", { name: "Enter the project portal" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The exploration" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("the held page follows a real drag, bends, completes right-to-left, and can turn back", async ({
  page,
}) => {
  test.setTimeout(60000);
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const before = await state(page),
    { right, left } = await points(page);
  await page.mouse.move(right.x, right.y);
  await page.mouse.down();
  await page.mouse.move((right.x + left.x) / 2, right.y - 45, { steps: 10 });
  await expect(stage(page)).toHaveAttribute("data-phase", "dragging");
  await expect
    .poll(async () => Number((await state(page)).turnProgress))
    .toBeGreaterThan(0.3);
  const held = await state(page);
  expect(Number(held.turnProgress)).toBeLessThan(0.7);
  expect(held.project).toBe("0");
  expect(Number(held.freeEdgeY)).toBeGreaterThan(2);
  expect(Number(held.freeEdgeX)).toBeLessThan(2);
  expect(held.dragging).toBe("true");
  expect(held.zoom).toBe("1");
  expect(held.camera).toBe(before.camera);
  await page.mouse.move(left.x, left.y, { steps: 10 });
  await page.mouse.up();
  await waitReady(page);
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Finding the way forward.",
  );
  await expect(page).toHaveURL(/project=second-project/);
  expect((await state(page)).camera).toBe(before.camera);
  const fresh = await points(page);
  await page.mouse.move(fresh.left.x, fresh.left.y);
  await page.mouse.down();
  await page.mouse.move(fresh.right.x, fresh.right.y, { steps: 16 });
  await page.mouse.up();
  await waitReady(page);
  await expect(stage(page)).toHaveAttribute("data-project", "0");
});

test("a short drag falls back without changing chapter, and page-corner navigation keeps the camera fixed", async ({
  page,
}) => {
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const before = await state(page),
    { right } = await points(page);
  await page.mouse.move(right.x, right.y);
  await page.mouse.down();
  await page.mouse.move(right.x - 65, right.y - 20, { steps: 8 });
  await page.waitForTimeout(180);
  await page.mouse.up();
  await waitReady(page);
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  await page.getByRole("button", { name: "Next project" }).click();
  await waitReady(page);
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  const after = await state(page);
  expect(after.zoom).toBe("1");
  expect(after.camera).toBe(before.camera);
});

test("R restarts a weighty opening with forward riffles and no camera zoom", async ({
  page,
}) => {
  test.setTimeout(60000);
  await openBook(page, "/?project=second-project");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    window.opening = [];
    new MutationObserver(() => {
      const el = document.querySelector(".book-stage");
      if (el) window.opening.push({ ...el.dataset });
    }).observe(document.querySelector(".book-stage"), {
      attributes: true,
      attributeFilter: ["data-phase", "data-rig-y", "data-intro-leaves"],
    });
  });
  const camera = (await state(page)).camera;
  await page.keyboard.press("r");
  await expect(stage(page)).toHaveAttribute("data-phase", "dropping");
  await waitReady(page);
  const samples = await page.evaluate(() => window.opening);
  expect(samples.some((s) => Number(s.rigY) > 2)).toBe(true);
  const phases = samples.map((s) => s.phase);
  for (const phase of ["dropping", "opening", "flipping", "settling", "ready"])
    expect(phases).toContain(phase);
  const groups = new Map();
  for (const sample of samples)
    for (const leaf of JSON.parse(sample.introLeaves || "[]")) {
      const values = groups.get(leaf.id) || [];
      values.push(leaf.x);
      groups.set(leaf.id, values);
    }
  expect(
    [...groups.values()].some(
      (values) => values.length > 1 && values[0] > values.at(-1) + 0.15,
    ),
  ).toBe(true);
  expect(samples.every((s) => s.zoom === "1" && s.camera === camera)).toBe(
    true,
  );
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  await page.keyboard.press("ArrowRight");
  await waitReady(page);
  await expect(stage(page)).toHaveAttribute("data-project", "1");
});

test("the portal visibly swirls and reduced motion freezes it", async ({
  page,
}) => {
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const hit = page.getByRole("button", { name: "Enter the project portal" }),
    before = await hit.screenshot();
  const time = Number((await state(page)).portalTime);
  await expect
    .poll(async () => Number((await state(page)).portalTime))
    .toBeGreaterThan(time + 0.2);
  expect(await hit.screenshot()).not.toEqual(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitReady(page);
  const frozen = await hit.screenshot();
  await page.waitForTimeout(200);
  expect(await hit.screenshot()).toEqual(frozen);
});

test("touch dragging turns the page on a phone without extra UI or horizontal overflow", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  await waitReady(page);
  const { right, left } = await points(page);
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: right.x, y: right.y }],
  });
  for (let i = 1; i <= 12; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: right.x + ((left.x - right.x) * i) / 12, y: right.y }],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  await page.getByRole("button", { name: "Next project" }).tap();
  await expect(stage(page)).toHaveAttribute("data-project", "2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Enter the project portal" }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close reading view" }).tap();
  await context.close();
});

test("without WebGL, a book-only reading layout retains navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl") ? null : get.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".fallback-book")).toBeVisible();
  await page.getByRole("button", { name: "Next project" }).click();
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Finding the way forward.",
  );
  await page.keyboard.press("r");
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Your first great adventure.",
  );
});
