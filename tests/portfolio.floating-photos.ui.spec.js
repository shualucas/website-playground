import {test,expect} from './support/portfolio.js';
import {filmPhotos} from '../src/content/film-photos.js';
test.use({webgl:false});
async function open(page,width=1440){
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos/');
 await expect(page.locator('.floating-photo-gallery')).toHaveAttribute('data-status','fallback');
}

test('borderless fallback photos preserve proportions, dither and keyboard lightbox access',async({page})=>{
 await open(page);await expect(page.locator('.floating-photo-help')).toHaveCount(0);await expect(page.getByRole('button',{name:'Change palette',exact:true})).toHaveCSS('clip-path','inset(50%)');const photos=page.locator('.floating-photo-hit');await expect(photos).toHaveCount(filmPhotos.length);
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

test('mobile resizing keeps photos accessible in dark mode without changing the home preference',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('cartridge-color-mode','light'));await open(page,390);const gallery=page.locator('.floating-photo-gallery');await expect(gallery).toHaveAttribute('data-motion','reduced');
 for(const width of [390,320,1440]){
  await page.setViewportSize({width,height:844});await expect.poll(()=>gallery.evaluate(el=>Math.round(el.clientWidth))).toBe(width-(width<600?16:40));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 const fixed=await page.locator('.floating-photo-hit').first().getAttribute('style');await page.mouse.move(40,150);await page.mouse.move(1000,700);await expect(page.locator('.floating-photo-hit').first()).toHaveAttribute('style',fixed);
 await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');await expect(page.locator('.theme-toggle')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('cartridge-color-mode'))).toBe('light');
 await page.setViewportSize({width:390,height:844});const first=page.locator('.floating-photo-hit').first();await first.focus();for(let i=0;i<30;i++)await page.keyboard.press('ArrowLeft');expect((await first.boundingBox()).x).toBeGreaterThanOrEqual(0);
 await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const b=await dialog.locator('img').boundingBox();expect(b.width).toBeLessThanOrEqual(350);expect(b.height).toBeLessThanOrEqual(694);
});

test.describe('touch photos',()=>{
 test.use({hasTouch:true});
 test('a touch hold develops without opening the lightbox on release',async({page})=>{
  await open(page,390);const photo=page.locator('.floating-photo-hit').last(),box=await photo.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2,cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await expect(photo).toHaveAttribute('data-develop','1.000');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(photo).toHaveAttribute('data-develop','0.000');await expect(page.getByRole('dialog')).toHaveCount(0);
  await photo.tap();await expect(page.getByRole('dialog')).toBeVisible();
 });
 test('touch drags independently, and tapping opens the original',async({page})=>{
  await open(page,390);const photo=page.locator('.floating-photo-hit').last(),before=await photo.boundingBox(),x=before.x+before.width/2,y=before.y+before.height/2;
  const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35*i/6,y:y+20*i/6}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.getByRole('dialog')).toHaveCount(0);const moved=await photo.boundingBox();expect(moved.x-before.x).toBeGreaterThan(15);expect(moved.x-before.x).toBeLessThanOrEqual(35.5);expect(moved.x+moved.width).toBeLessThanOrEqual(390);
  await photo.tap();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close photograph'}).tap();await expect(page.getByRole('dialog')).toHaveCount(0);
 });
});

test('a slow stagger reveals photos after loading and a stationary hold develops without opening',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/photos/');
 const gallery=page.locator('.floating-photo-gallery'),photos=page.locator('.floating-photo-hit');await expect(gallery).toHaveAttribute('data-status','fallback');
 await expect.poll(async()=>Number(await photos.first().getAttribute('data-photo-reveal'))).toBeGreaterThan(0);
 expect(Number(await photos.last().getAttribute('data-photo-reveal'))).toBeLessThan(1);await expect(gallery).toHaveAttribute('data-entrance','complete');
 const photo=photos.last(),box=await photo.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect(photo).toHaveAttribute('data-develop','1.000');await page.mouse.up();await expect(photo).toHaveAttribute('data-develop','0.000');await expect(page.getByRole('dialog')).toHaveCount(0);
 await photo.focus();await page.keyboard.down(' ');await expect(photo).toHaveAttribute('data-develop','1.000');await page.keyboard.up(' ');await expect(photo).toHaveAttribute('data-develop','0.000');
 await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();
});

test('thrown photos coast, settle inside the field and stop when picked up',async({page})=>{
 await open(page);await page.emulateMedia({reducedMotion:'no-preference'});const photo=page.locator('.floating-photo-hit').last(),box=await photo.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+75,y-25,{steps:6});await page.mouse.up();await expect(photo).toHaveAttribute('data-inertia','true');await expect(page.getByRole('dialog')).toHaveCount(0);
 const coast=await photo.getAttribute('style');await expect.poll(()=>photo.getAttribute('style')).not.toBe(coast);
 const catchBox=await photo.boundingBox(),cx=catchBox.x+catchBox.width/2,cy=catchBox.y+catchBox.height/2;
 await page.mouse.move(cx,cy);await page.mouse.down();await expect(photo).toHaveAttribute('data-inertia','false');await page.mouse.move(cx+30,cy+10,{steps:3});await page.mouse.up();await expect(photo).toHaveAttribute('data-inertia','true');await expect(photo).toHaveAttribute('data-inertia','false');
 const b=await photo.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(1440);
 await photo.focus();await page.keyboard.press('ArrowRight');await expect(photo).toHaveAttribute('data-inertia','false');
});

test('palette swatches recolor the gallery and lightbox arrows hug the actual image',async({page})=>{
 await open(page);const photo=page.locator('.floating-photo-hit').first(),fallback=photo.locator('.floating-dither-fallback'),old=await fallback.getAttribute('src');await photo.focus();await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog');await expect(dialog.locator('.photo-palette button')).toHaveCount(5);await expect(dialog).toHaveCSS('background-color','rgb(11, 12, 11)');
 const colors=await dialog.locator('.photo-palette li').evaluateAll(items=>items.map(el=>el.getAttribute('aria-label'))),swatch=dialog.locator('.photo-palette button').nth(2);
 await swatch.click();await expect(swatch).toHaveAttribute('aria-pressed','true');await expect(page.locator('.floating-photo-gallery')).toHaveAttribute('data-palette',colors.join(','));await expect(fallback).not.toHaveAttribute('src',old);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await expect.poll(async()=>(await dialog.locator('img').boundingBox()).width).toBeCloseTo(Math.min(width-(width<600?112:144),(900-(width<600?218:190))*filmPhotos[0].width/filmPhotos[0].height,1400),0);
  const {image,left,right}=await dialog.evaluate(el=>{const rect=selector=>{const b=el.querySelector(selector).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}};return {image:rect('img'),left:rect('.photo-viewer-previous'),right:rect('.photo-viewer-next')}});
  expect(image.x-left.x-left.width).toBeGreaterThanOrEqual(4);expect(image.x-left.x-left.width).toBeLessThanOrEqual(14);expect(right.x-image.x-image.width).toBeLessThanOrEqual(14);expect(right.x-image.x-image.width).toBeGreaterThanOrEqual(4);
  expect(left.y+left.height/2).toBeCloseTo(image.y+image.height/2,0);expect(right.y+right.height/2).toBeCloseTo(image.y+image.height/2,0);
 }
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await page.mouse.click(12,100);await expect(page.locator('.floating-photo-gallery')).not.toHaveAttribute('data-palette',colors.join(','));
});
