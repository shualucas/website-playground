import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test("resume page preserves original artwork and downloads its one-page PDF with clickable contacts", async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/resume/');
  const sheet=page.locator('.resume-sheet');
  await expect(page.locator('.resume-page')).toHaveAttribute('data-view','page');
  await expect(sheet).toHaveAttribute('data-art-ready','true');
  await expect(sheet).toHaveAttribute('data-motion','reduced');
  await expect(sheet).toHaveAttribute('data-orientation','0.000,0.000');
  await expect(page.locator('.resume-sheet')).toHaveCount(1);
  await expect(page.locator('.resume-artwork img')).toBeVisible();
  const size=await sheet.boundingBox();expect(size.width).toBeGreaterThan(200);expect(size.y).toBeGreaterThan(140);expect(size.y+size.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));expect(size.width/size.height).toBeCloseTo(595/842,2);
  await expect(page.locator('.paper-contact[aria-label="LinkedIn"]')).toHaveAttribute('href','https://www.linkedin.com/in/joshglucas/');
  await expect(page.locator('.paper-contact[aria-label="joshglucas@gmail.com"]')).toHaveAttribute('href','mailto:joshglucas@gmail.com');
  await expect(page.locator('.resume-page .profile-links')).toHaveCount(0);
  await expect(page.getByText('Drag gently to tilt · R to reset',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>/BookScene|CartridgeScene|FilmCameraScene/.test(r.name)))).toBe(false);
  const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Download PDF'}).click();const download=await pending;
  expect(download.suggestedFilename()).toBe('Josh-Lucas-Resume.pdf');
  const {readFile}=await import('node:fs/promises');const {PDFDocument,PDFArray,PDFDict,PDFName}=await import('pdf-lib');
  const pdf=await PDFDocument.load(await readFile(await download.path()));expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getSize()).toEqual({width:595,height:842});
  const links=pdf.getPage(0).node.lookup(PDFName.of('Annots'),PDFArray).asArray().map(ref=>pdf.context.lookup(ref,PDFDict).lookup(PDFName.of('A'),PDFDict).get(PDFName.of('URI')).decodeText());
  expect(links).toContain('https://www.linkedin.com/in/joshglucas/');expect(links).toContain('mailto:joshglucas@gmail.com');
  await page.getByRole('button',{name:'Read',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();
  await expect(sheet).toHaveAttribute('data-motion','paused');
  await expect(page.locator('.resume-job')).toHaveCount(1);await expect(page.locator('.resume-job').first()).toContainText('May 2019 - Present');
  await expect(page.locator('.resume-job li')).toHaveCount(6);await expect(page.locator('.resume-job')).toContainText('+12% game sales');
  await expect(page.locator('.resume-job')).toContainText('+1.84% daily active users');await expect(page.locator('.resume-job')).toContainText('+7.73% follow-up questions');await expect(page.locator('.resume-job')).toContainText('pending US design patent');
  await expect(page.locator('.resume-skills li')).toHaveText(['AI prototyping','Interaction design','Visual & motion craft','Product strategy','Brand development','Design systems']);await expect(page.locator('.resume-tools li')).toHaveText(['Antigravity','Codex','Github','Figma','Adobe Suite','GIFSKI']);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.resume-job li').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('.resume-gradient')).toHaveAttribute('data-active','true');
});

test("floating resume tilts on drag, settles without resizing, and resets with R", async ({ page }) => {
  await page.goto('/resume/');const sheet=page.locator('.resume-sheet');await expect(sheet).toHaveAttribute('data-art-ready','true');await expect(sheet).toHaveAttribute('data-motion','floating');
  await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  await expect(sheet).toHaveAttribute('data-ground-normal','0,1,0');
  const pose=await sheet.evaluate(el=>({ground:Number(el.dataset.groundY),center:Number(el.dataset.paperY),normal:el.dataset.paperNormal.split(',').map(Number)}));
  expect(pose.center-4.7/2-pose.ground).toBeGreaterThan(.5);expect(Math.abs(pose.normal[1])).toBeGreaterThan(.27);expect(Math.abs(pose.normal[1])).toBeLessThan(.43);
  const initial=await sheet.getAttribute('data-orientation'),width=await sheet.evaluate(el=>el.clientWidth),box=await sheet.boundingBox();
  await page.mouse.move(box.x+box.width*.45,box.y+150);await page.mouse.down();await page.mouse.move(box.x+box.width*.45+150,box.y+220,{steps:8});
  await expect(sheet).toHaveAttribute('data-dragging','true');await expect(sheet).not.toHaveAttribute('data-orientation',initial);
  await expect.poll(async()=>Number(await sheet.getAttribute('data-bend'))).toBeGreaterThan(.05);
  expect(Number(await sheet.getAttribute('data-bend'))).toBeLessThan(.26);
  await page.mouse.up();await expect(sheet).toHaveAttribute('data-dragging','false');
  await expect.poll(async()=>{const [x,y]=(await sheet.getAttribute('data-orientation')).split(',').map(Number);return Math.abs(x+20)<3.5&&Math.abs(y+12)<4.5}).toBe(true);
  expect(await sheet.evaluate(el=>el.clientWidth)).toBe(width);await expect(page).toHaveURL(/\/resume\/$/);
  await expect.poll(async()=>Number(await sheet.getAttribute('data-bend'))).toBeLessThan(.01);
  await page.keyboard.press('r');await page.emulateMedia({reducedMotion:'reduce'});await expect(sheet).toHaveAttribute('data-orientation','0.000,0.000');
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(page.locator('.resume-paper-canvas')).toHaveCount(1);await expect(sheet).toHaveAttribute('data-motion','paused');
});

test("floating resume opens Read on a click or keyboard activation, never after dragging or cancellation", async ({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/resume/');const sheet=page.locator('.resume-sheet'),main=page.locator('.resume-page');
  await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  const box=await sheet.boundingBox(),x=box.x+box.width/2,y=box.y+box.height*.4;
  // Crossing the slop then returning to the start is still a drag.
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+90,y+50,{steps:6});await page.mouse.move(x,y,{steps:6});await page.mouse.up();
  await expect(main).toHaveAttribute('data-view','page');
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(5,5,{steps:5});await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-dragging','false');await expect(main).toHaveAttribute('data-view','page');
  await page.mouse.move(x,y);
  // Cancellation never leaves a pending click activation behind.
  await page.mouse.down();await sheet.evaluate(el=>el.parentElement.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true})));await page.mouse.up();
  await expect(main).toHaveAttribute('data-view','page');
  const stage=await page.locator('.resume-paper-stage').boundingBox();await page.mouse.click(stage.x+10,stage.y+10);await expect(main).toHaveAttribute('data-view','page');
  // Small hand movement counts as a click, not a drag.
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+2,y+2);await page.mouse.up();
  await expect(main).toHaveAttribute('data-view','read');await expect(page.locator('.resume-paper-canvas')).toHaveCount(1);
  await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-view','page');await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  const target=page.getByRole('button',{name:'Open résumé in reading view'});await target.focus();await target.press('Enter');await expect(main).toHaveAttribute('data-view','read');
  await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-view','page');await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});
  await page.emulateMedia({reducedMotion:'reduce'});await expect(sheet).toHaveAttribute('data-orientation','0.000,0.000');
  const link=page.locator('.paper-contact[aria-label="LinkedIn"]');
  await link.evaluate(el=>el.addEventListener('click',event=>{event.preventDefault();el.dataset.clicked='true'}));
  await link.click();await expect(link).toHaveAttribute('data-clicked','true');await expect(main).toHaveAttribute('data-view','page');
  await target.focus();await target.press('Space');await expect(main).toHaveAttribute('data-view','read');
  expect(errors).toEqual([]);
});

test("mobile resume defaults to readable text and an unavailable preview falls back to reading", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/resume/');await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');
  await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();await expect(page.locator('.resume-artwork img')).toHaveCount(0);
  expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('resume-art-')))).toBe(false);
  await page.route('**/resume/resume-art-*.png',route=>route.abort());await page.getByRole('button',{name:'Page',exact:true}).click();
  await expect(page.getByRole('button',{name:'Page',exact:true})).toBeDisabled();await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("resume Page stays fully inside desktop, phone and landscape viewports", async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/resume/');await page.getByRole('button',{name:'Page',exact:true}).click();
  await expect(page.locator('.resume-sheet')).toHaveAttribute('data-art-ready','true');
  for(const [width,height] of [[1440,1000],[1280,720],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await expect.poll(async()=>{const r=await page.locator('.resume-sheet').boundingBox();return r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1}).toBe(true);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const controls=await page.locator('.resume-toolbar').boundingBox(),header=await page.locator('.resume-nav').boundingBox(),paper=await page.locator('.resume-sheet').boundingBox();
    expect(controls.y).toBeGreaterThan(height*.7);expect(controls.y+controls.height).toBeLessThanOrEqual(height-11);
    expect(paper.y+paper.height).toBeLessThan(controls.y);expect(header.y).toBe(24);expect(header.x).toBeGreaterThanOrEqual(24);
    expect(await page.getByRole('link',{name:'Download PDF'}).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
  }
});

test("rapid resume view changes honor the final requested mode", async ({ page }) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/resume/');await expect(page.locator('.resume-sheet')).toHaveAttribute('data-art-ready','true');
  await page.locator('.resume-view-switch').evaluate(group=>{group.children[1].click();group.children[0].click()});
  await page.waitForTimeout(650);await expect(page.locator('.resume-page')).toHaveAttribute('data-view','page');
  await page.locator('.resume-view-switch').evaluate(group=>{group.children[1].click();group.children[0].click();group.children[1].click()});
  await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');await expect(page.getByRole('heading',{name:'Joshua Lucas',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('resume keeps its rendered sheet ready and controls fixed through both view transitions',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|shader error/i.test(message.text()))errors.push(message.text())});
  await page.setViewportSize({width:1440,height:1000});await page.goto('/resume/');
  const main=page.locator('.resume-page'),sheet=page.locator('.resume-sheet'),canvas=page.locator('.resume-paper-canvas');
  await expect(sheet).toHaveAttribute('data-surface','webgl',{timeout:30000});await canvas.evaluate(el=>el.dataset.testIdentity='same-surface');
  await expect(page.getByRole('link',{name:'Home',exact:true})).toBeVisible();
  const controls=()=>page.locator('.resume-toolbar').boundingBox(),before=await controls();
  expect(before.y).toBe(910);
  const headerBefore=await page.locator('.resume-nav').boundingBox();expect(headerBefore.y).toBe(24);
  await sheet.evaluate(el=>{window.__hoverSampling=true;window.__hoverPeak=1;const sample=()=>{window.__hoverPeak=Math.max(window.__hoverPeak,Number(el.dataset.hoverScale));if(window.__hoverSampling)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
  const box=await sheet.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height*.45);
  await expect.poll(()=>page.evaluate(()=>window.__hoverPeak)).toBeGreaterThan(1.065);
  await expect.poll(async()=>Math.abs(Number(await sheet.getAttribute('data-hover-scale'))-1.06)).toBeLessThan(.001);
  await page.evaluate(()=>window.__hoverSampling=false);
  const stableWidth=await sheet.evaluate(el=>el.clientWidth);
  await page.mouse.move(8,8);await expect.poll(async()=>Math.abs(Number(await sheet.getAttribute('data-hover-scale'))-1)).toBeLessThan(.002);
  expect(await sheet.evaluate(el=>el.clientWidth)).toBe(stableWidth);
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(main).toHaveAttribute('data-view','read');
  expect(await controls()).toEqual(before);await expect(canvas).toHaveAttribute('data-test-identity','same-surface');await expect(canvas).toBeHidden();await expect(sheet).toHaveAttribute('data-motion','paused');
  expect(await page.locator('.resume-nav').boundingBox()).toEqual(headerBefore);
  await page.evaluate(()=>scrollTo(0,450));expect(await controls()).toEqual(before);
  await page.getByRole('button',{name:'Page',exact:true}).click();await expect(main).toHaveAttribute('data-transitioning','true');
  await expect(page.locator('.resume-morph-layer')).toHaveCount(3);
  await expect(page.locator('.resume-artwork picture')).toHaveCSS('opacity','0');
  await expect(main).toHaveAttribute('data-view','page');await expect(canvas).toHaveAttribute('data-test-identity','same-surface');await expect(canvas).toBeVisible();
  await expect(sheet).toHaveAttribute('data-motion','floating');expect(await controls()).toEqual(before);
  await expect(page.locator('.resume-morph-layer')).toHaveCount(0);await expect(page.locator('.resume-gradient')).toHaveAttribute('data-active','true');
  await expect(page.getByRole('link',{name:'Home',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('resume corner washes arrive after the paper and remain soft in both reading states',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/resume/');const wash=page.locator('.resume-gradient');
 await expect(wash).toHaveAttribute('data-active','false');await expect(page.locator('.resume-sheet')).toHaveAttribute('data-art-ready','true',{timeout:30000});
 await expect(wash).toHaveAttribute('data-active','true',{timeout:30000});await expect(wash).toHaveCSS('opacity','1');
 const pink=await page.locator('.resume-wash-pink').boundingBox(),warm=await page.locator('.resume-wash-warm').boundingBox();
 expect(pink.x+pink.width/2).toBeGreaterThan(1440*.7);expect(pink.y+pink.height/2).toBeLessThan(200);
 expect(warm.x+warm.width/2).toBeLessThan(1440*.3);expect(warm.y+warm.height/2).toBeGreaterThan(800);
 await page.getByRole('button',{name:'Read',exact:true}).click();await expect(page.locator('.resume-page')).toHaveAttribute('data-view','read');await expect(wash).toHaveAttribute('data-active','true');
});

test('resume header scrim appears only in Read and aligned back arrows return to Page',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/resume/');
  const main=page.locator('.resume-page'),header=page.locator('.resume-header-shell');
  await expect(page.getByRole('link',{name:'Home',exact:true})).toHaveAttribute('href','/');
  const homeArrow=await page.locator('.resume-home-link svg').boundingBox();
  expect(await header.evaluate(el=>getComputedStyle(el,'::before').opacity)).toBe('0');
  const scrim=await header.evaluate(el=>{const s=getComputedStyle(el,'::before');return{background:s.backgroundImage,blur:s.backdropFilter,events:s.pointerEvents,height:s.height}});
  expect(scrim.background).toContain('linear-gradient');expect(scrim.blur).toBe('blur(12px)');expect(scrim.events).toBe('none');expect(scrim.height).toBe('112px');
  await expect(page.locator('.resume-sheet')).toHaveAttribute('data-art-ready','true');const controls=await page.locator('.resume-toolbar').boundingBox();
  await page.getByRole('button',{name:'Read',exact:true}).click();await expect(main).toHaveAttribute('data-view','read');
  const back=page.getByRole('button',{name:'Back to page view',exact:true});await expect(back).toBeVisible();expect(await header.evaluate(el=>getComputedStyle(el,'::before').opacity)).toBe('1');expect(await back.locator('svg').boundingBox()).toEqual(homeArrow);await expect(back).toHaveText('');await expect(back.locator('svg')).toHaveCount(1);await expect(page.getByRole('link',{name:'Home',exact:true})).toHaveCount(0);
  await back.click();await expect(main).toHaveAttribute('data-view','page');await expect(page.getByRole('link',{name:'Home',exact:true})).toBeVisible();expect(await page.locator('.resume-toolbar').boundingBox()).toEqual(controls);expect(await header.evaluate(el=>getComputedStyle(el,'::before').opacity)).toBe('0');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Read',exact:true}).click();await page.getByRole('button',{name:'Back to page view',exact:true}).click();await expect(main).toHaveAttribute('data-view','page');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('resume navigation responds before paper morph finishes and Read uses body typography without contact links',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/resume/');await expect(page.locator('.resume-sheet')).toHaveAttribute('data-surface','webgl',{timeout:30000});
  const nav=page.locator('.resume-back-nav'),main=page.locator('.resume-page');
  const entering=await page.getByRole('button',{name:'Read',exact:true}).evaluate(button=>{button.click();return{navigation:document.querySelector('.resume-back-nav').dataset.reading,view:document.querySelector('.resume-page').dataset.view,transitioning:document.querySelector('.resume-page').dataset.transitioning}});
  expect(entering).toEqual({navigation:'true',view:'page',transitioning:'true'});await expect(main).toHaveAttribute('data-view','read');
  await expect(page.locator('.resume-read-sheet .resume-print-contacts')).toHaveCount(0);
  const fonts=await page.evaluate(()=>[getComputedStyle(document.querySelector('.resume-print-heading > p')).fontFamily,getComputedStyle(document.querySelector('.resume-job li')).fontFamily]);expect(fonts[0]).toBe(fonts[1]);
  const returning=await page.getByRole('button',{name:'Page',exact:true}).evaluate(async button=>{button.click();await Promise.resolve();return document.querySelector('.resume-back-nav').dataset.reading});expect(returning).toBe('false');await expect(main).toHaveAttribute('data-view','page');await expect(nav).toHaveAttribute('data-reading','false');
 });
