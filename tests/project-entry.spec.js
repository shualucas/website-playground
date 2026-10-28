import { test, expect } from "@playwright/test";
const stage = (page) => page.locator(".book-stage");
async function load(page, path = "/?project=stadia") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-presentation",
    "ready",
    { timeout: 60000 },
  );
  await expect(stage(page)).toHaveAttribute("data-phase", "ready", {
    timeout: 60000,
  });
}

test("phone dive animates from a rotated zine and browser Back/Forward restores its pose", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await load(page);
  const point = JSON.parse(await stage(page).getAttribute("data-right-grab"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 22, point.y - 8, { steps: 3 });
  await page.mouse.up();
  await expect(stage(page)).toHaveAttribute("data-phase", "ready");
  const before = await stage(page).evaluate((el) => ({ ...el.dataset }));
  await page.evaluate(async () => {
    const source = performance
      .getEntriesByType("resource")
      .find((entry) => entry.name.includes("/src/book/BookScene.ts")).name;
    const { BookScene } = await import(source);
    const apply = BookScene.prototype.applyDive;
    window.diveFrames = [];
    BookScene.prototype.applyDive = function () {
      const result = apply.call(this);
      window.diveFrames.push({
        progress: this.dive.progress,
        position: this.camera.position.toArray(),
        quaternion: this.camera.quaternion.toArray(),
        originalQuaternion: this.dive.book.quaternion.toArray(),
        projection: this.camera.projectionMatrix.toArray(),
        originalProjection: this.dive.book.projectionMatrix.toArray(),
        zoom: this.camera.zoom,
        originalZoom: this.dive.book.zoom,
      });
      return result;
    };
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // A genuine canvas/raycast click, rather than invoking the overlay's React handler.
  const phone = JSON.parse(await stage(page).getAttribute("data-phone-hit"));
  await page.mouse.click(phone.x, phone.y);
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-view",
    "entering",
  );
  await expect
    .poll(
      async () => Number(await stage(page).getAttribute("data-dive-progress")),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0.1);
  await expect(
    page.getByRole("region", { name: "Stadia case study" }),
  ).toBeVisible({ timeout: 20000 });
  expect(page.url()).toContain("view=case-study");
  const frames = await page.evaluate(() =>
    window.diveFrames.filter(
      (frame) => frame.progress > 0 && frame.progress < 1,
    ),
  );
  expect(frames.length).toBeGreaterThan(2);
  expect(
    frames.every((frame) =>
      frame.quaternion.every(
        (n, i) => Math.abs(n - frame.originalQuaternion[i]) < 1e-10,
      ),
    ),
  ).toBe(true);
  expect(frames.every((frame) => frame.zoom === frame.originalZoom)).toBe(true);
  expect(
    frames.every((frame) =>
      frame.projection.every(
        (n, i) => Math.abs(n - frame.originalProjection[i]) < 1e-10,
      ),
    ),
  ).toBe(true);
  expect(frames.at(-1).position).not.toEqual(frames[0].position);
  await expect(
    page.getByRole("heading", { name: "Stadia", exact: true }),
  ).toBeFocused();
  await page.goBack();
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-view",
    "book",
    { timeout: 20000 },
  );
  expect(page.url()).not.toContain("view=");
  const after = await stage(page).evaluate((el) => ({ ...el.dataset }));
  JSON.parse(after.orientation).forEach((component, index) =>
    expect(component).toBeCloseTo(JSON.parse(before.orientation)[index], 12),
  );
  expect(after.camera).toBe(before.camera);
  expect(after.zoom).toBe("1.2");
  expect(after.settledBoundary).toBe("2");
  await page.goForward();
  await expect(
    page.getByRole("region", { name: "Stadia case study" }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("button", { name: "Back to zine", exact: true })
    .first()
    .click();
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-view",
    "book",
    { timeout: 20000 },
  );
  expect(errors).toEqual([]);
});

test("case-study deep links remain readable on mobile and Back returns to the spread", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page, "/?project=ai-mode&view=case-study");
  await expect(
    page.getByRole("region", { name: "AI Mode case study" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI Mode", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.querySelector(".case-study").scrollWidth,
    ),
  ).toBe(390);
  await page
    .getByRole("button", { name: "Back to zine", exact: true })
    .first()
    .click();
  await expect(page.locator(".spellbook")).toHaveAttribute("data-view", "book");
  await expect(stage(page)).toHaveAttribute("data-project", "2");
  await expect(stage(page)).toHaveAttribute("data-zoom", "1");
  await expect(
    page.getByRole("button", { name: "Open AI Mode preview" }),
  ).toBeFocused();
});

test("HTML fallback can enter a case study and return without WebGL", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl") ? null : get.call(this, type, ...args);
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?project=stadia");
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-presentation",
    "ready",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Open Stadia preview" }).click();
  await expect(
    page.getByRole("region", { name: "Stadia case study" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".spellbook")).toHaveAttribute("data-view", "book");
  await expect(page.locator(".fallback-book")).toBeVisible();
});
