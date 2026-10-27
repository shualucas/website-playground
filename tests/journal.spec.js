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

test("the RISO zine has thin stock, shared printed pages, and an explicit reading link", async ({
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
  expect((await state(page)).format).toBe("riso-zine");
  expect(Number((await state(page)).bindingThickness)).toBeLessThan(0.12);
  expect((await state(page)).pageCount).toBe("16");
  expect(await page.evaluate(() => window.glyphs)).toBeGreaterThan(1000);
  expect(await page.locator(".book-printing .page-recto").innerText()).toBe("");
  await expect(page.locator(".book-printing .page-verso h1")).toHaveText(
    "Your first great adventure.",
  );
  await expect(page.locator(".site-header,.site-footer")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Zine pages" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Read the case study" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("dragging either leaf rotates a fixed center without moving or turning the zine", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const before = await state(page);
  for (const side of ["right", "left"]) {
    const point = await grabPoint(page, side);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 65, point.y - 35, { steps: 8 });
    await expect(stage(page)).toHaveAttribute("data-phase", "rotating");
    const held = await state(page);
    expect(held.rotation).not.toBe(before.rotation);
    expect(held.anchorPosition).toBe(before.anchorPosition);
    expect(held.bookPosition).toBe(before.bookPosition);
    expect(held.camera).toBe(before.camera);
    await page.mouse.up();
    await ready(page);
    await expect(stage(page)).toHaveAttribute("data-project", "0");
  }
  const rotated = (await state(page)).rotation;
  await page.getByRole("button", { name: "Next project" }).click();
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  expect((await state(page)).rotation).toBe(rotated);
  await page.keyboard.press("r");
  await ready(page);
  expect(JSON.parse((await state(page)).rotation)).toEqual([0, 0]);
  expect((await state(page)).project).toBe("0");
});

test("page hover glows and page clicks navigate, while dragging a control suppresses its click", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  let point = JSON.parse((await state(page)).rightHit);
  await page.mouse.move(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-hovered-page", "right");
  expect(Number((await state(page)).rightGlow)).toBeGreaterThan(0.15);
  await page.mouse.click(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  point = JSON.parse((await state(page)).leftHit);
  await page.mouse.move(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-hovered-page", "left");
  expect(Number((await state(page)).leftGlow)).toBeGreaterThan(0.15);
  await page.mouse.click(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  const button = page.getByRole("button", { name: "Next project" }),
    box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 65,
    box.y + box.height / 2 - 35,
    { steps: 8 },
  );
  await expect(stage(page)).toHaveAttribute("data-phase", "rotating");
  await page.mouse.up();
  await ready(page);
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  await page.mouse.move(4, 4);
  await expect(stage(page)).toHaveAttribute("data-hovered-page", "none");
  expect(Number((await state(page)).rightGlow)).toBe(0);
  expect(Number((await state(page)).leftGlow)).toBe(0);
  await page.getByRole("button", { name: "Turn to previous spread" }).focus();
  await expect(stage(page)).toHaveAttribute("data-hovered-page", "left");
  await page.keyboard.press("Enter");
  await expect(stage(page)).toHaveAttribute("data-view", "cover");
  point = JSON.parse((await state(page)).coverHit);
  await page.mouse.click(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-view", "spread");
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

test("the lightweight zine opening stays in frame and R resets its first spread", async ({
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
  await expect(stage(page)).toHaveAttribute("data-phase", "arriving");
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 45000,
  });
  const samples = await page.evaluate(() => window.opening);
  expect(samples.some((s) => s.phase === "flipping")).toBe(true);
  expect(samples.every((s) => s.camera === camera && s.zoom === "1")).toBe(
    true,
  );
  for (const sample of samples)
    for (const coordinate of Object.values(JSON.parse(sample.bookBounds)))
      expect(Math.abs(coordinate)).toBeLessThan(0.98);
  const final = await state(page);
  expect(Number(final.riffleCount)).toBe(8);
  expect(Number(final.duration)).toBe(3.4);
  expect(final.project).toBe("0");
  expect(JSON.parse(final.bookPosition)).toEqual([0, 0, 0]);
});

test("the two-ink ASCII print animates and respects reduced motion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const hit = page.getByRole("button", { name: "Turn to next spread" }),
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

test("touch rotates in place and tapping a leaf turns pages on mobile", async ({
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
  const before = await state(page);
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
  await expect(stage(page)).toHaveAttribute("data-phase", "rotating");
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await ready(page);
  expect((await state(page)).project).toBe("0");
  expect((await state(page)).anchorPosition).toBe(before.anchorPosition);
  expect((await state(page)).bookPosition).toBe(before.bookPosition);
  expect((await state(page)).rotation).not.toBe(before.rotation);
  await page.getByRole("button", { name: "Turn to next spread" }).tap();
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Read the case study" }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await context.close();
});

test("the HTML fallback retains print artwork, leaf clicks, and reading access", async ({
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
  await page.getByRole("button", { name: "Turn to next spread" }).click();
  await expect(page.locator(".fallback-book .page-verso h1")).toHaveText(
    "Finding the way forward.",
  );
});

test("reference-style page pills open both covers and queue project jumps", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const nav = page.getByRole("navigation", { name: "Zine pages" });
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
