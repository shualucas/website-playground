import { test, expect } from "@playwright/test";
import { funFacts } from "../src/cartridge/fun-facts.js";

// Keep UI checks independent of the private local API key and live listening.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/listening", route => route.fulfill({ status:204 }));
  await page.route("**/api/weather", route => route.fulfill({ contentType:"application/json", body:JSON.stringify({ temperature:58, condition:"Fog", city:"San Francisco" }) }));
});
const names = ["Search", "Stadia", "Gmail", "Blizzard Entertainment", "Early work"];
const dates = ["2022 – now", "2020 – 2022", "2019", "2017", "Before 2017"];
const body = "based in beautiful California, building fun things at Google.";
async function load(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(path);
  await expect(page.locator(".collection")).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 60000 });
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
  await expect(page.locator(".miniature-loader")).toHaveCount(0);
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-selected", "");
  await expect(page.getByRole("button", { name: "Josh, show full name" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".role-rotator")).toHaveAttribute("data-role", "product designer");
  await expect(page.locator(".bio-continuation")).toHaveText(body);
  expect(funFacts).toContain(await page.locator(".random-fact").textContent());
  await expect(page.locator(".collection-header").getByRole("button", { name: "About", exact: true })).toHaveCount(0);
  await expect(page.locator(".collection-content,.content-row")).toHaveCount(0);
  await expect(page.locator(".cartridge-keyboard")).toHaveCount(5);
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-view", "tilted-top-edge");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-magnification", "3");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-rest-pitch", "80");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-shadow", "soft-silhouette");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-model", "external-glb");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-order", "search,stadia,gmail,blizzard,early-work");
  const projected = JSON.parse(await page.locator(".cartridge-stage").getAttribute("data-frame-bounds"));
  expect(projected.right - projected.left).toBeGreaterThan(375);
  expect(projected.right - projected.left).toBeLessThan(430);
  const intro = await page.locator(".collection-intro").boundingBox(), stage = await page.locator(".cartridge-stage").boundingBox();
  const hero = await page.locator(".collection-hero").boundingBox();
  expect(hero.width).toBe(960);
  expect(await page.locator(".collection-hero").evaluate(el=>getComputedStyle(el).columnGap)).toBe("140px");
  const footerBounds = await page.locator(".collection-footer").boundingBox();
  expect(Math.abs(footerBounds.x - intro.x)).toBeLessThan(2);
  expect(Math.abs(footerBounds.x + footerBounds.width - stage.x - projected.right)).toBeLessThan(20);
  expect(Math.abs(intro.y + intro.height / 2 - stage.y - stage.height / 2)).toBeLessThan(1);
  const rightGutter = page.viewportSize().width - stage.x - projected.right;
  expect(Math.abs(intro.x - rightGutter)).toBeLessThan(20);
  expect(await page.locator(".bio-continuation").evaluate((el) => getComputedStyle(el).fontSize)).toBe("23px");
  const hits = [];
  for (let i = 0; i < 5; i++) {
    const facing = Number(await page.locator(".cartridge-stage").getAttribute(`data-front-facing${i}`));
    expect(facing).toBeGreaterThan(.1); expect(facing).toBeLessThan(.25);
    await expect(page.locator(".cartridge-stage")).toHaveAttribute(`data-top-near${i}`, "true");
    hits.push(JSON.parse(await page.locator(".cartridge-stage").getAttribute(`data-hit${i}`)));
  }
  for (let i = 1; i < hits.length; i++) expect(hits[i].y - hits[i - 1].y).toBeGreaterThan(20);
  for (const id of ["blizzard", "gmail", "stadia", "search", "early-work"]) {
    const label = await request.get(`/cartridges/labels/${id}-label.svg`); expect(label.ok()).toBe(true);
    expect(await label.text()).toMatch(/<title[^>]*>.+<\/title>/);
    expect(await label.text()).not.toMatch(/Josh|Lucas|1997|2011/);
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
      const x = parseFloat(el.style.getPropertyValue(`--hit-${i}-x`)), y = parseFloat(el.style.getPropertyValue(`--hit-${i}-y`)); return x >= 22 && x <= el.clientWidth - 22 && y >= 22 && y <= el.clientHeight - 22;
    }));
    expect(visible).toBe(true);
  }
  await page.getByRole("button", { name: "Open Early work, Before 2017", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Early work", exact: true })).toBeFocused();
  await expect(page.getByText("High school & college", { exact: true }).first()).toBeVisible();
});

test("canvas selection, drag rotation, caption entry and browser history work with the new chronology", async ({ page }) => {
  test.setTimeout(120000); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await load(page); const stage = page.locator(".cartridge-stage"), target = await point(page, 1);
  await page.mouse.click(target.x, target.y);
  await expect(stage).toHaveAttribute("data-selected", "stadia"); await expect(stage).toHaveAttribute("data-settled", "true");
  const caption = page.getByRole("button", { name: "Open Stadia, 2020 – 2022", exact: true });
  const captionBefore = await caption.boundingBox();
  for (const text of await caption.locator(":scope > span").all()) expect(await text.evaluate(el => getComputedStyle(el).fontWeight)).toBe("700");
  const before = await stage.getAttribute("data-rotation1"), p = await point(page, 1);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 80, p.y + 25, { steps: 5 }); await page.mouse.up();
  await expect(stage).not.toHaveAttribute("data-rotation1", before); await expect(page.locator(".case-study")).toHaveCount(0);
  const captionAfter = await caption.boundingBox();
  expect(captionAfter.x).toBeCloseTo(captionBefore.x, 1); expect(captionAfter.y).toBeCloseTo(captionBefore.y, 1);
  await page.keyboard.press("r"); await expect(stage).toHaveAttribute("data-rotation1", before);
  await caption.click();
  await expect(page.getByRole("heading", { name: "Stadia", exact: true })).toBeFocused();
  await expect(page.getByRole("region", { name: "Stadia case study" }).getByText("2020–2022", { exact: true })).toBeVisible();
  await page.goBack(); await expect(page.locator(".case-study")).toHaveCount(0); await expect(caption).toBeFocused();
  await page.goForward(); await expect(page.getByRole("region", { name: "Stadia case study" })).toBeVisible(); expect(errors).toEqual([]);
});

test("mobile keeps enlarged cartridges and captions in view, with persistent theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await load(page);
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-composition", "stack-mobile");
  for (const name of ["Blizzard Entertainment", "Search", "Early work"]) {
    await choose(page, name);
    // The long supplied bio and canvas form a scrollable mobile page. Keyboard
    // users can reach the fixed caption normally after selecting a cartridge.
    await page.locator(".cartridge-caption").focus();
    await expect(page.locator(".cartridge-caption")).toBeInViewport();
    const bounds = await page.locator(".cartridge-caption").boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  const framed = await page.locator(".cartridge-stage").evaluate((el) => {
    const bounds = JSON.parse(el.dataset.selectedFrame);
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
  await page.goto("/?project=ai-mode&view=case-study");
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 60000 });
  await expect(page.getByRole("region", { name: "Search case study" })).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Download zine source" })).toHaveAttribute("href", "/versions/portfolio-zine-v1-source.zip");
  await expect(page.getByRole("link", { name: "Download zine source" })).toHaveAttribute("download", "");
});


test("Josh expands to Josh Lucas at medium weight and reduced-motion readers can explore each role by keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 60000 });
  expect(await page.locator(".portfolio-name").evaluate((el) => Number(getComputedStyle(el).fontWeight))).toBe(500);
  const name = page.locator(".intro-name");
  await expect(name).toHaveAccessibleName("Josh, show full name");
  await name.focus(); await name.press("Enter");
  await expect(name).toHaveAttribute("aria-expanded", "true"); await expect(name).toHaveAccessibleName("Josh Lucas, show short name");
  await expect.poll(async () => (await page.locator(".name-surname").boundingBox()).width).toBeGreaterThan(30);
  await name.press("Enter"); await expect(name).toHaveAttribute("aria-expanded", "false");
  await expect.poll(async () => (await page.locator(".name-surname").boundingBox()).width).toBeLessThan(1);
  const role = page.locator(".role-rotator"); await role.focus();
  expect(await role.evaluate(el => getComputedStyle(el).fontWeight)).toBe("500");
  for (const label of ["product designer", "merch maker", "brand builder", "prototyper", "systems thinker", "storyteller", "community organizer"]) {
    await expect(role).toHaveAttribute("data-role", label);
    await expect(role).toHaveAttribute("data-paused", "true");
    await page.keyboard.press("Enter");
  }
  await expect(role).toHaveAttribute("data-role", "product designer");
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
  await page.getByRole("button", { name: /next role/i }).click();
  expect(await page.locator(".random-fact").textContent()).toBe(previous);
});

test("the camera is centered in the footer, floats only in view, and respects reduced motion", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 }); await load(page);
  const camera = page.locator(".film-camera-dock");
  await camera.scrollIntoViewIfNeeded();
  await expect(camera).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await expect(camera).toBeVisible(); await expect(camera.locator("canvas")).toHaveCount(1);
  expect(await camera.evaluate((el) => getComputedStyle(el).position)).toBe("relative");
  const footer = await page.locator(".collection-footer").boundingBox(), bounds = await camera.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(footer.y);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(footer.y + footer.height);
  expect(Math.abs(bounds.x + bounds.width / 2 - (footer.x + footer.width / 2))).toBeLessThan(1);
  await expect(page.locator(".footer-camera figcaption")).toHaveText("say cheese");
  expect(await page.evaluate(() => performance.getEntriesByType("resource").some((r) => r.name.includes("BookScene")))).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await camera.scrollIntoViewIfNeeded();
  expect(await camera.evaluate((el) => getComputedStyle(el).position)).toBe("relative");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(camera).toHaveAttribute("data-motion", "ambient");
  await expect(camera).toHaveAttribute("data-float", /,/);
  const before = await camera.getAttribute("data-float");
  await expect.poll(() => camera.getAttribute("data-float")).not.toBe(before);
  await page.evaluate(() => scrollTo(0, 0)); await expect(camera).toHaveAttribute("data-motion", "idle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await camera.scrollIntoViewIfNeeded(); await expect(camera).toHaveAttribute("data-motion", "reduced");
  await choose(page, "Stadia"); await page.locator(".cartridge-caption").click();
  await expect(camera).toBeHidden();
  await expect(camera).toHaveAttribute("data-motion", "reduced");
});

test("footer links and music stay usable on small screens without WebGL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
  });
  await page.goto("/");
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true");
  await expect(page.locator(".collection-header").getByRole("link", { name: "Zine edition" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download zine source" })).toHaveCount(0);
  const footer = page.locator(".collection-footer");
  await expect(footer.getByRole("link", { name: "shualucas on X" })).toHaveAttribute("href", "https://x.com/shualucas");
  await expect(footer.locator("figcaption")).toHaveText("say cheese");
  await expect(footer.locator(".now-playing")).toHaveAttribute("href", "https://www.last.fm/user/shualucas");
  const href = await footer.locator(".now-playing").getAttribute("href");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(footer.locator(".now-playing")).toHaveAttribute("href", href);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  expect(Number(await stage.getAttribute("data-front-facing1"))).toBeGreaterThan(.98);
  for (const i of [0, 2, 3, 4]) {
    const facing = Number(await stage.getAttribute(`data-front-facing${i}`));
    expect(facing).toBeGreaterThan(.1); expect(facing).toBeLessThan(.25);
  }
  const positions = await stage.evaluate((el) => [0,1,2,3,4].map(i => el.dataset[`position${i}`].split(",").map(Number)));
  expect(positions[0][1]).toBeGreaterThan(positions[1][1]);
  expect(positions[2][1]).toBeLessThan(positions[1][1]);
  expect(positions[0][1] - positions[1][1]).toBeLessThan(1.6);
  expect(positions[1][1] - positions[2][1]).toBeLessThan(1.9);
  const p = await point(page, 1);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 220, p.y + 45, { steps: 8 }); await page.mouse.up();
  await expect(stage).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  await expect(stage).toHaveAttribute("data-intersections", "0");
  expect(await page.evaluate(() => window.intersectionsSeen)).toEqual([]);
  expect(await page.evaluate(() => window.orderChanges)).toEqual([]);
});

test("intro words still sweep in reading order", async ({ page }) => {
  // Isolate DOM motion from GPU timing; these interactions also work in fallback.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
  });
  await page.goto("/");
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 60000 });
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
});


test("all seven lowercase roles cycle, with a shared entrance and pause/resume", async ({ page }) => {
  const initial = new Date("2026-10-29T12:00:00Z"); await page.clock.install({time:initial}); await page.clock.pauseAt(initial);
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.goto("/"); const role=page.locator(".role-rotator");
  await expect(role).toHaveAttribute("data-ready","false");
  expect(await page.locator(".role-entrance").evaluate(el=>getComputedStyle(el).animationName)).toBe("intro-reveal");
  await page.clock.runFor(1001); await expect(role).toHaveAttribute("data-ready","true");
  const labels=["product designer","merch maker","brand builder","prototyper","systems thinker","storyteller","community organizer"];
  for(const label of labels){
    await expect(role).toHaveAttribute("data-role",label);
    if(label.includes(" ")) expect(await role.locator(".role-suffix").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
    await page.clock.fastForward(2001); await expect(role.locator(".role-label")).toHaveClass(/is-leaving/); await page.clock.fastForward(280);
  }
  await expect(role).toHaveAttribute("data-role",labels[0]); await role.click();await page.clock.fastForward(10000);await expect(role).toHaveAttribute("data-role",labels[0]);
  await role.click();await page.clock.fastForward(2281);await expect(role).toHaveAttribute("data-role",labels[1]);
});

test("the upstream GLB decodes locally with wide proportions and per-team shell/label materials", async ({ page }) => {
  await page.goto("/tests/fixtures/blank.html");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { loadExternalShell } = await import("/src/cartridge/model.ts");
    const model = await loadExternalShell(new THREE.Texture(), "#da4c73");
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const labels = [], shells = [], paper = [], boards = [];
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (o.userData.label) labels.push({ flipY: m.map.flipY, uv: Boolean(o.geometry.attributes.uv) });
        if (m.name === "Cartridge Shell") shells.push(m.color.getHexString());
        if (m.name === "Label (Paper)") paper.push(m.visible);
        if (m.name === "Green PCB with gold contacts") boards.push({ uv: Boolean(o.geometry.attributes.uv), colorMap: m.map?.image.width, metalMap: m.metalnessMap?.image.width });
      }
    });
    return { size: size.toArray(), cartridge: Boolean(model.getObjectByName("Cartridge")), labels, shells, paper, boards };
  });
  expect(result.cartridge).toBe(true); expect(result.size[0]).toBeCloseTo(2.4, 3);
  expect(result.size[1]).toBeLessThan(2); expect(result.size[2]).toBeLessThan(.6);
  expect(result.labels.length).toBeGreaterThan(0); expect(result.labels.every(l => !l.flipY && l.uv)).toBe(true);
  expect(result.shells.length).toBeGreaterThan(0); expect(result.shells.every(c => c === "da4c73")).toBe(true);
  expect(result.paper).toEqual([false]);
  expect(result.boards).toEqual([{ uv: true, colorMap: 512, metalMap: 512 }, { uv: true, colorMap: 512, metalMap: 512 }]);
});

test("the bio appears without a loader, and stale project URLs start with no selection", async ({ page }) => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/src/cartridge/CartridgeScene*", async route => { await gate; await route.continue(); });
  await page.goto("/?project=gmail");
  await expect(page.locator(".portfolio-name")).toBeVisible();
  await expect(page.locator(".miniature-loader")).toHaveCount(0);
  await expect(page.locator(".collection")).toHaveAttribute("data-selected", "");
  release(); await expect(page.locator(".collection")).toHaveAttribute("data-status", "ready", {timeout:60000});
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-selected", "");
  await expect(page).not.toHaveURL(/project=/);
  const muted = await page.locator(".intro-muted").evaluateAll(elements => elements.map(element => getComputedStyle(element).color));
  const bodyColor = await page.locator(".bio-continuation").evaluate(element => getComputedStyle(element).color);
  expect(muted).toEqual([bodyColor, bodyColor]);
});

test("translucent shells retain opaque labels and team-specific finishes", async ({ page }) => {
  await page.goto("/tests/fixtures/blank.html");
  const finishes = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { cartridges } = await import("/src/cartridge/config.ts");
    const { loadExternalShell } = await import("/src/cartridge/model.ts");
    const result = {};
    for (const config of cartridges) {
      const model = await loadExternalShell(new THREE.Texture(), config.shell, undefined, config.finish);
      const shells = [], labels = [];
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          const finish = { transmission: material.transmission ?? 0, opacity: material.opacity, transparent: material.transparent, color: material.color?.getHexString() };
          if (material.name === "Cartridge Shell") shells.push(finish);
          if (object.userData.label) labels.push(finish);
        }
      });
      result[config.id] = { shells, labels };
    }
    return result;
  });
  for (const { shells, labels } of Object.values(finishes)) {
    expect(shells.length).toBeGreaterThan(0); expect(labels.length).toBeGreaterThan(0);
    expect(shells.every((m) => m.opacity === 1 && !m.transparent)).toBe(true);
    expect(labels.every((m) => m.transmission === 0 && m.opacity === 1 && !m.transparent)).toBe(true);
  }
  expect(finishes.search.shells.every((m) => m.transmission > 0 && m.transmission < .5)).toBe(true);
  expect(finishes.blizzard.shells.every((m) => m.transmission > .5)).toBe(true);
  expect(finishes.gmail.shells.every((m) => m.transmission > .5)).toBe(true);
  expect(finishes.stadia.shells.every((m) => m.transmission > .8)).toBe(true);
});

test("camera drag rotates without navigation; keyboard entry opens the new photo and zine page", async ({ page }) => {
  test.setTimeout(120000);
  await load(page);
  const link = page.getByRole("link", { name: "Explore zine and film photographs" }), camera = page.locator(".film-camera-dock");
  await link.scrollIntoViewIfNeeded(); await expect(camera).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  const bounds = await link.boundingBox(), before = await camera.getAttribute("data-rotation");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 85, bounds.y + bounds.height / 2 + 35, { steps: 5 }); await page.mouse.up();
  await expect(camera).not.toHaveAttribute("data-rotation", before ?? "");
  await expect(page).not.toHaveURL(/after-hours/);
  const rotated = await camera.getAttribute("data-rotation");
  await link.focus(); await page.keyboard.press("ArrowLeft"); await expect(camera).not.toHaveAttribute("data-rotation", rotated);
  await page.keyboard.press("r"); await expect(camera).toHaveAttribute("data-rotation", "0,0,0");
  await page.keyboard.press("Enter"); await expect(page).toHaveURL(/\/after-hours\/$/);
  await expect(page.getByRole("region", { name: "Interactive cover-only zine" })).toBeVisible();
  await expect(page.locator(".after-hours-film,.after-hours-zine")).toHaveCount(0);
  await expect(page.locator(".after-hours-book")).toHaveAttribute("data-phase","ready",{timeout:90000});
  await page.reload(); await expect(page.getByRole("region", { name: "Interactive cover-only zine" })).toBeVisible();
  await page.goBack(); await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 60000 });
  await expect(page.locator(".camera-page-flash")).toHaveCount(0);
});

test("camera click uses a single flash, with an accessible fallback and mobile destination", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
    window.cameraFlashed = false;
    new MutationObserver(() => { if (document.querySelector('.camera-page-flash')) { window.cameraFlashed = true; sessionStorage.setItem('camera-flash-tested','yes'); } }).observe(document,{childList:true,subtree:true});
  });
  await page.goto("/"); await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 15000 });
  await page.getByRole("link", { name: "Explore zine and film photographs" }).click();
  await expect(page).toHaveURL(/\/after-hours\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem('camera-flash-tested'))).toBe('yes');
  await expect(page.locator("html")).toHaveAttribute("data-camera-entry", "true");
  await expect(page.getByRole("region", { name: "Interactive cover-only zine" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("camera coasts after release, and selected cartridges drift without changing heading", async ({ page }) => {
  test.setTimeout(120000);
  await load(page); await page.emulateMedia({ reducedMotion: "no-preference" });
  const link = page.getByRole("link", { name: "Explore zine and film photographs" }), camera = page.locator(".film-camera-dock");
  await link.scrollIntoViewIfNeeded(); await expect(camera).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  const b = await link.boundingBox(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2+45,b.y+b.height/2+15,{steps:6});await page.mouse.up();
  const released = await camera.getAttribute("data-rotation");
  await expect.poll(() => camera.getAttribute("data-rotation")).not.toBe(released);
  await expect(camera).toHaveAttribute("data-coasting", "false", { timeout:10000 });
  await expect(page).not.toHaveURL(/after-hours/);
  await choose(page,"Gmail");
  const stage = page.locator(".cartridge-stage"), drift = await stage.getAttribute("data-drift2"), zoom=await stage.getAttribute("data-magnification");
  await expect.poll(() => stage.getAttribute("data-drift2")).not.toBe(drift);
  expect(Number(await stage.getAttribute("data-front-facing2"))).toBeGreaterThan(.98);
  await expect(stage).toHaveAttribute("data-intersections", "0"); await expect(stage).toHaveAttribute("data-magnification", zoom);
  await page.emulateMedia({reducedMotion:"reduce"}); await expect(stage).toHaveAttribute("data-drift2", "0,0");
});

test("Last.fm refreshes every 20 seconds and reveals history above the song without moving the page", async ({ page }) => {
  const initial = new Date("2026-10-29T12:00:00Z"); await page.clock.install({ time:initial }); await page.clock.pauseAt(initial);
  let request = 0;
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.route("**/api/listening", route => {
    request++;
    const track = {title:"Fixture track",artist:"Fixture artist",url:"https://www.last.fm/music/fixture",artwork:"/cartridges/labels/search-tonal.svg",playing:request===1};
    return route.fulfill({status:request>2?502:200,contentType:"application/json",body:JSON.stringify({track,recent:Array.from({length:5},(_,i)=>({...track,title:`Past track ${i+1}`,playing:false}))})});
  });
  await page.goto("/"); const footer=page.locator(".now-playing");
  await expect(footer).toHaveAttribute("data-track","Fixture track"); await expect(footer).toContainText(/now-ish listening|currently spinning|in the rotation/);
  await expect(footer).toContainText("Fixture artist"); await expect(footer.locator(".listening-indicator")).toHaveCount(1);
  await expect(footer.locator("img")).toHaveAttribute("src","/cartridges/labels/search-tonal.svg");
  const toggle=page.getByRole("button",{name:"Show last five songs"}); await toggle.scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>({scrollY, height:document.documentElement.scrollHeight, current:document.querySelector('.listening-current').getBoundingClientRect().y}));
  await toggle.click();
  const dialog=page.getByRole("region",{name:"Recently listened"});await expect(dialog).toBeVisible();await expect(dialog.locator("li")).toHaveCount(5);
  const panel=await dialog.boundingBox(), current=await page.locator(".listening-current").boundingBox();expect(panel.y+panel.height).toBeLessThanOrEqual(current.y+1);
  await expect(toggle).toBeFocused();
  expect(await dialog.evaluate(el=>getComputedStyle(el).position)).toBe("absolute");
  expect(await dialog.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(await page.locator("html").evaluate(el=>getComputedStyle(el).backgroundColor));
  expect(await dialog.evaluate(el=>getComputedStyle(el).paddingTop)).toBe("16px");
  expect(await dialog.evaluate(el=>getComputedStyle(el).borderRadius)).toBe("20px");
  expect(await dialog.locator("li").first().evaluate(el=>el.style.getPropertyValue("--history-delay"))).toBe("260ms");
  expect(await dialog.locator("li").last().evaluate(el=>el.style.getPropertyValue("--history-delay"))).toBe("0ms");
  const after=await page.evaluate(()=>({scrollY, height:document.documentElement.scrollHeight, current:document.querySelector('.listening-current').getBoundingClientRect().y}));
  expect(after).toEqual(before);
  const art=await footer.locator(".listening-artwork").boundingBox(),copy=await footer.locator(".now-playing-copy").boundingBox();
  const pastArt=await dialog.locator(".listening-artwork").first().boundingBox(),pastCopy=await dialog.locator(".listening-song").first().boundingBox();
  expect(pastArt.x).toBeCloseTo(art.x,1);expect(pastCopy.x).toBeCloseTo(copy.x,1);
  expect(art.x+art.width).toBeLessThan(copy.x);expect(art.height).toBeGreaterThanOrEqual(copy.height);
  const green=await footer.locator(".listening-indicator").evaluate(el=>getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number));
  expect(green[1]).toBeGreaterThan(green[0]);expect(green[1]).toBeGreaterThan(green[2]);
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);await expect(toggle).toBeFocused();
  await page.clock.fastForward(20000);await expect(footer).toContainText("last listened");await expect(footer.locator(".listening-indicator")).toHaveCount(0);expect(request).toBe(2);
  await page.clock.fastForward(20000);await expect(footer).toContainText("last listened");await expect(footer).toHaveAttribute("data-track","Fixture track");
  await expect(page.locator(".listening-widget")).toHaveAttribute("data-listening-status","unavailable");
  await toggle.click();await expect(dialog).toContainText("Showing your last available history.");
  await expect(footer).toHaveAttribute("href","https://www.last.fm/music/fixture");
});

test("empty listening history, unavailable artwork and API failure remain usable", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  let payload={track:null,recent:[]},failed=false;
  await page.route("**/api/listening",route=>route.fulfill({status:failed?502:200,contentType:"application/json",body:JSON.stringify(payload)}));
  await page.route("**/missing-art.png",route=>route.fulfill({status:404,body:""}));
  await page.goto("/");await expect(page.locator(".now-playing")).toContainText("Nothing scrobbled yet");
  await page.getByRole("button",{name:"Show last five songs"}).click();await expect(page.getByRole("region",{name:"Recently listened"})).toContainText("Your first scrobbles will appear here.");
  await page.getByRole("button",{name:"Show last five songs"}).click();
  payload={track:{title:"No artwork",artist:"An artist",artwork:"/missing-art.png",url:"https://www.last.fm/music/fixture",playing:false},recent:[]};
  await page.reload();await expect(page.locator(".now-playing img")).toHaveCount(0);await expect(page.locator(".now-playing .listening-artwork svg")).toBeVisible();
  await expect(page.locator(".now-playing")).toContainText("No artwork");
  failed=true;await page.reload();await expect(page.locator(".now-playing")).toContainText("Listening unavailable");
  await page.getByRole("button",{name:"Show last five songs"}).click();await expect(page.getByRole("region",{name:"Recently listened"})).toContainText("temporarily unavailable");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator("audio,video")).toHaveCount(0);
});


test("an unconfigured deployment has a quiet client fallback and does not pretend to be live", async ({ page }) => {
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.route("**/api/listening",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({code:"LISTENING_NOT_CONFIGURED",error:"Listening is not configured on this deployment."})}));
  await page.goto("/");
  await expect(page.locator(".listening-widget")).toHaveAttribute("data-listening-status","unconfigured");
  await expect(page.locator(".now-playing")).toContainText("my listening history");
  await expect(page.locator(".listening-indicator")).toHaveCount(0);
  await page.getByRole("button",{name:"Show last five songs"}).click();
  await expect(page.getByRole("region",{name:"Recently listened"})).toContainText("once connected");
});

test("gray SF metadata keeps Pacific time, updates each minute and survives weather failure", async ({ page }) => {
  await page.clock.install({time:new Date("2026-10-29T19:10:00Z")});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.setViewportSize({width:390,height:844}); await page.goto("/");
  const meta=page.getByLabel("San Francisco local time and weather");
  await expect(meta.locator("time")).toHaveText("12:10 PM PDT"); await expect(meta).toContainText("58°F · Fog");
  expect(await meta.evaluate(el=>getComputedStyle(el).color)).toBe("rgb(98, 98, 106)");
  await page.clock.fastForward(60050); await expect(meta.locator("time")).toHaveText("12:11 PM PDT");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.route("**/api/weather",route=>route.fulfill({status:502,contentType:"application/json",body:'{"error":"Unavailable"}'}));
  await page.reload(); await expect(meta.locator("time")).toBeVisible(); await expect(meta.getByRole("link")).toHaveCount(0);
});

test("footer and reader content reveal on entry and stay immediate for reduced motion", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.goto("/"); await expect(page.locator(".collection")).toHaveAttribute("data-status","fallback");
  await expect(page.locator(".footer-camera figcaption")).toHaveAttribute("data-reveal-state","waiting");
  await page.locator(".social-link").scrollIntoViewIfNeeded();
  for(const selector of [".social-link",".footer-camera figcaption",".listening-current"]) {
    const item=page.locator(selector); await expect(item).toHaveAttribute("data-reveal-state","visible");
    expect(await item.evaluate(el=>getComputedStyle(el).animationName)).toBe("content-reveal");
  }
  await page.getByRole("button",{name:"Open Stadia cartridge",exact:true}).click();
  const reader=page.getByRole("region",{name:"Stadia case study"});
  await expect(reader.locator("h1")).toHaveAttribute("data-reveal-state","visible");
  await reader.locator("footer").scrollIntoViewIfNeeded(); await expect(reader.locator("footer")).toHaveAttribute("data-reveal-state","visible");
  await page.emulateMedia({reducedMotion:"reduce"});
  expect(await reader.locator("footer").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
});
