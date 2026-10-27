import { test, expect } from "@playwright/test";
const centers = {
  today: [-122.4194, 37.7749],
  beginning: [-84.1402, 34.2073],
  blizzard: [-117.8265, 33.6846],
  google: [-122.4194, 37.7749],
};
async function ready(page, { blockLive = true } = {}) {
  if (blockLive)
    await page.route("https://tiles.openfreemap.org/**", (route) =>
      route.abort(),
    );
  await page.goto("/");
  await expect(page.locator(".journey-view")).toHaveAttribute(
    "data-scene",
    /maplibre-/,
    { timeout: 20000 },
  );
  await expect
    .poll(() =>
      page
        .locator(".journey-map")
        .getAttribute("data-rendered-roads")
        .then(Number),
    )
    .toBeGreaterThan(0);
}
async function atCity(page, id) {
  await expect(page.locator(".narrative")).toHaveAttribute("data-chapter", id);
  await expect
    .poll(
      async () => {
        const value = await page
          .locator(".journey-map")
          .getAttribute("data-map-center");
        if (!value) return false;
        const center = value.split(",").map(Number);
        return center.every((n, i) => Math.abs(n - centers[id][i]) < 0.001);
      },
      { timeout: 10000 },
    )
    .toBe(true);
}
test("real map starts in San Francisco, follows the four requested cities, and opens case studies", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await atCity(page, "today");
  await expect(
    page.getByRole("heading", { name: "san francisco, today", exact: true }),
  ).toBeVisible();
  const timeline = page.getByRole("navigation", { name: "Journey timeline" });
  await expect(timeline.getByRole("button")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Chapter 2: the beginning", exact: true })
    .click();
  await atCity(page, "beginning");
  await page
    .getByRole("button", { name: "Chapter 3: blizzard", exact: true })
    .click();
  await atCity(page, "blizzard");
  await page.getByRole("button", { name: "open case study" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "a chapter at blizzard", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: /the discovery/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "What changed your understanding?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Chapter 4: google", exact: true })
    .click();
  await atCity(page, "google");
  await expect(page.locator(".google-word")).toBeVisible();
  await expect(page.locator(".google-word > span")).toHaveCount(6);
  expect(errors).toEqual([]);
});
test("white palette, source attribution, readable text and index are usable", async ({
  page,
}) => {
  await ready(page);
  expect(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(248, 250, 247)");
  await expect(
    page.getByRole("link", { name: "Natural Earth · regional geography" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "reveal text" }).click();
  await expect(page.locator(".description-wrap")).toHaveClass(/full-text/);
  await page.getByRole("button", { name: "index", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /back to san francisco/ }).click();
  await expect(dialog).not.toBeVisible();
  await atCity(page, "google");
  await page.getByRole("button", { name: "back to start" }).click();
  await atCity(page, "today");
  await page.screenshot({ path: "/tmp/real-map-sf.png" });
});
test("mobile layout, timeline, map location and keyboard navigation remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await expect(page.locator(".narrative")).toBeInViewport();
  await page.getByRole("button", { name: "scroll to start" }).click();
  await atCity(page, "beginning");
  await page
    .getByRole("button", { name: "Chapter 2: the beginning", exact: true })
    .press("ArrowRight");
  await atCity(page, "blizzard");
  await page.getByRole("button", { name: "open case study" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close case study" }).click();
  await page.setViewportSize({ width: 390, height: 720 });
  await page.getByRole("button", { name: "josh lucas", exact: true }).click();
  await atCity(page, "today");
  await page.screenshot({ path: "/tmp/real-map-mobile.png" });
});
test("reduced motion jumps to geographic targets without flights", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const motion = page.getByRole("button", { name: "Reduce camera motion" });
  await expect(motion).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Chapter 3: blizzard", exact: true })
    .click();
  await atCity(page, "blizzard");
  await motion.click();
  await expect(motion).toHaveAttribute("aria-pressed", "false");
});
test("no-WebGL fallback uses real local geography and keeps the narrative usable", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".journey-view")).toHaveAttribute(
    "data-scene",
    "geographic-fallback",
  );
  await expect(
    page.getByRole("img", { name: "Real geographic map around San Francisco" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Chapter 2: the beginning", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Real geographic map around Cumming" }),
  ).toBeVisible();
  await expect(page.locator("svg.journey-map path").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("live-style upgrade path works with a controlled local geographic style fixture", async ({
  page,
}) => {
  // Tests the loader/style transition, not the availability of the public tile service.
  await page.route("https://tiles.openfreemap.org/styles/positron", (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {
          land: {
            type: "geojson",
            data: "http://127.0.0.1:3000/data/land.geojson",
          },
        },
        layers: [
          {
            id: "water",
            type: "background",
            paint: { "background-color": "#eee" },
          },
          {
            id: "land",
            type: "fill",
            source: "land",
            paint: { "fill-color": "#ddd" },
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".journey-view")).toHaveAttribute(
    "data-scene",
    "maplibre-live",
  );
  await expect(
    page.getByRole("link", { name: "© OpenStreetMap" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Chapter 2: the beginning", exact: true })
    .click();
  await atCity(page, "beginning");
});
