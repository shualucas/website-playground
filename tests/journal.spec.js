import { test, expect } from "@playwright/test";
const stage = (page) => page.locator(".book-stage");
const state = (page) => stage(page).evaluate((el) => ({ ...el.dataset }));
async function openBook(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 45000,
  });
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-presentation",
    "ready",
  );
  if (path === "/") {
    await page
      .getByRole("navigation", { name: "Zine pages" })
      .getByRole("button", { name: "About", exact: true })
      .click();
    await expect(stage(page)).toHaveAttribute("data-settled-boundary", "1");
  }
}
async function ready(page) {
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 60000,
  });
}
async function grabPoint(page, side = "right") {
  return JSON.parse(
    (await state(page))[side === "right" ? "rightGrab" : "leftGrab"],
  );
}

test("the portfolio zine has thin stock, shared printed pages, and phone-based case-study entry", async ({
  page,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:3000/") &&
      !r.url().startsWith("data:") &&
      !r.url().startsWith("blob:http://127.0.0.1:3000/")
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
  expect(Number((await state(page)).capturedPages)).toBe(4);
  expect((await state(page)).format).toBe("riso-zine");
  expect(Number((await state(page)).bindingThickness)).toBeLessThan(0.12);
  expect((await state(page)).pageCount).toBe("10");
  expect(await page.evaluate(() => window.glyphs)).toBeGreaterThan(1000);
  expect(await page.locator(".book-printing .page-recto").innerText()).toBe("");
  await expect(page.locator(".book-printing .page-verso h1")).toHaveText(
    "Josh Lucas",
  );
  await expect(page.locator(".book-printing .project-subtitle")).toHaveText(
    "Senior Product Designer at Google",
  );
  await expect(page.locator(".book-printing .project-description")).toHaveText(
    "Passionate about creating beautiful and impactful experiences at scale. Prior to Google, I worked on Heroes of the Storm & Starcraft at Blizzard Entertainment. Currently located in San Francisco, CA.",
  );
  await expect(page.locator(".site-header,.site-footer")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Zine pages" }),
  ).toBeVisible();
  await expect(
    page.locator(
      ".book-printing .page-corner,.book-printing .read-project,.book-printing .page-instruction",
    ),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Zine pages" })
    .getByRole("button", { name: "Stadia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Stadia preview" })
    .click({ force: true });
  await expect(
    page.getByRole("region", { name: "Stadia case study" }),
  ).toBeVisible();
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
    expect(held.modelScale).toBe(before.modelScale);
    expect(held.rotationFit).toBe("1");
    await page.mouse.up();
    await ready(page);
    await expect(stage(page)).toHaveAttribute("data-project", "0");
  }
  const rotated = (await state(page)).rotation;
  await page
    .getByRole("navigation", { name: "Zine pages" })
    .getByRole("button", { name: "Stadia", exact: true })
    .click();
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
  expect(Number((await state(page)).rightGlow)).toBeCloseTo(0.264, 3);
  await page.mouse.click(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  point = JSON.parse((await state(page)).leftHit);
  await page.mouse.move(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-hovered-page", "left");
  expect(Number((await state(page)).leftGlow)).toBeGreaterThan(0.15);
  await page.mouse.click(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  const button = page.getByRole("button", { name: "Turn to previous spread" }),
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
  await page
    .getByRole("navigation", { name: "Zine pages" })
    .getByRole("button", { name: "Stadia", exact: true })
    .click({ force: true });
  await expect(stage(page)).toHaveAttribute("data-phase", "turning");
  await expect
    .poll(async () => Number((await state(page)).activeLeafCount))
    .toBeGreaterThan(0);
  expect(Number((await state(page)).turnProgress)).toBeLessThan(0.99);
  const targetArtwork = (await state(page)).turnBackArtwork;
  await ready(page);
  const after = await state(page);
  expect(Date.now() - started).toBeGreaterThan(1500);
  expect(after.leftArtwork).toBe(targetArtwork);
  expect(after.rightArtwork).not.toBe(before.rightArtwork);
  expect(after.rightArtwork).toBe(JSON.parse(before.previewArtworks)[1]);
  expect(after.camera).toBe(before.camera);
  expect(after.zoom).toBe("1.2");
  await expect(page.locator(".book-printing .page-verso h1")).toHaveText(
    "Stadia",
  );
  await page.keyboard.press("ArrowLeft");
  await ready(page);
  expect((await state(page)).project).toBe("0");
});

test("loading reveals a bouncing closed cover, idle motion continues, and R returns to the cover", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    window.arrival = [];
    const mounted = new MutationObserver(() => {
      const el = document.querySelector(".book-stage");
      if (!el) return;
      const frames = new MutationObserver(() =>
        window.arrival.push({ ...el.dataset }),
      );
      frames.observe(el, {
        attributes: true,
        attributeFilter: ["data-arrival-scale"],
      });
      mounted.disconnect();
    });
    mounted.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Preparing your zine" }),
  ).toBeVisible();
  await expect(page.locator(".scene-brand,.scene-marquee")).toHaveCount(0);
  await ready(page);
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-presentation",
    "ready",
  );
  await expect(stage(page)).toHaveAttribute("data-view", "cover");
  const before = await state(page);
  expect(Number(before.firstRevealAt)).toBeGreaterThanOrEqual(1990);
  await expect
    .poll(async () => (await state(page)).ambientPosition)
    .not.toBe(before.ambientPosition);
  await page.waitForTimeout(500);
  expect((await state(page)).coverOpen).toBe("0");
  const samples = await page.evaluate(() =>
    window.arrival.filter((s) => s.phase === "arriving"),
  );
  expect(samples.some((s) => Number(s.arrivalScale) < 0.95)).toBe(true);
  expect(samples.some((s) => Number(s.arrivalScale) > 1)).toBe(true);
  expect(samples.every((s) => Number(s.coverOpen) === 0)).toBe(true);
  await page.getByRole("button", { name: "About", exact: true }).click();
  await ready(page);
  await expect
    .poll(async () => Number((await state(page)).popupCount), {
      timeout: 15000,
    })
    .toBe(3);
  await page.keyboard.press("r");
  await ready(page);
  const final = await state(page);
  expect(final.view).toBe("cover");
  expect(final.popupCount).toBe("0");
  expect(final.camera).toBe(before.camera);
  expect(JSON.parse(final.rotation)).toEqual([0, 0]);
  expect(page.url()).not.toContain("project=");
});

test("the two-ink ASCII print animates and respects reduced motion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const time = Number((await state(page)).portalTime);
  await expect
    .poll(async () => Number((await state(page)).portalTime), {
      timeout: 15000,
    })
    .toBeGreaterThan(time + 0.3);
  const moving = await page.screenshot();
  await expect
    .poll(async () => (await state(page)).ambientPosition)
    .not.toBe((await state(page)).ambientPosition);
  expect(await page.screenshot()).not.toEqual(moving);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const still = await page.screenshot();
  const frozen = await state(page);
  await page.waitForTimeout(160);
  expect(await page.screenshot()).toEqual(still);
  expect((await state(page)).portalTime).toBe(frozen.portalTime);
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
  await page.getByRole("button", { name: "About", exact: true }).tap();
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
  const nextHit = JSON.parse((await state(page)).rightHit);
  await page.touchscreen.tap(nextHit.x, nextHit.y);
  await expect(stage(page)).toHaveAttribute("data-project", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.keyboard.press("r");
  await ready(page);
  await page
    .getByRole("navigation", { name: "Zine pages" })
    .getByRole("button", { name: "Stadia", exact: true })
    .tap();
  await page
    .getByRole("button", { name: "Open Stadia preview" })
    .tap({ force: true });
  await expect(
    page.getByRole("region", { name: "Stadia case study" }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Printed front cover" }).click();
  await expect(page.locator(".fallback-book")).toBeVisible();
  await expect(page.locator(".fallback-book .ascii-portal")).toBeVisible();
  expect(await page.locator(".fallback-book .page-recto").innerText()).toBe("");
  await page.getByRole("button", { name: "Turn to next spread" }).click();
  await expect(page.locator(".fallback-book .page-verso h1")).toHaveText(
    "Stadia",
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
    nav.getByRole("button", { name: "About", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Cover", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "cover");
  await expect(
    nav.getByRole("button", { name: "Cover", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "AI Mode", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "spread");
  await expect(stage(page)).toHaveAttribute("data-project", "2");
  await nav.getByRole("button", { name: "Back cover", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "back");
  await nav.getByRole("button", { name: "About", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await nav.getByRole("button", { name: "AI Mode", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-phase", "turning");
  await nav.getByRole("button", { name: "About", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 45000,
  });
  await expect(stage(page)).toHaveAttribute("data-project", "0");
  expect((await state(page)).camera).toBe(camera);
  await expect(
    nav.getByRole("button", { name: "About", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("dragging can complete full horizontal and vertical revolutions around the same center", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const before = await state(page),
    box = await stage(page).boundingBox();
  for (const axis of ["horizontal", "vertical"]) {
    const point = JSON.parse((await state(page)).rightHit);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(
      point.x + (axis === "horizontal" ? box.width * 1.08 : 0),
      point.y + (axis === "vertical" ? box.height * 1.08 : 0),
      { steps: 12 },
    );
    await expect(stage(page)).toHaveAttribute("data-phase", "rotating");
    await page.mouse.up();
    const after = await state(page),
      angles = JSON.parse(after.rotation);
    expect(Math.abs(angles[axis === "horizontal" ? 1 : 0])).toBeGreaterThan(
      Math.PI * 2,
    );
    expect(after.anchorPosition).toBe(before.anchorPosition);
    expect(after.bookPosition).toBe(before.bookPosition);
    expect(after.camera).toBe(before.camera);
    expect(after.modelScale).toBe(before.modelScale);
    expect(after.project).toBe("0");
    await page.keyboard.press("r");
    await ready(page);
    await page.getByRole("button", { name: "About", exact: true }).click();
  }
});

test("rapid leaf clicks accumulate through spreads and covers in both directions", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const point = JSON.parse((await state(page)).rightHit);
  for (let i = 0; i < 4; i++) await page.mouse.click(point.x, point.y);
  await expect(stage(page)).toHaveAttribute("data-requested-page", "4");
  await expect(stage(page)).toHaveAttribute("data-view", "back", {
    timeout: 60000,
  });
  await ready(page);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(stage(page)).toHaveAttribute("data-requested-page", "0");
  await expect(stage(page)).toHaveAttribute("data-view", "spread", {
    timeout: 45000,
  });
  await expect(stage(page)).toHaveAttribute("data-project", "0", {
    timeout: 45000,
  });
  await ready(page);
});

test("the cover and inside artwork remain the same physical leaf through opening", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const original = JSON.parse((await state(page)).leafStates);
  expect((await state(page)).geometryMode).toBe("gpu-skinning");
  await page.getByRole("button", { name: "Cover", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "cover");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    window.coverSamples = [];
    new MutationObserver(() =>
      window.coverSamples.push({
        ...document.querySelector(".book-stage").dataset,
      }),
    ).observe(document.querySelector(".book-stage"), {
      attributes: true,
      attributeFilter: ["data-cover-open"],
    });
  });
  await page.getByRole("button", { name: "About", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-phase", "opening");
  await ready(page);
  const samples = await page.evaluate(() =>
    window.coverSamples.filter(
      (s) => Number(s.coverOpen) > 0.01 && Number(s.coverOpen) < 0.985,
    ),
  );
  expect(samples.length).toBeGreaterThan(2);
  for (const sample of samples) {
    const leaf = JSON.parse(sample.leafStates)[0];
    expect(leaf.object).toBe(original[0].object);
    expect(leaf.front).toBe(original[0].front);
    expect(leaf.back).toBe(original[0].back);
    expect(leaf.verticesVersion).toBe(original[0].verticesVersion);
  }
  expect((await state(page)).leftArtwork).toBe(original[0].back);
});

test("overlapping turns keep physical page identities and handle an interrupted destination", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  const before = JSON.parse((await state(page)).leafStates);
  await page.evaluate(() => {
    window.turnSamples = [];
    new MutationObserver(() =>
      window.turnSamples.push({
        ...document.querySelector(".book-stage").dataset,
      }),
    ).observe(document.querySelector(".book-stage"), {
      attributes: true,
      attributeFilter: ["data-active-leaf-count", "data-turn-progress"],
    });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Back cover", exact: true }).click();
  await expect
    .poll(async () => Number((await state(page)).activeLeafCount))
    .toBeGreaterThan(1);
  await page.getByRole("button", { name: "Cover", exact: true }).click();
  await page.getByRole("button", { name: "Stadia", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-settled-boundary", "2", {
    timeout: 45000,
  });
  await ready(page);
  const after = await state(page),
    leaves = JSON.parse(after.leafStates);
  expect(Number(after.maxConcurrent)).toBeGreaterThan(1);
  expect(after.project).toBe("1");
  const samples = await page.evaluate(() =>
    window.turnSamples.filter((s) => Number(s.activeLeafCount) > 0),
  );
  expect(samples.length).toBeGreaterThan(2);
  expect(samples.every((s) => s.popupCount === "0")).toBe(true);
  const peakExtent = Math.max(
    ...samples.flatMap((sample) =>
      Object.values(JSON.parse(sample.bookBounds)).map(Math.abs),
    ),
  );
  expect(
    peakExtent,
    "Raised leaves stay inside the fixed viewport during interrupted turns",
  ).toBeLessThan(1.0);
  for (let i = 0; i < leaves.length; i++) {
    expect(leaves[i].object).toBe(before[i].object);
    expect(leaves[i].front).toBe(before[i].front);
    expect(leaves[i].back).toBe(before[i].back);
    expect(leaves[i].verticesVersion).toBe(before[i].verticesVersion);
    expect(leaves[i].progress).toBe(i < 2 ? 1 : 0);
  }
});

test("About, Stadia and AI Mode keep independent print palettes and permanent previews", async ({
  page,
}) => {
  await openBook(page);
  const nav = page.getByRole("navigation", { name: "Zine pages" });
  await expect(nav.getByRole("button")).toHaveText([
    "Cover",
    "About",
    "Stadia",
    "AI Mode",
    "After-hours",
    "Back cover",
  ]);
  const initial = await state(page),
    artwork = JSON.parse(initial.previewArtworks);
  expect(new Set(artwork).size).toBe(4);
  expect(initial.popupCount).toBe("3");
  expect(initial.popupSpread).toBe("0");
  await expect(page.locator(".book-printing .project-facts")).toHaveCount(0);
  for (const [label, theme, index] of [
    ["Stadia", "stadia", 1],
    ["AI Mode", "ai", 2],
  ]) {
    await nav.getByRole("button", { name: label, exact: true }).click();
    const current = await state(page);
    expect(current.theme).toBe(theme);
    expect(current.popupCount).toBe("0");
    expect(current.popupSpread).toBe(String(index));
    expect(current.rightArtwork).toBe(artwork[index]);
    expect(current.previewArtworks).toBe(initial.previewArtworks);
    await expect(page.locator(".book-printing h1")).toHaveText(label);
    await page
      .getByRole("button", { name: `Open ${label} preview`, exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: `${label} case study` }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  }
  expect(JSON.parse((await state(page)).lightPosition)[1]).toBe(15);
});

test("project URLs open their spread and reset returns to a reloadable closed cover", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openBook(page, "/?project=ai-mode");
  await expect(stage(page)).toHaveAttribute("data-project", "2");
  await expect(stage(page)).toHaveAttribute("data-popup-count", "0");
  await page.reload();
  await ready(page);
  await expect(stage(page)).toHaveAttribute("data-project", "2");
  await page.keyboard.press("r");
  await ready(page);
  await expect(stage(page)).toHaveAttribute("data-view", "cover");
  expect(page.url()).not.toContain("project=");
  await page.reload();
  await ready(page);
  await expect(stage(page)).toHaveAttribute("data-view", "cover");
});

test("navigation highlights the requested destination before settled content changes", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const nav = page.getByRole("navigation", { name: "Zine pages" });
  await nav.getByRole("button", { name: "AI Mode", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: "AI Mode", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect((await state(page)).project).toBe("0");
  await nav.getByRole("button", { name: "Cover", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: "Cover", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(stage(page)).toHaveAttribute("data-view", "cover", {
    timeout: 45000,
  });
  await ready(page);
});

test("light/dark preference persists, repaints the zine and keeps physical texture identities", async ({
  page,
}) => {
  await openBook(page);
  await page.evaluate(async () => {
    const source = performance
      .getEntriesByType("resource")
      .find((entry) => entry.name.includes("/src/book/BookScene.ts")).name;
    const { BookScene } = await import(source);
    const original = BookScene.prototype.setDarkMode;
    BookScene.prototype.setDarkMode = function (dark) {
      const pixel = () =>
        Array.from(
          this.leftTextures[0].image.getContext("2d").getImageData(10, 10, 1, 1)
            .data,
        );
      const before = pixel(),
        preview = this.phones.phones[0].poster.image.toDataURL();
      original.call(this, dark);
      window.paperTheme = {
        before,
        after: pixel(),
        mediaUnchanged:
          preview === this.phones.phones[0].poster.image.toDataURL(),
      };
    };
  });
  const before = await state(page);
  await expect(page.locator(".spellbook")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  const left = page.locator(".print-sources .metadata-content").nth(1);
  await expect(left.locator("h1")).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(left.locator(".project-description")).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
  );
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-color-mode",
    "dark",
  );
  await expect(page.locator(".spellbook")).toHaveCSS(
    "background-color",
    "rgb(20, 20, 20)",
  );
  await expect.poll(() => page.evaluate(() => !!window.paperTheme)).toBe(true);
  const painted = await page.evaluate(() => window.paperTheme);
  expect(painted.before[0]).toBeGreaterThan(200);
  expect(painted.after[0]).toBeLessThan(70);
  expect(painted.mediaUnchanged).toBe(true);
  const dark = await state(page);
  expect(dark.bookColorMode).toBe("dark");
  expect(before.bookColorMode).toBe("light");
  expect(dark.rotation).toBe(before.rotation);
  expect(dark.previewArtworks).toBe(before.previewArtworks);
  expect(dark.settledBoundary).toBe(before.settledBoundary);
  await expect(left.locator("h1")).toHaveCSS("color", "rgb(17, 17, 17)");
  await page.reload();
  await ready(page);
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-color-mode",
    "dark",
  );
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-color-mode",
    "light",
  );
});

test("restart button and R reset to the same cover without viewport focus lines", async ({
  page,
}) => {
  await openBook(page);
  await stage(page).focus();
  await expect(stage(page)).toHaveCSS("outline-style", "none");
  await expect(stage(page)).toHaveAttribute("data-hovered-page", "right");
  await page.getByRole("button", { name: "Stadia", exact: true }).click();
  await page.getByRole("button", { name: "Restart zine" }).click();
  await ready(page);
  const button = await state(page);
  await page.getByRole("button", { name: "AI Mode", exact: true }).click();
  await page.keyboard.press("r");
  await ready(page);
  const keyboard = await state(page);
  for (const key of [
    "view",
    "rotation",
    "requestedPage",
    "popupCount",
    "coverOpen",
  ])
    expect(keyboard[key]).toBe(button[key]);
  await expect(
    page.getByRole("button", { name: "Cover", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("cover-to-cover navigation launches the final leaf without waiting at the last spread", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openBook(page);
  await page.getByRole("button", { name: "Cover", exact: true }).click();
  await page.evaluate(() => {
    window.closures = [];
    new MutationObserver(() =>
      window.closures.push({
        ...document.querySelector(".book-stage").dataset,
      }),
    ).observe(document.querySelector(".book-stage"), {
      attributes: true,
      attributeFilter: ["data-leaf-states"],
    });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Back cover", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "back", {
    timeout: 45000,
  });
  await ready(page);
  const forward = await page.evaluate(() => window.closures);
  expect(forward.some((s) => Number(s.maxConcurrent) === 5)).toBe(true);
  const firstCoverFrame = forward.find(
    (s) => JSON.parse(s.leafStates).at(-1).target === 1,
  );
  expect(firstCoverFrame).toBeTruthy();
  expect(
    JSON.parse(firstCoverFrame.leafStates)
      .slice(0, -1)
      .some((l) => !l.settled),
  ).toBe(true);
  await page.getByRole("button", { name: "Cover", exact: true }).click();
  await expect(stage(page)).toHaveAttribute("data-view", "cover", {
    timeout: 45000,
  });
  await ready(page);
});
