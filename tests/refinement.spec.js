import { test, expect } from "@playwright/test";

test("card progress waits for real asset readiness, reaches ten, then reveals", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/models/google-g.svg", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  const progress = page.getByRole("progressbar", {
    name: "Preparing your zine",
    includeHidden: true,
  });
  await expect(progress).toBeVisible();
  await expect(progress).toHaveAttribute("aria-valuenow", "30");
  await page.waitForTimeout(350);
  await expect(progress).toHaveAttribute("aria-valuenow", "30");
  expect(
    await page.locator(".spellbook").getAttribute("data-presentation"),
  ).toBe("loading");
  release();
  await expect(progress).toHaveAttribute("aria-valuenow", "100", {
    timeout: 45000,
  });
  await expect(page.locator(".spellbook")).toHaveAttribute(
    "data-presentation",
    "ready",
    { timeout: 20000 },
  );
});

test("shared leaf shapes retain closed-cover clearance and ordering through reversals", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/blank.html");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { SkinnedLeaf, createLeafGeometry } =
      await import("/src/book/leaf.ts");
    const { TurnScheduler } = await import("/src/book/turn-scheduler.ts");
    const paper = createLeafGeometry(),
      cover = createLeafGeometry(0.012),
      material = new THREE.MeshPhongMaterial({ map: new THREE.Texture() });
    const leaves = Array.from(
      { length: 5 },
      (_, i) =>
        new SkinnedLeaf(
          i,
          i === 0 || i === 4,
          5,
          i === 0 || i === 4 ? cover : paper,
          Array(6).fill(material),
        ),
    );
    const scheduler = new TurnScheduler(leaves);
    scheduler.request(5);
    let ordered = true;
    for (let i = 0; i < 620; i++) {
      if (i === 25) scheduler.request(0);
      if (i === 52) scheduler.request(5);
      if (i === 210) scheduler.request(0);
      scheduler.step(1 / 60, 0);
      for (let j = 0; j < 4; j++)
        ordered &&= leaves[j].progress + 1e-8 >= leaves[j + 1].progress;
    }
    let clearance = Infinity;
    for (let i = 0; i < 4; i++)
      for (let bone = 0; bone <= 30; bone++) {
        const a = leaves[i].bones[bone].getWorldPosition(new THREE.Vector3()),
          b = leaves[i + 1].bones[bone].getWorldPosition(new THREE.Vector3());
        clearance = Math.min(clearance, a.y - b.y);
      }
    leaves.forEach((leaf) => leaf.snap(0.5));
    let midwayClearance = Infinity;
    for (let i = 0; i < 4; i++)
      midwayClearance = Math.min(
        midwayClearance,
        leaves[i].group.position.distanceTo(leaves[i + 1].group.position),
      );
    const values = {
      midwayClearance,
      ordered,
      clearance,
      boundary: scheduler.committed,
      settled: leaves.every((l) => l.settled),
    };
    leaves.forEach((l) => l.dispose());
    paper.dispose();
    cover.dispose();
    material.dispose();
    return values;
  });
  expect(result.ordered).toBe(true);
  expect(result.settled).toBe(true);
  expect(result.boundary).toBe(0);
  expect(result.clearance).toBeGreaterThan(0.012);
  expect(result.midwayClearance).toBeGreaterThan(0.015);
});

test("MP4 and GIF previews load only when selected, stop for turns and respect reduced motion", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/blank.html");
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { SkinnedLeaf, createLeafGeometry } =
      await import("/src/book/leaf.ts");
    const { PhonePreviews } = await import("/src/book/phones.ts");
    const geometry = createLeafGeometry(),
      material = new THREE.MeshPhongMaterial({ map: new THREE.Texture() });
    const leaves = Array.from(
      { length: 3 },
      (_, i) =>
        new SkinnedLeaf(i, i === 0, 3, geometry, Array(6).fill(material)),
    );
    window.previews = new PhonePreviews(
      [
        {
          kind: "project",
          label: "MP4",
          theme: "stadia",
          previewVideo: "/tests/fixtures/preview.mp4",
        },
        {
          kind: "project",
          label: "GIF",
          theme: "ai",
          previewGif: "/tests/fixtures/preview.gif",
        },
      ],
      leaves,
    );
    window.previews.step(0.1, 0, true);
  });
  expect(
    await page.evaluate(() =>
      window.previews.phones.every((p) => !p.media && !p.video),
    ),
  ).toBe(true);
  await page.evaluate(() => window.previews.step(0.1, 0, false));
  await expect
    .poll(() => page.evaluate(() => !!window.previews.phones[0].media))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.previews.phones[0].video.paused))
    .toBe(false);
  await page.evaluate(() => window.previews.step(0.1, -1, false));
  expect(
    await page.evaluate(() => window.previews.phones[0].video.paused),
  ).toBe(true);
  await page.evaluate(() => window.previews.step(0.1, 1, false));
  await expect
    .poll(() => page.evaluate(() => !!window.previews.phones[1].frames))
    .toBe(true);
  const before = await page.evaluate(() =>
    window.previews.phones[1].canvas.toDataURL(),
  );
  await page.evaluate(() => window.previews.step(0.11, 1, false));
  expect(
    await page.evaluate(() => window.previews.phones[1].canvas.toDataURL()),
  ).not.toBe(before);
  await page.evaluate(() => window.previews.step(0.11, 1, true));
  const still = await page.evaluate(() =>
    window.previews.phones[1].canvas.toDataURL(),
  );
  await page.evaluate(() => window.previews.step(0.5, 1, true));
  expect(
    await page.evaluate(() => window.previews.phones[1].canvas.toDataURL()),
  ).toBe(still);
  await page.evaluate(() => window.previews.dispose());
  expect(
    await page.evaluate(() =>
      window.previews.phones[0].video.getAttribute("src"),
    ),
  ).toBe(null);
});

test("a video finishing its load after reduced motion is enabled stays paused", async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route("**/tests/fixtures/preview.mp4", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/tests/fixtures/blank.html");
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { SkinnedLeaf, createLeafGeometry } =
      await import("/src/book/leaf.ts");
    const { PhonePreviews } = await import("/src/book/phones.ts");
    const material = new THREE.MeshPhongMaterial({ map: new THREE.Texture() }),
      geometry = createLeafGeometry();
    const leaves = [0, 1].map(
      (i) => new SkinnedLeaf(i, true, 2, geometry, Array(6).fill(material)),
    );
    window.pendingPreview = new PhonePreviews(
      [
        {
          kind: "project",
          label: "Video",
          theme: "stadia",
          previewVideo: "/tests/fixtures/preview.mp4",
        },
      ],
      leaves,
    );
    window.pendingPreview.step(0.1, 0, false);
    window.pendingPreview.step(0.1, 0, true);
  });
  release();
  await expect
    .poll(() => page.evaluate(() => !!window.pendingPreview.phones[0].media))
    .toBe(true);
  expect(
    await page.evaluate(() => window.pendingPreview.phones[0].video.paused),
  ).toBe(true);
  await page.evaluate(() => window.pendingPreview.dispose());
});
