import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });

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
  await expect(page.locator(".polaroid")).toHaveCount(6);
  await expect(page.locator(".photos-page")).toHaveAttribute("data-arrived","true");
  await expect(page.locator(".photo-entry-camera")).toHaveCount(0);
  const caption=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('camera-caption-tested')));
  expect(Math.abs(caption.dx)).toBeLessThan(1);expect(Math.abs(caption.dy)).toBeLessThan(1);expect(caption.camera).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
