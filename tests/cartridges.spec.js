import { test, expect } from "@playwright/test";

async function load(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator(".collection")).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-hit1", /"x"/);
}
async function point(page, index) {
  const stage = page.locator(".cartridge-stage");
  const bounds = await stage.boundingBox();
  const position = JSON.parse(await stage.getAttribute(`data-hit${index}`));
  return { x: bounds.x + position.x, y: bounds.y + position.y };
}

test("cartridges render original labels; drag inspects, click opens, and history restores collection", async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await load(page);
  expect(await page.evaluate(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("BookScene")))).toBe(false);
  const stage = page.locator(".cartridge-stage"), before = await stage.getAttribute("data-rotation1");
  const p = await point(page, 1);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(p.x + 100, p.y + 30, { steps: 5 }); await page.mouse.up();
  await expect(page.locator(".case-study")).toHaveCount(0);
  await expect(stage).not.toHaveAttribute("data-rotation1", before);
  await page.getByRole("button", { name: "Reset cartridge rotation" }).click();
  await expect(stage).toHaveAttribute("data-rotation1", before);
  const target = await point(page, 1);
  await page.mouse.click(target.x, target.y);
  await expect(page.getByRole("region", { name: "Stadia case study" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stadia", exact: true })).toBeFocused();
  expect(page.url()).toContain("project=stadia&view=case-study");
  await expect(page.getByText("Case study in progress.", { exact: false })).toBeVisible();
  await page.goBack(); await expect(page.locator(".case-study")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Stadia", exact: true })).toBeFocused();
  await page.goForward(); await expect(page.getByRole("region", { name: "Stadia case study" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("keyboard opens About and After-hours; photo gallery closes and restores focus", async ({ page }) => {
  await load(page);
  await page.getByRole("button", { name: "Open Josh Lucas", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Josh Lucas", exact: true })).toBeFocused();
  await expect(page.getByText("Senior Product Designer at Google", { exact: true })).toBeVisible();
  await expect(page.getByText(/Prior to Google, I worked on Heroes of the Storm & Starcraft/)).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.locator(".case-study")).toHaveCount(0);
  await page.getByRole("button", { name: "Open After-hours", exact: true }).click();
  await page.getByRole("button", { name: /Open photographs/ }).click();
  await expect(page.getByRole("dialog", { name: "Film photographs" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open photographs/ })).toBeFocused();
});

test("mobile has no horizontal overflow, preserves theme, and can open a case study", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await load(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const stage = await page.locator(".cartridge-stage").boundingBox(); expect(stage.width).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page.getByRole("button", { name: "Open AI Mode", exact: true }).click();
  await expect(page.getByRole("region", { name: "AI Mode case study" })).toBeVisible();
  await page.getByRole("button", { name: /Back to collection/ }).first().click();
  await expect(page.locator(".case-study")).toHaveCount(0);
});

test("without WebGL, all four illustrated cartridges still open their content", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
  });
  await page.goto("/");
  await expect(page.locator(".collection")).toHaveAttribute("data-status", "fallback");
  await expect(page.locator(".cartridge-fallback img")).toHaveCount(4);
  await page.getByRole("button", { name: "Open Stadia cartridge", exact: true }).click();
  await expect(page.getByRole("region", { name: "Stadia case study" })).toBeVisible();
});

test("direct case-study URLs are readable and return to the collection", async ({ page }) => {
  await page.goto("/?project=ai-mode&view=case-study");
  await expect(page.getByRole("region", { name: "AI Mode case study" })).toBeVisible();
  await page.getByRole("button", { name: /Back to collection/ }).first().click();
  await expect(page.locator(".case-study")).toHaveCount(0);
  await expect(page.locator(".collection")).toHaveAttribute("data-selected", "ai-mode");
});

test("zine snapshot is downloadable and preserved edition remains runnable", async ({ page, request }) => {
  test.setTimeout(120000);
  const response = await request.get("/versions/portfolio-zine-v1-source.zip"); expect(response.ok()).toBe(true);
  const bytes = await response.body(); expect(bytes.subarray(0, 2).toString()).toBe("PK"); expect(bytes.length).toBeGreaterThan(100000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/zine/?project=about");
  await expect(page.locator(".spellbook")).toHaveAttribute("data-presentation", "ready", { timeout: 90000 });
  await expect(page.locator(".book-stage")).toHaveAttribute("data-phase", "ready", { timeout: 90000 });
  await expect(page.locator(".collection")).toHaveCount(0);
});
