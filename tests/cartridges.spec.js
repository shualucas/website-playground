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
  await expect(page.locator(".intro-name")).toHaveText("Josh");
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

test("captions enter with their cartridge and stay clear of every shell during interrupted selections", async ({ page }) => {
  test.setTimeout(120000);await load(page);await page.emulateMedia({reducedMotion:'no-preference'});
  const stage=page.locator('.cartridge-stage'),caption=page.locator('.cartridge-caption');
  await page.evaluate(()=>{
    window.captionSamples={visible:0,overlaps:[]};
    const sample=()=>{
      const stage=document.querySelector('.cartridge-stage'),caption=stage.querySelector('.cartridge-caption');
      if(caption && getComputedStyle(caption).visibility==='visible' && Number(getComputedStyle(caption).opacity)>.02){
        window.captionSamples.visible++;
        const origin=stage.getBoundingClientRect(),box=caption.getBoundingClientRect();
        for(let i=0;i<5;i++){
          const frame=stage.dataset[`frame${i}`];if(!frame)continue;const cart=JSON.parse(frame);
          if(box.right-origin.x>cart.left && box.left-origin.x<cart.right && box.bottom-origin.y>cart.top && box.top-origin.y<cart.bottom)window.captionSamples.overlaps.push({selected:stage.dataset.selected,cart:i});
        }
      }
      window.captionSampleFrame=requestAnimationFrame(sample);
    };sample();
  });
  const select=async name=>page.getByRole('button',{name:`View ${name} cartridge`,exact:true}).evaluate(el=>el.click());
  await select('Blizzard Entertainment');await expect(stage).toHaveAttribute('data-caption-ready','true',{timeout:60000});await expect(caption).toBeVisible();
  await expect(caption).toHaveCSS('animation-name','cartridge-caption-in');await expect(caption).toHaveCSS('animation-duration','0.32s');
  await select('Search');await expect(stage).toHaveAttribute('data-caption-ready','false');await expect(caption).toBeHidden();
  // Interrupt the moving stack with another selection; only its caption may enter.
  await select('Gmail');await expect(caption.locator(':scope > span').first()).toHaveText('Gmail');
  await expect(stage).toHaveAttribute('data-caption-ready','true',{timeout:60000});
  await expect(caption).toBeVisible();
  await page.waitForTimeout(200);const before=await caption.boundingBox();await page.waitForTimeout(200);const after=await caption.boundingBox();
  expect(after.x).toBeCloseTo(before.x,0);expect(after.y).toBeCloseTo(before.y,0);
  // Sample rendered frames, rather than assuming a GPU frame rate in CI.
  await expect.poll(()=>page.evaluate(()=>window.captionSamples.visible),{timeout:10000}).toBeGreaterThan(2);
  const samples=await page.evaluate(()=>{cancelAnimationFrame(window.captionSampleFrame);return window.captionSamples});
  expect(samples.visible).toBeGreaterThan(2);expect(samples.overlaps).toEqual([]);
  await page.emulateMedia({reducedMotion:'reduce'});await select('Early work');await expect(caption).toBeVisible();await expect(caption).toHaveCSS('animation-name','none');
});

test("canvas selection, drag rotation, caption entry and browser history work with the new chronology", async ({ page }) => {
  test.setTimeout(120000); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await load(page); const stage = page.locator(".cartridge-stage"), target = await point(page, 1);
  await page.mouse.click(target.x, target.y);
  await expect(stage).toHaveAttribute("data-selected", "stadia"); await expect(stage).toHaveAttribute("data-settled", "true");
  const caption = page.locator(".cartridge-caption");
  await expect(caption).toHaveAttribute("aria-label", "Open Stadia, 2020 – 2022");
  const captionBefore = await caption.boundingBox();
  for (const text of await caption.locator(":scope > span").all()) expect(await text.evaluate(el => getComputedStyle(el).fontWeight)).toBe("700");
  const before = await stage.getAttribute("data-rotation1"), p = await point(page, 1);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 80, p.y + 25, { steps: 5 }); await page.mouse.up();
  await expect(stage).not.toHaveAttribute("data-rotation1", before); await expect(page.locator(".case-study")).toHaveCount(0);
  const captionAfter = await caption.boundingBox();
  expect(captionAfter.x).toBeCloseTo(captionBefore.x, 1); expect(captionAfter.y).toBeCloseTo(captionBefore.y, 1);
  await expect(caption).toBeHidden(); // The rotated shell occupies this fixed slot.
  await page.keyboard.press("r"); await expect(stage).toHaveAttribute("data-rotation1", before);
  await expect(caption).toBeVisible();
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
    await expect(page.locator(".cartridge-caption")).toBeVisible();
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
  await expect(page.getByRole("region", { name: "Search case study" }).getByText("2022–Now", { exact: true })).toBeVisible();
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


test("Josh and roles are passive medium-weight text with a stable reduced-motion label", async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}});
  await page.goto('/');const role=page.locator('.role-rotator');
  await expect(page.locator('.intro-name')).toHaveText('Josh');expect(await role.evaluate(el=>el.tagName)).toBe('SPAN');
  await expect(role).not.toHaveAttribute('tabindex',/.+/);await expect(role).not.toHaveAttribute('aria-pressed',/.+/);
  await expect(role).toHaveAttribute('data-role','product designer');await expect(role).toHaveCSS('font-weight','500');
  await role.hover();await expect(role).toHaveCSS('opacity','1');await role.click();await expect(role).toHaveAttribute('data-role','product designer');
  expect(await role.evaluate(el=>getComputedStyle(el).cursor)).not.toBe('pointer');
  expect(await page.locator('.portfolio-name').evaluate(el=>getComputedStyle(el).fontWeight)).toBe('500');
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
  await page.locator(".role-rotator").click();
  expect(await page.locator(".random-fact").textContent()).toBe(previous);
});

test("the camera lives in the Say cheese row, floats only in view, and respects reduced motion", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 }); await load(page);
  const camera = page.locator(".film-camera-dock");
  await camera.scrollIntoViewIfNeeded();
  await expect(camera).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await expect(camera).toBeVisible(); await expect(camera.locator("canvas")).toHaveCount(1);
  expect(await camera.evaluate((el) => getComputedStyle(el).position)).toBe("relative");
  const footer = await page.locator(".collection-footer").boundingBox(), bounds = await camera.boundingBox(),row=await page.locator('.recent-camera-row').boundingBox();
  const social=await page.locator('.footer-links').boundingBox();
  expect(Math.abs(social.x-footer.x)).toBeLessThan(1);
  expect(bounds.y).toBeGreaterThanOrEqual(row.y);expect(bounds.y+bounds.height).toBeLessThanOrEqual(row.y+row.height);
  await expect(page.locator('.recent-camera-row .recent-project-name')).toHaveText('Say cheese!');await expect(page.locator('.collection-footer .camera-link')).toHaveCount(0);
  await expect(page.locator(".footer-camera figcaption,.camera-say-cheese")).toHaveCount(0);
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
  await expect(footer.locator("figcaption")).toHaveCount(0);
  const idleColors=await footer.locator(".profile-links .link-copy").evaluateAll(links=>links.map(link=>getComputedStyle(link).color));expect(new Set(idleColors).size).toBe(1);
  await expect(footer.locator(".now-playing")).toHaveAttribute("href", "https://www.last.fm/user/shualucas");
  const href = await footer.locator(".now-playing").getAttribute("href");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(footer.locator(".now-playing")).toHaveAttribute("href", href);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const link of await footer.locator('.profile-links a').all()) { const box=await link.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44); }
  await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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


test("all eight lowercase roles cycle with a shared entrance and no hover or click behavior", async ({ page }) => {
  const initial = new Date("2026-10-29T12:00:00Z"); await page.clock.install({time:initial}); await page.clock.pauseAt(initial);
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.goto("/"); const role=page.locator(".role-rotator");
  await expect(role).toHaveAttribute("data-ready","false");
  expect(await page.locator(".role-entrance").evaluate(el=>getComputedStyle(el).animationName)).toBe("intro-reveal");
  await page.clock.runFor(1001); await expect(role).toHaveAttribute("data-ready","true");
  const labels=["product designer","merch maker","brand developer","prototyper","systems thinker","storyteller","community builder", "riso artist"];
  for(const label of labels){
    await expect(role).toHaveAttribute("data-role",label);
    if(label.includes(" ")) expect(await role.locator(".role-suffix").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
    await page.clock.fastForward(2001); await expect(role.locator(".role-label")).toHaveClass(/is-leaving/); await page.clock.fastForward(280);
  }
  await expect(role).toHaveAttribute("data-role",labels[0]); await role.click();await expect(role).toHaveAttribute("data-paused","false");
  await page.clock.fastForward(2281);await expect(role).toHaveAttribute("data-role",labels[1]);
  await role.hover();await expect(role).toHaveCSS("opacity","1");await page.clock.fastForward(2281);await expect(role).toHaveAttribute("data-role",labels[2]);
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

test("camera drag rotates without navigation; keyboard entry opens the separate photos page", async ({ page }) => {
  test.setTimeout(120000);
  await load(page);
  const link = page.getByRole("link", { name: /Explore film photographs/ }), camera = page.locator(".film-camera-dock");
  await link.scrollIntoViewIfNeeded(); await expect(camera).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await link.hover(); await expect(camera).toHaveAttribute("data-ready-light","on");
  await expect(link.locator(".camera-ready-light")).toHaveCSS("opacity","1");
  await expect(page.locator(".camera-page-flash")).toHaveCount(0);
  await page.mouse.move(8,8); await expect(camera).toHaveAttribute("data-ready-light","off");
  await page.getByRole("link",{name:/Zine of Extracurriculars/}).focus(); await page.keyboard.press("Tab"); await expect(link).toBeFocused(); await expect(camera).toHaveAttribute("data-ready-light","on");
  await link.evaluate(el=>el.blur()); await expect(camera).toHaveAttribute("data-ready-light","off");
  const bounds = await camera.boundingBox(), before = await camera.getAttribute("data-rotation");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
  await expect(camera).toHaveAttribute("data-ready-light","off"); await expect(link.locator(".camera-ready-light")).toHaveCSS("opacity","0");
  await page.mouse.move(bounds.x + bounds.width / 2 + 85, bounds.y + bounds.height / 2 + 35, { steps: 5 }); await page.mouse.up();
  await expect(camera).not.toHaveAttribute("data-rotation", before ?? "");
  await expect(camera).toHaveAttribute("data-ready-light","off"); await expect(link.locator(".camera-ready-light")).toHaveCSS("opacity","0");
  await expect(page).not.toHaveURL(/photos/);
  const rotated = await camera.getAttribute("data-rotation");
  await link.focus(); await page.keyboard.press("ArrowLeft"); await expect(camera).not.toHaveAttribute("data-rotation", rotated);
  await page.keyboard.press("r"); await expect(camera).toHaveAttribute("data-rotation", "0,0,0");
  await page.keyboard.press("Enter"); await expect(page).toHaveURL(/\/photos\/$/);
  await expect(page).toHaveTitle("josh lucas - product designer");
  await expect(page.locator(".polaroid")).toHaveCount(6);
  await expect(page.locator(".after-hours-book,.photo-entry-camera")).toHaveCount(0);
  await page.reload(); await expect(page.locator(".polaroid")).toHaveCount(6);
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
    new MutationObserver(()=>{
      const caption=document.querySelector('.photo-entry-caption'),source=window.__cameraEntry?.camera;
      if(caption&&source){const rect=caption.getBoundingClientRect();sessionStorage.setItem('camera-caption-tested',JSON.stringify({dx:rect.left+rect.width/2-source.x*innerWidth,dy:rect.top+rect.height/2-source.y*innerHeight,camera:!!document.querySelector('.film-camera-dock')}));}
    }).observe(document,{childList:true,subtree:true});
  });
  await page.goto("/"); await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 15000 });
  await page.getByRole("link", { name: /Explore film photographs/ }).click();
  await expect(page).toHaveURL(/\/photos\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem('camera-flash-tested'))).toBe('yes');
  await expect(page.locator("html")).toHaveAttribute("data-camera-entry", "true");
  await expect(page.locator(".polaroid")).toHaveCount(6);
  await expect(page.locator(".photos-page")).toHaveAttribute("data-arrived","true");
  await expect(page.locator(".photo-entry-camera")).toHaveCount(0);
  const caption=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('camera-caption-tested')));
  expect(Math.abs(caption.dx)).toBeLessThan(1);expect(Math.abs(caption.dy)).toBeLessThan(1);expect(caption.camera).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("camera coasts after release, and selected cartridges drift without changing heading", async ({ page }) => {
  test.setTimeout(120000);
  await load(page); await page.emulateMedia({ reducedMotion: "no-preference" });
  const link = page.getByRole("link", { name: /Explore film photographs/ }), camera = page.locator(".film-camera-dock");
  await link.scrollIntoViewIfNeeded(); await expect(camera).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  const b = await camera.boundingBox(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2+45,b.y+b.height/2+15,{steps:6});await page.mouse.up();
  const released = await camera.getAttribute("data-rotation");
  await expect.poll(() => camera.getAttribute("data-rotation")).not.toBe(released);
  await expect(camera).toHaveAttribute("data-coasting", "false", { timeout:10000 });
  await expect(page).not.toHaveURL(/photos/);
  await choose(page,"Gmail");
  const stage = page.locator(".cartridge-stage"), drift = await stage.getAttribute("data-drift2"), zoom=await stage.getAttribute("data-magnification");
  await expect.poll(() => stage.getAttribute("data-drift2")).not.toBe(drift);
  expect(Number(await stage.getAttribute("data-front-facing2"))).toBeGreaterThan(.98);
  await expect(stage).toHaveAttribute("data-intersections", "0"); await expect(stage).toHaveAttribute("data-magnification", zoom);
  await page.emulateMedia({reducedMotion:"reduce"}); await expect(stage).toHaveAttribute("data-drift2", "0,0");
});

test("Last.fm refreshes every 20 seconds and reveals history above the song without moving the page", async ({ page }) => {
  const initial = new Date("2026-10-29T12:00:00Z"); await page.clock.install({ time:initial }); await page.clock.pauseAt(new Date(initial.getTime()+1000));
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
  expect(await dialog.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  expect(await dialog.evaluate(el=>getComputedStyle(el).paddingTop)).toBe("0px");
  expect(await dialog.evaluate(el=>getComputedStyle(el).borderRadius)).toBe("0px");
  expect(await dialog.evaluate(el=>getComputedStyle(el).boxShadow)).toBe("none");
  expect(await dialog.locator("li").first().evaluate(el=>el.style.getPropertyValue("--history-delay"))).toBe("260ms");
  expect(await dialog.locator("li").last().evaluate(el=>el.style.getPropertyValue("--history-delay"))).toBe("0ms");
  const after=await page.evaluate(()=>({scrollY, height:document.documentElement.scrollHeight, current:document.querySelector('.listening-current').getBoundingClientRect().y}));
  expect(after).toEqual(before);
  const art=await footer.locator(".listening-artwork").boundingBox(),copy=await footer.locator(".now-playing-copy").boundingBox();
  const pastArt=await dialog.locator(".listening-artwork").first().boundingBox(),pastCopy=await dialog.locator(".listening-song").first().boundingBox();
  expect(pastArt.x).toBeCloseTo(art.x,1);expect(pastCopy.x).toBeCloseTo(copy.x,1);
  expect(art.x+art.width).toBeLessThan(copy.x);expect(art.height).toBeCloseTo(pastArt.height,2);expect(art.width).toBeCloseTo(pastArt.width,2);
  const green=await footer.locator(".listening-indicator").evaluate(el=>getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number));
  expect(green[1]).toBeGreaterThan(green[0]);expect(green[1]).toBeGreaterThan(green[2]);
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);await expect(toggle).toBeFocused();
  await page.clock.fastForward(20000);await expect(footer).toContainText("last listened");await expect(footer.locator(".listening-indicator")).toHaveCount(0);expect(request).toBe(2);
  await page.clock.fastForward(20000);await expect(footer).toContainText("last listened");await expect(footer).toHaveAttribute("data-track","Fixture track");
  await expect(page.locator(".listening-widget")).toHaveAttribute("data-listening-status","unavailable");
  await toggle.click();await expect(dialog).toContainText("Showing your last available history.");
  await expect(footer).toHaveAttribute("href","https://www.last.fm/music/fixture");
});

test("listening history animates closed, can reopen mid-exit, and dismisses immediately with reduced motion", async ({ page }) => {
  const initial=new Date('2026-10-29T19:00:00Z');await page.clock.install({time:initial});await page.clock.pauseAt(new Date(initial.getTime()+1000));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  const track={title:'Current song',artist:'Fixture artist',url:'https://www.last.fm/music/fixture',playing:true,artwork:''};
  await page.route('**/api/listening',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({track,recent:Array.from({length:5},(_,i)=>({...track,title:`Past song ${i+1}`,playing:false}))})}));
  await page.goto('/');await expect(page.locator('.now-playing')).toHaveAttribute('data-track','Current song');
  const toggle=page.getByRole('button',{name:'Show last five songs'}),panel=page.locator('.listening-history');
  await toggle.scrollIntoViewIfNeeded();await page.clock.fastForward(5000);
  await toggle.click();await expect(panel).toHaveAttribute('data-state','open');
  const before=await page.evaluate(()=>({scrollY,height:document.documentElement.scrollHeight,y:document.querySelector('.listening-current').getBoundingClientRect().y}));
  await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(panel).toHaveAttribute('data-state','closing');await expect(panel).toHaveAttribute('aria-hidden','true');await expect(panel).toHaveAttribute('inert','');
  await expect(panel).toHaveCSS('transition-duration','0.28s');
  await page.clock.fastForward(150);await expect(panel).toHaveCount(1);
  // Reopening cancels the previous dismissal timer, without a forced remount.
  await toggle.click();await expect(panel).toHaveAttribute('data-state','open');await expect(panel).not.toHaveAttribute('inert','');
  await page.clock.fastForward(400);await expect(panel).toHaveCount(1);await expect(toggle).toHaveAttribute('aria-expanded','true');
  await panel.locator('a').first().focus();await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(panel).toHaveAttribute('data-state','closing');
  await page.clock.fastForward(321);await expect(panel).toHaveCount(0);
  expect(await page.evaluate(()=>({scrollY,height:document.documentElement.scrollHeight,y:document.querySelector('.listening-current').getBoundingClientRect().y}))).toEqual(before);
  await page.emulateMedia({reducedMotion:'reduce'});await toggle.click();await expect(panel).toHaveCount(1);await toggle.click();await expect(panel).toHaveCount(0);
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

test("unlinked metadata has a blinking clock, Pacific time and a weather fallback", async ({ page }) => {
  await page.clock.install({time:new Date("2026-10-29T19:10:00Z")});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.setViewportSize({width:390,height:844}); await page.goto("/");
  const meta=page.getByLabel("Local time and weather");
  await expect(meta.locator("time")).toHaveText("12:10 PM PDT"); await expect(meta).toContainText("58°F · Fog");
  expect(await meta.evaluate(el=>getComputedStyle(el).color)).toBe("rgb(98, 98, 106)");
  await expect(meta).not.toContainText("San Francisco"); await expect(meta.getByRole("link")).toHaveCount(0);
  await expect(meta.locator('.clock-colon')).toHaveCSS('animation-name','none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const blink=await meta.locator('.clock-colon').evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=250;const on=getComputedStyle(el).opacity;a.currentTime=750;return {on,off:getComputedStyle(el).opacity};});
  expect(blink).toEqual({on:'1',off:'0'});
  await page.clock.fastForward(60050); await expect(meta.locator("time")).toHaveText("12:11 PM PDT");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.route("**/api/weather",route=>route.fulfill({status:502,contentType:"application/json",body:'{"error":"Unavailable"}'}));
  await page.reload(); await expect(meta.locator("time")).toBeVisible(); await expect(meta.getByRole("link")).toHaveCount(0);
});

test("footer and reader content reveal on entry and stay immediate for reduced motion", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.goto("/"); await expect(page.locator(".collection")).toHaveAttribute("data-status","fallback");
  await expect(page.locator(".footer-links")).toHaveAttribute("data-reveal-state","waiting");
  await page.locator(".footer-links").scrollIntoViewIfNeeded();
  for(const selector of [".footer-links",".listening-current"]) {
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

test("the page entrance continues from the hero into the footer on one timeline", async ({ page }) => {
  await page.setViewportSize({width:1280,height:1400});
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.goto("/"); await expect(page).toHaveTitle("josh lucas - product designer");
  await expect(page.locator(".footer-links")).toHaveAttribute("data-reveal-state","visible");
  const timing=await page.evaluate(()=>{
    const origin=Number(document.querySelector('.collection').dataset.revealStart);
    const heroEnd=Math.max(...[...document.querySelectorAll('.intro-word')].map(el=>{
      const style=getComputedStyle(el);return origin+parseFloat(style.animationDelay)*1000+parseFloat(style.animationDuration)*1000;
    }));
    const starts=['.footer-links','.listening-current'].map(selector=>{
      const animation=document.querySelector(selector).getAnimations()[0];return animation.startTime+Number(animation.effect.getTiming().delay);
    });
    const projectsEnd=Math.max(...[...document.querySelectorAll('.recent-projects [data-reveal]')].map(el=>{
      const animation=el.getAnimations()[0],timing=animation.effect.getTiming();return animation.startTime+Number(timing.delay)+Number(timing.duration);
    }));
    return {heroEnd,starts,projectsEnd};
  });
  expect(timing.starts[0]).toBeGreaterThanOrEqual(timing.heroEnd);
  expect(timing.starts[0]).toBeGreaterThanOrEqual(timing.projectsEnd);
  expect(timing.starts[1]).toBeGreaterThan(timing.starts[0]);
});

test("recent projects use one column with native reader links and restore focus on Back", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  await page.goto("/");
  const navigation=page.getByRole("navigation",{name:"Recent projects"}),links=navigation.locator('.recent-project-list > li:not(.recent-camera-row) > a');
  const titles=['AI Mode Nudges','Search Labs','Stadia Store Redesign','Zine of Extracurriculars'];
  const descriptions=['Guided follow-ups for clearer questions','Launching AI experiments to 48M+ users','Helping players explore and buy games','Flyers for music, coffee, and community'];
  await expect(links).toHaveCount(4);
  await expect(links.locator('.recent-project-name')).toHaveText(titles);
  await expect(navigation.getByRole('link')).toHaveCount(5);
  await expect(navigation.getByRole('link',{name:'Say cheese! Explore film photographs'})).toHaveAttribute('href','/photos/');
  await expect(navigation.locator('.recent-project-summary')).toHaveText(descriptions);
  await expect(navigation.locator('.recent-project-year')).toHaveCount(0);
  await expect(links.first()).toHaveAttribute('href','/?project=ai-mode-nudges&view=case-study');
  for(const selector of ['.recent-project-name','.recent-project-summary']) {
    expect(await links.locator(selector).first().evaluate(el=>getComputedStyle(el).fontWeight)).toBe('400');
  }
  const rows=await links.evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y};}));
  expect(rows.every((row,i)=>row.x===rows[0].x && (!i || row.y>rows[i-1].y))).toBe(true);
  const heights=await navigation.locator('.recent-project-list > li').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(1);
  const textGap=await links.first().evaluate(el=>el.querySelector('.recent-project-summary').getBoundingClientRect().left-el.querySelector('.recent-project-name').getBoundingClientRect().right);
  expect(textGap).toBeGreaterThan(0);expect(textGap).toBeLessThan(10);
  for(let i=0;i<titles.length-1;i++) {
    await links.nth(i).click(); await expect(page.getByRole('heading',{name:titles[i],exact:true})).toBeFocused();
    await expect(page.locator('.case-study-deck')).not.toBeEmpty();
    await expect(page.locator('.case-study-facts')).toHaveCount(1);
    await expect(page.locator('.case-star-story > section > h2')).toHaveText(['Situation','Task','Action','Result']);
    await expect(page.locator('[data-story-stage="task"] > p')).not.toBeEmpty();
    const story=page.locator('.case-star-story');
    await expect(story.locator('.case-decisions > li')).toHaveCount(3);
    await expect(story.locator('.case-story-media')).toHaveCount(i===1?1:3);
    expect(await story.locator('.case-story-media').evaluateAll(elements=>elements.every(el=>!!el.closest('.case-decisions li')))).toBe(true);
    const sizes=await page.locator('.case-study-editorial').evaluate(root=>{
      const body=[...root.querySelectorAll('.case-study-deck,.case-study-facts dt,.case-study-facts dd,.case-editorial-section > p,.case-decisions h3,.case-decisions p,figcaption,.eyebrow,.case-impact,.case-outcome-grid dt')];
      return [...new Set(body.map(el=>getComputedStyle(el).fontSize))];
    });expect(sizes).toEqual(['16px']);
    await page.goBack(); await expect(page.locator('.case-study')).toHaveCount(0); await expect(links.nth(i)).toBeFocused();
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  const before=await navigation.boundingBox();await links.first().hover();
  await expect(links.first().locator('.recent-project-copy')).toHaveCSS('transform','matrix(1, 0, 0, 1, 18, 0)');
  await expect(links.first().locator('.recent-project-marker')).toHaveCSS('opacity','1');
  const after=await navigation.boundingBox();expect(after.height).toBe(before.height);expect(after.y).toBe(before.y);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(links.first().locator('.recent-project-copy')).toHaveCSS('transform','none');
  await page.setViewportSize({width:390,height:844}); await navigation.scrollIntoViewIfNeeded();
  await expect.poll(async()=>{const heights=await navigation.locator('.recent-project-list > li').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));return Math.max(...heights)-Math.min(...heights)}).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const link of await links.all()) { const r=await link.boundingBox();expect(r.x).toBeGreaterThanOrEqual(24);expect(r.x+r.width).toBeLessThanOrEqual(366); }
  await page.goto(await links.last().getAttribute('href'));
  await expect(page.locator('.flyer-gallery img')).toHaveCount(5);
  await page.getByRole('link',{name:'Back to Josh Lucas',exact:true}).click();
  await expect(page.locator('.collection')).toBeVisible();
});

test("song changes crossfade without shifting the footer or replaying on unchanged polls", async ({ page }) => {
  const initial=new Date('2026-10-29T19:00:00Z');await page.clock.install({time:initial});await page.clock.pauseAt(new Date(initial.getTime()+1000));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(() => { const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)} });
  let calls=0;await page.route('**/api/listening',route=>{calls++;const title=calls===1?'First song':calls<4?'Second song':'Third song';return route.fulfill({contentType:'application/json',body:JSON.stringify({track:{title,artist:'Fixture artist',url:`https://www.last.fm/music/${calls===1?'first':calls<4?'second':'third'}`,playing:true,artwork:''},recent:[]})});});
  await page.goto('/');const link=page.locator('.now-playing');await expect(link).toHaveAttribute('data-track','First song');await link.scrollIntoViewIfNeeded();
  const before=await page.locator('.listening-current').boundingBox();
  await page.clock.fastForward(20000);await expect(link).toHaveAttribute('data-track','Second song');
  const outgoing=link.locator('.now-playing-outgoing');await expect(outgoing).toHaveAttribute('aria-hidden','true');await expect(outgoing).toContainText('First song');
  await expect(link.locator('.now-playing-track.is-entering')).toHaveCSS('animation-name','track-enter');
  await expect(link).toHaveAttribute('href','https://www.last.fm/music/second');
  const during=await page.locator('.listening-current').boundingBox();expect(during.height).toBe(before.height);expect(during.y).toBe(before.y);
  await page.clock.fastForward(401);await expect(outgoing).toHaveCount(0);
  await page.clock.fastForward(20000);await expect(link.locator('.now-playing-transition')).toHaveAttribute('data-changing','false');
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.fastForward(20000);await expect(link).toHaveAttribute('data-track','Third song');await expect(outgoing).toHaveCount(0);
});

test("flyer layouts preserve every source aspect ratio and fill a consistent physical page", async ({ page }) => {
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const {prepareFlyerPages,flyerPage}=await import('/src/after-hours/flyers.js');
    const spreads=await prepareFlyerPages();
    return {page:flyerPage,faces:spreads.flatMap(spread=>[spread.left,spread.right]).map(canvas=>({id:canvas.dataset.flyerId,fit:canvas.dataset.fit?JSON.parse(canvas.dataset.fit):null,size:[canvas.width,canvas.height]}))};
  });
  expect(result.faces.map(face=>face.id).filter(Boolean)).toEqual(['wavform','metronome','ghosts-n-stuff','jornada-coffee','picnic']);
  for(const face of result.faces){expect(face.size).toEqual([1110,1280]);if(!face.fit)continue;const fit=face.fit;expect(fit.width/fit.height).toBeCloseTo(fit.sourceWidth/fit.sourceHeight,8);expect(fit.x).toBeGreaterThanOrEqual(0);expect(fit.y).toBeGreaterThanOrEqual(0);expect(fit.x+fit.width).toBeLessThanOrEqual(1110.001);expect(fit.y+fit.height).toBeLessThanOrEqual(1280.001);}
  expect(result.faces[3].fit.x).toBe(103);expect(result.faces[4].fit.y).toBeGreaterThan(0);
});

test("camera flash clears the grip and the strap sags in world gravity after a camera rotation", async ({ page }) => {
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {aboutMiniatures}=await import('/src/book/miniatures.ts');
    const {CameraStrap}=await import('/src/cartridge/CameraStrap.ts');
    const scene=new THREE.Scene(),model=aboutMiniatures(params=>new THREE.MeshPhysicalMaterial(params),()=>{},true).camera;scene.add(model);
    const box=name=>new THREE.Box3().setFromObject(model.getObjectByName(name));
    const overlap=box('camera-front-grip').intersectsBox(box('camera-flash-bezel'));
    const strap=new CameraStrap(model,scene),initial=strap.report();
    const center=()=>{const p=strap.mesh.geometry.getAttribute('position'),v=new THREE.Vector3();for(let j=0;j<6;j++)v.add(new THREE.Vector3().fromBufferAttribute(p,12*6+j));return v.multiplyScalar(1/6)};
    const before=center();model.rotation.z=Math.PI;model.updateMatrixWorld(true);strap.step(0,false);const inertialDistance=before.distanceTo(center());
    for(let i=0;i<360;i++)strap.step(1/120,false);
    const rotated=strap.report();
    return {overlap,inertialDistance,initial,rotated,worldSpace:strap.mesh.parent===scene};
  });
  expect(result.overlap).toBe(false);expect(result.worldSpace).toBe(true);expect(result.inertialDistance).toBeLessThan(.00001);
  for(const pose of [result.initial,result.rotated]){expect(pose.bottom).toBeLessThan(pose.anchor[1]-.15);expect(pose.stretch).toBeLessThan(.15);}
});

test("flyer zine prints one flyer per page through forward and reverse turns", async ({ page }) => {
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/after-hours/');
  const book=page.getByRole('region',{name:'Interactive zine of extracurriculars'});
  await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});await expect(book).toHaveAttribute('data-flyer-count','5');await expect(book).toHaveAttribute('data-page-count','8');
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Back to Josh Lucas'})).toHaveAttribute('href','/');
  await expect(page.locator('.after-hours [data-reveal]')).toHaveCount(2);
  await expect(page.locator('.zine-footer,.zine-pagination,.zine-current')).toHaveCount(0);
  await expect(page.locator('.zine-heading')).toHaveCount(0);
  await expect(book).toHaveAttribute('data-paper-inserts','5');
  await expect(page.getByText('Vol. 01',{exact:true})).toHaveCount(0);
  await expect(page.locator('.after-hours')).toHaveCSS('background-color','rgb(240, 240, 240)');
  expect(Number(await book.getAttribute('data-page-aspect'))).toBeCloseTo(1110/1280,8);
  await page.getByRole('button',{name:'Switch to dark mode'}).focus();
  const faces=[['wavform','metronome'],['ghosts-n-stuff','jornada-coffee'],['picnic','']];
  const maps=[];
  for(let i=0;i<faces.length;i++){await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print',faces[i][0]);await expect(book).toHaveAttribute('data-right-print',faces[i][1]);maps.push([await book.getAttribute('data-left-artwork'),await book.getAttribute('data-right-artwork')]);}
  await page.keyboard.press('ArrowLeft');await expect(book).toHaveAttribute('data-left-print','ghosts-n-stuff');
  expect([await book.getAttribute('data-left-artwork'),await book.getAttribute('data-right-artwork')]).toEqual(maps[1]);
  await page.setViewportSize({width:390,height:844});await expect(book).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('r');await expect(book).toHaveAttribute('data-view','cover');
  await book.evaluate(el=>el.blur());
  await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print','wavform');
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(book).toHaveAttribute('data-left-print','wavform');
  await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
  await expect(page.locator('.after-hours')).toHaveCSS('background-color','rgb(27, 28, 27)');
  await page.evaluate(()=>{const input=document.createElement('input');input.value='typing';document.body.append(input);input.focus();});
  await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print','wavform');
});

test("uploaded covers shuffle without repeats, pause while reading, and stay static for reduced motion", async ({ page }) => {
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const {prepareFlyerCovers,coverDesigns}=await import('/src/after-hours/covers.js');
    const cover=await prepareFlyerCovers(()=>.37),initial=cover.front.dataset.coverId,seen=[initial];
    const exact=async()=>{
      const design=coverDesigns.find(d=>d.id===cover.front.dataset.coverId),image=new Image();image.src=design.src;await image.decode();
      const reference=document.createElement('canvas');reference.width=1110;reference.height=1280;reference.getContext('2d').drawImage(image,0,0);
      return reference.toDataURL()===cover.front.toDataURL();
    };
    const faithful=[await exact()];cover.update(0,false,false,true);
    for(let tick=1;tick<=180;tick++){cover.update(tick/10,false,false,true);const id=cover.front.dataset.coverId;if(id!==seen.at(-1))seen.push(id);if(tick===90||tick===180)faithful.push(await exact());}
    const readingId=cover.front.dataset.coverId,readingPixels=cover.front.toDataURL();
    for(let tick=181;tick<=400;tick++)cover.update(tick/10,false,false,false);
    const readingStable=cover.front.dataset.coverId===readingId&&cover.front.toDataURL()===readingPixels;
    for(let tick=401;tick<=600;tick++)cover.update(tick/10,false,true,true);
    const reducedStable=cover.front.dataset.coverId===readingId&&cover.front.toDataURL()===readingPixels;
    const next=await prepareFlyerCovers(()=>.37);
    return {size:[cover.front.width,cover.front.height],seen,faithful,readingStable,reducedStable,noImmediateReloadRepeat:next.front.dataset.coverId!==readingId};
  });
  expect(result.size).toEqual([1110,1280]);expect(result.seen).toHaveLength(3);expect(new Set(result.seen).size).toBe(3);
  expect(result.faithful).toEqual([true,true,true]);expect(result.readingStable).toBe(true);expect(result.reducedStable).toBe(true);expect(result.noImmediateReloadRepeat).toBe(true);
});

test("sticky notes open their own readable notes without turning or dragging the page", async ({page})=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/after-hours/');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const book=page.getByRole('region',{name:'Interactive zine of extracurriculars'});
  await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print','wavform');
  const hit=JSON.parse(await book.getAttribute('data-note-hits')).find(hit=>hit.id==='metronome');
  await page.mouse.click(hit.x,hit.y);
  const dialog=page.getByRole('dialog',{name:'Metronome'});await expect(dialog).toBeVisible();await expect(dialog).toContainText('a kiteclub.fm takeover of the everyday commute.');await expect(dialog).toHaveCSS('border-radius','0px');
  await expect(dialog.locator('p')).toHaveCount(1);await expect(dialog.locator('.zine-note-eyebrow')).toHaveCount(0);
  const copy=await dialog.locator('#zine-note-body').textContent();expect(copy).toBe(copy.toLowerCase());expect(copy).not.toContain('—');
  expect(await dialog.locator('#zine-note-body').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Caveat');
  expect(await page.evaluate(()=>document.fonts.check('400 26px "Caveat"'))).toBe(true);
  await expect(page.getByRole('button',{name:'Close note',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('r');await expect(book).toHaveAttribute('data-settled-boundary','1');
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  const shortcut=page.getByRole('button',{name:'Read note for Wavform',exact:true});await shortcut.focus();await expect(shortcut).toBeVisible();await shortcut.press('Enter');
  await expect(page.getByRole('dialog',{name:'Wavform',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close note',exact:true}).click();await expect(shortcut).toBeFocused();
  const before=await book.getAttribute('data-orientation'),grab=JSON.parse(await book.getAttribute('data-note-hits')).find(hit=>hit.id==='metronome');
  await page.mouse.move(grab.x,grab.y);await page.mouse.down();await page.mouse.move(grab.x-70,grab.y+35,{steps:8});await page.mouse.up();
  await expect(page.locator('.zine-note-dialog')).toHaveCount(0);await expect(book).not.toHaveAttribute('data-orientation',before);await expect(book).toHaveAttribute('data-settled-boundary','1');
  expect(errors).toEqual([]);
});

test("mobile cartridges start close to the hero while selection keeps its framing",async({page})=>{
  await page.setViewportSize({width:390,height:844});await load(page);
  for(const width of [375,390,768]){
    await page.setViewportSize({width,height:844});
    await expect.poll(()=>page.evaluate(()=>{
      const intro=document.querySelector('.collection-intro').getBoundingClientRect(),s=document.querySelector('.cartridge-stage'),r=s.getBoundingClientRect(),frame=JSON.parse(s.dataset.frameBounds);
      return r.top+frame.top-intro.bottom;
    })).toBeLessThan(80);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:390,height:844});await choose(page,'Search');
  const zoom=await page.locator('.cartridge-stage').getAttribute('data-magnification');
  const visible=await page.evaluate(()=>{
    const s=document.querySelector('.cartridge-stage'),stage=s.getBoundingClientRect(),display=document.querySelector('.collection-display').getBoundingClientRect(),f=JSON.parse(s.dataset.selectedFrame);
    return stage.top+f.top>=display.top-1&&stage.top+f.bottom<=display.bottom+1;
  });expect(visible).toBe(true);
  await expect(page.getByRole('button',{name:'Open Search, 2022 – now',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('.cartridge-stage')).toHaveAttribute('data-selected','');await expect(page.locator('.cartridge-stage')).toHaveAttribute('data-magnification',zoom);
});

test("tucked paper inserts stay attached to their leaf through opening and resetting",async({page})=>{
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {SkinnedLeaf,createLeafGeometry}=await import('/src/book/leaf.ts');
    const {createPaperInserts,hoverPaperInsert}=await import('/src/book/paper-inserts.ts');
    const geometry=createLeafGeometry(.006,4.7*1110/1280);
    const ids=[['','wavform'],['metronome','ghosts-n-stuff'],['jornada-coffee','picnic'],['','']];
    const leaves=Array.from({length:4},(_,i)=>{
      const materials=Array.from({length:6},()=>new THREE.MeshStandardMaterial({map:new THREE.Texture()}));
      ids[i].forEach((id,face)=>{const canvas=document.createElement('canvas');if(id)canvas.dataset.flyerId=id;materials[face+2].map=new THREE.CanvasTexture(canvas)});
      return new SkinnedLeaf(i,i===0||i===3,4,geometry,materials,4.7*1110/1280);
    });
    const meshes=createPaperInserts(leaves,params=>new THREE.MeshStandardMaterial(params),map=>map);
    let hoverLift=0,adhesiveShift=0,hoverResetError=0;
    for(const mesh of meshes){
      const p=mesh.geometry.attributes.position,rest=new Float32Array(p.array);
      hoverPaperInsert(mesh,1);
      for(let i=0;i<p.count;i++){
        const delta=Math.abs(p.getY(i)-rest[i*3+1]);hoverLift=Math.max(hoverLift,delta);
        if(rest[i*3]<=leaves[0].width&&Math.abs(rest[i*3+2])<=2.35)adhesiveShift=Math.max(adhesiveShift,delta);
      }
      hoverPaperInsert(mesh,0);
      for(let i=0;i<p.array.length;i++)hoverResetError=Math.max(hoverResetError,Math.abs(p.array[i]-rest[i]));
    }
    const sample=mesh=>mesh.getVertexPosition(49,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
    leaves.forEach(leaf=>leaf.updateWorld());const before=meshes.map(sample);
    leaves.forEach(leaf=>{leaf.snap(1);leaf.updateWorld()});const opened=meshes.map(sample);
    leaves.forEach(leaf=>{leaf.snap(0);leaf.updateWorld()});const restored=meshes.map(sample);
    const onSurface=meshes.every(mesh=>{const p=mesh.geometry.attributes.position,side=mesh.userData.printFace===0?1:-1,min=leaves[mesh.userData.leaf].cover?.007:.004;for(let i=0;i<p.count;i++)if(p.getX(i)<=leaves[0].width&&Math.abs(p.getZ(i))<=2.35&&side*p.getY(i)<min)return false;return true});
    const square=meshes.every(mesh=>{const p=mesh.geometry.attributes.position;return Math.abs(Math.hypot(p.getX(0)-p.getX(98),p.getZ(0)-p.getZ(98))-1.05*Math.SQRT2)<.00001});
    const readable=meshes.every(mesh=>{const uv=mesh.geometry.attributes.uv;return (uv.getX(8)-uv.getX(0))*(mesh.userData.printFace===0?1:-1)>0});
    return {count:meshes.length,onSurface,square,readable,hoverLift,adhesiveShift,hoverResetError,ids:meshes.map(mesh=>mesh.userData.flyerId),sizes:meshes.map(mesh=>[mesh.geometry.parameters.width,mesh.geometry.parameters.height]),shared:meshes.every(mesh=>mesh.skeleton===leaves[mesh.userData.leaf].mesh.skeleton),
      crossesSpine:before.every((v,i)=>v.x>0&&opened[i].x<0),resetError:Math.max(...before.map((v,i)=>v.distanceTo(restored[i]))),
      finite:[...before,...opened,...restored].every(v=>v.toArray().every(Number.isFinite))};
  });
  expect(result.count).toBe(5);expect(result.onSurface).toBe(true);expect(result.square).toBe(true);expect(result.ids).toEqual(['wavform','metronome','ghosts-n-stuff','jornada-coffee','picnic']);expect(result.sizes).toEqual(Array(5).fill([1.05,1.05]));expect(result.shared).toBe(true);expect(result.crossesSpine).toBe(true);expect(result.finite).toBe(true);expect(result.resetError).toBeLessThan(.00001);
  expect(result.hoverLift).toBeGreaterThan(.1);expect(result.adhesiveShift).toBe(0);expect(result.hoverResetError).toBe(0);
  expect(result.readable).toBe(true);
});

test("printed ink preserves source colors under bright light and can still darken in shadow",async({page})=>{
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {preservePrintColors}=await import('/src/book/printed-paper.ts');
    const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(8,8);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=2;
    const light=new THREE.AmbientLight('#ffffff',10);scene.add(light);
    const geometry=new THREE.PlaneGeometry(2,2),pixels=new Uint8Array([32,154,69,255]);
    const map=new THREE.DataTexture(pixels,1,1);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;
    const swatches=[[32,154,69],[55,126,240],[239,82,35],[36,36,36]],samples=[];
    const read=()=>{renderer.render(scene,camera);const out=new Uint8Array(4),gl=renderer.getContext();gl.readPixels(4,4,1,1,gl.RGBA,gl.UNSIGNED_BYTE,out);return [...out].slice(0,3)};
    for(const Material of [THREE.MeshPhongMaterial,THREE.MeshPhysicalMaterial]){
      const material=preservePrintColors(new Material({map})),mesh=new THREE.Mesh(geometry,material);scene.add(mesh);light.intensity=10;
      const bright=swatches.map(rgb=>{pixels.set(rgb);map.needsUpdate=true;return read()});light.intensity=.05;const dark=read();samples.push({bright,dark});scene.remove(mesh);material.dispose();
    }
    map.dispose();geometry.dispose();renderer.dispose();renderer.forceContextLoss();return {swatches,samples};
  });
  for(const sample of result.samples){sample.bright.forEach((rgb,i)=>rgb.forEach((value,channel)=>expect(Math.abs(value-result.swatches[i][channel])).toBeLessThanOrEqual(2)));expect(sample.dark.every(value=>value<30)).toBe(true);}
});

test("binding follows cover hinges and stays below opened cover surfaces through reversals", async ({ page }) => {
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {SkinnedLeaf,createLeafGeometry}=await import('/src/book/leaf.ts');
    const {TurnScheduler}=await import('/src/book/turn-scheduler.ts');
    const {createBinding}=await import('/src/book/binding.ts');
    const material=new THREE.MeshPhongMaterial({map:new THREE.Texture()});
    const leaves=Array.from({length:4},(_,i)=>new SkinnedLeaf(i,i===0||i===3,4,createLeafGeometry(i===0||i===3?.012:.006,4.0758),Array(6).fill(material),4.0758));
    const binding=createBinding(material,material,material,leaves),scheduler=new TurnScheduler(leaves);
    let maxJoinDistance=0, minFoldClearance=Infinity, penetrations=0, invalid=0, openStates=0;
    const inspect=()=>{
      binding.update();
      const p=binding.spine.geometry.attributes.position,uv=binding.spine.geometry.attributes.uv;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i);if(!Number.isFinite(x+y))invalid++;
        if(uv.getX(i)===0)maxJoinDistance=Math.max(maxJoinDistance,Math.hypot(x-leaves[0].group.position.x,y-leaves[0].group.position.y));
        if(uv.getX(i)===1)maxJoinDistance=Math.max(maxJoinDistance,Math.hypot(x-leaves[3].group.position.x,y-leaves[3].group.position.y));
        for(const cover of [leaves[0],leaves[3]]){
          const a=cover.hingeAngle+cover.bones[0].rotation.z,dx=x-cover.group.position.x,dy=y-cover.group.position.y;
          const along=dx*Math.cos(a)+dy*Math.sin(a),normal=-dx*Math.sin(a)+dy*Math.cos(a);
          if(along>.026&&Math.abs(normal)<.006)penetrations++;
        }
      }
      if(binding.fold.visible){
        openStates++;const boundary=leaves.findIndex(l=>l.progress<.5),q=binding.fold.geometry.attributes.position;
        const underside=Math.min(...[leaves[boundary-1],leaves[boundary]].map(l=>l.group.position.y-(l.cover?.006:.003)));
        for(let i=0;i<q.count;i++)minFoldClearance=Math.min(minFoldClearance,underside-q.getY(i));
      }
    };
    for(let boundary=0;boundary<=4;boundary++){scheduler.snap(boundary);inspect();}
    scheduler.snap(0);
    for(let frame=0;frame<720;frame++){
      if(frame===0)scheduler.request(4);if(frame===45)scheduler.request(0);if(frame===100)scheduler.request(3);if(frame===240)scheduler.request(1);if(frame===400)scheduler.request(4);if(frame===560)scheduler.request(0);
      scheduler.step(1/60,0);inspect();
    }
    return {maxJoinDistance,minFoldClearance,penetrations,invalid,openStates};
  });
  expect(result.maxJoinDistance).toBeLessThan(.021);expect(result.minFoldClearance).toBeGreaterThan(.0015);
  expect(result.penetrations).toBe(0);expect(result.invalid).toBe(0);expect(result.openStates).toBeGreaterThan(2);
});

test("resume page preserves original artwork and downloads its one-page PDF with clickable contacts", async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/resume/');
  const sheet=page.locator('.resume-sheet');
  await expect(page.locator('.resume-page')).toHaveAttribute('data-view','page');
  await expect(sheet).toHaveAttribute('data-art-ready','true');
  await expect(sheet).toHaveAttribute('data-motion','reduced');
  await expect(sheet).toHaveAttribute('data-orientation','0.000,0.000');
  await expect(page.locator('.resume-sheet')).toHaveCount(1);
  await expect(page.locator('.resume-artwork img')).toBeVisible();
  const size=await sheet.boundingBox();expect(size.width).toBeGreaterThan(200);expect(size.y).toBeGreaterThan(140);expect(size.y+size.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));expect(size.width/size.height).toBeCloseTo(595/842,2);
  await expect(page.locator('.paper-contact[aria-label="LinkedIn"]')).toHaveAttribute('href','https://www.linkedin.com/in/joshglucas/');
  await expect(page.locator('.paper-contact[aria-label="joshglucas@gmail.com"]')).toHaveAttribute('href','mailto:joshglucas@gmail.com');
  await expect(page.locator('.resume-page .profile-links')).toHaveCount(0);
  await expect(page.getByText('Drag gently to tilt · R to reset',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>/BookScene|CartridgeScene|FilmCameraScene/.test(r.name)))).toBe(false);
  const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Download PDF'}).click();const download=await pending;
  expect(download.suggestedFilename()).toBe('Josh-Lucas-Resume.pdf');
  const {readFile}=await import('node:fs/promises');const {PDFDocument,PDFArray,PDFDict,PDFName}=await import('pdf-lib');
  const pdf=await PDFDocument.load(await readFile(await download.path()));expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getSize()).toEqual({width:595,height:842});
  const links=pdf.getPage(0).node.lookup(PDFName.of('Annots'),PDFArray).asArray().map(ref=>pdf.context.lookup(ref,PDFDict).lookup(PDFName.of('A'),PDFDict).get(PDFName.of('URI')).decodeText());
  expect(links).toContain('https://www.linkedin.com/in/joshglucas/');expect(links).toContain('mailto:joshglucas@gmail.com');
  await page.getByRole('button',{name:'Read',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();
  await expect(sheet).toHaveAttribute('data-motion','paused');
  await expect(page.locator('.resume-job')).toHaveCount(2);await expect(page.locator('.resume-job').first()).toContainText('May 2019 - Present');
  await expect(page.locator('.resume-job').last()).toContainText('May - Sept 2017');await expect(page.locator('.resume-job').first()).toContainText('12% increase');
  await expect(page.locator('.resume-skills li')).toHaveCount(8);await expect(page.locator('.resume-tools li')).toHaveText(['Figma','Adobe Suite','GIFSKI','Principle']);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.resume-job li').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('.resume-gradient')).toHaveAttribute('data-active','true');
});

test("floating resume tilts on drag, settles without resizing, and resets with R", async ({ page }) => {
  await page.goto('/resume/');const sheet=page.locator('.resume-sheet');await expect(sheet).toHaveAttribute('data-art-ready','true');await expect(sheet).toHaveAttribute('data-motion','floating');
  await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  await expect(sheet).toHaveAttribute('data-ground-normal','0,1,0');
  const pose=await sheet.evaluate(el=>({ground:Number(el.dataset.groundY),center:Number(el.dataset.paperY),normal:el.dataset.paperNormal.split(',').map(Number)}));
  expect(pose.center-4.7/2-pose.ground).toBeGreaterThan(.5);expect(Math.abs(pose.normal[1])).toBeGreaterThan(.27);expect(Math.abs(pose.normal[1])).toBeLessThan(.43);
  const initial=await sheet.getAttribute('data-orientation'),width=await sheet.evaluate(el=>el.clientWidth),box=await sheet.boundingBox();
  await page.mouse.move(box.x+box.width*.45,box.y+150);await page.mouse.down();await page.mouse.move(box.x+box.width*.45+150,box.y+220,{steps:8});
  await expect(sheet).toHaveAttribute('data-dragging','true');await expect(sheet).not.toHaveAttribute('data-orientation',initial);
  await expect.poll(async()=>Number(await sheet.getAttribute('data-bend'))).toBeGreaterThan(.05);
  expect(Number(await sheet.getAttribute('data-bend'))).toBeLessThan(.26);
  await page.mouse.up();await expect(sheet).toHaveAttribute('data-dragging','false');
  await expect.poll(async()=>{const [x,y]=(await sheet.getAttribute('data-orientation')).split(',').map(Number);return Math.abs(x+20)<3.5&&Math.abs(y+12)<4.5}).toBe(true);
  expect(await sheet.evaluate(el=>el.clientWidth)).toBe(width);await expect(page).toHaveURL(/\/resume\/$/);
  await expect.poll(async()=>Number(await sheet.getAttribute('data-bend'))).toBeLessThan(.01);
  await page.keyboard.press('r');await page.emulateMedia({reducedMotion:'reduce'});await expect(sheet).toHaveAttribute('data-orientation','0.000,0.000');
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(page.locator('.resume-paper-canvas')).toHaveCount(1);await expect(sheet).toHaveAttribute('data-motion','paused');
});

test("floating resume opens Read on a click or keyboard activation, never after dragging or cancellation", async ({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/resume/');const sheet=page.locator('.resume-sheet'),main=page.locator('.resume-page');
  await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  const box=await sheet.boundingBox(),x=box.x+box.width/2,y=box.y+box.height*.4;
  // Crossing the slop then returning to the start is still a drag.
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+90,y+50,{steps:6});await page.mouse.move(x,y,{steps:6});await page.mouse.up();
  await expect(main).toHaveAttribute('data-view','page');
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(5,5,{steps:5});await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-dragging','false');await expect(main).toHaveAttribute('data-view','page');
  await page.mouse.move(x,y);
  // Cancellation never leaves a pending click activation behind.
  await page.mouse.down();await sheet.evaluate(el=>el.parentElement.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true})));await page.mouse.up();
  await expect(main).toHaveAttribute('data-view','page');
  const stage=await page.locator('.resume-paper-stage').boundingBox();await page.mouse.click(stage.x+10,stage.y+10);await expect(main).toHaveAttribute('data-view','page');
  // Small hand movement counts as a click, not a drag.
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+2,y+2);await page.mouse.up();
  await expect(main).toHaveAttribute('data-view','read');await expect(page.locator('.resume-paper-canvas')).toHaveCount(1);
  await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-view','page');await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  const target=page.getByRole('button',{name:'Open résumé in reading view'});await target.focus();await target.press('Enter');await expect(main).toHaveAttribute('data-view','read');
  await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-view','page');await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  await page.emulateMedia({reducedMotion:'reduce'});await expect(sheet).toHaveAttribute('data-orientation','0.000,0.000');
  const link=page.locator('.paper-contact[aria-label="LinkedIn"]');
  await link.evaluate(el=>el.addEventListener('click',event=>{event.preventDefault();el.dataset.clicked='true'}));
  await link.click();await expect(link).toHaveAttribute('data-clicked','true');await expect(main).toHaveAttribute('data-view','page');
  await target.focus();await target.press('Space');await expect(main).toHaveAttribute('data-view','read');
  expect(errors).toEqual([]);
});

test("mobile resume defaults to readable text and an unavailable preview falls back to reading", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/resume/');await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');
  await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();await expect(page.locator('.resume-artwork img')).toHaveCount(0);
  expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('resume-art-')))).toBe(false);
  await page.route('**/resume/resume-art-*.png',route=>route.abort());await page.getByRole('button',{name:'Page',exact:true}).click();
  await expect(page.getByRole('button',{name:'Page',exact:true})).toBeDisabled();await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("resume keeps its original paper preview usable without WebGL", async ({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}});
  await page.goto('/resume/');const sheet=page.locator('.resume-sheet');
  await expect(sheet).toHaveAttribute('data-surface','fallback');
  await expect(page.locator('.resume-artwork picture')).toHaveCSS('opacity','1');
  await expect(page.locator('.resume-paper-canvas')).toHaveCount(0);
  const idleGlow=await sheet.evaluate(el=>getComputedStyle(el).boxShadow),box=await sheet.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height*.4);
  await expect.poll(()=>sheet.evaluate(el=>Number(el.style.getPropertyValue('--paper-emphasis')))).toBeGreaterThan(.98);
  expect(await sheet.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe(idleGlow);
  await page.mouse.move(8,8);await expect.poll(()=>sheet.evaluate(el=>Number(el.style.getPropertyValue('--paper-emphasis')))).toBeLessThan(.02);
  // Reduced motion keeps the static hover contrast, while skipping the scale/bounce.
  await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(box.x+box.width/2,box.y+box.height*.4);
  await expect.poll(()=>sheet.evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--paper-emphasis')))).toBe(1);await expect(sheet).toHaveAttribute('data-hover-scale','1.0000');
  await page.mouse.move(8,8);await expect.poll(()=>sheet.evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--paper-emphasis')))).toBe(0);
  await page.getByRole('button',{name:'Open résumé in reading view'}).click();
  await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();
});

test('resume Read keeps its title clear of navigation when shared styles load last',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}});
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/resume/');
  // Production extracts the shared collection stylesheet after the resume stylesheet.
  const {readFile}=await import('node:fs/promises');
  await page.addStyleTag({content:await readFile(new URL('../src/cartridge/style.css',import.meta.url),'utf8')});
  const main=page.locator('.resume-page');await page.getByRole('button',{name:'Read',exact:true}).click();await expect(main).toHaveAttribute('data-view','read');
  for(const [width,height] of [[1440,1000],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await expect.poll(async()=>{const heading=await page.locator('.resume-read-stage h1').boundingBox(),nav=await page.locator('.resume-nav').boundingBox();return heading.y-(nav.y+nav.height)}).toBeGreaterThanOrEqual(24);
    const controls=await page.locator('.resume-toolbar').boundingBox();expect(controls.y).toBeGreaterThan(height*.7);
    await expect(page.getByRole('link',{name:'Home',exact:true})).toBeVisible();
  }
  await page.evaluate(()=>scrollTo(0,400));await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-view','page');
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(main).toHaveAttribute('data-view','read');
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  const heading=await page.locator('.resume-read-stage h1').boundingBox(),nav=await page.locator('.resume-nav').boundingBox();expect(heading.y).toBeGreaterThanOrEqual(nav.y+nav.height+24);
});

test("resume Page stays fully inside desktop, phone and landscape viewports", async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/resume/');await page.getByRole('button',{name:'Page',exact:true}).click();
  await expect(page.locator('.resume-sheet')).toHaveAttribute('data-art-ready','true');
  for(const [width,height] of [[1440,1000],[1280,720],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await expect.poll(async()=>{const r=await page.locator('.resume-sheet').boundingBox();return r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1}).toBe(true);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const controls=await page.locator('.resume-toolbar').boundingBox(),header=await page.locator('.resume-nav').boundingBox(),paper=await page.locator('.resume-sheet').boundingBox();
    expect(controls.y).toBeGreaterThan(height*.7);expect(controls.y+controls.height).toBeLessThanOrEqual(height-11);
    expect(paper.y+paper.height).toBeLessThan(controls.y);expect(header.y).toBe(24);expect(header.x).toBeGreaterThanOrEqual(24);
    expect(await page.getByRole('link',{name:'Download PDF'}).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
  }
});

test("Read is full-page text with responsive gradients and a static reduced-motion background", async ({ page }) => {
  await page.goto('/resume/');await page.getByRole('button',{name:'Read',exact:true}).click();
  await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');
  const gradient=page.locator('.resume-gradient'),pink=page.locator('.resume-wash-pink');
  await expect(gradient).toHaveAttribute('data-motion','ambient');await expect(page.locator('.resume-sheet')).toHaveCSS('box-shadow','none');
  await expect(page.locator('html')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(page.locator('.resume-document:not(.sr-only)')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const before=await pink.evaluate(el=>el.style.transform);await page.mouse.move(1100,600);
  await expect.poll(()=>pink.evaluate(el=>el.style.transform)).not.toBe(before);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(gradient).toHaveAttribute('data-motion','reduced');
  const stopped=await pink.evaluate(el=>el.style.transform);await page.mouse.move(20,20);await page.waitForTimeout(180);expect(await pink.evaluate(el=>el.style.transform)).toBe(stopped);
  await page.getByRole('button',{name:'Page',exact:true}).click();await expect(gradient).toHaveAttribute('data-active','true');
});

test("download starts immediately while a decorative duplicate flies away without reflow", async ({ page }) => {
  await page.goto('/resume/');await expect(page.locator('.resume-sheet')).toHaveAttribute('data-art-ready','true');
  const button=page.getByRole('link',{name:'Download PDF'}),before=await page.evaluate(()=>({height:document.documentElement.scrollHeight,y:scrollY}));
  const pending=page.waitForEvent('download');await button.click();const download=await pending;expect(download.suggestedFilename()).toBe('Josh-Lucas-Resume.pdf');
  await expect(page.locator('.resume-download-copy')).toHaveCount(1);await expect(page.locator('.resume-download-copy')).toHaveAttribute('aria-hidden','true');
  expect(await page.evaluate(()=>({height:document.documentElement.scrollHeight,y:scrollY}))).toEqual(before);
  await expect(page.locator('.resume-download-copy')).toHaveCount(0);
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');
  // Read from the settled view; locator clicks can auto-scroll a moving sticky toolbar.
  await expect(page.locator('.resume-page')).toHaveAttribute('data-transitioning','false');
  await page.evaluate(()=>scrollTo(0,500));const readingPosition=await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight}));
  const readingDownload=page.waitForEvent('download');await button.click();await readingDownload;await expect(page.locator('.resume-download-copy')).toHaveCount(1);
  expect(await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight}))).toEqual(readingPosition);
  const repeat=page.waitForEvent('download');await button.click();await repeat;await expect(page.locator('.resume-download-copy')).toHaveCount(1);await expect(page.locator('.resume-download-copy')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});const second=page.waitForEvent('download');await button.click();await second;await expect(page.locator('.resume-download-copy')).toHaveCount(0);
});

test("rapid resume view changes honor the final requested mode", async ({ page }) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/resume/');await expect(page.locator('.resume-sheet')).toHaveAttribute('data-art-ready','true');
  await page.locator('.resume-view-switch').evaluate(group=>{group.children[1].click();group.children[0].click()});
  await page.waitForTimeout(650);await expect(page.locator('.resume-page')).toHaveAttribute('data-view','page');
  await page.locator('.resume-view-switch').evaluate(group=>{group.children[1].click();group.children[0].click();group.children[1].click()});
  await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('notes peel from the book, reverse on dismissal, and keep their irregular handwriting',async({page})=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/after-hours/');
  const book=page.locator('.after-hours-book');await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});
  await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-settled-boundary','1');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const hit=JSON.parse(await book.getAttribute('data-note-hits')).find(item=>item.id==='metronome');
  await page.mouse.click(hit.x,hit.y);
  const dialog=page.getByRole('dialog',{name:'Metronome'});await expect(dialog).toBeVisible();
  const flight=await dialog.locator('.zine-note-paper').evaluate(el=>{
    const animation=el.getAnimations()[0];animation.pause();animation.currentTime=0;
    const rect=el.getBoundingClientRect(),matrix=getComputedStyle(el).transform;
    return {width:rect.width,matrix};
  });
  expect(flight.matrix).toContain('matrix3d');expect(flight.width).toBeLessThan(250);
  await dialog.locator('.zine-note-paper').evaluate(el=>{const animation=el.getAnimations()[0];animation.currentTime=600;animation.play()});
  await expect(dialog).toHaveAttribute('data-state','reading');
  expect(await dialog.locator('.zine-note-scrim').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(255, 255, 255, 0.88)');
  const poses=await dialog.locator('.handwritten-word').evaluateAll(words=>words.map(word=>getComputedStyle(word).transform));expect(new Set(poses).size).toBeGreaterThan(15);
  await page.mouse.move(4,4);await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');await expect(dialog).toHaveAttribute('data-state','returning');
  await expect(dialog).toHaveCount(0);await expect(book).toHaveAttribute('data-settled-boundary','1');
  const shortcut=page.getByRole('button',{name:'Read note for Metronome',exact:true});await shortcut.focus();await shortcut.press('Enter');
  await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(shortcut).toBeFocused();
  await shortcut.press('Enter');await expect(dialog).toHaveAttribute('data-state','reading');await page.mouse.click(8,8);await expect(dialog).toHaveCount(0);
});

test('photos use a loose Polaroid spread and retain the zine at its own address',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos/');
  await expect(page.getByRole('heading',{name:'Film photographs'})).toHaveCount(1);
  await expect(page.locator('.polaroid')).toHaveCount(6);await expect(page.locator('.after-hours-book,.photo-entry-camera')).toHaveCount(0);
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect.poll(()=>page.locator('.polaroid').evaluateAll(cards=>cards.every(card=>card.clientWidth>100))).toBe(true);
    const layout=await page.locator('.polaroid').evaluateAll(cards=>cards.map(card=>getComputedStyle(card).transform));
    expect(new Set(layout).size).toBeGreaterThan(3);
  }
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
  await page.getByRole('link',{name:'Back to Josh Lucas'}).click();
  await page.getByRole('link',{name:/Zine of Extracurriculars/}).click();await expect(page).toHaveURL(/after-hours/);
  expect(errors).toEqual([]);
});

test('resume keeps its rendered sheet ready and controls fixed through both view transitions',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|shader error/i.test(message.text()))errors.push(message.text())});
  await page.setViewportSize({width:1440,height:1000});await page.goto('/resume/');
  const main=page.locator('.resume-page'),sheet=page.locator('.resume-sheet'),canvas=page.locator('.resume-paper-canvas');
  await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});await canvas.evaluate(el=>el.dataset.testIdentity='same-surface');
  await expect(page.getByRole('link',{name:'Home',exact:true})).toBeVisible();
  const controls=()=>page.locator('.resume-toolbar').boundingBox(),before=await controls();
  expect(before.y).toBe(910);
  const headerBefore=await page.locator('.resume-nav').boundingBox();expect(headerBefore.y).toBe(24);
  await sheet.evaluate(el=>{window.__hoverSampling=true;window.__hoverPeak=1;const sample=()=>{window.__hoverPeak=Math.max(window.__hoverPeak,Number(el.dataset.hoverScale));if(window.__hoverSampling)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
  const box=await sheet.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height*.45);
  await expect.poll(()=>page.evaluate(()=>window.__hoverPeak)).toBeGreaterThan(1.065);
  await expect.poll(async()=>Math.abs(Number(await sheet.getAttribute('data-hover-scale'))-1.06)).toBeLessThan(.001);
  await page.evaluate(()=>window.__hoverSampling=false);
  const stableWidth=await sheet.evaluate(el=>el.clientWidth);
  await page.mouse.move(8,8);await expect.poll(async()=>Math.abs(Number(await sheet.getAttribute('data-hover-scale'))-1)).toBeLessThan(.002);
  expect(await sheet.evaluate(el=>el.clientWidth)).toBe(stableWidth);
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(main).toHaveAttribute('data-view','read');
  expect(await controls()).toEqual(before);await expect(canvas).toHaveAttribute('data-test-identity','same-surface');await expect(canvas).toBeHidden();await expect(sheet).toHaveAttribute('data-motion','paused');
  expect(await page.locator('.resume-nav').boundingBox()).toEqual(headerBefore);
  await page.evaluate(()=>scrollTo(0,450));expect(await controls()).toEqual(before);
  await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-transitioning','true');
  await expect(page.locator('.resume-morph-layer')).toHaveCount(3);
  await expect(page.locator('.resume-artwork picture')).toHaveCSS('opacity','0');
  await expect(main).toHaveAttribute('data-view','page');await expect(canvas).toHaveAttribute('data-test-identity','same-surface');await expect(canvas).toBeVisible();
  await expect(sheet).toHaveAttribute('data-motion','floating');expect(await controls()).toEqual(before);
  await expect(page.locator('.resume-morph-layer')).toHaveCount(0);await expect(page.locator('.resume-gradient')).toHaveAttribute('data-active','true');
  await expect(page.getByRole('link',{name:'Home',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('project exits fade, blur and move the whole page left before navigating',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}});
  await page.goto('/');const main=page.locator('main.collection');await expect(main).toHaveAttribute('data-status','fallback');
  // Pause only the outgoing animation, so the handoff can be inspected reliably.
  await page.evaluate(()=>{const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const a=animate.call(this,frames,options);if(this.matches('main.collection')){a.pause();a.currentTime=150}return a}});
  const links=page.getByRole('navigation',{name:'Recent projects'}).locator('.recent-project-list > li:not(.recent-camera-row) > a');
  await links.first().scrollIntoViewIfNeeded();
  await expect(page.locator('.recent-project-list li').first()).toHaveAttribute('data-reveal-state','visible');
  await page.locator('.recent-project-list li').first().evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished))});
  await links.first().click();await expect(main).toHaveAttribute('data-exiting','true');
  const exit=await main.evaluate(el=>{const s=getComputedStyle(el);return{opacity:Number(s.opacity),blur:parseFloat(s.filter.match(/[\d.]+/)[0]),x:new DOMMatrixReadOnly(s.transform).m41,inert:el.inert}});
  expect(exit.opacity).toBeGreaterThan(0);expect(exit.opacity).toBeLessThan(1);expect(exit.blur).toBeGreaterThan(0);expect(exit.x).toBeLessThan(0);expect(exit.inert).toBe(true);
  await expect(page.locator('.case-study')).toHaveCount(0);expect(new URL(page.url()).searchParams.get('view')).toBeNull();
  expect(await main.locator('.collection-header,.collection-hero,.recent-projects,.collection-footer').count()).toBe(4);
  await page.screenshot({path:testInfo.outputPath('project-exit-mid.png')});
  await main.evaluate(el=>el.getAnimations()[0].finish());await expect(page.getByRole('heading',{name:'AI Mode Nudges',exact:true})).toBeFocused();
  await expect(main).toHaveAttribute('data-exiting','false');await expect(main).toHaveCSS('transform','none');
  await page.goBack();await expect(links.first()).toBeFocused();await expect(page.locator('.case-study')).toHaveCount(0);
  // A cancelled exit restores the page without adding a history entry.
  await page.getByRole('button',{name:'Open Stadia cartridge',exact:true}).click();await expect(main).toHaveAttribute('data-exiting','true');
  await page.keyboard.press('Escape');await expect(main).toHaveAttribute('data-exiting','false');await expect(main).toHaveCSS('opacity','1');await expect(main).toHaveCSS('filter','none');await expect(page.locator('.case-study')).toHaveCount(0);
  // The same exit also precedes the real zine page navigation.
  await links.last().click();await expect(main).toHaveAttribute('data-exiting','true');expect(new URL(page.url()).pathname).toBe('/');
  await main.evaluate(el=>el.getAnimations()[0].finish());await expect(page).toHaveURL(/\/after-hours\/$/);
  await page.goBack();await expect(main).toHaveAttribute('data-exiting','false');await expect(main).toHaveCSS('opacity','1');
  expect(errors).toEqual([]);
});

test('AI Mode case study shows the supplied story and outcomes at the home project width',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  const navigation=page.getByRole('navigation',{name:'Recent projects'}),homeWidth=(await navigation.boundingBox()).width;
  await navigation.getByRole('link',{name:/AI Mode Nudges/}).click();
  const study=page.getByRole('region',{name:'AI Mode Nudges case study'});
  await expect(study).toBeVisible();await expect(study.getByRole('heading',{name:'AI Mode Nudges',exact:true})).toBeFocused();
  expect((await study.locator('.case-study-measure').boundingBox()).width).toBeCloseTo(homeWidth,0);
  await expect(study.locator('.case-outcome-grid dd')).toHaveText(['+1.84%','+3.87%','10+']);
  await expect(study.locator('.case-study-facts')).toContainText('Lead Product Designer');await expect(study.locator('.case-study-facts')).toContainText('Follow-ups & interactive questionnaires');
  await expect(study.locator('.case-impact')).toContainText('Inline nudges launched globally');await expect(study.locator('.case-impact')).toContainText('web-result clicks healthy');
  await expect(study.locator('.case-decisions li')).toHaveCount(3);await expect(study.locator('.case-decisions')).toContainText('“Something else”');await expect(study.locator('.case-decisions')).toContainText('live browser prototypes');
  await expect(study.locator('.case-study-preview,.case-study-note')).toHaveCount(0);await expect(study.locator('.case-story-media')).toHaveCount(3);
  expect(await study.locator('.case-story-media').evaluateAll(elements=>elements.map(el=>el.dataset.mediaType))).toEqual(['image','image','video']);
  await expect(study.locator('.case-story-media').nth(2)).toHaveAttribute('data-media-type','video');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>study.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect.poll(async()=>{
    const bounds=await study.locator('.case-outcome-grid dd').evaluateAll(elements=>elements.map(el=>({width:el.clientWidth,scroll:el.scrollWidth})));
    return bounds.every(r=>r.scroll<=r.width+1);
  }).toBe(true);
  await study.getByRole('button',{name:'Back to collection',exact:true}).first().click();await expect(study).toHaveCount(0);
  await expect(navigation.getByRole('link',{name:/AI Mode Nudges/})).toBeFocused();expect(errors).toEqual([]);
});
