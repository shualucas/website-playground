import { test, expect } from "@playwright/test";
const stage = (page) => page.locator(".book-stage");
const state = (page) => stage(page).evaluate((el) => ({ ...el.dataset }));
async function openBook(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 45000,
  });
}
async function ready(page) {
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 20000,
  });
}
async function grabPoint(page, side = "right") {
  return JSON.parse(
    (await state(page))[side === "right" ? "rightGrab" : "leftGrab"],
  );
}

test("the book has one connected spread and only an ASCII portal on the right", async ({
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
  await page.addInitScript(() => {
    window.glyphs = 0;
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (text.length === 1) window.glyphs++;
      return draw.call(this, text, ...args);
    };
  });
  await openBook(page);
  expect(Number((await state(page)).capturedPages)).toBe(3);
  expect(await page.evaluate(() => window.glyphs)).toBeGreaterThan(1000);
  expect(await page.locator(".book-printing .page-recto").innerText()).toBe("");
  await expect(page.locator(".book-printing .page-verso h1")).toHaveText(
    "Your first great adventure.",
  );
  await expect(page.locator(".site-header,.site-footer")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Book pages" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter the project portal" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("dragging either page picks up the entire book and drops it at its new position", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const initial = await state(page),
    first = await grabPoint(page);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(first.x + 65, first.y - 40, { steps: 5 });
  await expect(stage(page)).toHaveAttribute("data-phase", "carrying");
  await expect
    .poll(async () => Number((await state(page)).rigY))
    .toBeGreaterThan(0.5);
  const held = await state(page);
  expect(held.project).toBe("0");
  expect(held.turnProgress).toBe("0.0000");
  expect(held.camera).toBe(initial.camera);
  expect(Math.abs(JSON.parse(held.bookPosition)[0])).toBeGreaterThan(0.1);
  await page.mouse.up();
  await ready(page);
  const dropped = JSON.parse((await state(page)).bookPosition);
  expect(dropped[1]).toBe(0);
  expect(Math.hypot(dropped[0], dropped[2])).toBeGreaterThan(0.1);
  const left = await grabPoint(page, "left");
  await page.mouse.move(left.x, left.y);
  await page.mouse.down();
  await page.mouse.move(left.x - 40, left.y - 25, { steps: 4 });
  await expect(stage(page)).toHaveAttribute("data-phase", "carrying");
  await page.mouse.up();
  await ready(page);
  expect((await state(page)).project).toBe("0");
  const beforeTurn = JSON.parse((await state(page)).bookPosition);
  await page.getByRole("button", { name: "Next project" }).click();
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  expect(JSON.parse((await state(page)).bookPosition)).toEqual(beforeTurn);
});

test("dragging a page control moves the book, while clicking it still turns a page", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const button = page.getByRole("button", { name: "Next project" }),
    box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 45,
    box.y + box.height / 2 - 30,
    { steps: 4 },
  );
  await expect(stage(page)).toHaveAttribute("data-phase", "carrying");
  await page.mouse.up();
  await ready(page);
  expect((await state(page)).project).toBe("0");
  await button.click();
  await expect(stage(page)).toHaveAttribute("data-project", "1");
});

test("turning and resting faces share the exact printed artwork and fixed framing", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const before = await state(page);
  const started = Date.now();
  await page.getByRole("button", { name: "Next project" }).click();
  await expect(stage(page)).toHaveAttribute("data-phase", "turning");
  await page.waitForTimeout(600);
  expect(Number((await state(page)).turnProgress)).toBeLessThan(0.99);
  const targetArtwork = (await state(page)).turnBackArtwork;
  await ready(page);
  const after = await state(page);
  expect(Date.now() - started).toBeGreaterThan(1500);
  expect(after.leftArtwork).toBe(targetArtwork);
  expect(after.rightArtwork).toBe(before.rightArtwork);
  expect(after.camera).toBe(before.camera);
  expect(after.zoom).toBe("1");
  await expect(page.locator(".book-printing .page-verso h1")).toHaveText(
    "Finding the way forward.",
  );
  await page.keyboard.press("ArrowLeft");
  await ready(page);
  expect((await state(page)).project).toBe("0");
});

test("opening slows its blank leaves and R restores the book", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page, "/?project=second-project");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    window.opening = [];
    new MutationObserver(() =>
      window.opening.push({ ...document.querySelector(".book-stage").dataset }),
    ).observe(document.querySelector(".book-stage"), {
      attributes: true,
      attributeFilter: ["data-phase", "data-rig-y", "data-intro-leaves"],
    });
  });
  const camera = (await state(page)).camera;
  await page.keyboard.press("r");
  await expect(stage(page)).toHaveAttribute("data-phase", "dropping");
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 45000,
  });
  const samples = await page.evaluate(() => window.opening);
  expect(samples.some((s) => Number(s.dust) > 0)).toBe(true);
  expect(samples.some((s) => s.phase === "flipping")).toBe(true);
  expect(samples.every((s) => s.camera === camera && s.zoom === "1")).toBe(
    true,
  );
  for (const sample of samples)
    for (const coordinate of Object.values(JSON.parse(sample.bookBounds)))
      expect(Math.abs(coordinate)).toBeLessThan(0.98);
  const final = await state(page);
  expect(Number(final.riffleCount)).toBe(64);
  expect(Number(final.duration)).toBe(7.4);
  expect(final.project).toBe("0");
  expect(JSON.parse(final.bookPosition)).toEqual([0, 0, 0]);
});

test("the ASCII portal animates and respects reduced motion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const hit = page.getByRole("button", { name: "Enter the project portal" }),
    image = await hit.screenshot(),
    time = Number((await state(page)).portalTime);
  await expect
    .poll(async () => Number((await state(page)).portalTime))
    .toBeGreaterThan(time + 0.3);
  expect(await hit.screenshot()).not.toEqual(image);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const still = await hit.screenshot();
  await page.waitForTimeout(160);
  expect(await hit.screenshot()).toEqual(still);
});

test("touch picks up the book, and navigation remains available on mobile", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true,
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  await page.goto("/");
  await ready(page);
  const point = await grabPoint(page),
    client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  for (let i = 1; i <= 6; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x + (30 * i) / 6, y: point.y - (30 * i) / 6 }],
    });
  await expect(stage(page)).toHaveAttribute("data-phase", "carrying");
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await ready(page);
  expect((await state(page)).project).toBe("0");
  await page.getByRole("button", { name: "Next project" }).tap();
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Enter the project portal" }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await context.close();
});

test("the HTML fallback remains book-only and uses an ASCII portal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".fallback-book")).toBeVisible();
  await expect(page.locator(".fallback-book .ascii-portal")).toBeVisible();
  expect(await page.locator(".fallback-book .page-recto").innerText()).toBe("");
  await page.getByRole("button", { name: "Next project" }).click();
  await expect(page.locator(".fallback-book .page-verso h1")).toHaveText(
    "Finding the way forward.",
  );
});

test("reference-style page pills open both covers and queue project jumps", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const nav = page.getByRole("navigation", { name: "Book pages" });
  const camera = (await state(page)).camera;
  await expect(
    nav.getByRole("button", { name: "Page 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Cover", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "cover");
  await expect(
    nav.getByRole("button", { name: "Cover", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Page 3", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "spread");
  await expect(stage(page)).toHaveAttribute("data-project", "2");
  await nav.getByRole("button", { name: "Back cover", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "back");
  await nav.getByRole("button", { name: "Page 1", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await nav.getByRole("button", { name: "Page 3", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-phase", "turning");
  await nav.getByRole("button", { name: "Page 1", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 45000,
  });
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  expect((await state(page)).camera).toBe(camera);
  await expect(
    nav.getByRole("button", { name: "Page 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
