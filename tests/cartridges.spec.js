import { test, expect } from "@playwright/test";
import { funFacts } from "../src/cartridge/fun-facts.js";
const names = ["Blizzard Entertainment", "Gmail", "Stadia", "Search", "Early work"];
const dates = ["2017", "2019", "2020 – 2022", "2022 – now", ""];
const bio = "I'm Josh, currently making things for fun at Google.";
const body = "I'm a systems thinker with a knack for micro interactions and finer details. I like figuring out what should exist, what it should feel like, and how to make it happen.";
async function load(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(path);
  await expect(page.locator(".collection")).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-hit2", /"x"/, { timeout: 60000 });
}
async function choose(page, name) {
  const control = page.getByRole("button", { name: `View ${name} cartridge`, exact: true });
  await control.focus(); await control.press("Enter");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-settled", "true", { timeout: 60000 });
}
async function point(page, index) {
  const stage = page.locator(".cartridge-stage"), bounds = await stage.boundingBox();
  const position = JSON.parse(await stage.getAttribute(`data-hit${index}`));
  return { x: bounds.x + position.x, y: bounds.y + position.y };
}

test("career collection uses exact bio and five individually visible, tilted top-edge cartridges", async ({ page, request }) => {
  await load(page);
  const copy = await page.locator("h1").evaluate((el) => {
    const clone = el.cloneNode(true), name = clone.querySelector(".name-toggle");
    name.textContent = name.getAttribute("aria-label").split(",")[0]; return clone.textContent;
  });
  expect(copy).toBe(bio); await expect(page.locator(".bio-details")).toHaveText(body);
  expect(funFacts).toContain(await page.locator(".random-fact").textContent());
  await expect(page.locator(".collection-header").getByRole("button", { name: "About", exact: true })).toHaveCount(0);
  await expect(page.locator(".collection-content,.content-row")).toHaveCount(0);
  await expect(page.locator(".cartridge-keyboard")).toHaveCount(5);
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-view", "tilted-top-edge");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-magnification", "2");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-rest-pitch", "80");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-shadow", "soft-silhouette");
  const hits = [];
  for (let i = 0; i < 5; i++) {
    const facing = Number(await page.locator(".cartridge-stage").getAttribute(`data-front-facing${i}`));
    expect(facing).toBeGreaterThan(.1); expect(facing).toBeLessThan(.25);
    await expect(page.locator(".cartridge-stage")).toHaveAttribute(`data-top-near${i}`, "true");
    hits.push(JSON.parse(await page.locator(".cartridge-stage").getAttribute(`data-hit${i}`)));
  }
  for (let i = 1; i < hits.length; i++) expect(hits[i].y - hits[i - 1].y).toBeGreaterThan(20);
  for (const id of ["blizzard", "gmail", "stadia", "search", "early-work"]) {
    const label = await request.get(`/cartridges/labels/${id}-tonal.svg`); expect(label.ok()).toBe(true);
    expect(await label.text()).not.toMatch(/<text|Josh|Lucas|logo/i);
  }
});

test("all career captions contain only team and supplied dates; early work has no invented dates", async ({ page }) => {
  await load(page);
  for (let i = 0; i < names.length; i++) {
    await choose(page, names[i]);
    const caption = page.locator(".cartridge-caption");
    await expect(caption.locator(":scope > span").first()).toHaveText(names[i]);
    if (dates[i]) await expect(caption.locator(".cartridge-years")).toHaveText(dates[i]);
    else await expect(caption.locator(".cartridge-years")).toHaveCount(0);
    expect((await caption.innerText()).trim()).toBe([names[i], dates[i]].filter(Boolean).join("\n"));
    await expect(page.getByRole("button", { name: "Reset cartridge rotation" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Close cartridge" })).toHaveCount(0);
    const visible = await page.locator(".cartridge-stage").evaluate((el) => [0,1,2,3,4].every((i) => {
      const p = JSON.parse(el.dataset[`hit${i}`]); return p.x > 0 && p.x < el.clientWidth && p.y > 0 && p.y < el.clientHeight;
    }));
    expect(visible).toBe(true);
  }
  await page.getByRole("button", { name: "Open Early work", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Early work", exact: true })).toBeFocused();
  await expect(page.getByText("High school & college", { exact: true }).first()).toBeVisible();
});

test("canvas selection, drag rotation, caption entry and browser history work with the new chronology", async ({ page }) => {
  test.setTimeout(120000); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await load(page); const stage = page.locator(".cartridge-stage"), target = await point(page, 2);
  await page.mouse.click(target.x, target.y);
  await expect(stage).toHaveAttribute("data-selected", "stadia"); await expect(stage).toHaveAttribute("data-settled", "true");
  const before = await stage.getAttribute("data-rotation2"), p = await point(page, 2);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 80, p.y + 25, { steps: 5 }); await page.mouse.up();
  await expect(stage).not.toHaveAttribute("data-rotation2", before); await expect(page.locator(".case-study")).toHaveCount(0);
  await page.keyboard.press("r"); await expect(stage).toHaveAttribute("data-rotation2", before);
  const caption = page.getByRole("button", { name: "Open Stadia, 2020 – 2022", exact: true }); await caption.click();
  await expect(page.getByRole("heading", { name: "Stadia", exact: true })).toBeFocused();
  await expect(page.getByRole("region", { name: "Stadia case study" }).getByText("2020 – 2022", { exact: true })).toBeVisible();
  await page.goBack(); await expect(page.locator(".case-study")).toHaveCount(0); await expect(caption).toBeFocused();
  await page.goForward(); await expect(page.getByRole("region", { name: "Stadia case study" })).toBeVisible(); expect(errors).toEqual([]);
});

test("mobile keeps enlarged cartridges and captions in view, with persistent theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await load(page);
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-composition", "stack-mobile");
  for (const name of ["Blizzard Entertainment", "Search", "Early work"]) {
    await choose(page, name);
    // The long supplied bio and canvas form a scrollable mobile page. Keyboard
    // users can reach the caption normally, even when selection moves its slot.
    await page.locator(".cartridge-caption").focus();
    await expect(page.locator(".cartridge-caption")).toBeInViewport();
    const bounds = await page.locator(".cartridge-caption").boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  const framed = await page.locator(".cartridge-stage").evaluate((el) => {
    const bounds = JSON.parse(el.dataset.frameBounds);
    return bounds.left >= 0 && bounds.top >= 0 && bounds.right <= el.clientWidth && bounds.bottom <= el.clientHeight;
  });
  expect(framed).toBe(true);
  await page.getByRole("button", { name: "Switch to dark mode" }).click(); await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
});

test("without WebGL all five career cartridges retain team/year captions and open their readers", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
  });
  await page.goto("/"); await expect(page.locator(".collection")).toHaveAttribute("data-status", "fallback");
  await expect(page.locator(".cartridge-fallback img")).toHaveCount(5);
  await page.getByRole("button", { name: "Open Gmail cartridge", exact: true }).click();
  await expect(page.getByRole("region", { name: "Gmail case study" })).toBeVisible(); await expect(page.getByRole("region", { name: "Gmail case study" }).getByText("2019", { exact: true })).toBeVisible();
});

test("Search and legacy AI Mode deep links remain readable", async ({ page }) => {
  await page.goto("/?project=ai-mode&view=case-study"); await expect(page.getByRole("region", { name: "Search case study" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Search case study" }).getByText("2022 – now", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Back to collection/ }).first().click();
  await expect(page.locator(".case-study")).toHaveCount(0); await expect(page.locator(".collection")).toHaveAttribute("data-selected", "search");
});

test("zine snapshot is downloadable and preserved edition remains runnable", async ({ page, request }) => {
  test.setTimeout(120000);
  const response = await request.get("/versions/portfolio-zine-v1-source.zip"); expect(response.ok()).toBe(true);
  const bytes = await response.body(); expect(bytes.subarray(0, 2).toString()).toBe("PK"); expect(bytes.length).toBeGreaterThan(100000);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/zine/?project=about");
  await expect(page.locator(".spellbook")).toHaveAttribute("data-presentation", "ready", { timeout: 90000 });
  await expect(page.locator(".book-stage")).toHaveAttribute("data-phase", "ready", { timeout: 90000 });
});


test("medium-weight name toggles in both directions with keyboard access and the anecdote matches bio type size", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /show full name/i });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const before = await toggle.evaluate((el) => el.getBoundingClientRect().width);
  expect(await toggle.evaluate((el) => Number(getComputedStyle(el).fontWeight))).toBe(500);
  await toggle.click();
  await expect(page.getByRole("button", { name: /show short name/i })).toHaveAttribute("aria-expanded", "true");
  expect(await page.getByRole("button", { name: /show short name/i }).evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(before + 50);
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(await page.locator(".collection-intro").evaluate((el) => {
    const bio = getComputedStyle(el.querySelector("h1")), fact = getComputedStyle(el.querySelector(".random-fact"));
    return { size: bio.fontSize === fact.fontSize, lineHeight: bio.lineHeight === fact.lineHeight };
  })).toEqual({ size: true, lineHeight: true });
});

test("each load chooses a supplied fact without immediate repeats; interactions keep the current one", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
  });
  await page.goto("/"); let previous = "";
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(".collection")).toHaveAttribute("data-status", "fallback");
    const fact = await page.locator(".random-fact").textContent();
    expect(funFacts).toContain(fact); expect(fact).not.toBe(previous); previous = fact;
    if (i < 3) await page.reload();
  }
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByRole("button", { name: /show full name/i }).click();
  expect(await page.locator(".random-fact").textContent()).toBe(previous);
});

test("the zine film camera appears at the desktop viewport bottom and stays clear of mobile content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await load(page);
  const camera = page.locator(".film-camera-dock");
  await expect(camera).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await expect(camera).toBeVisible(); await expect(camera.locator("canvas")).toHaveCount(1);
  const bounds = await camera.boundingBox();
  expect(bounds.bottom ?? bounds.y + bounds.height).toBeLessThanOrEqual(1000);
  expect(bounds.y).toBeGreaterThan(850);
  expect(await page.evaluate(() => performance.getEntriesByType("resource").some((r) => r.name.includes("BookScene")))).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await camera.evaluate((el) => getComputedStyle(el).position)).toBe("relative");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await choose(page, "Stadia"); await page.locator(".cartridge-caption").click();
  await expect(camera).toBeHidden();
});

test("shell halves and their inset seam have separate surfaces", async ({ page }) => {
  await page.goto("/tests/fixtures/blank.html");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { makeCartridge } = await import("/src/cartridge/model.ts");
    const group = makeCartridge("#555555", new THREE.Texture(), new THREE.Texture());
    const bounds = (name) => { const b = new THREE.Box3().setFromObject(group.getObjectByName(name)); return { min: b.min.z, max: b.max.z }; };
    return { front: bounds("Front shell"), back: bounds("Back shell"), seam: bounds("Shell seam"), label: bounds("Label"), surround: bounds("Recessed label surround") };
  });
  expect(result.front.min).toBeGreaterThan(result.back.max);
  expect(result.seam.min).toBeGreaterThanOrEqual(result.back.max - 1e-6);
  expect(result.seam.max).toBeLessThan(result.front.min);
  expect(result.label.min).toBeGreaterThan(result.surround.max + .001);
});

test("opening poses remain separated through interrupted selection and full rotation", async ({ page }) => {
  test.setTimeout(120000);
  await load(page);
  await page.evaluate(() => {
    window.intersectionsSeen = []; window.orderChanges = [];
    const stage = document.querySelector(".cartridge-stage");
    new MutationObserver(() => {
      if (Number(stage.dataset.intersections) > 0) window.intersectionsSeen.push(stage.dataset.intersections);
      const ys = [0,1,2,3,4].map(i => Number(stage.dataset[`position${i}`].split(",")[1]));
      if (ys.some((y, i) => i > 0 && y >= ys[i - 1])) window.orderChanges.push(ys);
    }).observe(stage, { attributes: true, attributeFilter: ["data-intersections"] });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // A direct middle selection previously let two lower neighbors exchange
  // slots and prevented settling, despite the final target poses being clear.
  await page.getByRole("button", { name: "View Stadia cartridge", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  for (const name of ["Gmail", "Early work", "Blizzard Entertainment", "Stadia"]) {
    const control = page.getByRole("button", { name: `View ${name} cartridge`, exact: true }); await control.focus(); await control.press("Enter");
  }
  const stage = page.locator(".cartridge-stage");
  await expect(stage).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  await expect(stage).toHaveAttribute("data-intersections", "0");
  expect(Number(await stage.getAttribute("data-front-facing2"))).toBeGreaterThan(.98);
  for (const i of [0, 1, 3, 4]) {
    const facing = Number(await stage.getAttribute(`data-front-facing${i}`));
    expect(facing).toBeGreaterThan(.1); expect(facing).toBeLessThan(.25);
  }
  const positions = await stage.evaluate((el) => [0,1,2,3,4].map(i => el.dataset[`position${i}`].split(",").map(Number)));
  expect(positions[1][1]).toBeGreaterThan(positions[2][1]);
  expect(positions[3][1]).toBeLessThan(positions[2][1]);
  const p = await point(page, 2);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 220, p.y + 45, { steps: 8 }); await page.mouse.up();
  await expect(stage).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  await expect(stage).toHaveAttribute("data-intersections", "0");
  expect(await page.evaluate(() => window.intersectionsSeen)).toEqual([]);
  expect(await page.evaluate(() => window.orderChanges)).toEqual([]);
});

test("intro words sweep in reading order and name extensions animate reversibly", async ({ page }) => {
  // Isolate DOM motion from GPU timing; these interactions also work in fallback.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
  });
  await page.goto("/");
  await page.locator(".intro-word").first().waitFor();
  const sweep = await page.locator(".intro-word").evaluateAll((elements) => {
    const values = elements.map((el) => {
      const animation = el.getAnimations()[0]; animation.pause(); animation.currentTime = 600;
      const style = getComputedStyle(el);
      return { delay: parseFloat(style.animationDelay), opacity: Number(style.opacity), blur: style.filter, duration: style.animationDuration };
    });
    return values;
  });
  expect(sweep[0].opacity).toBeGreaterThan(sweep.at(-1).opacity);
  expect(sweep[0].duration).toBe("0.7s"); expect(sweep[0].blur).toMatch(/blur/);
  expect(sweep.every((value, i) => i === 0 || value.delay > sweep[i - 1].delay)).toBe(true);
  const toggle = page.locator(".name-toggle");
  await toggle.click({ force: true });
  const transitions = await toggle.locator(".name-extension").evaluateAll((els) => els.map((el) => ({ duration: getComputedStyle(el).transitionDuration, delay: getComputedStyle(el).transitionDelay })));
  expect(transitions).toEqual([{ duration: "0.32s", delay: "0s" }, { duration: "0.32s", delay: "0.06s" }]);
  await toggle.press("Space"); await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await toggle.locator(".name-extension").first().evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(reduced).toBeLessThan(.001);
});
