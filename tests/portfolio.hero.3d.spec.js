import {test,expect} from './support/portfolio.js';

test('inline hero swaps all five cartridges with continuous enter spins and exit fades in one renderer',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|VALIDATE_STATUS|shader error/.test(message.text()))errors.push(message.text())});
 await page.addInitScript(()=>{
  window.heroReveals=[];window.heroReadbacks=0;window.heroSwaps=[];let previous=null;
  const read=WebGL2RenderingContext.prototype.readPixels;WebGL2RenderingContext.prototype.readPixels=function(...args){if(this.canvas.closest('.hero-cartridge'))window.heroReadbacks++;return read.apply(this,args)};
  new MutationObserver(changes=>{for(const {target}of changes)if(target.matches('.hero-cartridge-stage')){
   const state={id:target.dataset.cartridge,state:target.dataset.dissolve,progress:Number(target.dataset.revealProgress),appearance:target.dataset.appearanceState,fade:Number(target.dataset.fadeProgress),pose:(target.dataset.float||'').split(',').map(Number),turn:(target.dataset.turn||'').split(',').map(Number)};
   window.heroReveals.push(state);if(previous&&previous.id!==state.id)window.heroSwaps.push({before:previous,after:state});previous=state;
  }}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-dissolve','data-cartridge','data-float','data-fade-progress']});
 });
 await page.goto('/');const hero=page.locator('.hero-cartridge'),stage=hero.locator('.hero-cartridge-stage');
 await expect(hero).toHaveAttribute('data-status','ready',{timeout:60000});await expect(stage).toHaveAttribute('data-intro','settled',{timeout:30000});await expect(stage).toHaveAttribute('data-cartridge','personal');
 await expect(stage).toHaveAttribute('data-render-style','dither');
 expect(await page.evaluate(()=>window.heroReveals.some(frame=>frame.state==='revealing'&&frame.progress<1))).toBe(true);
 await page.evaluate(()=>{window.heroReveals=[]});
 await stage.locator('canvas').evaluate(el=>{window.heroCanvas=el});
 const dimensions=await hero.boundingBox();
 for(const id of ['search','gmail','stadia','blizzard']){
  await page.locator(`[data-company="${id}"]`).hover();await expect(stage).toHaveAttribute('data-cartridge',id,{timeout:30000});
  await expect(stage).toHaveAttribute('data-dissolve','complete',{timeout:30000});
  await expect(stage).toHaveAttribute('data-render-style','model');
  await expect(stage).toHaveAttribute('data-intro','settled');
  await expect(stage).toHaveAttribute('data-turn-state','spinning');
  await expect(stage).toHaveAttribute('data-appearance-state','settled');
  await expect(stage).toHaveAttribute('data-turn-state','settled',{timeout:15000});
  expect(await page.evaluate(id=>window.heroReveals.some(frame=>frame.id===id&&frame.appearance==='fading'&&frame.fade>0&&frame.fade<1),id)).toBe(true);
  const angle=await page.evaluate(id=>window.heroSwaps.findLast(swap=>swap.after.id===id).after.turn[0],id);
  expect(Number((await stage.getAttribute('data-turn')).split(',')[0])-angle).toBeGreaterThan(1);
  await expect(hero.locator('canvas')).toHaveCount(1);expect(await stage.locator('canvas').evaluate(el=>el===window.heroCanvas)).toBe(true);
  expect(await hero.boundingBox()).toEqual(dimensions);
 }
 // Leaving a fully settled cartridge must not start another spin.
 const settledAngle=Number((await stage.getAttribute('data-turn')).split(',')[0]);
 await page.mouse.move(2,2);await expect(stage).toHaveAttribute('data-cartridge','personal');
 await expect(stage).toHaveAttribute('data-appearance-state','settled');await expect(stage).toHaveAttribute('data-turn-state','settled');
 expect(Number((await stage.getAttribute('data-turn')).split(',')[0])).toBeCloseTo(settledAngle,4);
 expect(await page.evaluate(()=>window.heroReveals.some(frame=>frame.id==='personal'&&frame.appearance==='fading'&&frame.fade>0&&frame.fade<1))).toBe(true);
 for(const id of ['search','gmail','stadia','blizzard'])await page.locator(`[data-company="${id}"]`).hover();
 await expect(stage).toHaveAttribute('data-cartridge','blizzard');await expect(stage).toHaveAttribute('data-turn-state','spinning');
 const interrupted=await stage.getAttribute('data-turn');await page.mouse.move(2,2);await expect(stage).toHaveAttribute('data-cartridge','personal');await expect(stage).toHaveAttribute('data-intro','settled',{timeout:30000});
 const continued=await stage.getAttribute('data-turn');expect(Number(continued.split(',')[0])).toBeGreaterThanOrEqual(Number(interrupted.split(',')[0]));
 await expect(stage).toHaveAttribute('data-turn-state','settled',{timeout:15000});
 await expect(stage).toHaveAttribute('data-appearance-state','settled');
 const exitAngle=await page.evaluate(()=>window.heroSwaps.findLast(swap=>swap.after.id==='personal').after.turn[0]);
 // An interrupted spin coasts by at most 18/24 radians rather than adding a turn.
 expect(Number((await stage.getAttribute('data-turn')).split(',')[0])-exitAngle).toBeLessThan(.8);
 await expect(stage).toHaveAttribute('data-render-style','dither');
 expect(await page.evaluate(()=>window.heroReveals.every(frame=>frame.state==='complete'&&frame.progress===1))).toBe(true);
 const swaps=await page.evaluate(()=>window.heroSwaps);expect(swaps.length).toBeGreaterThanOrEqual(5);
 for(const swap of swaps)expect(Math.max(...swap.after.pose.map((value,i)=>Math.abs(value-swap.before.pose[i])))).toBeLessThan(.1);
 const quality=await stage.locator('canvas').evaluate(el=>({ratio:el.width/el.clientWidth,expected:Math.min(devicePixelRatio,1.5),antialias:el.getContext('webgl2').getContextAttributes().antialias}));expect(quality.ratio).toBeCloseTo(quality.expected,1);expect(quality.antialias).toBe(true);expect(await page.evaluate(()=>window.heroReadbacks)).toBe(0);
 await page.locator('.collection-header .theme-toggle').click();await expect(stage).toHaveAttribute('data-shell-theme','dark');expect(await stage.locator('canvas').evaluate(el=>el===window.heroCanvas)).toBe(true);
 await page.locator('[data-project="ai-mode-nudges"] .recent-project-link').hover();await expect(stage).toHaveAttribute('data-motion','idle');
 const pose=await stage.getAttribute('data-float');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(stage).toHaveAttribute('data-float',pose);
 await page.mouse.move(2,2);await expect(stage).toHaveAttribute('data-motion','ambient');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-company="gmail"]').hover();await expect(stage).toHaveAttribute('data-cartridge','gmail');await expect(stage).toHaveAttribute('data-reveal-progress','1.0000');
 await expect(stage).toHaveAttribute('data-turn-state','settled');
 await hero.focus();await page.keyboard.press('ArrowRight');expect(Math.abs(Number((await stage.getAttribute('data-rotation')).split(',')[1]))).toBeGreaterThan(.1);
 await page.keyboard.press('ArrowUp');const rotation=await stage.getAttribute('data-rotation'),manualPose=await stage.getAttribute('data-float');
 for(const id of ['search','stadia','blizzard',null]){
  if(id)await page.locator(`[data-company="${id}"]`).hover();else await page.mouse.move(2,2);
  await expect(stage).toHaveAttribute('data-cartridge',id||'personal');await expect(stage).toHaveAttribute('data-rotation',rotation);await expect(stage).toHaveAttribute('data-float',manualPose);
  await expect(stage).toHaveAttribute('data-appearance-state','settled');
 }
 expect(errors).toEqual([]);
});
