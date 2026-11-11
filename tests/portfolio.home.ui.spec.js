import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });

test("favicon slowly cycles a rounded square while preserving the white J on every current page", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.clock.install();
  const icon=page.locator('link[rel="icon"]');
  const pixels=()=>icon.evaluate(async el=>{
    const image=new Image();image.src=el.href;await image.decode();
    const canvas=document.createElement("canvas");canvas.width=canvas.height=64;
    const context=canvas.getContext("2d");context.drawImage(image,0,0);
    const pixel=(x,y)=>Array.from(context.getImageData(x,y,1,1).data);
    return {corner:pixel(0,0),background:pixel(10,10),letter:pixel(40,35)};
  });
  for(const path of ["/","/resume/","/after-hours/","/photos/"]) {
    await page.goto(path);
    await expect(icon).toHaveAttribute("href",/^data:image\/png;base64,/);
    const before=await pixels();
    expect(before.corner[3]).toBe(0);expect(before.background[3]).toBe(255);
    expect(before.letter).toEqual([255,255,255,255]);
    await page.clock.fastForward(11000);
    expect((await pixels()).background).not.toEqual(before.background);
  }
  // Hidden tabs hold their current color and resume without skipping ahead.
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))});
  const paused=await icon.getAttribute("href");await page.clock.fastForward(10000);
  await expect(icon).toHaveAttribute("href",paused);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))});
  await page.clock.fastForward(3000);expect(await icon.getAttribute("href")).not.toBe(paused);
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(icon).toHaveAttribute("href","/favicon.svg");await expect(icon).toHaveAttribute("type","image/svg+xml");
  await page.clock.fastForward(10000);await expect(icon).toHaveAttribute("href","/favicon.svg");
});

test("Josh and roles are passive medium-weight text with a stable reduced-motion label", async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});

  await page.goto('/');const role=page.locator('.role-rotator');
  await expect(page.locator('.intro-name')).toHaveText('Josh');expect(await role.evaluate(el=>el.tagName)).toBe('SPAN');
  await expect(role).not.toHaveAttribute('tabindex',/.+/);await expect(role).not.toHaveAttribute('aria-pressed',/.+/);
  await expect(role).toHaveAttribute('data-role','product designer');await expect(role).toHaveCSS('font-weight','500');
  await role.hover();await expect(role).toHaveCSS('opacity','1');await role.click();await expect(role).toHaveAttribute('data-role','product designer');
  expect(await role.evaluate(el=>getComputedStyle(el).cursor)).not.toBe('pointer');
  expect(await page.locator('.portfolio-name').evaluate(el=>getComputedStyle(el).fontWeight)).toBe('500');
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.locator('.intro-title,.intro-name,.role-rotator,.bio-continuation,.random-fact').evaluateAll(els=>els.map(el=>getComputedStyle(el).fontSize))).toEqual(Array(5).fill('23px'));
    await expect(page.locator('.bio-continuation')).toHaveCSS('font-weight','300');
  }
  for(const dark of [false,true]) {
    if(dark)await page.getByRole('button',{name:'Switch to dark mode'}).click();
    const gray=await page.locator('.recent-project-summary').first().evaluate(el=>getComputedStyle(el).color);
    expect(await page.locator('.intro-title,.bio-continuation,.intro-muted,.random-fact').evaluateAll(els=>[...new Set(els.map(el=>getComputedStyle(el).color))])).toEqual([gray]);
    const ink=await page.locator('.recent-project-name').first().evaluate(el=>getComputedStyle(el).color);
    await expect(page.locator('.intro-name')).toHaveCSS('color',ink);await expect(role).toHaveCSS('color',ink);
  }
});

test("each load chooses a supplied fact without immediate repeats; interactions keep the current one", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

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

test("intro words still sweep in reading order", async ({ page }) => {
  // Isolate DOM motion from GPU timing; these interactions also work in fallback.

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

test("unlinked metadata has a blinking clock, Pacific time and a weather fallback", async ({ page }) => {
  await page.clock.install({time:new Date("2026-10-29T19:10:00Z")});
  await page.emulateMedia({reducedMotion:"reduce"});

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
  await reader.locator("footer").scrollIntoViewIfNeeded(); await expect(reader.locator(".footer-links")).toHaveAttribute("data-reveal-state","visible");
  await page.emulateMedia({reducedMotion:"reduce"});
  expect(await reader.locator(".footer-links").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
});

test("the page entrance continues from the hero into the footer on one timeline", async ({ page }) => {
  await page.setViewportSize({width:1280,height:1400});
  await page.emulateMedia({reducedMotion:"no-preference"});

  await page.goto("/"); await expect(page).toHaveTitle("Josh Lucas — Product Designer");
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

test('community letters gather while the word compresses, then settle without shifting its width',async({page})=>{
 const initial=new Date('2026-11-02T12:00:00Z');await page.clock.install({time:initial});await page.clock.pauseAt(initial);await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.clock.runFor(1001);
 const role=page.locator('.role-rotator');for(let i=0;i<6;i++)await page.clock.fastForward(2281);await expect(role).toHaveAttribute('data-role','community builder');
 const motion=await role.evaluate(el=>{
  const animations=el.getAnimations({subtree:true});animations.forEach(animation=>{animation.pause();animation.currentTime=360});
  const letter=el.querySelector('.role-char-gather'),ink=letter.querySelector('.role-char-ink');
  const moving={gather:new DOMMatrixReadOnly(getComputedStyle(ink).transform).m41,squeeze:new DOMMatrixReadOnly(getComputedStyle(letter).transform).m41,width:el.getBoundingClientRect().width};
  animations.forEach(animation=>animation.currentTime=1500);
  return{...moving,restGather:new DOMMatrixReadOnly(getComputedStyle(ink).transform).m41,restSqueeze:new DOMMatrixReadOnly(getComputedStyle(letter).transform).m41,restWidth:el.getBoundingClientRect().width};
 });expect(motion.gather).toBeLessThan(-1);expect(motion.squeeze).toBeGreaterThan(.1);expect(motion.restGather).toBe(0);expect(motion.restSqueeze).toBe(0);expect(motion.restWidth).toBeCloseTo(motion.width,1);
});
