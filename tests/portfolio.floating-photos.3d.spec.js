import {test,expect} from './support/portfolio.js';
import {filmPhotos} from '../src/content/film-photos.js';

test('live photos drift with a shader color wake, pause in the viewer and respect reduced motion',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGLProgram|GL_INVALID/.test(m.text()))errors.push(m.text())});
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/photos/');
 const gallery=page.locator('.floating-photo-gallery');await expect(gallery).toHaveAttribute('data-status','ready');await expect(gallery.locator('canvas')).toHaveCount(1);await expect(page.locator('.floating-photo-hit')).toHaveCount(filmPhotos.length);
 const time=await gallery.getAttribute('data-time');await expect.poll(()=>gallery.getAttribute('data-time')).not.toBe(time);
 const photo=page.locator('.floating-photo-hit').first(),before=await photo.getAttribute('style');await expect.poll(()=>photo.getAttribute('style')).not.toBe(before);
 const box=await photo.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:10});await expect(gallery).toHaveAttribute('data-wake','active');
 await page.mouse.move(1,1);await expect(gallery).toHaveAttribute('data-wake','fading');
 await photo.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await expect(gallery).toHaveAttribute('data-motion','paused');
 const paused=await gallery.getAttribute('data-time');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await expect(gallery).toHaveAttribute('data-time',paused);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(gallery).toHaveAttribute('data-motion','floating');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(gallery).toHaveAttribute('data-motion','reduced');const reduced=await gallery.getAttribute('data-time');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await expect(gallery).toHaveAttribute('data-time',reduced);
 expect(errors).toEqual([]);
});
