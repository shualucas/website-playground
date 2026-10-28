import { test, expect } from "@playwright/test";

test("About miniatures have no tooltip, After-hours has no extra menu, and the camera remains keyboard accessible", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?project=about");
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-presentation",
    "ready",
    { timeout: 60000 },
  );
  await page.evaluate(async () => {
    const source = performance
      .getEntriesByType("resource")
      .find((e) => e.name.includes("/src/book/BookScene.ts")).name;
    const { BookScene } = await import(source),
      render = BookScene.prototype.render;
    BookScene.prototype.render = function () {
      window.clayScene = this;
      return render.call(this);
    };
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  const point = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js"),
      book = window.clayScene,
      rect = book.host.getBoundingClientRect();
    for (const mesh of book.popups.hitMeshes) {
      const p = new THREE.Box3()
          .setFromObject(mesh)
          .getCenter(new THREE.Vector3())
          .project(book.camera),
        point = {
          clientX: rect.left + ((p.x + 1) * rect.width) / 2,
          clientY: rect.top + ((1 - p.y) * rect.height) / 2,
        };
      if (book.bookHit(point)?.object.userData.popup)
        return { x: point.clientX, y: point.clientY };
    }
    throw new Error("No visible About miniature hit");
  });
  await page.mouse.move(point.x, point.y);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.locator("[data-miniature-control]")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Zine pages" })
    .getByRole("button", { name: "After-hours", exact: true })
    .click();
  await expect(page.locator(".miniature-access,.about-note")).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(1);
  const camera = page.locator('[data-miniature-control="camera"]');
  await camera.focus();
  await camera.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Film photographs" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(camera).toBeFocused();
});

test("the new ASCII contour field prints through the page center and animates without a reserved window", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/blank.html");
  const result = await page.evaluate(async () => {
    const { AsciiPortal } = await import("/src/book/ascii.ts"),
      art = new AsciiPortal(["#111111", "#777777"]),
      ctx = art.canvas.getContext("2d");
    const painted = (x, y, w, h) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]) n++;
      return n;
    };
    const center = painted(250, 350, 250, 300),
      corner = painted(0, 0, 100, 100),
      before = art.canvas.toDataURL();
    const unchanged = art.draw(0),
      changed = art.draw(0.5);
    return {
      center,
      corner,
      unchanged,
      changed,
      different: before !== art.canvas.toDataURL(),
    };
  });
  expect(result.center).toBeGreaterThan(500);
  expect(result.corner).toBeGreaterThan(30);
  expect(result.unchanged).toBe(false);
  expect(result.changed).toBe(true);
  expect(result.different).toBe(true);
});
