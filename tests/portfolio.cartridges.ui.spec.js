import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });

test("without WebGL all four companies still swap the personal cartridge through their text controls", async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto("/"); await expect(page.locator(".collection")).toHaveAttribute("data-status", "fallback");
  const hero=page.locator('.hero-cartridge');await expect(hero).toHaveAttribute('data-cartridge','personal');
  await expect(hero.locator('img')).toHaveAttribute('src','/cartridges/dither-cartridge.svg');
  for(const company of ['search','gmail','stadia','blizzard']){
    const button=page.locator(`[data-company="${company}"]`);await button.hover();await expect(hero).toHaveAttribute('data-cartridge',company);
    await expect(button).toHaveAttribute('aria-pressed','true');await expect(hero.locator('img')).toHaveJSProperty('complete',true);
    expect(await hero.locator('img').evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
  }
  await page.mouse.move(2,2);await expect(hero).toHaveAttribute('data-cartridge','personal');await expect(page.locator('.case-study')).toHaveCount(0);
});

test("an unconfigured deployment has a quiet client fallback and does not pretend to be live", async ({ page }) => {

  await page.route("**/api/listening",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({code:"LISTENING_NOT_CONFIGURED",error:"Listening is not configured on this deployment."})}));
  await page.goto("/");
  await expect(page.locator(".listening-widget")).toHaveAttribute("data-listening-status","unconfigured");
  await expect(page.locator(".now-playing")).toContainText("my listening history");
  await expect(page.locator(".listening-indicator")).toHaveCount(0);
  await page.getByRole("button",{name:"Show last five songs"}).click();
  await expect(page.getByRole("region",{name:"Recently listened"})).toContainText("once connected");
});

test('reload and full-page navigation always start at the top across the site',async({page,request})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:560});await page.emulateMedia({reducedMotion:'reduce'});
 for(const path of ['/','/after-hours/','/photos/','/resume/']){
  await page.goto(path);await expect(page.locator('main')).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeGreaterThan(100);await page.evaluate(()=>scrollTo(0,400));await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(80);expect(await page.evaluate(()=>history.scrollRestoration)).toBe('manual');await page.reload();await expect(page.locator('main')).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
 }
 const archived=await request.get('/zine/');expect(await archived.text()).toContain('history.scrollRestoration = "manual"');
});

test('content cannot hover, click or receive keyboard focus until its entrance completes',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 await page.addStyleTag({content:'[data-reveal-state="visible"],.intro-word {animation-play-state:paused !important}'});
 const nav=page.getByRole('navigation',{name:'Recent projects'}),row=nav.locator('[data-project="search-labs"]'),google=page.locator('[data-company="search"]'),footer=page.locator('.footer-links');
 await expect(row).toHaveAttribute('data-reveal-state','visible');await expect(row).toHaveAttribute('data-reveal-ready','false');expect(await row.evaluate(el=>el.inert)).toBe(true);await expect(row.locator('a')).toHaveCSS('pointer-events','none');
 const rect=await row.boundingBox();await page.mouse.click(rect.x+140,rect.y+rect.height/2);await expect(nav).toHaveAttribute('data-preview-active','false');expect(new URL(page.url()).searchParams.has('view')).toBe(false);
 await google.evaluate(el=>el.focus());expect(await google.evaluate(el=>document.activeElement===el)).toBe(false);await expect(google).toHaveCSS('pointer-events','none');expect(await footer.evaluate(el=>el.inert)).toBe(true);
 await page.evaluate(()=>document.querySelectorAll('[data-reveal],[data-reveal-gate]').forEach(el=>el.getAnimations().forEach(a=>a.finish())));
 await expect(row).toHaveAttribute('data-reveal-ready','true');expect(await row.evaluate(el=>el.inert)).toBe(false);await expect(google).toHaveCSS('pointer-events','auto');await row.locator('a').hover();await expect(nav).toHaveAttribute('data-active-project','search-labs');
});
