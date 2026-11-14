import { test, expect, disableWebGL } from './support/portfolio.js';

test.use({webgl:false,ignoreHTTPSErrors:Boolean(process.env.PORTFOLIO_REVIEW_URL)});

test('footer and header hover dither animates without changing native controls',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(process.env.PORTFOLIO_REVIEW_URL||'/');
 const footer=page.getByRole('navigation',{name:'Connect with Josh'}),link=footer.getByRole('link',{name:'LinkedIn'}),all=page.locator('.control-dither');
 const sample=()=>all.evaluate(el=>{const pixels=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let hash=2166136261,painted=0;for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i])painted++;}return{hash,painted}});
 for(const dark of [false,true]){
  if(dark){await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).not.toHaveClass(/theme-transition/);}
  const before=await link.boundingBox(),href=await link.getAttribute('href');await link.hover();
  await expect(all).toHaveCount(1);await expect(link.locator('.control-dither')).toHaveAttribute('data-state','playing');await expect(all).toHaveCSS('pointer-events','none');
  await expect.poll(async()=>(await sample()).painted).toBeGreaterThan(20);const held=await sample();
  await expect.poll(async()=>(await sample()).hash).not.toBe(held.hash);
  const after=await link.boundingBox();expect(after.width).toBeCloseTo(before.width,1);expect(after.height).toBeCloseTo(before.height,1);await expect(link).toHaveAttribute('href',href);await expect(link).toHaveAttribute('target','_blank');
  const effect=await all.boundingBox();expect(effect.height).toBeCloseTo(after.height/2,1);expect(effect.y+effect.height/2).toBeCloseTo(after.y+after.height/2,1);
  await page.mouse.move(2,2);await expect(all).toHaveCount(0);
 }
 await page.keyboard.press('Tab');const resume=footer.getByRole('link',{name:'Résumé',exact:true});await resume.focus();
 await expect(resume.locator('.control-dither')).toHaveAttribute('data-state','playing');await expect(resume).toHaveAttribute('href','/resume/');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(all).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(resume.locator('.control-dither')).toHaveAttribute('data-state','playing');
 await resume.evaluate(el=>el.blur());await page.getByRole('button',{name:'Switch to light mode'}).hover();await expect(page.locator('.theme-toggle .control-dither')).toHaveCount(0);await expect(all).toHaveCount(0);
 const padding=await footer.locator('a').evaluateAll(links=>links.map(el=>Number.parseFloat(getComputedStyle(el).paddingLeft)));expect(new Set(padding).size).toBe(1);expect(padding[0]).toBeGreaterThanOrEqual(16);
});

test('resume only keeps dither on its back control',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/resume/');
 const back=page.locator('.resume-home-link');await back.hover();await expect(back.locator('.control-dither')).toHaveAttribute('data-state','playing');
 for(const target of [page.getByRole('button',{name:'Read',exact:true}),page.getByRole('link',{name:'Download PDF'}),page.locator('.theme-toggle')]){
  await target.hover();await expect(page.locator('.control-dither')).toHaveCount(0);
 }
});

test('current-page navigation gets dither while its native Home action remains usable',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.emulateMedia({reducedMotion:'no-preference'});
 for(const [path,selector]of [
  ['/?project=ai-mode-nudges&view=case-study','.case-study-nav .back-to-zine'],
  ['/photos/','.zine-header .after-hours-back'],
  ['/after-hours/','.zine-header .after-hours-back'],
  ['/resume/','.resume-home-link'],
 ]){
  await page.goto(path);const home=page.locator(selector);await home.hover();await expect(home.locator('.control-dither')).toHaveAttribute('data-state','playing');
  if(await home.evaluate(el=>el.tagName==='A'))await expect(home).toHaveAttribute('href','/');
  await home.click();await expect(page).toHaveURL(url=>url.pathname==='/'&&!url.searchParams.has('view'));await expect(page.locator('.collection-intro')).toBeVisible();
 }
 expect(errors).toEqual([]);
});

test('touch navigation does not leave a hover dither behind',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage();
 await disableWebGL(page);await page.route('**/api/listening',route=>route.fulfill({status:204}));await page.route('**/api/weather',route=>route.fulfill({status:204}));
 await page.goto('http://127.0.0.1:3000/');await page.getByRole('button',{name:'Switch to dark mode'}).tap();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');await expect(page.locator('.control-dither')).toHaveCount(0);await context.close();
});
