import {test,expect} from './support/portfolio.js';

test.use({webgl:false});

test('the theme dot reveals either theme through a dithered edge and preserves the choice',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(()=>{
    const start=document.startViewTransition.bind(document);
    document.startViewTransition=update=>{window.themeWipe=start(update);return window.themeWipe};
  });
  await page.goto('/');const button=page.locator('.collection-header .theme-toggle');await expect(button).toHaveAttribute('data-reveal-ready','true');
  await expect(button.locator('svg')).toHaveCount(0);await expect(button.locator('.theme-dot')).toHaveCSS('width','12px');
  const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  for(const mode of ['dark','light']){
    await button.click();
    const wipe=await page.evaluate(async()=>{
      await window.themeWipe.ready;
      const animation=document.getAnimations().find(animation=>animation.animationName==='theme-circle');
      animation.pause();animation.currentTime=325;
      const root=document.documentElement,style=getComputedStyle(root,'::view-transition-new(root)');
      return {origin:[parseFloat(root.style.getPropertyValue('--theme-origin-x')),parseFloat(root.style.getPropertyValue('--theme-origin-y'))],radius:parseFloat(style.getPropertyValue('--theme-reveal')),mask:style.maskImage,duration:animation.effect.getTiming().duration};
    });
    expect(wipe.origin[0]).toBeCloseTo(box.x+box.width/2,0);expect(wipe.origin[1]).toBeCloseTo(box.y+box.height/2,0);expect(wipe.radius).toBeGreaterThan(100);expect(decodeURIComponent(wipe.mask)).toContain('<pattern');expect(wipe.duration).toBe(650);
    await expect(page.locator('html')).toHaveAttribute('data-color-mode',mode);
    const screenshot=await page.screenshot({path:testInfo.outputPath('theme-dither-wipe-'+mode+'.png')});
    const pixels=await page.evaluate(async({encoded,origin,radius})=>{
      const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const context=canvas.getContext('2d');context.drawImage(image,0,0);
      const sample=(x,y)=>context.getImageData(x,y,1,1).data[0];
      const edge=context.getImageData(Math.round(origin[0]-radius*.982)-6,8,12,16).data;
      const values=Array.from(edge).filter((_,i)=>i%4===0);
      return {left:sample(16,16),right:sample(canvas.width-16,16),edgeRange:Math.max(...values)-Math.min(...values)};
    },{encoded:screenshot.toString('base64'),origin:wipe.origin,radius:wipe.radius});
    expect(pixels.left).toBe(mode==='dark'?240:16);expect(pixels.right).toBe(mode==='dark'?16:240);
    expect(pixels.edgeRange).toBeGreaterThan(100);
    // A repeated activation cannot start a second transition or invert the theme mid-wipe.
    await button.press('Enter');await expect(page.locator('html')).toHaveAttribute('data-color-mode',mode);
    await page.evaluate(async()=>{for(const animation of document.getAnimations())if(animation.animationName==='theme-circle')animation.finish();await window.themeWipe.finished});
    await expect(page.locator('html')).not.toHaveClass(/theme-transition/);expect(await page.evaluate(()=>localStorage.getItem('cartridge-color-mode'))).toBe(mode);
  }
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-color-mode','light');expect(errors).toEqual([]);
});

test('theme switching stays immediate for reduced motion and browsers without view transitions',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos/');
  await page.evaluate(()=>{document.startViewTransition=()=>{throw Error('Reduced motion must not start a wipe')}});
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{document.startViewTransition=undefined});
  await page.getByRole('button',{name:'Switch to light mode'}).press('Enter');await expect(page.locator('html')).toHaveAttribute('data-color-mode','light');await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
});

test('a theme wipe settles cleanly when motion preferences or the viewport change',async({page})=>{
  await page.addInitScript(()=>{
    const start=document.startViewTransition.bind(document);document.startViewTransition=update=>{const transition=start(update);transition.ready.then(()=>{document.getAnimations().find(animation=>animation.animationName==='theme-circle')?.pause()});return transition};
  });
  for(const change of ['reduce','resize']){
    await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/photos/');await page.locator('.theme-toggle').click();await expect(page.locator('html')).toHaveClass(/theme-transition/);
    if(change==='reduce')await page.emulateMedia({reducedMotion:'reduce'});else await page.setViewportSize({width:390,height:844});
    await expect(page.locator('html')).not.toHaveClass(/theme-transition/);expect(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--theme-radius'))).toBe('');
  }
});
