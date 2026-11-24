import {test,expect} from './support/portfolio.js';
import {filmPhotos} from '../src/content/film-photos.js';
test.use({webgl:false});
async function open(page,width=1440){await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos/');await page.getByRole('button',{name:/Open \d+ film photographs/}).click();await expect(page.locator('.photos-page')).toHaveAttribute('data-envelope-state','open');await expect(page.locator('.photo-spread')).toBeFocused()}

test('loose prints have no captions, drag independently and open a keyboard-accessible lightbox',async({page})=>{
 await open(page);await expect(page.locator('.photo-print')).toHaveCount(filmPhotos.length);await expect(page.locator('.photo-spread figcaption')).toHaveCount(0);
 const print=page.locator('.photo-print').first(),slot=page.locator('.photo-slot').first();await print.scrollIntoViewIfNeeded();
 const before=await slot.boundingBox(),rect=await print.boundingBox();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+80,rect.y+rect.height/2+65,{steps:10});await expect(print).toHaveAttribute('data-dragging','true');await page.mouse.up();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>(await slot.boundingBox()).x-before.x).toBeCloseTo(80,0);await expect.poll(async()=>(await slot.boundingBox()).y-before.y).toBeCloseTo(65,0);const after=await slot.boundingBox();
 await print.focus();await page.keyboard.press('ArrowRight');await expect.poll(async()=>(await slot.boundingBox()).x).toBeCloseTo(after.x+12,0);
 await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Photograph viewer'});await expect(dialog).toBeVisible();
 await expect(dialog.locator('img')).toHaveAttribute('src',filmPhotos[0].src);await expect(page.getByRole('button',{name:'Close photograph'})).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(dialog.locator('img')).toHaveAttribute('src',filmPhotos[1].src);
 for(let i=0;i<6;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.querySelector('.photo-lightbox').contains(document.activeElement))).toBe(true)}
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(print).toBeFocused();await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
 await expect.poll(async()=>(await slot.boundingBox()).x).toBeCloseTo(after.x+12,0);
});

test('table and lightbox preserve full image proportions on mobile and drag stays in bounds',async({page},testInfo)=>{
 await open(page,390);const print=page.locator('.photo-print').first(),slot=page.locator('.photo-slot').first();
 await print.focus();for(let i=0;i<30;i++)await page.keyboard.press('ArrowLeft');
 const b=await print.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);
 const image=print.locator('img');await expect(image).toHaveJSProperty('complete',true);expect(await image.evaluate(el=>el.clientWidth/el.clientHeight)).toBeCloseTo(filmPhotos[0].width/filmPhotos[0].height,1);
 await page.screenshot({path:testInfo.outputPath('prints-mobile.png')});
 await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const photo=await dialog.locator('img').boundingBox();expect(photo.width).toBeLessThanOrEqual(350);expect(photo.height).toBeLessThanOrEqual(850);
 await page.getByRole('button',{name:'Next photograph'}).click();await expect(dialog.locator('img')).toHaveAttribute('src',filmPhotos[1].src);
 await page.getByRole('button',{name:'Close photograph'}).click();await expect(dialog).toHaveCount(0);
 await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('mailer shakes and releases prints in bursts and settles on interruption',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/photos/');
 await expect(page.locator('.film-envelope-stage')).toHaveAttribute('data-reveal-ready','true');
 const button=page.getByRole('button',{name:/Open \d+ film photographs/}),rect=await button.boundingBox();await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
 await expect(page.locator('.photos-page')).toHaveAttribute('data-envelope-state','opening');
 const motion=await page.evaluate(()=>({shake:document.querySelector('.film-envelope-scene').getAnimations().map(a=>a.effect.getKeyframes().length),delays:[...document.querySelectorAll('.photo-print')].map(el=>el.getAnimations()[0]?.effect.getTiming().delay)}));
 expect(motion.shake[0]).toBeGreaterThan(8);expect(motion.delays[0]).toBeLessThan(motion.delays.at(-1));
 await page.evaluate(()=>{for(const el of document.querySelectorAll('.film-envelope-scene,.film-envelope-stage,.photo-print'))for(const a of el.getAnimations()){a.pause();a.currentTime=800}});
 await page.screenshot({path:testInfo.outputPath('prints-shake-midway.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.photos-page')).toHaveAttribute('data-envelope-state','open');await expect(page.locator('.photo-spread')).toBeFocused();
 expect(await page.locator('.photo-spread').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
 await page.screenshot({path:testInfo.outputPath('prints-table-desktop.png')});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.photo-print').first().focus();await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await dialog.locator('img').evaluate(async el=>{await Promise.allSettled(el.getAnimations().map(a=>a.finished))});
 await page.screenshot({path:testInfo.outputPath('photo-lightbox-desktop.png')});
 await page.getByRole('button',{name:'Close photograph'}).click();await expect(dialog).toHaveCount(0);await expect(page.locator('.photo-print').first()).toBeFocused();
});

test.describe('touch photo arranging',()=>{
 test.use({hasTouch:true});
 test('a touch drag moves a print without opening it and a tap opens the viewer',async({page})=>{
  await open(page,390);const print=page.locator('.photo-print').first(),slot=page.locator('.photo-slot').first();
  const rect=await print.boundingBox(),before=await slot.boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60*i/6,y:y+45*i/6}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>(await slot.boundingBox()).x).toBeCloseTo(before.x+60,0);await expect(page.getByRole('dialog')).toHaveCount(0);
  await print.evaluate(el=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await print.tap();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close photograph'}).tap();await expect(page.getByRole('dialog')).toHaveCount(0);
 });
});
