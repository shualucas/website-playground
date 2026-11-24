import {test,expect} from './support/portfolio.js';
test.use({webgl:false});

test('about dissolves only the main content and browser Back restores work',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const about=page.getByRole('button',{name:/about me/i,exact:true});await expect(about).toBeVisible();
 await expect(about).toHaveCSS('text-decoration-style','dotted');
 await expect(page.locator('.random-fact button')).toHaveText('about me');
 await expect(page.locator('.collection-intro > .about-link')).toHaveCount(0);
 const chrome=await page.locator('.collection-header,.collection-footer').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));
 await about.click();await expect(page).toHaveURL(/view=about/);
 await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','true');
 const main=page.locator('.collection-main');
 await main.evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=240});
 const middle=await main.evaluate(el=>getComputedStyle(el).maskImage);
 await expect(page.locator('.about-dither-color')).toHaveCount(0);
 await expect(main).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 const endpoints=await main.evaluate(el=>{const a=el.getAnimations()[0];return a.effect.getKeyframes().filter((_,i)=>i===0||i===16).map(k=>k.maskImage)});
 expect(endpoints).not.toContain(middle);
 await page.screenshot({path:testInfo.outputPath('about-mid-exit.png')});
 await main.evaluate(el=>el.getAnimations()[0].finish());
 await expect(main).toHaveAttribute('data-about','true');
 await main.evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=320});
 expect(await main.evaluate(el=>getComputedStyle(el).maskImage)).toBe(middle);
 await page.locator('.about-photo').evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=320});
 await expect(page.locator('.about-photo')).toHaveCSS('filter','brightness(0.78) contrast(1.2)');
 await page.screenshot({path:testInfo.outputPath('about-mid-enter.png')});
 await main.evaluate(el=>el.getAnimations()[0].finish());
 await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','false');
 await expect(page.getByRole('heading',{name:'A little about me.'})).toBeFocused();
 await expect(main).toHaveCSS('mask-image','none');
 await expect(page.locator('.about-photo')).toHaveCSS('filter','none');
 await expect(page.getByRole('link',{name:'tennis at the park'})).toHaveAttribute('href','https://www.youtube.com/watch?v=q-cJEEdw39M');
 await expect(page.locator('.recent-projects')).not.toBeVisible();
 expect(await page.locator('.collection-header,.collection-footer').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()))).toEqual(chrome);
 expect(await page.locator('.about-photo').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
 await expect(page.locator('.about-photo')).toHaveAttribute('src','/about/joshua-film-portrait.jpg');
 await expect(page.locator('.about-copy')).toContainText('technology enhances the texture of everyday life');
 await page.goBack();await expect(about).toBeFocused();await expect(page.locator('.recent-projects')).toBeVisible();
 await about.click();await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','false');
 await page.getByRole('button',{name:'Back to my work'}).click();await expect(about).toBeFocused();
});

test('about deep links and reduced motion remain responsive on mobile',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/?view=about');
 await expect(page.getByRole('heading',{name:'A little about me.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Back to my work'}).click();await expect(page.getByRole('button',{name:/about me/i,exact:true})).toBeVisible();
 await page.getByRole('button',{name:/about me/i,exact:true}).click();await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','false');
 expect(await page.locator('.collection-main').evaluate(el=>el.getAnimations().length)).toBe(0);
});

test('About hover dims hero text and recent projects and requests an exit spin on click',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const about=page.getByRole('button',{name:'about me',exact:true});await about.hover();
 await expect(page.locator('.intro-title')).toHaveCSS('opacity','0.3');
 await expect(page.locator('.recent-projects')).toHaveCSS('opacity','0.3');
 for(const word of await page.locator('.random-fact > .intro-word:not(.about-link-word)').all())await expect(word).toHaveCSS('opacity','0.3');
 await expect(about).toHaveCSS('opacity','1');await expect(page.locator('.hero-cartridge')).toHaveCSS('opacity','1');
 await expect(page.locator('.hero-cartridge')).toHaveAttribute('data-about-motion','hover');
 await page.mouse.move(2,2);await expect(page.locator('.intro-title')).toHaveCSS('opacity','1');await expect(page.locator('.recent-projects')).toHaveCSS('opacity','1');
 await about.click();await expect(page.locator('.hero-cartridge')).toHaveAttribute('data-about-motion','exit');
 await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','true');
 await expect(page.getByRole('heading',{name:'A little about me.'})).toBeFocused();
});
