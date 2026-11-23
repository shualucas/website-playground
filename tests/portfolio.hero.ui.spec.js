import {test,expect,disableWebGL} from './support/portfolio.js';

test.use({webgl:false,ignoreHTTPSErrors:Boolean(process.env.PORTFOLIO_REVIEW_URL)});

test('inline hero matches project typography and keeps the default cartridge above the left-aligned copy',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.PORTFOLIO_REVIEW_URL||'/');
 const hero=page.locator('.hero-cartridge'),title=page.locator('.intro-title');
 await expect(title).toContainText('Josh Lucas, product designer');await expect(page.locator('.bio-continuation')).toHaveText('based in California, building stuff on Google Search, previously Gmail, Stadia, & Blizzard.');
 await page.evaluate(()=>document.fonts.ready);
 for(const width of [1440,900,390,320]){
  await page.setViewportSize({width,height:900});
  // Read together so a viewport update cannot split these measurements across layouts.
  const bounds=()=>page.evaluate(()=>Object.fromEntries(Object.entries({copy:'.intro-title',cart:'.hero-cartridge',project:'.recent-project-link'}).map(([name,selector])=>[name,document.querySelector(selector).getBoundingClientRect().toJSON()])));
  await expect.poll(async()=>{const {copy,cart,project}=await bounds();return Math.max(Math.abs(cart.x-copy.x),Math.abs(copy.x-project.x))}).toBeLessThan(.5);
  const row=page.locator('.recent-project-link').first(),{copy,cart,project}=await bounds();
  expect(cart.x).toBeCloseTo(copy.x,0);expect(copy.x).toBeCloseTo(project.x,0);expect(cart.y+cart.height).toBeLessThan(copy.y);
  expect(await title.evaluate(el=>getComputedStyle(el).fontSize)).toBe(await row.evaluate(el=>getComputedStyle(el).fontSize));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await expect(page.locator('.collection-display,.cartridge-stage')).toHaveCount(0);
});

test('company text supports keyboard selection, Escape, and unchanged project previews',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.PORTFOLIO_REVIEW_URL||'/');
 const hero=page.locator('.hero-cartridge');await page.keyboard.press('Tab');
 for(const company of ['search','gmail','stadia','blizzard']){
  const control=page.locator(`[data-company="${company}"]`);await control.focus();await expect(hero).toHaveAttribute('data-cartridge',company);
  await expect(control).toHaveAttribute('aria-pressed','true');await expect(control).toBeFocused();
 }
 await page.keyboard.press('Escape');await expect(hero).toHaveAttribute('data-cartridge','personal');
 await page.locator('.collection-header .theme-toggle').focus();await expect(hero).toHaveAttribute('data-cartridge','personal');
 const row=page.locator('[data-project="stadia-store-redesign"] .recent-project-link');await row.hover();
 await expect(page.locator('.recent-projects')).toHaveAttribute('data-active-project','stadia-store-redesign');await expect(page.locator('.recent-project-preview')).toBeVisible();
 await expect(hero).toHaveAttribute('data-cartridge','personal');await row.click();await expect(page.locator('.case-study')).toBeVisible();
 await page.locator('.case-study-nav').getByRole('button',{name:'Home',exact:true}).click();await expect(row).toBeFocused();
});

test('company taps select and reset cartridges on mobile with full-size touch targets',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
 await disableWebGL(page);await page.route('**/api/listening',route=>route.fulfill({status:204}));await page.route('**/api/weather',route=>route.fulfill({status:204}));
 await page.goto('http://127.0.0.1:3000/');const hero=page.locator('.hero-cartridge');
 for(const company of ['search','gmail','stadia','blizzard']){
  const control=page.locator(`[data-company="${company}"]`);expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await control.tap();await expect(hero).toHaveAttribute('data-cartridge',company);await control.tap();await expect(hero).toHaveAttribute('data-cartridge','personal');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});
