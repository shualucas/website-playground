import {filmPhotos} from '../src/content/film-photos.js';
import {test,expect} from './support/portfolio.js';
test.use({webgl:false});

test('camera click flashes once and opens the floating mobile gallery',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{new MutationObserver(()=>{if(document.querySelector('.camera-page-flash'))sessionStorage.setItem('camera-flash-tested','yes')}).observe(document,{childList:true,subtree:true})});
 await page.goto('/');await expect(page.locator('.collection')).toHaveAttribute('data-presented','true',{timeout:15000});
 await page.getByRole('button',{name:/Explore film photographs/}).click();
 await page.getByRole('region',{name:'Say cheese! preview'}).getByRole('link',{name:'Open project'}).click();
 await expect(page).toHaveURL(/\/photos\/$/);expect(await page.evaluate(()=>sessionStorage.getItem('camera-flash-tested'))).toBe('yes');
 await expect(page.getByRole('region',{name:'Film photograph collection'})).toHaveAttribute('data-status','fallback');
 await expect(page.locator('.floating-photo-hit')).toHaveCount(filmPhotos.length);
 await expect(page.locator('.film-envelope-stage,.photo-entry-camera,.parcel-sticker-tray')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
