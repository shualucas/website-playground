import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test("career collection uses exact bio and four individually visible cartridges in a compact diagonal stack", async ({ page, request }) => {
  await load(page);
  await expect(page.locator(".miniature-loader")).toHaveCount(0);
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-selected", "");
  await expect(page.locator(".intro-name")).toHaveText("Josh");
  await expect(page.locator(".role-rotator")).toHaveAttribute("data-role", "product designer");
  await expect(page.locator(".bio-continuation")).toHaveText(body);
  expect(funFacts).toContain(await page.locator(".random-fact").textContent());
  await expect(page.locator(".collection-header").getByRole("button", { name: "About", exact: true })).toHaveCount(0);
  await expect(page.locator(".collection-content,.content-row")).toHaveCount(0);
  await expect(page.locator(".cartridge-keyboard")).toHaveCount(4);
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-view", "tilted-top-edge");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-magnification", "2.4");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-rest-pitch", "72");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-shadow", "soft-silhouette");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-model", "external-glb");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-order", "search,stadia,gmail,blizzard");
  const projected = JSON.parse(await page.locator(".cartridge-stage").getAttribute("data-frame-bounds"));
  expect(projected.right - projected.left).toBeGreaterThan(300);
  expect(projected.right - projected.left).toBeLessThan(380);
  const intro = await page.locator(".collection-intro").boundingBox(), stage = await page.locator(".cartridge-stage").boundingBox();
  const hero = await page.locator(".collection-hero").boundingBox();
  expect(hero.width).toBe(960);
  expect(await page.locator(".collection-hero").evaluate(el=>getComputedStyle(el).columnGap)).toBe("140px");
  const footerBounds = await page.locator(".collection-footer").boundingBox();
  expect(Math.abs(footerBounds.x - intro.x)).toBeLessThan(2);
  const headerBounds=await page.locator('.collection-header').boundingBox();
  expect(Math.abs(footerBounds.x+footerBounds.width-headerBounds.x-headerBounds.width)).toBeLessThan(1);
  expect(Math.abs(intro.y + intro.height / 2 - stage.y - stage.height / 2)).toBeLessThan(1);
  expect(projected.left).toBeGreaterThan(20);expect(projected.right).toBeLessThan(stage.width-20);
  await expect(page.locator('.cartridge-stage')).toHaveAttribute('data-composition','zigzag-stack');
  await expect(page.getByRole('button',{name:/View Early work cartridge/})).toHaveCount(0);
  expect(await page.locator(".bio-continuation").evaluate((el) => getComputedStyle(el).fontSize)).toBe("23px");
  const hits = [];
  for (let i = 0; i < 4; i++) {
    const facing = Number(await page.locator(".cartridge-stage").getAttribute(`data-front-facing${i}`));
    expect(facing).toBeGreaterThan(.28); expect(facing).toBeLessThan(.38);
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

test("career captions retain team and dates while the archived early reader remains accessible", async ({ page }) => {
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
    const visible = await page.locator(".cartridge-stage").evaluate((el) => [0,1,2,3].every((i) => {
      const x = parseFloat(el.style.getPropertyValue(`--hit-${i}-x`)), y = parseFloat(el.style.getPropertyValue(`--hit-${i}-y`)); return x >= 22 && x <= el.clientWidth - 22 && y >= 22 && y <= el.clientHeight - 22;
    }));
    expect(visible).toBe(true);
  }
  await expect(page.getByRole("button", { name: "View Early work cartridge", exact: true })).toHaveCount(0);
  await page.goto("/?project=early-work&view=case-study");
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
        for(let i=0;i<4;i++){
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
  await page.emulateMedia({reducedMotion:'reduce'});await select('Blizzard Entertainment');await expect(caption).toBeVisible();await expect(caption).toHaveCSS('animation-name','none');
});

test("canvas selection, drag rotation, caption entry and browser history work with the new chronology", async ({ page }) => {
  test.setTimeout(120000); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await load(page); const stage = page.locator(".cartridge-stage"), target = await point(page, 1);
  await page.mouse.click(target.x, target.y);
  await expect(stage).toHaveAttribute("data-selected", "stadia"); await expect(stage).toHaveAttribute("data-settled", "true");
  const caption = page.locator(".cartridge-caption");
  await expect(caption).toHaveAttribute("aria-label", "Open Stadia, 2020 – 2022");
  const captionBefore = await caption.boundingBox();
  await expect(caption.locator(':scope > span').first()).toHaveCSS('font-weight','400');
  await expect(caption.locator('.cartridge-years')).toHaveCSS('font-weight','400');
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
  for (const name of ["Blizzard Entertainment", "Search", "Gmail"]) {
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

test("Search and legacy AI Mode deep links remain readable", async ({ page }) => {
  await page.goto("/?project=ai-mode&view=case-study");
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 60000 });
  await expect(page.getByRole("region", { name: "Search case study" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Search case study" }).getByText("2022–Now", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).first().click();
  await expect(page.locator(".case-study")).toHaveCount(0); await expect(page.locator(".collection")).toHaveAttribute("data-selected", "search");
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
      const ys = [0,1,2,3].map(i => Number(stage.dataset[`position${i}`].split(",")[1]));
      if (ys.some((y, i) => i > 0 && y >= ys[i - 1])) window.orderChanges.push(ys);
    }).observe(stage, { attributes: true, attributeFilter: ["data-intersections"] });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // A direct middle selection previously let two lower neighbors exchange
  // slots and prevented settling, despite the final target poses being clear.
  await page.getByRole("button", { name: "View Stadia cartridge", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  for (const name of ["Gmail", "Search", "Blizzard Entertainment", "Stadia"]) {
    const control = page.getByRole("button", { name: `View ${name} cartridge`, exact: true }); await control.focus(); await control.press("Enter");
  }
  const stage = page.locator(".cartridge-stage");
  await expect(stage).toHaveAttribute("data-settled", "true", { timeout: 60000 });
  await expect(stage).toHaveAttribute("data-intersections", "0");
  expect(Number(await stage.getAttribute("data-front-facing1"))).toBeGreaterThan(.98);
  for (const i of [0, 2, 3]) {
    const facing = Number(await stage.getAttribute(`data-front-facing${i}`));
    expect(facing).toBeGreaterThan(.28); expect(facing).toBeLessThan(.38);
  }
  const positions = await stage.evaluate((el) => [0,1,2,3].map(i => el.dataset[`position${i}`].split(",").map(Number)));
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
  expect(finishes.stadia.shells.every((m) => m.transmission > .5 && m.transmission < .8)).toBe(true);
});

test("selected cartridges retain ambient drift and fixed framing with the frosted finish",async({page})=>{
 test.setTimeout(120000);await load(page);await page.emulateMedia({reducedMotion:'no-preference'});await choose(page,'Gmail');
 const stage=page.locator('.cartridge-stage'),drift=await stage.getAttribute('data-drift2'),zoom=await stage.getAttribute('data-magnification');
 await expect.poll(()=>stage.getAttribute('data-drift2')).not.toBe(drift);expect(Number(await stage.getAttribute('data-front-facing2'))).toBeGreaterThan(.98);
 await expect(stage).toHaveAttribute('data-intersections','0');await expect(stage).toHaveAttribute('data-magnification',zoom);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(stage).toHaveAttribute('data-drift2','0,0');
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

test('cartridge browsing follows only the exposed tops and rocks with the contact position',async({page})=>{
  test.setTimeout(120000);const errors=[];page.on('pageerror',error=>errors.push(error.message));await load(page);
  const stage=page.locator('.cartridge-stage');await page.mouse.move(2,2);await page.emulateMedia({reducedMotion:'no-preference'});
  const touch=async(index,side=1)=>{const rect=await stage.boundingBox(),points=JSON.parse(await stage.getAttribute(`data-browse${index}`));await page.mouse.move(rect.x+points[side].x,rect.y+points[side].y)};
  for(const [index,id] of ['search','stadia','gmail','blizzard'].entries()){
    await touch(index);await expect(stage).toHaveAttribute('data-hovered',id);
  }
  await touch(1,0);await expect(stage).toHaveAttribute('data-hovered','stadia');
  await expect.poll(async()=>Number((await stage.getAttribute('data-hover-contact')).split(',')[0])).toBeLessThan(-.5);
  await expect.poll(async()=>Number((await stage.getAttribute('data-contact-pose1')).split(',')[2])).toBeGreaterThan(.01);
  await touch(1,2);
  await expect.poll(async()=>Number((await stage.getAttribute('data-hover-contact')).split(',')[0])).toBeGreaterThan(.5);
  await expect.poll(async()=>Number((await stage.getAttribute('data-contact-pose1')).split(',')[2])).toBeLessThan(-.01);
  // The printed front below the top strip does not claim hover, but remains clickable.
  const front=await point(page,0);await page.mouse.move(front.x,front.y);await expect(stage).toHaveAttribute('data-hovered','');
  await page.mouse.click(front.x,front.y);await expect(stage).toHaveAttribute('data-selected','search');
  const caption=page.locator('.cartridge-caption');await expect(caption).toBeVisible();await caption.hover();
  await expect(stage).toHaveAttribute('data-hovered','');
  await expect(caption.locator(':scope > span').first()).toHaveCSS('font-weight','400');
  expect(await caption.locator(':scope > span').first().evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(stage).toHaveAttribute('data-contact-pose0','0.0000,0.0000,0.0000');
  await expect(stage).toHaveAttribute('data-magnification','2.4');await expect(stage).toHaveAttribute('data-intersections','0');expect(errors).toEqual([]);
});

test('zine hover spins the closed cover without turning pages and replays on return',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await load(page);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>new Promise(requestAnimationFrame));
 const link=page.getByRole('link',{name:/Zine of Extracurriculars/}),book=page.locator('.zine-preview-scene');
 await link.hover();await expect(book).toHaveAttribute('data-status','ready',{timeout:60000});await expect(book).toHaveAttribute('data-preview-intro','spinning');
 await expect(book).toHaveAttribute('data-view','cover');await expect(book).toHaveAttribute('data-requested-page','-1');const angle=await book.getAttribute('data-preview-spin-angle');await expect.poll(()=>book.getAttribute('data-preview-spin-angle')).not.toBe(angle);
 expect(JSON.parse(await book.getAttribute('data-leaf-states')).every(leaf=>leaf.progress===0)).toBe(true);await expect(book).toHaveAttribute('data-preview-intro','settled',{timeout:30000});await expect(book).toHaveAttribute('data-preview-spin-angle','0');
 await book.evaluate(el=>el.dataset.testIdentity='same-spinning-book');await page.mouse.move(2,2);await expect(book).toHaveAttribute('data-active','false');await link.hover();await expect(book).toHaveAttribute('data-test-identity','same-spinning-book');await expect(book).toHaveAttribute('data-preview-intro','spinning');await expect(book).toHaveAttribute('data-view','cover');
 await page.mouse.move(2,2);await page.emulateMedia({reducedMotion:'reduce'});await link.hover();await expect(book).toHaveAttribute('data-preview-intro','settled');await expect(book).toHaveAttribute('data-view','cover');expect(JSON.parse(await book.getAttribute('data-leaf-states')).every(leaf=>leaf.progress===0)).toBe(true);
});

test('bounded paper settings stay finite and ordered through interrupted turns',async({page})=>{
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
   const THREE=await import('/node_modules/three/build/three.module.js');
   const {SkinnedLeaf,createLeafGeometry}=await import('/src/book/leaf.ts');const {TurnScheduler}=await import('/src/book/turn-scheduler.ts');
   const {physicsControls,normalizePaperPhysics}=await import('/src/book/paper-physics.ts');const {advancePaperFlex}=await import('/src/book/paper-flex.ts');
   const material=new THREE.MeshStandardMaterial({map:new THREE.Texture()});let finite=true,ordered=true,closed=true;
   for(const bound of ['min','max']){
    const settings=normalizePaperPhysics(Object.fromEntries(Object.entries(physicsControls).map(([key,value])=>[key,value[bound]])));
    const leaves=Array.from({length:4},(_,i)=>new SkinnedLeaf(i,i===0||i===3,4,createLeafGeometry(),Array(6).fill(material)));
    const scheduler=new TurnScheduler(leaves);scheduler.setPhysics(settings);scheduler.snap(0);scheduler.request(4);
    let flex=0,velocity=0;
    for(let frame=0;frame<1000;frame++){
     if(frame===12)scheduler.request(0);if(frame===25)scheduler.request(4);if(frame===80)scheduler.request(0);
     const response=advancePaperFlex(flex,velocity,frame<80?.15:0,1/30,settings.reboundDamping);flex=response.value;velocity=response.velocity;scheduler.step(1/30,flex*settings.rotationFlex);
     finite&&=Number.isFinite(flex)&&leaves.every(leaf=>Number.isFinite(leaf.progress)&&leaf.bones.every(b=>[b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite)));
     ordered&&=leaves.every((leaf,i)=>!i||leaves[i-1].progress+1e-7>=leaf.progress);
    }
    closed&&=!scheduler.moving&&leaves.every(leaf=>leaf.progress===0);leaves.forEach(leaf=>{leaf.dispose();leaf.mesh.geometry.dispose()});
   }
   material.map.dispose();material.dispose();const normalized=normalizePaperPhysics({turnSpeed:Infinity,curl:900,edgeStiffness:-10});
   return{finite,ordered,closed,normalized};
  });
  expect(result.finite).toBe(true);expect(result.ordered).toBe(true);expect(result.closed).toBe(true);expect(result.normalized.turnSpeed).toBe(1);expect(result.normalized.curl).toBe(1.15);expect(result.normalized.edgeStiffness).toBe(.65);
 });

test('stacked hero and resting cartridges align to the left without changing inspection zoom',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:768,height:1000});await load(page);const intro=await page.locator('.collection-intro').boundingBox(),stage=page.locator('.cartridge-stage'),display=await page.locator('.collection-display').boundingBox();expect(intro.x).toBe(60);expect(display.x).toBe(intro.x);await expect.poll(async()=>{const frame=JSON.parse(await stage.getAttribute('data-frame-bounds'));return frame.left}).toBeLessThan(35);expect(JSON.parse(await stage.getAttribute('data-frame-bounds')).left).toBeGreaterThan(0);const zoom=await stage.getAttribute('data-magnification');await choose(page,'Search');await expect(stage).toHaveAttribute('data-magnification',zoom);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('cartridge swipe direction reverses top motion while its bottom edge remains anchored',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await load(page);const stage=page.locator('.cartridge-stage');await page.mouse.move(2,2);await page.emulateMedia({reducedMotion:'no-preference'});
 const strip=async()=>{const box=await stage.boundingBox(),points=JSON.parse(await stage.getAttribute('data-swipe-strip1'));return points.map(point=>({x:point.x+box.x,y:point.y+box.y}))};
 let [top,bottom]=await strip();await page.mouse.move(bottom.x,bottom.y);await page.mouse.move(top.x,top.y,{steps:3});await expect(stage).toHaveAttribute('data-hovered','stadia');await expect(stage).toHaveAttribute('data-swipe-direction','up');await expect.poll(()=>stage.getAttribute('data-contact-pose1').then(value=>Number(value.split(',')[1]))).toBeLessThan(-.012);
 let movement=(await stage.getAttribute('data-contact-motion1')).split(',').map(Number);expect(movement[0]).toBeLessThan(.00001);expect(movement[1]).toBeGreaterThan(.025);
 [top,bottom]=await strip();await page.mouse.move(bottom.x,bottom.y,{steps:3});await expect(stage).toHaveAttribute('data-swipe-direction','down');await expect.poll(()=>stage.getAttribute('data-contact-pose1').then(value=>Number(value.split(',')[1]))).toBeGreaterThan(.012);
 movement=(await stage.getAttribute('data-contact-motion1')).split(',').map(Number);expect(movement[0]).toBeLessThan(.00001);expect(movement[1]).toBeGreaterThan(.025);await expect(stage).toHaveAttribute('data-intersections','0');
 await page.mouse.move(2,2);await expect(stage).toHaveAttribute('data-swipe-direction','none');await page.emulateMedia({reducedMotion:'reduce'});await expect(stage).toHaveAttribute('data-contact-pose1','0.0000,0.0000,0.0000');await expect(stage).toHaveAttribute('data-magnification','2.4');
});

test('3D cartridge input stays locked until both its fade and physical arrival have finished',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.addInitScript(()=>{
  window.earlyCartridgeInputs=[];new MutationObserver(()=>{const stage=document.querySelector('.cartridge-stage');if(!stage||stage.dataset.rendered!=='true'||stage.dataset.entrance==='complete')return;window.earlyCartridgeInputs.push({enabled:stage.dataset.interactive,hovered:stage.dataset.hovered||'',selected:stage.dataset.selected||''});const canvas=stage.querySelector('canvas');canvas?.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:900,clientY:300,pointerType:'mouse'}));canvas?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:900,clientY:300,button:0}));}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-entrance','data-rendered']});
 });await page.goto('/');const stage=page.locator('.cartridge-stage');await expect(stage).toHaveAttribute('data-interactive','true',{timeout:60000});await expect(stage).toHaveAttribute('data-entrance','complete');expect(await stage.evaluate(el=>el.inert)).toBe(false);const early=await page.evaluate(()=>window.earlyCartridgeInputs);expect(early.length).toBeGreaterThan(0);expect(early.every(frame=>frame.enabled==='false'&&!frame.hovered&&!frame.selected)).toBe(true);await expect(stage).toHaveAttribute('data-selected','');
});
