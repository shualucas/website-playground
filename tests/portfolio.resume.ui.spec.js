import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });

test("resume keeps its original paper preview usable without WebGL", async ({page})=>{

  await page.goto('/resume/');const sheet=page.locator('.resume-sheet');
  await expect(sheet).toHaveAttribute('data-surface','fallback');
  await expect(page.locator('.resume-artwork picture')).toHaveCSS('opacity','1');
  await expect(page.locator('.resume-paper-canvas')).toHaveCount(0);
  const idleGlow=await sheet.evaluate(el=>getComputedStyle(el).boxShadow),box=await sheet.boundingBox();
  await expect(sheet).toHaveCSS('outline-color','rgb(228, 59, 250)');
  await page.mouse.move(box.x+box.width/2,box.y+box.height*.4);
  await expect.poll(()=>sheet.evaluate(el=>Number(el.style.getPropertyValue('--paper-emphasis')))).toBeGreaterThan(.98);
  expect(await sheet.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe(idleGlow);
  await page.mouse.move(8,8);await expect.poll(()=>sheet.evaluate(el=>Number(el.style.getPropertyValue('--paper-emphasis')))).toBeLessThan(.02);
  // Reduced motion keeps the static hover contrast, while skipping the scale/bounce.
  await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(box.x+box.width/2,box.y+box.height*.4);
  await expect.poll(()=>sheet.evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--paper-emphasis')))).toBe(1);await expect(sheet).toHaveAttribute('data-hover-scale','1.0000');
  await page.mouse.move(8,8);await expect.poll(()=>sheet.evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--paper-emphasis')))).toBe(0);
  await page.getByRole('button',{name:'Open résumé in reading view'}).click();
  await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();
});

test('resume Read keeps its title clear of navigation when shared styles load last',async({page})=>{

  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/resume/');
  // Production extracts the shared collection stylesheet after the resume stylesheet.
  const {readFile}=await import('node:fs/promises');
  await page.addStyleTag({content:await readFile(new URL('../src/site.css',import.meta.url),'utf8')});
  const main=page.locator('.resume-page');await page.getByRole('button',{name:'Read',exact:true}).click();await expect(main).toHaveAttribute('data-view','read');
  for(const [width,height] of [[1440,1000],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await expect.poll(async()=>{const heading=await page.locator('.resume-read-stage h1').boundingBox(),nav=await page.locator('.resume-nav').boundingBox();return heading.y-(nav.y+nav.height)}).toBeGreaterThanOrEqual(24);
    const controls=await page.locator('.resume-toolbar').boundingBox();expect(controls.y).toBeGreaterThan(height*.7);
    await expect(page.getByRole('button',{name:'Back to page view',exact:true})).toBeVisible();
  }
  await page.evaluate(()=>scrollTo(0,400));await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-view','page');
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(main).toHaveAttribute('data-view','read');
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  const heading=await page.locator('.resume-read-stage h1').boundingBox(),nav=await page.locator('.resume-nav').boundingBox();expect(heading.y).toBeGreaterThanOrEqual(nav.y+nav.height+24);
});
