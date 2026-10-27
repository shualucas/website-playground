import { test, expect } from "@playwright/test";

async function openJournal(page, { reduced = true, path = "/" } = {}) {
  await page.emulateMedia({
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  await page.goto(path);
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
    { timeout: 25000 },
  );
}

test("a real 3D journal opens, riffles pages, settles, and shows the first project", async ({
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
    window.draws = 0;
    window.phases = [];
    for (const type of [
      window.WebGLRenderingContext,
      window.WebGL2RenderingContext,
    ]) {
      if (!type) continue;
      const draw = type.prototype.drawElements;
      type.prototype.drawElements = function (...args) {
        window.draws++;
        return draw.apply(this, args);
      };
    }
    new MutationObserver(() => {
      const phase = document.querySelector(".book-stage")?.dataset.phase;
      if (phase && window.phases.at(-1) !== phase) window.phases.push(phase);
    }).observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["data-phase"],
    });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
    { timeout: 25000 },
  );
  expect(await page.evaluate(() => window.draws)).toBeGreaterThan(100);
  const phases = await page.evaluate(() => window.phases);
  expect(phases).toEqual(
    expect.arrayContaining([
      "entering",
      "opening",
      "flipping",
      "settling",
      "ready",
    ]),
  );
  expect(phases.indexOf("flipping")).toBeLessThan(phases.indexOf("settling"));
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Your first great adventure.",
  );
  await expect(page.locator(".page-recto .preview-art")).toBeVisible();
  await expect(page.locator(".book-printing")).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("button", { name: "Previous project" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("skip, physical page turns, project links, and replay work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas.book-webgl")).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
  );
  await page.getByRole("button", { name: "Next project" }).click();
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "turning",
  );
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
  );
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Finding the way forward.",
  );
  await expect(page).toHaveURL(/project=second-project/);
  await page.getByRole("button", { name: "Previous project" }).click();
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
  );
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Your first great adventure.",
  );
  await page.getByRole("button", { name: "Replay opening" }).click();
  await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
  );
});

test("keyboard navigation and deep links work with reduced motion", async ({
  page,
}) => {
  await openJournal(page, { path: "/?project=second-project" });
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Finding the way forward.",
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".page-verso h1")).toHaveText(
    "Small details. Lasting magic.",
  );
  await expect(
    page.getByRole("button", { name: "Next project" }),
  ).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("button", { name: "Previous project" }),
  ).toBeDisabled();
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
  );
  await expect(
    page.getByRole("button", { name: "Replay opening" }),
  ).toBeHidden();
});

test("the printed case-study button opens a readable dialog and Escape returns focus", async ({
  page,
}) => {
  await openJournal(page);
  const read = page
    .locator(".page-verso")
    .getByRole("button", { name: "Open the case study" });
  await read.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The question" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The resolution" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(read).toBeFocused();
  await page.getByRole("button", { name: "About the author" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Josh Lucas." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close reading view" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("mobile has a readable chapter, touch navigation, and no horizontal overflow", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
  );
  await expect(page.locator(".mobile-reading h1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(await page.locator(".book-printing").evaluate((el) => el.inert)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Next project" }).tap();
  await expect(page.locator(".mobile-reading h1")).toHaveText(
    "Finding the way forward.",
  );
  await page
    .locator(".mobile-reading")
    .getByRole("button", { name: "Open the case study" })
    .tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close reading view" }).tap();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect
    .poll(() => page.locator("canvas.book-webgl").evaluate((el) => el.width))
    .toBeGreaterThan(700);
  await context.close();
});

test("without WebGL, the journal remains readable and navigable", async ({
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
  await expect(page.locator(".journal")).toHaveClass(/is-fallback/);
  await expect(page.locator(".mobile-reading h1")).toBeVisible();
  await page.getByRole("button", { name: "Next project" }).click();
  await expect(page.locator(".mobile-reading h1")).toHaveText(
    "Finding the way forward.",
  );
  await page.getByRole("button", { name: "Open the case study" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
