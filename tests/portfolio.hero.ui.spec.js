import {test,expect,disableWebGL} from './support/portfolio.js';

test.use({webgl:false,ignoreHTTPSErrors:Boolean(process.env.PORTFOLIO_REVIEW_URL)});

test('inline hero matches project typography and keeps the default cartridge above the left-aligned copy',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.PORTFOLIO_REVIEW_URL||'/');
 const hero=page.locator('.hero-cartridge'),title=page.locator('.intro-title');
 await expect(title).toContainText('Josh Lucas, product designer');
 await expect(title.locator('.intro-line')).toHaveCount(3);
 await expect(title.locator('.role-label')).toHaveText(/product\s*designer\./);
 await expect(page.locator('.bio-continuation .intro-line')).toHaveText(['AI Mode at Google','Previously Stadia, Gmail, & Blizzard.']);
 await page.evaluate(()=>document.fonts.ready);
 for(const width of [1440,900,390,320]){
  await page.setViewportSize({width,height:900});
  // Read together so a viewport update cannot split these measurements across layouts.
  const bounds=()=>page.evaluate(()=>Object.fromEntries(Object.entries({copy:'.intro-title',cart:'.hero-cartridge',project:'.recent-project-link'}).map(([name,selector])=>[name,document.querySelector(selector).getBoundingClientRect().toJSON()])));
  await expect.poll(async()=>{const {copy,cart,project}=await bounds();return Math.max(Math.abs(cart.x-copy.x),Math.abs(copy.x-project.x))}).toBeLessThan(.5);
  const row=page.locator('.recent-project-link').first(),{copy,cart,project}=await bounds();
  expect(cart.x).toBeCloseTo(copy.x,0);expect(copy.x).toBeCloseTo(project.x,0);expect(cart.y+cart.height).toBeLessThan(copy.y);
  expect(await title.evaluate(el=>getComputedStyle(el).fontSize)).toBe(await row.evaluate(el=>getComputedStyle(el).fontSize));
  const lines=await title.locator('.intro-line').evaluateAll(els=>els.map(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight)})));
  expect(lines[0].height).toBeLessThanOrEqual(lines[0].lineHeight+1);
  expect(lines[1].top).toBeGreaterThanOrEqual(lines[0].bottom);expect(lines[2].top).toBeGreaterThanOrEqual(lines[1].bottom);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await expect(page.locator('.collection-display,.cartridge-stage')).toHaveCount(0);
});

test('project hovers tint only the default dither cartridge with the matching project palette',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const hero=page.locator('.hero-cartridge'),nav=page.locator('.recent-projects');
 await expect(hero).toHaveAttribute('data-status','fallback');
 for(const dark of [false,true]){
  if(dark)await page.getByRole('button',{name:'Switch to dark mode'}).click();
  for(const [id,light,color] of [['ai-mode-nudges','#7e99dd','#6988d8'],['search-labs','#d447e0','#cd29db'],['stadia-store-redesign','#e97958','#e5633d'],['rave-flyer-zine','#e9c25b','#e5b840'],['film','#5cac7d','#429f68']]){
   await page.locator(`[data-project="${id}"] .recent-project-link`).hover();
   await expect(hero).toHaveAttribute('data-cartridge','personal');await expect(hero.locator('.hero-cartridge-fallback')).toHaveCount(0);
   const accent=await nav.evaluate(el=>el.style.getPropertyValue('--preview-accent'));expect(accent).toBe(dark?color:light);
   await expect.poll(()=>hero.evaluate(el=>el.style.getPropertyValue('--hero-dither-color'))).toBe(accent);
  }
  await page.mouse.move(2,2);await expect.poll(()=>hero.evaluate(el=>el.style.getPropertyValue('--hero-dither-color'))).toBe('');
 }
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
