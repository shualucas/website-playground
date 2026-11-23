import {test,expect} from './support/portfolio.js';

test('inline hero swaps all five cartridges in one renderer with GPU dissolve and interruptible spin',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|VALIDATE_STATUS|shader error/.test(message.text()))errors.push(message.text())});
 await page.addInitScript(()=>{
  window.heroReveals=[];window.heroReadbacks=0;
  const read=WebGL2RenderingContext.prototype.readPixels;WebGL2RenderingContext.prototype.readPixels=function(...args){if(this.canvas.closest('.hero-cartridge'))window.heroReadbacks++;return read.apply(this,args)};
  new MutationObserver(changes=>{for(const {target}of changes)if(target.matches('.hero-cartridge-stage'))window.heroReveals.push({id:target.dataset.cartridge,state:target.dataset.dissolve,progress:Number(target.dataset.revealProgress)})}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-dissolve','data-cartridge']});
 });
 await page.goto('/');const hero=page.locator('.hero-cartridge'),stage=hero.locator('.hero-cartridge-stage');
 await expect(hero).toHaveAttribute('data-status','ready',{timeout:60000});await expect(stage).toHaveAttribute('data-intro','settled',{timeout:30000});await expect(stage).toHaveAttribute('data-cartridge','personal');
 await stage.locator('canvas').evaluate(el=>{window.heroCanvas=el});
 const dimensions=await hero.boundingBox();
 for(const id of ['search','gmail','stadia','blizzard']){
  await page.locator(`[data-company="${id}"]`).hover();await expect(stage).toHaveAttribute('data-cartridge',id,{timeout:30000});
  await expect(stage).toHaveAttribute('data-dissolve','complete',{timeout:30000});
  expect(await page.evaluate(id=>window.heroReveals.some(frame=>frame.id===id&&frame.state==='revealing'&&frame.progress<1),id)).toBe(true);
  await expect(hero.locator('canvas')).toHaveCount(1);expect(await stage.locator('canvas').evaluate(el=>el===window.heroCanvas)).toBe(true);
  expect(await hero.boundingBox()).toEqual(dimensions);
 }
 for(const id of ['search','gmail','stadia','blizzard'])await page.locator(`[data-company="${id}"]`).hover();
 await expect(stage).toHaveAttribute('data-cartridge','blizzard');await page.mouse.move(2,2);await expect(stage).toHaveAttribute('data-cartridge','personal');await expect(stage).toHaveAttribute('data-intro','settled',{timeout:30000});
 const quality=await stage.locator('canvas').evaluate(el=>({ratio:el.width/el.clientWidth,expected:Math.min(devicePixelRatio,1.5),antialias:el.getContext('webgl2').getContextAttributes().antialias}));expect(quality.ratio).toBeCloseTo(quality.expected,1);expect(quality.antialias).toBe(true);expect(await page.evaluate(()=>window.heroReadbacks)).toBe(0);
 await page.locator('.collection-header .theme-toggle').click();await expect(stage).toHaveAttribute('data-shell-theme','dark');expect(await stage.locator('canvas').evaluate(el=>el===window.heroCanvas)).toBe(true);
 await page.locator('[data-project="ai-mode-nudges"] .recent-project-link').hover();await expect(stage).toHaveAttribute('data-motion','idle');
 const pose=await stage.getAttribute('data-float');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(stage).toHaveAttribute('data-float',pose);
 await page.mouse.move(2,2);await expect(stage).toHaveAttribute('data-motion','ambient');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-company="gmail"]').hover();await expect(stage).toHaveAttribute('data-cartridge','gmail');await expect(stage).toHaveAttribute('data-reveal-progress','1.0000');
 await hero.focus();await page.keyboard.press('ArrowRight');expect(Math.abs(Number((await stage.getAttribute('data-rotation')).split(',')[1]))).toBeGreaterThan(.1);
 expect(errors).toEqual([]);
});
