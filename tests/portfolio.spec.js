import { test, expect } from "@playwright/test";
const ready = async (page) => {
  await page.goto("/");
  await expect(page.locator(".journey-view")).toHaveAttribute(
    "data-scene",
    "webgl",
    { timeout: 20000 },
  );
};
test("3D map journey responds to scrolling, timeline clicks, and keyboard navigation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "tl;dr", exact: true }),
  ).toBeVisible();
  await page.mouse.move(10, 10);
  const before = await page.screenshot({
    clip: { x: 50, y: 100, width: 200, height: 200 },
  });
  await page.mouse.wheel(0, 720);
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "project-01",
  );
  await expect(
    page.getByRole("button", { name: "Chapter 2: project 01", exact: true }),
  ).toHaveAttribute("aria-current", "step");
  const after = await page.screenshot({
    clip: { x: 50, y: 100, width: 200, height: 200 },
  });
  expect(before.equals(after)).toBe(false);
  await page
    .getByRole("button", { name: "Chapter 3: project 02", exact: true })
    .click();
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "project-02",
  );
  await page
    .getByRole("button", { name: "Chapter 3: project 02", exact: true })
    .press("ArrowRight");
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "project-03",
  );
  await page.getByRole("button", { name: "open case study" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "built around people", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: /the discovery/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "What changed your understanding?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "next chapter" }).click();
  await expect(
    dialog.getByRole("heading", { name: "What did you choose, and why?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("index, full text, and final contact chapter are usable", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "reveal text" }).click();
  await expect(page.locator(".description-wrap")).toHaveClass(/full-text/);
  await page.getByRole("button", { name: "soften text" }).click();
  await expect(page.locator(".description-wrap")).not.toHaveClass(/full-text/);
  await page.getByRole("button", { name: "index", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: /there’s always another chapter/ })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "next",
  );
  await expect(
    page.getByRole("link", { name: "visit my current portfolio" }),
  ).toHaveAttribute("href", "https://joshglucas.com");
  await page.getByRole("button", { name: "back to start" }).click();
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "intro",
  );
});
test("mobile timeline scrolls to active chapter, story fits, and viewport resize stays navigable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await expect(page.locator(".narrative")).toBeInViewport();
  await page.getByRole("button", { name: "scroll to start" }).click();
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "project-01",
  );
  await page.getByRole("button", { name: "open case study" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close case study" }).click();
  await page.getByRole("button", { name: "index", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /following a little curiosity/ })
    .click();
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "experiments",
  );
  await expect(
    page.getByRole("button", { name: "Chapter 5: side paths" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "visit the frog pond" }),
  ).toHaveAttribute("href", "/pond.html");
  await page.setViewportSize({ width: 390, height: 720 });
  await page.getByRole("button", { name: "josh lucas", exact: true }).click();
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "intro",
  );
  await page.screenshot({ path: "/tmp/journey-mobile.png" });
});
test("reduced motion and direct chapter navigation work without smooth travel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const motion = page.getByRole("button", { name: "Reduce camera motion" });
  await expect(motion).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Chapter 7: what’s next", exact: true })
    .click();
  await expect(page.locator(".narrative")).toHaveAttribute(
    "data-chapter",
    "next",
  );
  await motion.click();
  await expect(motion).toHaveAttribute("aria-pressed", "false");
});
test("without WebGL, a local map fallback preserves the chapter and case study flow", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return getContext.call(this, type, ...args);
    };
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".journey-view")).toHaveAttribute(
    "data-scene",
    "fallback",
  );
  await expect(
    page.getByRole("img", { name: "A warm-toned coastal map illustration" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Chapter 2: project 01", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "open case study" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "open case study" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(errors).toEqual([]);
});
