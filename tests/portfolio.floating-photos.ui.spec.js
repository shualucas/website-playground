import {test,expect} from './support/portfolio.js';
import {filmPhotos} from '../src/content/film-photos.js';
test.use({webgl:false});
async function open(page,width=1440){
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos/');
 await expect(page.locator('.floating-photo-gallery')).toHaveAttribute('data-status','fallback');
}

test('borderless fallback photos preserve proportions, dither and keyboard lightbox access',async({page})=>{
 await open(page);const photos=page.locator('.floating-photo-hit');await expect(photos).toHaveCount(filmPhotos.length);
 await expect(page.locator('.film-envelope-stage,.parcel-sticker-tray,figcaption')).toHaveCount(0);
 for(const photo of await photos.all()){
  await expect(photo.locator('.floating-dither-fallback')).toHaveAttribute('src',/^data:image\/png/);
  const original=photo.locator('.floating-original');await expect(original).toHaveJSProperty('complete',true);
  const shape=await original.evaluate(el=>({actual:el.clientWidth/el.clientHeight,original:el.naturalWidth/el.naturalHeight}));expect(shape.actual).toBeCloseTo(shape.original,1);
  await expect(photo).toHaveCSS('border-top-width','0px');await expect(photo).toHaveCSS('padding','0px');
 }
 const first=photos.first();await first.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Photograph viewer'});
 await expect(dialog).toBeVisible();await expect(dialog.locator('img')).toHaveAttribute('src',filmPhotos[0].src);await expect(dialog.locator('img')).toHaveCSS('border-top-width','0px');
 await expect(dialog.locator('.photo-palette li')).toHaveCount(5);await expect(dialog.locator('.photo-caption')).toHaveText(filmPhotos[0].caption);
 const palette=await dialog.locator('.photo-palette li').evaluateAll(items=>items.map(el=>el.getAttribute('aria-label')));expect(new Set(palette).size).toBe(5);
 await expect(page.getByRole('button',{name:'Close photograph'})).toBeFocused();await page.keyboard.press('ArrowRight');await expect(dialog.locator('img')).toHaveAttribute('src',filmPhotos[1].src);await expect(dialog.locator('.photo-caption')).toHaveText(filmPhotos[1].caption);await expect(dialog.locator('.photo-palette li')).toHaveCount(5);
 await expect.poll(()=>dialog.locator('.photo-palette li').evaluateAll(items=>items.map(el=>el.getAttribute('aria-label')))).not.toEqual(palette);
 for(let i=0;i<6;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.querySelector('.photo-lightbox').contains(document.activeElement))).toBe(true)}
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(first).toBeFocused();await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
});

test('drag and keyboard arranging do not open the viewer, and interruption restores the photo',async({page})=>{
 await open(page);const photo=page.locator('.floating-photo-hit').last();await photo.focus();
 const before=await photo.boundingBox(),x=before.x+before.width/2,y=before.y+before.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+45,y+30,{steps:6});await expect(photo).toHaveAttribute('data-dragging','true');await page.mouse.up();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>(await photo.boundingBox()).x-before.x).toBeCloseTo(45,0);await expect.poll(async()=>(await photo.boundingBox()).y-before.y).toBeCloseTo(30,0);const after=await photo.boundingBox();
 await page.keyboard.press('ArrowRight');await expect.poll(async()=>(await photo.boundingBox()).x).toBeGreaterThan(after.x+10);
 const a=await photo.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2+30,a.y+a.height/2+20,{steps:3});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();
 await expect(photo).toHaveAttribute('data-dragging','false');await expect.poll(async()=>(await photo.boundingBox()).x).toBeCloseTo(a.x,0);
});

test('mobile resizing and theme changes keep photos accessible without overflow',async({page})=>{
 await open(page,390);const gallery=page.locator('.floating-photo-gallery');await expect(gallery).toHaveAttribute('data-motion','reduced');
 for(const width of [390,320,1440]){
  await page.setViewportSize({width,height:844});await expect.poll(()=>gallery.evaluate(el=>Math.round(el.clientWidth))).toBe(width-(width<600?16:40));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 const fallback=page.locator('.floating-dither-fallback').first(),old=await fallback.getAttribute('src');await page.getByRole('button',{name:/Switch to .* mode/}).click();await expect(fallback).not.toHaveAttribute('src',old);
 await page.setViewportSize({width:390,height:844});const first=page.locator('.floating-photo-hit').first();await first.focus();for(let i=0;i<30;i++)await page.keyboard.press('ArrowLeft');expect((await first.boundingBox()).x).toBeGreaterThanOrEqual(0);
 await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const b=await dialog.locator('img').boundingBox();expect(b.width).toBeLessThanOrEqual(350);expect(b.height).toBeLessThanOrEqual(694);
});

test.describe('touch photos',()=>{
 test.use({hasTouch:true});
 test('touch drags independently, and tapping opens the original',async({page})=>{
  await open(page,390);const photo=page.locator('.floating-photo-hit').last(),before=await photo.boundingBox(),x=before.x+before.width/2,y=before.y+before.height/2;
  const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35*i/6,y:y+20*i/6}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.getByRole('dialog')).toHaveCount(0);const moved=await photo.boundingBox();expect(moved.x-before.x).toBeGreaterThan(15);expect(moved.x-before.x).toBeLessThanOrEqual(35.5);expect(moved.x+moved.width).toBeLessThanOrEqual(390);
  await photo.tap();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close photograph'}).tap();await expect(page.getByRole('dialog')).toHaveCount(0);
 });
});
