import { filmPhotos } from "../src/content/film-photos.js";
import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });

async function openEnvelope(page){
  await expect(page.locator('.film-envelope-stage')).toHaveAttribute('data-reveal-ready','true');
  const box=await page.getByRole('button',{name:/Open \d+ film photographs/}).boundingBox();
  // The envelope intentionally never becomes stationary; click its current center.
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
}

test("camera click uses a single flash, with an accessible fallback and mobile destination", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {

    window.cameraFlashed = false;
    new MutationObserver(() => { if (document.querySelector('.camera-page-flash')) { window.cameraFlashed = true; sessionStorage.setItem('camera-flash-tested','yes'); } }).observe(document,{childList:true,subtree:true});
    new MutationObserver(()=>{
      const caption=document.querySelector('.photo-entry-caption'),source=window.__cameraEntry?.camera;
      if(caption&&source){const rect=caption.getBoundingClientRect();sessionStorage.setItem('camera-caption-tested',JSON.stringify({dx:rect.left+rect.width/2-source.x*innerWidth,dy:rect.top+rect.height/2-source.y*innerHeight,camera:!!document.querySelector('.film-camera-dock')}));}
    }).observe(document,{childList:true,subtree:true});
  });
  await page.goto("/"); await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 15000 });
  await page.getByRole("link", { name: /Explore film photographs/ }).click();
  await expect(page).toHaveURL(/\/photos\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem('camera-flash-tested'))).toBe('yes');
  await expect(page.locator("html")).toHaveAttribute("data-camera-entry", "true");
  await expect(page.locator(".polaroid")).toHaveCount(filmPhotos.length);
  await expect(page.locator(".photos-page")).toHaveAttribute("data-arrived","true");
  await expect(page.locator(".photo-entry-camera")).toHaveCount(0);
  const caption=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('camera-caption-tested')));
  expect(Math.abs(caption.dx)).toBeLessThan(1);expect(Math.abs(caption.dy)).toBeLessThan(1);expect(caption.camera).toBe(false);
  await expect(page.locator('.photo-spread')).toBeHidden();
  await openEnvelope(page);
  await expect(page.locator('.photos-page')).toHaveAttribute('data-envelope-state','open');
  await expect(page.locator('.film-envelope-stage')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Film photograph collection'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the envelope floats, distinguishes dragging from opening, and leaves after releasing the prints',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/photos/');
  const envelope=page.getByRole('button',{name:/Open \d+ film photographs/}),root=page.locator('.photos-page');
  await expect(page.locator('.film-envelope-stage')).toHaveAttribute('data-reveal-ready','true');
  await expect(envelope).toHaveAttribute('data-motion','floating');const before=await envelope.getAttribute('data-orientation');await expect.poll(()=>envelope.getAttribute('data-orientation')).not.toBe(before);
  const box=await envelope.boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.7;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y-30,{steps:6});await expect(envelope).toHaveAttribute('data-dragging','true');await page.mouse.up();
  await expect(root).toHaveAttribute('data-envelope-state','closed');await expect(envelope).toHaveAttribute('data-dragging','false');
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+20,{steps:3});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();await expect(envelope).toHaveAttribute('data-dragging','false');
  await openEnvelope(page);await expect(root).toHaveAttribute('data-envelope-state','opening');await expect(envelope).toHaveAttribute('data-motion','paused');
  await expect(root).toHaveAttribute('data-envelope-state','open');await expect(envelope).toHaveCount(0);await expect(page.locator('.photo-spread')).toBeFocused();await expect(page.locator('.polaroid')).toHaveCount(filmPhotos.length);
  expect(errors).toEqual([]);
});

test('film photos retain original proportions on small screens and open by keyboard with reduced motion',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos/');
  const envelope=page.getByRole('button',{name:/Open \d+ film photographs/});await expect(envelope).toHaveAttribute('data-motion','reduced');
  const pose=await envelope.getAttribute('data-orientation');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(envelope).toHaveAttribute('data-orientation',pose);
  await envelope.focus();await page.keyboard.press('Enter');await expect(page.locator('.photos-page')).toHaveAttribute('data-envelope-state','open');await expect(page.locator('.photo-spread')).toBeFocused();
  await expect(page.locator('.photo-placeholder')).toHaveCount(0);
  const photos=page.locator('img.polaroid-image');await expect(photos).toHaveCount(filmPhotos.length);
  for(const image of await photos.all()){
    await image.scrollIntoViewIfNeeded();await expect(image).toHaveJSProperty('complete',true);expect(await image.evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
    const ratio=await image.evaluate(el=>({actual:el.clientWidth/el.clientHeight,original:el.naturalWidth/el.naturalHeight,filter:getComputedStyle(el).filter}));expect(ratio.actual).toBeCloseTo(ratio.original,1);expect(ratio.filter).toBe('none');
  }
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width!==320){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:testInfo.outputPath(`film-spread-${width}.png`)})}
  }
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
});

test('changing size or motion preferences during the envelope reveal settles without stranded animations',async({page})=>{
  for(const change of ['resize','reduce']){
    await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/photos/');
    await openEnvelope(page);await expect(page.locator('.photos-page')).toHaveAttribute('data-envelope-state','opening');
    if(change==='resize')await page.setViewportSize({width:900,height:700});else await page.emulateMedia({reducedMotion:'reduce'});
    await expect(page.locator('.photos-page')).toHaveAttribute('data-envelope-state','open');await expect(page.locator('.film-envelope-stage')).toHaveCount(0);await expect(page.locator('.photo-spread')).toHaveAttribute('aria-hidden','false');expect(await page.locator('.photo-spread').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  }
});
