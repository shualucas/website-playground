import { test, expect } from "@playwright/test";
async function openAfterHours(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?project=after-hours");
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-presentation",
    "ready",
    { timeout: 60000 },
  );
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-phase",
    "ready",
    { timeout: 60000 },
  );
}
async function cameraPoint(page) {
  await page.evaluate(async () => {
    const source = performance
      .getEntriesByType("resource")
      .find((e) => e.name.includes("/src/book/BookScene.ts")).name;
    const { BookScene } = await import(source);
    const render = BookScene.prototype.render;
    BookScene.prototype.render = function () {
      window.bookForGallery = this;
      return render.call(this);
    };
  });
  await page
    .getByRole("button", { name: /Switch to (dark|light) mode/ })
    .click();
  return page.evaluate(async () => {
    const book = window.bookForGallery,
      item = book.popups.spreads[3].items[0],
      THREE = await import("/node_modules/.vite/deps/three.js");
    const p = new THREE.Box3()
        .setFromObject(item.pose, true)
        .getCenter(new THREE.Vector3())
        .project(book.camera),
      rect = book.host.getBoundingClientRect();
    return {
      x: rect.left + ((p.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - p.y) * rect.height) / 2,
    };
  });
}

test("camera hover describes the miniature, click opens gallery, and dragging never opens it", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openAfterHours(page);
  const point = await cameraPoint(page);
  await page.mouse.move(point.x, point.y);
  await expect(
    page.getByRole("tooltip", { name: "Film photography" }),
  ).toBeVisible();
  await expect(page.getByRole("tooltip")).toContainText(
    "Film photographs and contact sheets.",
  );
  await page.mouse.down();
  await page.mouse.move(point.x + 25, point.y - 15, { steps: 3 });
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "Film photographs" }),
  ).toHaveCount(0);
  // Reset the pose before the next raycast click.
  await page.keyboard.press("r");
  await page
    .getByRole("navigation", { name: "Zine pages" })
    .getByRole("button", { name: "After-hours", exact: true })
    .click();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  const next = await cameraPoint(page);
  await page.mouse.click(next.x, next.y);
  await expect(
    page.getByRole("dialog", { name: "Film photographs" }),
  ).toBeVisible();
  await expect(page.getByText("A collection in the making.")).toBeVisible();
  const project = await page
    .locator(".book-stage")
    .getAttribute("data-project");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".book-stage")).toHaveAttribute(
    "data-project",
    project,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Film photographs" }),
  ).toHaveCount(0);
});

test("gallery presents configured photos and supports keyboard viewing; miniature descriptions pin on keyboard click", async ({
  page,
}) => {
  test.setTimeout(90000);
  const photo = (color) =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="${color}"/></svg>`,
    );
  await page.route("**/src/content/film-photos.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export const filmPhotos=${JSON.stringify([
        {
          src: photo("#bbb"),
          alt: "First test photograph",
          caption: "Frame one",
        },
        {
          src: photo("#555"),
          alt: "Second test photograph",
          caption: "Frame two",
        },
      ])};`,
    }),
  );
  await openAfterHours(page);
  const tennis = page.locator('[data-miniature-control="racket"]');
  await tennis.focus();
  await expect(page.getByRole("tooltip", { name: "Tennis" })).toBeVisible();
  await tennis.press("Enter");
  await expect(page.getByRole("dialog", { name: "Tennis" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Tennis" })).toHaveCount(0);
  const camera = page.locator('[data-miniature-control="camera"]');
  await camera.focus();
  await camera.press("Enter");
  const gallery = page.getByRole("dialog", { name: "Film photographs" });
  await expect(gallery).toBeVisible();
  await gallery
    .getByRole("button", { name: "View First test photograph" })
    .click();
  await expect(
    gallery.getByRole("img", { name: "First test photograph" }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    gallery.getByRole("img", { name: "Second test photograph" }),
  ).toBeVisible();
  await gallery.getByRole("button", { name: "Close film photographs" }).click();
  await expect(gallery).toHaveCount(0);
});

test("phone emergence overshoots smoothly, retains its pose during rotation and has no light effects", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/blank.html");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js"),
      { PhonePreviews } = await import("/src/book/phones.ts"),
      { SkinnedLeaf, createLeafGeometry } = await import("/src/book/leaf.ts");
    const material = new THREE.MeshPhongMaterial({ map: new THREE.Texture() }),
      geometry = createLeafGeometry(),
      leaves = [0, 1].map(
        (i) => new SkinnedLeaf(i, true, 2, geometry, Array(6).fill(material)),
      );
    const previews = new PhonePreviews(
        [{ kind: "project", label: "Phone" }],
        leaves,
      ),
      phone = previews.phones[0],
      sizes = [];
    for (let i = 0; i < 50; i++) {
      previews.step(1 / 60, 0, false);
      sizes.push(phone.root.scale.x);
    }
    const visible = phone.root.visible,
      settled = phone.root.scale.x;
    previews.step(0.1, -1, false);
    const retracts = phone.root.visible && phone.amount < 1;
    previews.step(0.2, -1, false);
    return {
      visible,
      settled,
      peak: Math.max(...sizes),
      startsSmaller: sizes[0] < 0.5,
      retracts,
      folded: previews.folded,
      effects: phone.meshes.some((mesh) => /glow|halo/.test(mesh.name)),
    };
  });
  expect(result.visible).toBe(true);
  expect(result.startsSmaller).toBe(true);
  expect(result.peak).toBeGreaterThan(1);
  expect(result.settled).toBeCloseTo(1, 8);
  expect(result.retracts).toBe(true);
  expect(result.folded).toBe(true);
  expect(result.effects).toBe(false);
});
