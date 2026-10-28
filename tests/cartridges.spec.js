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

test("stack selection, rotation and project entry are separate, with history and focus restored", async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await load(page);
  const stage = page.locator(".cartridge-stage");
  await expect(stage).toHaveAttribute("data-composition", "stack");
  await expect(stage).toHaveAttribute("data-selected", "");
  expect(await page.evaluate(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("BookScene")))).toBe(false);
  const target = await point(page, 1);
  await page.mouse.click(target.x, target.y);
  await expect(stage).toHaveAttribute("data-selected", "stadia");
  await expect(stage).toHaveAttribute("data-settled", "true");
  await expect(page.locator(".case-study")).toHaveCount(0);
  const before = await stage.getAttribute("data-rotation1"), p = await point(page, 1);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(p.x + 100, p.y + 30, { steps: 5 }); await page.mouse.up();
  await expect(page.locator(".case-study")).toHaveCount(0);
  await expect(stage).not.toHaveAttribute("data-rotation1", before);
  await page.getByRole("button", { name: "Reset cartridge rotation" }).click();
  await expect(stage).toHaveAttribute("data-rotation1", before);
  await page.getByRole("button", { name: "View case study", exact: true }).click();
  await expect(page.getByRole("region", { name: "Stadia case study" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stadia", exact: true })).toBeFocused();
  expect(page.url()).toContain("project=stadia&view=case-study");
  await expect(page.getByText("Case study in progress.", { exact: false })).toBeVisible();
  expect(await page.title()).toBe("Stadia");
  await page.goBack(); await expect(page.locator(".case-study")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View case study", exact: true })).toBeFocused();
  await page.goForward(); await expect(page.getByRole("region", { name: "Stadia case study" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("rapid keyboard selection keeps all stack targets in view and removes custom name branding", async ({ page, request }) => {
  await load(page);
  for (const label of ["About", "After-hours", "Stadia", "AI Mode", "About"]) {
    const control = page.getByRole("button", { name: `View ${label} cartridge`, exact: true });
    await control.focus(); await control.press("Enter");
  }
  const stage = page.locator(".cartridge-stage");
  await expect(stage).toHaveAttribute("data-selected", "about");
  await expect(stage).toHaveAttribute("data-settled", "true");
  const visible = await stage.evaluate((el) => [0,1,2,3].every((i) => {
    const p = JSON.parse(el.dataset[`hit${i}`]);
    return p.x > 0 && p.x < el.clientWidth && p.y > 0 && p.y < el.clientHeight;
  }));
  expect(visible).toBe(true);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/Josh|Lucas|Work, with|little play|curiosity|FOUR CARTRIDGES|VOL\. 01/i);
  for (const id of ["about", "stadia", "ai-mode", "after-hours"]) {
    const label = await request.get(`/cartridges/labels/${id}.svg`);
    expect(await label.text()).not.toMatch(/Josh|Lucas|JL—/i);
  }
  await page.getByRole("button", { name: "Close cartridge" }).click();
  await expect(stage).toHaveAttribute("data-selected", "");
});

test("About preserves biography; After-hours and the photography gallery remain keyboard accessible", async ({ page }) => {
  await load(page);
  await page.getByRole("button", { name: "About", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "About", exact: true })).toBeFocused();
  await expect(page.getByText("Senior Product Designer at Google", { exact: true })).toBeVisible();
  await expect(page.getByText(/Prior to Google, I worked on Heroes of the Storm & Starcraft/)).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.locator(".case-study")).toHaveCount(0);
  await page.getByRole("button", { name: "After-hours", exact: true }).click();
  await page.getByRole("button", { name: /View photographs/ }).click();
  await expect(page.getByRole("dialog", { name: "Film photographs" })).toBeVisible();
  await expect(page.getByText("No photographs added yet.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /View photographs/ })).toBeFocused();
});

test("mobile has no horizontal overflow, preserves theme, and can open a case study", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await load(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const stage = await page.locator(".cartridge-stage").boundingBox(); expect(stage.width).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-composition", "rack");
  await page.getByRole("button", { name: "AI Mode Google", exact: true }).click();
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
