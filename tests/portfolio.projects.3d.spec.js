import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test('Nudges opens with the Google cartridge spinning into an ambient float',async({page},testInfo)=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  window.cartridgeEntrances=[];
  new MutationObserver(changes=>{for(const {target} of changes)if(target.matches('.case-cartridge-stage'))window.cartridgeEntrances.push(target.dataset.intro)}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-intro']});
 });
 await page.goto('/?project=ai-mode-nudges&view=case-study');
 const cartridge=page.getByRole('img',{name:'Google Search cartridge'}),stage=cartridge.locator('.case-cartridge-stage');
 const reset=async()=>{await page.keyboard.press('r');await expect.poll(async()=>Math.hypot(...(await stage.getAttribute('data-rotation')).split(',').map(Number))).toBeLessThan(.0001)};
 await expect(cartridge).toHaveAttribute('data-status','ready',{timeout:60000});await expect(stage.locator('canvas')).toHaveCount(1);
 await expect(stage).toHaveAttribute('data-intro','settled',{timeout:15000});expect(await page.evaluate(()=>window.cartridgeEntrances.includes('spinning'))).toBe(true);
 await expect(stage).toHaveAttribute('data-motion','ambient');const before=await stage.getAttribute('data-float');await expect.poll(()=>stage.getAttribute('data-float')).not.toBe(before);
 await expect(stage).toHaveAttribute('data-interactive','true');
 const bounds=await stage.boundingBox();expect(bounds.width).toBe(180);expect(bounds.height).toBe(130);
 const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+3,y+2);
 await expect(stage).toHaveAttribute('data-rotation','0.00000,0.00000');
 await page.mouse.move(x+55,y+20,{steps:10});await expect(stage).toHaveAttribute('data-dragging','true');await expect(stage).toHaveCSS('cursor','grabbing');
 await expect.poll(async()=>Math.abs(Number((await stage.getAttribute('data-rotation')).split(',')[1]))).toBeGreaterThan(.3);
 await page.screenshot({path:testInfo.outputPath('nudges-google-cartridge-drag.png')});
 await page.mouse.up();await expect(stage).toHaveAttribute('data-dragging','false');await expect(page).toHaveURL(/project=ai-mode-nudges&view=case-study$/);
 await cartridge.focus();await reset();
 await page.keyboard.press('ArrowRight');await expect.poll(async()=>Number((await stage.getAttribute('data-rotation')).split(',')[1])).toBeGreaterThan(.1);
 await reset();
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y+10,{steps:4});await expect(stage).toHaveAttribute('data-dragging','true');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(stage).toHaveAttribute('data-dragging','false');await page.mouse.up();
 await reset();
 await page.screenshot({path:testInfo.outputPath('nudges-google-cartridge-desktop.png')});
 await page.locator('.case-study-content footer').scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-motion','idle');
 const paused=await stage.getAttribute('data-float');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(stage).toHaveAttribute('data-float',paused);
 await page.emulateMedia({reducedMotion:'reduce'});await cartridge.scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-motion','reduced');await expect(stage).toHaveAttribute('data-intro','settled');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const reduced=await stage.getAttribute('data-float');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(stage).toHaveAttribute('data-float',reduced);
 await page.setViewportSize({width:390,height:844});await cartridge.scrollIntoViewIfNeeded();expect(await page.locator('.case-study').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 const touch=await page.context().newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const mobile=await stage.boundingBox(),tx=mobile.x+mobile.width/2,ty=mobile.y+mobile.height/2,scroll=await page.locator('.case-study').evaluate(el=>el.scrollTop);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty,id:1}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+30,y:ty+20,id:1}]});await expect(stage).toHaveAttribute('data-dragging','true');
 await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(stage).toHaveAttribute('data-dragging','false');
 expect(await page.locator('.case-study').evaluate(el=>el.scrollTop)).toBe(scroll);
 await reset();await touch.detach();
 await page.screenshot({path:testInfo.outputPath('nudges-google-cartridge-mobile.png')});
});

test("the camera loads only in its hover preview and pauses when that preview is hidden", async ({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await load(page);
 const link=page.getByRole('link',{name:/Explore film photographs/}),camera=page.locator('.film-camera-dock');
 await expect(camera).toHaveCount(0);await expect(link.locator('.camera-model')).toHaveCount(0);
 await link.hover();await expect(camera).toHaveAttribute('data-status','ready',{timeout:60000});await expect(camera).toBeVisible();
 await expect(page.locator('.recent-special-preview .film-camera-dock')).toHaveCount(1);await expect(camera.locator('canvas')).toHaveCount(1);
 // Let the newly mounted WebGL preview finish its first paint before changing media preferences.
 await page.evaluate(()=>new Promise(requestAnimationFrame));
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(camera).toHaveAttribute('data-motion','ambient');
 const before=await camera.getAttribute('data-float');await expect.poll(()=>camera.getAttribute('data-float')).not.toBe(before);
 await page.mouse.move(2,2);await expect(camera).toBeHidden();await expect(camera).toHaveAttribute('data-motion','idle');
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Tab');await link.focus();await expect(camera).toBeVisible();await expect(camera).toHaveAttribute('data-motion','reduced');
 await page.setViewportSize({width:390,height:844});await expect(camera).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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

test("camera preview spins and blinks once before settling, and keyboard entry opens photos",async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await load(page);await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{});
 await page.evaluate(()=>{window.cameraLights=[];new MutationObserver(()=>{const h=document.querySelector('.film-camera-dock');if(h)window.cameraLights.push(h.dataset.readyLight)}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-ready-light']})});
 const link=page.getByRole('link',{name:/Explore film photographs/}),camera=page.locator('.film-camera-dock');
 await link.hover();await expect(camera).toHaveAttribute('data-status','ready',{timeout:60000});await expect(camera).toHaveAttribute('data-intro','settled',{timeout:15000});
 await expect(camera).toHaveAttribute('data-ready-light','off');expect(await page.evaluate(()=>window.cameraLights.includes('on'))).toBe(true);
 await expect(camera).toHaveAttribute('data-rotation','0,0,0');await expect(link.locator('.camera-model')).toHaveCount(0);
 await page.mouse.move(2,2);await link.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/photos\/$/);await expect(page.locator('.polaroid')).toHaveCount(6);
 await expect(page.locator('.photo-entry-camera')).toHaveCount(0);
});

test('zine preview uses the actual book without controls, pauses on leave and keeps its scene on return',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await load(page);
 const link=page.getByRole('link',{name:/Zine of Extracurriculars/});await expect(page.locator('.zine-preview-scene')).toHaveCount(0);
 await link.hover();const book=page.locator('.zine-preview-scene');await expect(book).toHaveAttribute('data-status','ready',{timeout:60000});await expect(book).toHaveAttribute('data-interactive','false');
 await expect(book.locator('.book-webgl')).toHaveCount(1);await expect(book.locator('button,a')).toHaveCount(0);await expect(book).toHaveCSS('pointer-events','none');
 await book.evaluate(el=>el.dataset.testIdentity='same-book');const orientation=await book.getAttribute('data-orientation');
 await page.mouse.move(2,2);await expect(page).toHaveURL(/\/$/);await expect(page.locator('.case-study')).toHaveCount(0);
 await expect(book).toHaveAttribute('data-active','false');await expect(book).toHaveAttribute('data-orientation',orientation);
 await link.hover();await expect(book).toHaveAttribute('data-test-identity','same-book');await expect(book).toHaveAttribute('data-active','true');
});

test('touch zine and camera previews use real models and retain the camera flash route',async({browser})=>{
 test.setTimeout(180000);const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();await page.route('**/api/listening',r=>r.fulfill({status:204}));await page.route('**/api/weather',r=>r.fulfill({status:204}));await page.goto('http://127.0.0.1:3000/');await expect(page.locator('.collection')).toHaveAttribute('data-status','ready',{timeout:60000});
 const nav=page.getByRole('navigation',{name:'Recent projects'});await expect(page.locator('.film-camera-dock')).toHaveCount(0);await nav.getByRole('button',{name:/Zine of Extracurriculars/}).tap();await expect(page.locator('.recent-inline-preview .zine-preview-scene')).toHaveAttribute('data-status','ready',{timeout:60000});await nav.getByRole('button',{name:/Say cheese!/}).tap();await expect(page.locator('.recent-inline-preview .film-camera-dock')).toHaveAttribute('data-status','ready',{timeout:60000});await expect(page.locator('.recent-inline-preview .film-camera-dock canvas')).toHaveCount(1);await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('region',{name:'Say cheese! preview'}).getByRole('link',{name:'Open project'}).tap();await expect(page.locator('#film-camera-link')).toHaveAttribute('data-arming','true');await expect(page).toHaveURL(/\/photos\/$/);await expect(page.locator('.photos-page')).toHaveAttribute('data-camera-entry','true');await context.close();
});

test('short screens keep the entire cartridge caption clear of the scene crop and projects',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:768,height:600});await load(page);
 for(const [width,height]of[[768,600],[844,390],[390,560],[1024,600],[1440,600]]){
  await page.setViewportSize({width,height});await expect(page.locator('.cartridge-stage')).toHaveAttribute('data-settled','true',{timeout:30000});
  for(const name of ['Search','Blizzard Entertainment']){
   await choose(page,name);const caption=page.locator('.cartridge-caption');await expect(caption).toBeVisible();await caption.scrollIntoViewIfNeeded();
   const bounds=await caption.evaluate(el=>{
    const rect=el.getBoundingClientRect(),stage=el.closest('.cartridge-stage'),box=stage.getBoundingClientRect(),style=getComputedStyle(stage),trim=parseFloat(style.getPropertyValue('--hero-trim')),room=parseFloat(style.getPropertyValue('--caption-room'));
    const year=el.querySelector('.cartridge-years').getBoundingClientRect(),projects=document.querySelector('.recent-projects').getBoundingClientRect(),display=stage.parentElement.getBoundingClientRect();
    return{bottom:rect.bottom,yearBottom:year.bottom,clipBottom:box.bottom-trim+room,displayBottom:display.bottom,projectsTop:projects.top,room,zoom:stage.dataset.magnification,height:innerHeight};
   });
   expect(bounds.bottom).toBeLessThanOrEqual(bounds.clipBottom-4);expect(bounds.yearBottom).toBeLessThanOrEqual(bounds.displayBottom);expect(bounds.bottom).toBeLessThan(bounds.projectsTop);expect(bounds.yearBottom).toBeLessThanOrEqual(bounds.height);expect(bounds.room).toBeGreaterThanOrEqual(0);
   const before=await caption.boundingBox();await page.keyboard.press('r');await expect(page.locator('.cartridge-stage')).toHaveAttribute('data-magnification',bounds.zoom);const after=await caption.boundingBox();expect(after.y).toBeCloseTo(before.y,0);
  }
 }
});
