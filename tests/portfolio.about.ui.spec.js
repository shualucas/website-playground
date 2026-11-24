import {test,expect} from './support/portfolio.js';
test.use({webgl:false});

test('about dissolves only the main content and browser Back restores work',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const about=page.getByRole('button',{name:'About me',exact:true});await expect(about).toBeVisible();
 await expect(about).toHaveCSS('text-decoration-style','dotted');
 const chrome=await page.locator('.collection-header,.collection-footer').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));
 await about.click();await expect(page).toHaveURL(/view=about/);
 await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','true');
 expect(await page.locator('.collection-main').evaluate(el=>el.getAnimations().length)).toBeGreaterThan(0);
 await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','false');
 await expect(page.getByRole('heading',{name:'A little about me.'})).toBeFocused();
 await expect(page.locator('.recent-projects')).not.toBeVisible();
 expect(await page.locator('.collection-header,.collection-footer').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()))).toEqual(chrome);
 expect(await page.locator('.about-photo').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
 await page.goBack();await expect(about).toBeFocused();await expect(page.locator('.recent-projects')).toBeVisible();
 await about.click();await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','false');
 await page.getByRole('button',{name:'Back to my work'}).click();await expect(about).toBeFocused();
});

test('about deep links and reduced motion remain responsive on mobile',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/?view=about');
 await expect(page.getByRole('heading',{name:'A little about me.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Back to my work'}).click();await expect(page.getByRole('button',{name:'About me',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'About me',exact:true}).click();await expect(page.locator('.collection-main')).toHaveAttribute('data-dissolving','false');
 expect(await page.locator('.collection-main').evaluate(el=>el.getAnimations().length)).toBe(0);
});
