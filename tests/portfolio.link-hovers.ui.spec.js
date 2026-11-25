import {test,expect,disableWebGL} from './support/portfolio.js';
test.use({webgl:false});
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('cartridge-color-mode','light'))});
const active='.traveling-dot[data-active="true"],.control-hover-target[data-hover-kind="marks"][data-hover-active="true"] .registration-marks';

test('footer links share a traveling dot and keep their text and native targets still',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 const footer=page.getByRole('navigation',{name:'Connect with Josh'}),linkedin=footer.getByRole('link',{name:'LinkedIn'}),resume=footer.getByRole('link',{name:'Résumé',exact:true});
 for(const dark of [false,true]){
  if(dark){await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).not.toHaveClass(/theme-transition/);}
  await expect(linkedin).toHaveAttribute('data-hover-kind','dot');
  const before=await linkedin.boundingBox(),copy=await linkedin.locator('.link-copy').boundingBox(),href=await linkedin.getAttribute('href');await linkedin.hover();
  const dot=footer.locator('.traveling-dot');await expect(dot).toHaveCount(1);await expect(dot).toHaveAttribute('data-active','true');await expect(dot).toHaveCSS('pointer-events','none');
  await expect.poll(async()=>{const b=await dot.boundingBox(),label=await linkedin.locator('.link-copy').boundingBox();return Math.abs(b.x+b.width/2-label.x+9)}).toBeLessThan(.5);
  const after=await linkedin.boundingBox(),afterCopy=await linkedin.locator('.link-copy').boundingBox();expect(after.width).toBeCloseTo(before.width,1);expect(after.height).toBeCloseTo(before.height,1);expect(afterCopy.x).toBeCloseTo(copy.x,1);
  await expect(linkedin).toHaveAttribute('href',href);await expect(linkedin).toHaveAttribute('target','_blank');
  const old=await dot.getAttribute('style');await resume.hover();await expect(dot).toHaveAttribute('data-for','Résumé');await expect(dot).not.toHaveAttribute('style',old);await expect(footer.locator('.traveling-dot')).toHaveCount(1);
  await page.mouse.move(2,2);await expect(dot).toHaveAttribute('data-active','false');
 }
 await page.keyboard.press('Tab');await resume.focus();await expect(footer.locator('.traveling-dot')).toHaveAttribute('data-active','true');await expect(resume).toHaveAttribute('href','/resume/');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(footer.locator('.traveling-dot')).toHaveCSS('transition-duration','0s');
 await resume.evaluate(el=>el.blur());await page.getByRole('button',{name:'Switch to light mode'}).hover();await expect(page.locator('.theme-toggle .control-hover-indicator')).toHaveCount(0);await expect(page.locator(active)).toHaveCount(0);
 const padding=await footer.locator('a').evaluateAll(links=>links.map(el=>Number.parseFloat(getComputedStyle(el).paddingLeft)));expect(new Set(padding).size).toBe(1);expect(padding[0]).toBeGreaterThanOrEqual(16);
 await expect(page.locator('.control-dither')).toHaveCount(0);
});

test('resume decorates its back control while other resume controls retain their own behavior',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/resume/');
 const back=page.locator('.resume-home-link');await back.hover();await expect(back).toHaveAttribute('data-hover-active','true');await expect(back.locator('.registration-marks i')).toHaveCount(4);
 for(const target of [page.getByRole('button',{name:'Read',exact:true}),page.getByRole('link',{name:'Download PDF'}),page.locator('.theme-toggle')]){await target.hover();await expect(page.locator(active)).toHaveCount(0)}
});

test('registration marks decorate current-page navigation without changing Home actions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});
 for(const [path,selector]of[
  ['/?project=ai-mode-nudges&view=case-study','.case-study-nav .back-to-zine'],
  ['/photos/','.zine-header .after-hours-back'],
  ['/after-hours/','.zine-header .after-hours-back'],
  ['/resume/','.resume-home-link'],
 ]){
  await page.goto(path);const home=page.locator(selector);await home.hover();await expect(home).toHaveAttribute('data-hover-kind','marks');await expect(home).toHaveAttribute('data-hover-active','true');await expect(home.locator('.registration-marks')).toHaveCSS('opacity','1');await expect(home.locator('.registration-marks i')).toHaveCount(4);
  if(await home.evaluate(el=>el.tagName==='A'))await expect(home).toHaveAttribute('href','/');
  await home.click();await expect(page).toHaveURL(url=>url.pathname==='/'&&!url.searchParams.has('view'));await expect(page.locator('.collection-intro')).toBeVisible();
 }
 expect(errors).toEqual([]);
});

test('all three hover designs can be compared on the same footer with reduced-motion keyboard feedback',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const kind of ['marks','dot','stamp']){
  await page.goto('/?hover='+kind);const link=page.getByRole('link',{name:'LinkedIn'});await link.focus();await expect(link).toHaveAttribute('data-hover-kind',kind);await expect(link).toHaveAttribute('data-hover-active','true');
  const marker=kind==='marks'?link.locator('.registration-marks'):kind==='stamp'?link.locator('.ink-stamp'):page.locator('.traveling-dot');await expect(marker).toHaveCSS('opacity','1');await expect(marker).toHaveCSS('transition-duration','0s');
  await expect(page.locator('.recent-project-link .control-hover-indicator')).toHaveCount(0);
 }
});

test('touch navigation leaves no sticky hover decoration',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage();
 await disableWebGL(page);await page.addInitScript(()=>localStorage.setItem('cartridge-color-mode','light'));await page.route('**/api/listening',route=>route.fulfill({status:204}));await page.route('**/api/weather',route=>route.fulfill({status:204}));
 await page.goto('http://127.0.0.1:3000/');await page.getByRole('button',{name:'Switch to dark mode'}).tap();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');await expect(page.locator(active)).toHaveCount(0);await context.close();
});


test('the ink stamp prints in place, dissolves on exit and keeps link geometry fixed',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?hover=stamp');
 const link=page.getByRole('link',{name:'LinkedIn'});await expect(link).toHaveAttribute('data-hover-kind','stamp');const before=await link.boundingBox(),text=await link.locator('.link-copy').boundingBox(),href=await link.getAttribute('href');
 await link.hover();const stamp=link.locator('.ink-stamp');await expect(stamp).toHaveAttribute('data-state','printed');await expect(stamp).toHaveCSS('pointer-events','none');expect(await stamp.evaluate(el=>getComputedStyle(el).maskImage)).toContain('data:image/svg+xml');
 expect((await link.boundingBox()).width).toBeCloseTo(before.width,1);expect((await link.locator('.link-copy').boundingBox()).x).toBeCloseTo(text.x,1);await expect(link).toHaveAttribute('href',href);await expect(link).toHaveAttribute('target','_blank');
 await page.mouse.move(2,2);await expect(stamp).toHaveAttribute('data-state','hidden');await expect(stamp).toHaveCSS('opacity','0');
 await page.keyboard.press('Tab');await link.focus();await expect(stamp).toHaveAttribute('data-state','printed');
});
