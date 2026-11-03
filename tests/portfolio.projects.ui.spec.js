import { test, expect, disableWebGL, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });

test("recent projects use one column with native reader links and restore focus on Back", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"});

  await page.goto("/");
  const navigation=page.getByRole("navigation",{name:"Recent projects"}),links=navigation.locator('.recent-project-list > li:not(.recent-camera-row) > a');
  const titles=['AI Mode Nudges','Search Labs','Stadia Store Redesign','Zine of Extracurriculars'];
  const descriptions=['Helping users go from initial search to task completion','Launching AI experiments on Search to 48M+ users','Guiding users towards an informed game purchase','Flyers for music, coffee, and community'];
  await expect(links).toHaveCount(4);
  await expect(links.locator('.recent-project-name')).toHaveText(titles);
  await expect(navigation.getByRole('link')).toHaveCount(5);
  await expect(navigation.getByRole('link',{name:'Say cheese! Explore film photographs'})).toHaveAttribute('href','/photos/');
  await expect(navigation.locator('.recent-project-summary')).toHaveText(descriptions);
  await expect(navigation.locator('.recent-project-year')).toHaveCount(0);
  await expect(links.first()).toHaveAttribute('href','/?project=ai-mode-nudges&view=case-study');
  for(const selector of ['.recent-project-name','.recent-project-summary']) {
    expect(await links.locator(selector).first().evaluate(el=>getComputedStyle(el).fontWeight)).toBe('400');
  }
  const rows=await links.evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y};}));
  expect(rows.every((row,i)=>row.x===rows[0].x && (!i || row.y>rows[i-1].y))).toBe(true);
  const heights=await navigation.locator('.recent-project-list > li').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(1);
  await expect(navigation.locator('.recent-project-index')).toHaveText(['01','02','03','04','05']);
  await expect(links.locator('.recent-project-team')).toHaveText(['Search','Search','Stadia','Fun']);
  await expect(navigation.locator('.recent-camera-row .recent-project-team')).toHaveText('Fun');
  for(let i=0;i<titles.length-1;i++) {
    await links.nth(i).click(); await expect(page.getByRole('heading',{name:titles[i],exact:true})).toBeFocused();
    await expect(page.locator('.case-study-deck')).not.toBeEmpty();
    await expect(page.locator('.case-study-facts')).toHaveCount(1);
    await expect(page.locator('.case-study-cartridge')).toHaveAttribute('data-cartridge',titles[i]==='Stadia Store Redesign'?'stadia':'search');
    await expect(page.locator('.case-study-cartridge')).toHaveAttribute('data-status','fallback');
    await expect(page.locator('.case-cartridge-fallback img')).toHaveAttribute('src',titles[i]==='Stadia Store Redesign'?'/cartridges/labels/stadia-label.jpg':'/cartridges/labels/search-label.jpg');
    await expect(page.locator('.case-star-story > section > h2')).toHaveText(['Situation','Task','Action','Result']);
    await expect(page.locator('[data-story-stage="task"] > p')).not.toBeEmpty();
    const story=page.locator('.case-star-story');
    await expect(story.locator('.case-decisions > li')).toHaveCount(3);
    await expect(story.locator('.case-story-media')).toHaveCount(titles[i]==='Search Labs'?1:3);
    expect(await story.locator('.case-story-media').evaluateAll(elements=>elements.every(el=>!!el.closest('.case-decisions li')))).toBe(true);
    const sizes=await page.locator('.case-study-editorial').evaluate(root=>{
      const body=[...root.querySelectorAll('.case-study-deck,.case-study-facts dt,.case-study-facts dd,.case-editorial-section > p,.case-decisions h3,.case-decisions p,figcaption,.eyebrow,.case-impact,.case-outcome-grid dt')];
      return [...new Set(body.map(el=>getComputedStyle(el).fontSize))];
    });expect(sizes).toEqual(['16px']);
    await page.goBack(); await expect(page.locator('.case-study')).toHaveCount(0); await expect(links.nth(i)).toBeFocused();
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  const before=await navigation.evaluate(el=>({height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top+scrollY}));await links.first().hover();
  await expect(navigation).toHaveAttribute('data-active-project','ai-mode-nudges');
  await expect(navigation.locator('.recent-project-preview')).toHaveCSS('opacity','1');
  await expect(links.first().locator('.recent-project-arrow')).toHaveCSS('opacity','1');
  await expect(links.nth(1)).toHaveCSS('opacity','0.4');
  const copyBox=()=>links.first().locator('.recent-project-copy').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height}});
  const titleBefore=await copyBox();
  await links.nth(1).hover();await links.nth(2).hover();await links.last().hover();
  await expect(navigation).toHaveAttribute('data-active-project','rave-flyer-zine');
  await expect(navigation.locator('.recent-preview-content')).toHaveCount(1);
  await expect(navigation.locator('.zine-preview-scene')).toHaveAttribute('data-interactive','false');
  await expect(navigation.locator('.recent-motion-visual')).toHaveCount(0);
  await page.mouse.move(5,5);
  await expect(navigation).toHaveAttribute('data-preview-active','false');
  await expect(links.first()).toHaveCSS('opacity','1');
  const titleAfter=await copyBox();expect(titleAfter).toEqual(titleBefore);
  await links.first().focus();await page.keyboard.press('Tab');
  await expect(navigation).toHaveAttribute('data-active-project','search-labs');
  await expect(links.nth(1)).toBeFocused();
  await page.keyboard.press('Tab');await expect(navigation).toHaveAttribute('data-active-project','stadia-store-redesign');
  await page.locator('.collection-header .tool-button').focus();
  await expect(navigation).toHaveAttribute('data-preview-active','false');
  const after=await navigation.evaluate(el=>({height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top+scrollY}));expect(after).toEqual(before);
  await page.emulateMedia({reducedMotion:'reduce'});
  await links.first().hover();await expect(navigation.locator('.recent-preview-content')).toHaveCSS('animation-name','none');
  await page.setViewportSize({width:390,height:844}); await navigation.scrollIntoViewIfNeeded();
  await expect.poll(async()=>{const heights=await navigation.locator('.recent-project-list > li').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));return Math.max(...heights)-Math.min(...heights)}).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const link of await links.all()) { const r=await link.boundingBox();expect(r.x).toBeGreaterThanOrEqual(24);expect(r.x+r.width).toBeLessThanOrEqual(366); }
  await page.goto(await links.last().getAttribute('href'));
  await expect(page.locator('.flyer-gallery img')).toHaveCount(5,{timeout:15000});
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await expect(page.locator('.collection')).toBeVisible();
});

test('project exits fade, blur and move the whole page left before navigating',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));

  await page.goto('/');const main=page.locator('main.collection');await expect(main).toHaveAttribute('data-status','fallback');
  // Pause only the outgoing animation, so the handoff can be inspected reliably.
  await page.evaluate(()=>{const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const a=animate.call(this,frames,options);if(this.matches('main.collection')){a.pause();a.currentTime=150}return a}});
  const links=page.getByRole('navigation',{name:'Recent projects'}).locator('.recent-project-list > li:not(.recent-camera-row) > a');
  await links.first().scrollIntoViewIfNeeded();
  await expect(page.locator('.recent-project-list li').first()).toHaveAttribute('data-reveal-state','visible');
  await page.locator('.recent-project-list li').first().evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished))});
  await links.first().click();await expect(main).toHaveAttribute('data-exiting','true');
  const exit=await main.evaluate(el=>{const s=getComputedStyle(el);return{opacity:Number(s.opacity),blur:parseFloat(s.filter.match(/[\d.]+/)[0]),x:new DOMMatrixReadOnly(s.transform).m41,inert:el.inert}});
  expect(exit.opacity).toBeGreaterThan(0);expect(exit.opacity).toBeLessThan(1);expect(exit.blur).toBeGreaterThan(0);expect(exit.x).toBeLessThan(0);expect(exit.inert).toBe(true);
  await expect(page.locator('.case-study')).toHaveCount(0);expect(new URL(page.url()).searchParams.get('view')).toBeNull();
  expect(await main.locator('.collection-header,.collection-hero,.recent-projects,.collection-footer').count()).toBe(4);
  await page.screenshot({path:testInfo.outputPath('project-exit-mid.png')});
  await main.evaluate(el=>el.getAnimations()[0].finish());await expect(page.getByRole('heading',{name:'AI Mode Nudges',exact:true})).toBeFocused();
  await expect(main).toHaveAttribute('data-exiting','false');await expect(main).toHaveCSS('transform','none');
  await page.goBack();await expect(links.first()).toBeFocused();await expect(page.locator('.case-study')).toHaveCount(0);
  // A cancelled exit restores the page without adding a history entry.
  await page.getByRole('button',{name:'Open Stadia cartridge',exact:true}).click();await expect(main).toHaveAttribute('data-exiting','true');
  await page.keyboard.press('Escape');await expect(main).toHaveAttribute('data-exiting','false');await expect(main).toHaveCSS('opacity','1');await expect(main).toHaveCSS('filter','none');await expect(page.locator('.case-study')).toHaveCount(0);
  // The same exit also precedes the real zine page navigation.
  await links.last().click();await expect(main).toHaveAttribute('data-exiting','true');expect(new URL(page.url()).pathname).toBe('/');
  await main.evaluate(el=>el.getAnimations()[0].finish());await expect(page).toHaveURL(/\/after-hours\/$/);
  await page.goBack();await expect(main).toHaveAttribute('data-exiting','false');await expect(main).toHaveCSS('opacity','1');
  expect(errors).toEqual([]);
});

test('AI Mode case study shows the supplied story and outcomes at the home project width',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));

  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  const navigation=page.getByRole('navigation',{name:'Recent projects'}),homeWidth=(await navigation.boundingBox()).width;
  await navigation.getByRole('link',{name:/AI Mode Nudges/}).click();
  const study=page.getByRole('region',{name:'AI Mode Nudges case study'});
  await expect(study).toBeVisible();await expect(study.getByRole('heading',{name:'AI Mode Nudges',exact:true})).toBeFocused();
  expect((await study.locator('.case-study-measure').boundingBox()).width).toBeCloseTo(homeWidth,0);
  await expect(study.locator('.case-outcome-grid dd')).toHaveText(['+1.84%','+3.87%','10+']);
  await expect(study.locator('.case-study-facts')).toContainText('Lead Product Designer');await expect(study.locator('.case-study-facts')).toContainText('Follow-ups & interactive questionnaires');
  await expect(study.locator('.case-impact')).toContainText('Inline nudges launched globally');await expect(study.locator('.case-impact')).toContainText('web-result clicks healthy');
  await expect(study.locator('.case-decisions li')).toHaveCount(3);await expect(study.locator('.case-decisions')).toContainText('“Something else”');await expect(study.locator('.case-decisions')).toContainText('live browser prototypes');
  await expect(study.locator('.case-study-preview,.case-study-note')).toHaveCount(0);await expect(study.locator('.case-story-media')).toHaveCount(3);
  expect(await study.locator('.case-story-media').evaluateAll(elements=>elements.map(el=>el.dataset.mediaType))).toEqual(['image','image','video']);
  await expect(study.locator('.case-story-media').nth(2)).toHaveAttribute('data-media-type','video');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>study.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect.poll(async()=>{
    const bounds=await study.locator('.case-outcome-grid dd').evaluateAll(elements=>elements.map(el=>({width:el.clientWidth,scroll:el.scrollWidth})));
    return bounds.every(r=>r.scroll<=r.width+1);
  }).toBe(true);
  await study.getByRole('button',{name:'Back to collection',exact:true}).first().click();await expect(study).toHaveCount(0);
  await expect(navigation.getByRole('link',{name:/AI Mode Nudges/})).toBeFocused();expect(errors).toEqual([]);
});

test('project previews follow movement inside a row, dim other content and wash the background by project',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});

  await page.goto('/');
  await expect(page.locator('.collection')).toHaveAttribute('data-status','fallback');
  const google=page.getByRole('link',{name:'Google (opens in a new tab)'});
  await expect(google).toHaveAttribute('href','https://google.ai');await expect(google).toHaveAttribute('rel','noopener noreferrer');
  const googleBefore=await google.boundingBox();await google.hover();
  expect(new Set(await google.locator('span').evaluateAll(els=>els.map(el=>getComputedStyle(el).color))).size).toBe(4);
  const googleAfter=await google.boundingBox();expect(googleAfter.width).toBe(googleBefore.width);expect(googleAfter.height).toBe(googleBefore.height);
  const navigation=page.getByRole('navigation',{name:'Recent projects'}),links=navigation.locator('.recent-project-link');
  await navigation.scrollIntoViewIfNeeded();await page.emulateMedia({reducedMotion:'no-preference'});
  const row=await links.first().boundingBox();
  await page.mouse.move(row.x+row.width*.4,row.y+8);
  const preview=navigation.locator('.recent-project-preview');await expect(preview).toHaveCSS('opacity','1');
  const position=()=>preview.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
  const firstTarget=await navigation.evaluate(el=>parseFloat(el.style.getPropertyValue('--preview-offset')));
  await expect.poll(async()=>Math.abs(await position()-firstTarget)).toBeLessThan(.3);
  const top=await position();
  await page.mouse.move(row.x+row.width*.4,row.y+row.height-8);
  await expect.poll(async()=>await position()-top).toBeGreaterThan(10);
  await expect(navigation).toHaveAttribute('data-active-project','ai-mode-nudges');
  await expect(navigation.locator('.recent-preview-content')).toHaveCount(1);
  await expect(links.first()).toHaveCSS('opacity','1');
  for(let i=1;i<await links.count();i++)await expect(links.nth(i)).toHaveCSS('opacity','0.4');
  const ids=['ai-mode-nudges','search-labs','stadia-store-redesign','rave-flyer-zine','film'];
  const hues=['#6988d8','#b759ba','#e5633d','#e48dae','#b69272'];
  const wash=page.locator('.project-hue-wash');await expect(wash).toHaveCSS('pointer-events','none');
  for(let i=0;i<ids.length;i++){
    await links.nth(i).hover();await expect(navigation).toHaveAttribute('data-active-project',ids[i]);
    expect(await navigation.evaluate(el=>el.style.getPropertyValue('--preview-accent'))).toBe(hues[i]);
    await expect(wash.locator('span[data-active="true"]')).toHaveCount(1);await expect(wash.locator('span').nth(i)).toHaveCSS('opacity','1');
  }
  await page.mouse.move(5,5);await expect(wash).toHaveAttribute('data-active','false');
  for(const link of await links.all())await expect(link).toHaveCSS('opacity','1');
  await page.emulateMedia({reducedMotion:'reduce'});await links.first().focus();
  expect(await preview.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(.001);expect(await wash.locator('span').first().evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(.001);
  await page.keyboard.press('Enter');await expect(page.locator('.case-study')).toBeVisible();await expect(wash).toHaveAttribute('data-active','false');
});

test('compact project rows keep equal typography and solid previews switch off when hidden',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});

  await page.goto('/');await expect(page.locator('.collection')).toHaveAttribute('data-status','fallback');
  const nav=page.getByRole('navigation',{name:'Recent projects'}),links=nav.locator('.recent-project-link');
  for(const height of await nav.locator('li').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height)))expect(height).toBeCloseTo(38*1.1,1);
  const sizes=await nav.locator('.recent-project-index,.recent-project-name,.recent-project-team').evaluateAll(els=>[...new Set(els.map(el=>getComputedStyle(el).fontSize))]);expect(sizes).toEqual(['15px']);
  await page.evaluate(()=>document.fonts.ready);
  expect(await nav.locator('.recent-project-index').evaluateAll(els=>els.every(el=>getComputedStyle(el).fontFamily.includes('Roboto Mono')&&getComputedStyle(el).fontWeight==='300'))).toBe(true);
  expect(await nav.locator('.recent-project-team').evaluateAll(els=>els.every(el=>getComputedStyle(el).fontFamily.includes('DM Sans')&&getComputedStyle(el).fontWeight==='400'))).toBe(true);
  expect(await page.evaluate(()=>document.fonts.check('300 15px "Roboto Mono"'))).toBe(true);
  await expect(links.first()).toHaveCSS('grid-template-columns',/32px .+/);
  expect(await page.locator('.collection-footer .link-copy').evaluateAll(els=>els.every(el=>getComputedStyle(el).fontSize==='15px'))).toBe(true);
  expect(await page.locator('.listening-current .now-playing-copy > span').evaluateAll(els=>els.every(el=>getComputedStyle(el).fontSize==='9.375px'))).toBe(true);
  await expect(page.locator('.bio-continuation')).toHaveCSS('font-weight','300');await expect(page.locator('.portfolio-name')).toHaveCSS('font-weight','500');
  for(const link of await links.all()){
    await link.hover();await expect(link.locator('.recent-project-name')).toHaveCSS('font-weight','400');
    if(await nav.locator('.motion-mesh').count())await expect(nav.locator('.motion-mesh')).toHaveCSS('animation-name','none');
    await expect(nav.locator('.motion-grid,.motion-signal,.motion-orb')).toHaveCount(0);
    if(await link.locator('.recent-project-team').textContent()==='Fun')await expect(nav.locator('.recent-preview-content p')).toHaveCount(0);
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await links.first().hover();
  const fill=nav.locator('.recent-solid-visual');await expect(fill).toHaveCSS('background-image','none');await expect(fill).toHaveCSS('animation-name','none');
  await page.mouse.move(2,2);await expect(nav.locator('.recent-project-preview')).toHaveAttribute('data-visible','false');
  await page.setViewportSize({width:390,height:844});await nav.scrollIntoViewIfNeeded();
  await expect.poll(()=>nav.locator('li').evaluateAll(els=>Math.max(...els.map(el=>Math.abs(el.getBoundingClientRect().height-47*1.1))))).toBeLessThan(.05);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('project heading matches the row numbers and its divider fades with the first row',async({page})=>{
 const initial=new Date('2026-11-02T00:00:00Z');await page.clock.install({time:initial});await page.clock.pauseAt(new Date(initial.getTime()+1));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),heading=nav.locator('h2'),number=nav.locator('.recent-project-index').first();
 for(const property of ['font-size','font-weight'])await expect(heading).toHaveCSS(property,await number.evaluate((el,p)=>getComputedStyle(el).getPropertyValue(p),property));
 await expect(nav.locator('ul')).toHaveCSS('border-top-width','0px');const first=nav.locator('li').first();
 await expect(heading).toHaveCSS('color',await number.evaluate(el=>getComputedStyle(el).color));
 await expect(number).toHaveCSS('color',await nav.locator('.recent-project-summary:not(.sr-only)').first().evaluate(el=>getComputedStyle(el).color));
 expect(await first.evaluate(el=>getComputedStyle(el,'::before').backgroundColor)).not.toBe(await number.evaluate(el=>getComputedStyle(el).color));
 expect(await first.evaluate(el=>getComputedStyle(el,'::before').height)).toBe('1px');await expect(first).toHaveCSS('opacity','0');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(first).toHaveCSS('opacity','1');
});

test('project rows span the content width and floating previews leave the full row clickable',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});

  await page.goto('/');await expect(page.locator('.collection')).toHaveAttribute('data-status','fallback');
  const nav=page.getByRole('navigation',{name:'Recent projects'}),links=nav.locator('.recent-project-link'),preview=nav.locator('.recent-project-preview');
  const content=await nav.boundingBox();
  for(const link of await links.all()){const r=await link.boundingBox();expect(r.x).toBeCloseTo(content.x,1);expect(r.width).toBeCloseTo(content.width,1)}
  for(const i of [0,4,5]){
    await links.nth(i).hover();await expect(preview).toHaveAttribute('data-visible','true');await expect(preview).toHaveCSS('position','absolute');await expect(preview).toHaveCSS('pointer-events','none');
    const row=await links.nth(i).boundingBox(),art=await nav.locator('.recent-preview-art').boundingBox();
    expect(art.x).toBeGreaterThan(row.x);expect(art.x+art.width).toBeCloseTo(row.x+row.width,1);expect(art.y).toBeLessThan(row.y+row.height);expect(art.y+art.height).toBeGreaterThan(row.y);
    const surface=await page.locator('.project-hue-wash > span[data-active="true"]').evaluate(el=>getComputedStyle(el).backgroundColor);await expect(nav.locator('.recent-preview-art')).toHaveCSS('background-color',surface);await expect(nav.locator('.recent-preview-content')).toHaveCSS('background-color',surface);
  }
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await links.last().hover();await expect(nav.locator('.recent-preview-art')).toHaveCSS('background-color',await page.locator('.project-hue-wash > span[data-active="true"]').evaluate(el=>getComputedStyle(el).backgroundColor));
  const target=await links.nth(2).boundingBox(),art=await nav.locator('.recent-preview-art').boundingBox();
  const point={x:art.x+art.width/2,y:target.y+target.height/2};
  const href=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('a')?.getAttribute('href'),point);expect(href).toBe('/?project=search-labs&view=case-study');
  await page.mouse.click(point.x,point.y);await expect(page.getByRole('heading',{name:'Search Labs',exact:true})).toBeFocused();
  await page.goBack();await page.setViewportSize({width:390,height:844});await expect(preview).toHaveAttribute('data-follow-cursor','true');
  await expect.poll(()=>nav.evaluate(el=>{const width=el.getBoundingClientRect().width;return Math.max(...[...el.querySelectorAll('.recent-project-link')].map(link=>Math.abs(link.getBoundingClientRect().width-width)))})).toBeLessThan(.1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('internal page links share the project exit while camera links keep their own transition',async({page})=>{
  test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});

  await page.goto('/');await page.getByRole('link',{name:'Résumé',exact:true}).click();await expect(page.locator('.collection')).toHaveAttribute('data-exiting','true');await expect(page).toHaveURL(/\/resume\/$/);
  await page.getByRole('link',{name:'Home',exact:true}).click();await expect(page.locator('.resume-page')).toHaveAttribute('data-exiting','true');await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link',{name:/Zine of Extracurriculars/}).click();await expect(page.locator('.collection')).toHaveAttribute('data-exiting','true');await expect(page).toHaveURL(/\/after-hours\/$/);
  await page.getByRole('link',{name:'Home',exact:true}).click();await expect(page.locator('.after-hours')).toHaveAttribute('data-exiting','true');await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link',{name:/AI Mode Nudges/}).click();await expect(page.locator('.case-study')).toBeVisible();await page.getByRole('button',{name:'Back to collection',exact:true}).first().click();await expect(page.locator('.case-study')).toHaveAttribute('data-exiting','true');await expect(page.locator('.case-study')).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Explore film photographs/})).toHaveAttribute('href','/photos/');
 });

test('touch projects expand inline, show full descriptions and navigate only through Open project',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
 await page.route('**/api/listening',r=>r.fulfill({status:204}));await page.route('**/api/weather',r=>r.fulfill({status:204}));await disableWebGL(page);
 await page.goto('http://127.0.0.1:3000/');const nav=page.getByRole('navigation',{name:'Recent projects'});await expect(nav).toHaveAttribute('data-preview-mode','inline');
 const ai=nav.getByRole('button',{name:/AI Mode Nudges/});await ai.tap();const preview=page.getByRole('region',{name:'AI Mode Nudges preview'});await expect(preview).toBeVisible();await expect(preview).toContainText('Helping users go from initial search to task completion');await expect(ai).toHaveAttribute('aria-expanded','true');
 const row=await ai.boundingBox(),box=await preview.boundingBox();expect(box.y).toBeGreaterThanOrEqual(row.y+row.height-1);await expect(page).toHaveURL(/\/$/);await expect(page.locator('.role-rotator')).toHaveAttribute('data-paused','true');
 await ai.tap();await expect(preview).toHaveCount(0);const labs=nav.getByRole('button',{name:/Search Labs/});await labs.tap();const labsPreview=page.getByRole('region',{name:'Search Labs preview'});await expect(labsPreview).toContainText('Launching AI experiments on Search to 48M+ users');await expect(page.locator('.recent-inline-preview')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await labsPreview.getByRole('link',{name:'Open project'}).tap();await expect(page.getByRole('heading',{name:'Search Labs',exact:true})).toBeVisible();await context.close();
});

test('narrow desktop previews hug the content right edge and follow the pointer vertically',async({page})=>{
 await page.setViewportSize({width:900,height:800});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),row=nav.locator('.recent-project-link').first(),preview=nav.locator('.recent-project-preview');await row.scrollIntoViewIfNeeded();const r=await row.boundingBox();await page.mouse.move(r.x+100,r.y+r.height/2);await expect(preview).toBeVisible();await expect(preview).toHaveAttribute('data-follow-cursor','true');await expect(preview).toHaveCSS('position','fixed');const before=await preview.boundingBox();await page.mouse.move(r.x+180,r.y+r.height/2+10);await expect.poll(()=>preview.boundingBox().then(b=>Math.abs(b.y-before.y))).toBeGreaterThan(5);const after=await preview.boundingBox();expect(after.x).toBeCloseTo(before.x,1);const content=await nav.boundingBox();expect(after.x+after.width).toBeCloseTo(content.x+content.width,1);expect(after.x).toBeGreaterThanOrEqual(0);expect(after.x+after.width).toBeLessThanOrEqual(900);expect(after.y).toBeGreaterThanOrEqual(0);expect(after.y+after.height).toBeLessThanOrEqual(800);await page.setViewportSize({width:850,height:800});await expect.poll(async()=>{const art=await nav.locator('.recent-preview-art').boundingBox(),bounds=await nav.boundingBox();return Math.abs(art.x+art.width-bounds.x-bounds.width)}).toBeLessThan(1);await page.mouse.move(2,2);await expect(preview).toHaveAttribute('data-visible','false');
});

test('project hover surfaces fade as one solid color with identical thumbnail fills in both themes',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),links=nav.locator('.recent-project-link'),wash=page.locator('.project-hue-wash');
 for(const dark of [false,true]){
  if(dark)await page.getByRole('button',{name:'Switch to dark mode'}).click();
  const colors=[];
  await links.first().hover();const samples=await nav.evaluate(async el=>{const values=[];for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);const layer=document.querySelector('.project-hue-wash'),art=el.querySelector('.recent-preview-art');values.push([getComputedStyle(layer).backgroundColor,getComputedStyle(art).backgroundColor])}return values});
  expect(samples.every(([page,thumbnail])=>page===thumbnail)).toBe(true);await expect(page.locator('.collection')).toHaveCSS('transition-property','--project-surface');await expect(page.locator('.collection')).toHaveCSS('transition-duration','0.75s');
  for(const link of await links.all()){

   await link.hover();await nav.evaluate(async el=>{const root=el.closest('.collection');getComputedStyle(root).getPropertyValue('--project-surface');await Promise.allSettled(root.getAnimations().map(animation=>animation.finished))});const state=await nav.evaluate(el=>{const layer=document.querySelector('.project-hue-wash > span[data-active="true"]'),background=getComputedStyle(layer);return{color:background.backgroundColor,image:background.backgroundImage,transition:background.transitionDuration,opacity:background.opacity,fill:getComputedStyle(el.querySelector('.recent-preview-art')).backgroundColor,card:getComputedStyle(el.querySelector('.recent-preview-content')).backgroundColor,glow:getComputedStyle(el.querySelector('.recent-project-preview'),'::before').content,shadow:getComputedStyle(el.querySelector('.recent-preview-content')).boxShadow}});
   expect(state.image).toBe('none');expect(state.transition).toBe('0s');expect(state.opacity).toBe('1');expect(state.fill).toBe(state.color);expect(state.card).toBe(state.color);expect(state.shadow).toBe('none');expect(state.glow).toBe('none');colors.push(state.color);
   const placeholder=nav.locator('.recent-solid-visual');if(await placeholder.count())await expect(placeholder).toHaveCSS('background-color',state.color);
  }
  expect(new Set(colors).size).toBeGreaterThan(3);await expect(nav.locator('.motion-mesh,.recent-preview-dither')).toHaveCount(0);await page.mouse.move(2,2);await expect(wash).toHaveAttribute('data-active','false');await expect(wash.locator('span[data-active="true"]')).toHaveCount(0);
 }
});

test('browsing projects lets an entering role finish before its rotation pauses',async({page})=>{
 await page.goto('/');await expect(page.locator('.role-rotator')).toHaveAttribute('data-ready','true');
 await page.locator('.role-label').evaluate(el=>el.getAnimations().forEach(animation=>animation.currentTime=1));await page.locator('.recent-project-link').first().hover();await expect(page.locator('.role-rotator')).toHaveAttribute('data-paused','true');await expect(page.locator('.role-label')).toHaveCSS('opacity','1');await expect(page.locator('.role-label')).toHaveCSS('animation-play-state','running');
});

test('hover previews are fifty percent larger, stay inside narrow viewports and Search Labs keeps its magenta hue',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),labs=nav.getByRole('link',{name:/Search Labs/}),preview=nav.locator('.recent-project-preview');await labs.hover();const wide=await nav.locator('.recent-preview-art').boundingBox();expect(wide.width).toBeCloseTo(326*1.5,0);expect(wide.height).toBeCloseTo(326/1.8*1.5,0);expect(await nav.evaluate(el=>el.style.getPropertyValue('--preview-accent'))).toBe('#b759ba');
 await page.setViewportSize({width:900,height:650});await labs.hover();await expect(preview).toHaveAttribute('data-follow-cursor','true');const narrow=await nav.locator('.recent-preview-art').boundingBox();expect(narrow.width).toBeCloseTo(450,0);expect(narrow.x).toBeGreaterThanOrEqual(0);expect(narrow.x+narrow.width).toBeLessThanOrEqual(900);expect(narrow.y+narrow.height).toBeLessThanOrEqual(650);
 await page.setViewportSize({width:1440,height:600});await labs.hover();await expect(preview).toHaveAttribute('data-follow-cursor','true');const short=await nav.locator('.recent-preview-art').boundingBox();expect(short.width).toBeCloseTo(489,0);expect(short.y+short.height).toBeLessThanOrEqual(600);
 await page.getByRole('button',{name:'Switch to dark mode'}).click();await page.mouse.move(2,2);await expect(page.locator('html')).toHaveCSS('background-color','rgb(16, 17, 16)');
});

test('each hover preview resolves through ASCII, replays on return and stays static for reduced motion',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});await page.addInitScript(()=>{

  window.asciiReveals=[];new MutationObserver(records=>{for(const {target}of records){if(!target.matches?.('.recent-preview-ascii')||target.dataset.state!=='revealing')continue;const pixels=target.getContext('2d').getImageData(0,0,target.width,target.height).data;window.asciiReveals.push({kind:target.closest('.recent-preview-content').dataset.kind,painted:pixels.some((v,i)=>i%4===3&&v>0)})}}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-state']});
 });await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),links=nav.locator('.recent-project-link');await expect(nav.locator('[data-project="film"]')).toHaveAttribute('data-reveal-ready','true');
 for(const link of await links.all()){
  await link.hover();const ascii=nav.locator('.recent-project-preview .recent-preview-ascii'),kind=await nav.locator('.recent-preview-content').getAttribute('data-kind');await expect(ascii).toHaveAttribute('data-state','complete',{timeout:15000});await expect(ascii).toBeHidden();expect(await page.evaluate(kind=>window.asciiReveals.some(entry=>entry.kind===kind&&entry.painted),kind)).toBe(true);
 }
 const before=await page.evaluate(()=>window.asciiReveals.filter(entry=>entry.kind==='ai').length);await page.mouse.move(2,2);await links.first().hover();await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-state','complete');expect(await page.evaluate(()=>window.asciiReveals.filter(entry=>entry.kind==='ai').length)).toBeGreaterThan(before);
 await page.emulateMedia({reducedMotion:'reduce'});await links.nth(1).hover();await expect(nav.locator('.recent-preview-ascii')).toBeHidden();await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-state','complete');
});

test('ASCII previews use source pixels and crossfade uniformly over 1.2 seconds',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});await page.addInitScript(()=>{

  window.dissolve={};new MutationObserver(()=>{
   const visual=document.querySelector('.recent-solid-visual[data-visual="search"]');
   if(visual&&!visual.firstChild){const source=document.createElement('canvas');source.width=360;source.height=200;source.style.cssText='width:100%;height:100%';const ctx=source.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(30,40,100,120);ctx.fillStyle='#eee';ctx.beginPath();ctx.arc(280,100,40,0,Math.PI*2);ctx.fill();visual.append(source)}
   const ascii=document.querySelector('.recent-preview-ascii[data-source="content"]');if(!ascii)return;
   const state=window.dissolve,opacity=Number(ascii.style.opacity),content=Number(ascii.parentElement.style.getPropertyValue('--preview-content-opacity'));
   if(ascii.dataset.state==='revealing'){
    state.start??=performance.now();
    if(opacity>.5&&content===0&&!state.fadeIn){state.fadeIn=ascii.toDataURL();state.visiblePixels=ascii.getContext('2d').getImageData(0,0,ascii.width,ascii.height).data.some((v,i)=>i%4===3&&v>0)}
    if(content>.5&&opacity<.5&&!state.fadeOut)state.fadeOut=ascii.toDataURL();
   }else if(ascii.dataset.state==='complete')state.duration??=performance.now()-state.start;
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-state','style','data-source']});
 });await page.goto('/');const nav=page.getByRole('navigation',{name:'Recent projects'});await expect(nav.locator('[data-project="search-labs"]')).toHaveAttribute('data-reveal-ready','true');await nav.getByRole('link',{name:/Search Labs/}).hover();const ascii=nav.locator('.recent-preview-ascii');await expect(ascii).toHaveAttribute('data-state','complete');await expect(ascii).toHaveAttribute('data-source','content');
 const result=await page.evaluate(()=>window.dissolve);expect(result.visiblePixels).toBe(true);expect(result.fadeIn).toBeTruthy();expect(result.fadeOut).toBe(result.fadeIn);expect(result.duration).toBeGreaterThanOrEqual(1180);expect(result.duration).toBeLessThan(2500);
 const shape=await ascii.evaluate(el=>{const {data,width,height}=el.getContext('2d').getImageData(0,0,el.width,el.height);let left=0,right=0,gap=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(!data[(y*width+x)*4+3])continue;if(x<width*.4)left++;else if(x>width*.65)right++;else if(x>width*.42&&x<width*.62)gap++}return{left,right,gap}});expect(shape.left).toBeGreaterThan(100);expect(shape.right).toBeGreaterThan(100);expect(shape.gap).toBe(0);await expect(nav.locator('.recent-preview-source')).toHaveCSS('opacity','1');
});

test('Stadia plays its animated GIF after the ASCII dissolve and uses a still for reduced motion',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'});await nav.getByRole('link',{name:/Stadia Store Redesign/}).hover();
 const image=nav.locator('.recent-preview-image');await expect(image).toBeVisible();await expect(image).toHaveJSProperty('complete',true);await expect(image).toHaveJSProperty('naturalWidth',640);
 await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-state','complete',{timeout:15000});await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-source','content');
 expect(await image.evaluate(el=>el.currentSrc)).toMatch(/stadia-store-redesign\.gif$/);const box=await image.boundingBox();expect(box.width/box.height).toBeCloseTo(640/429,2);
 const first=await image.screenshot();await expect.poll(async()=>!(await image.screenshot()).equals(first),{timeout:17000,intervals:[250,500,1000]}).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>image.evaluate(el=>el.currentSrc)).toMatch(/stadia-store-redesign-still\.webp$/);await expect(image).toHaveJSProperty('complete',true);
});

test('Nudges hover video loads on demand, resolves through ASCII and resets when leaving',async({page})=>{
 const requests=[];page.on('request',request=>{if(request.url().includes('/videos/nudges/')&&request.url().endsWith('.mp4'))requests.push(request.url())});
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),row=nav.getByRole('link',{name:/AI Mode Nudges/});await expect(row).toBeVisible();expect(requests).toEqual([]);
 await row.hover();const video=nav.locator('.loop-video video'),art=nav.locator('.recent-preview-art');
 await expect.poll(()=>video.evaluate(el=>el.readyState)).toBeGreaterThanOrEqual(2);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-state','complete');await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-source','content');
 const frame=await art.boundingBox();expect(frame.width/frame.height).toBeCloseTo(1.6,2);expect(frame.height).toBeCloseTo(489/1.8,0);
 expect(await video.evaluate(el=>({muted:el.muted,loop:el.loop,inline:el.playsInline,controls:el.controls}))).toEqual({muted:true,loop:true,inline:true,controls:false});
 await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeGreaterThan(0);
 await page.mouse.move(2,2);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(true);await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeLessThan(.1); // The MP4's first presentation timestamp is 0.041s.
 await row.hover();await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(video).not.toHaveAttribute('src');await expect(video).toHaveAttribute('data-ready','false');await expect(nav.locator('.loop-video-poster')).toBeVisible();
 expect(requests.every(url=>url.endsWith('/nudges-hover-1280.mp4'))).toBe(true);
});

test('Nudges hero uses responsive video sources, pauses offscreen and shows its poster for reduced motion',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?project=ai-mode-nudges&view=case-study');
 const hero=page.locator('.case-study-hero-media'),video=hero.locator('video');await hero.scrollIntoViewIfNeeded();
 await expect.poll(()=>video.evaluate(el=>el.currentSrc)).toMatch(/nudges-hero-1920\.mp4$/);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 const frame=await hero.boundingBox(),measure=await page.locator('.case-study-measure').boundingBox();expect(frame.width).toBeCloseTo(measure.width,1);expect(frame.width/frame.height).toBeCloseTo(1.6,2);
 await page.locator('.case-impact').scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(true);
 await page.setViewportSize({width:390,height:844});await hero.scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(el=>el.currentSrc)).toMatch(/nudges-hero-1280\.mp4$/);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(video).not.toHaveAttribute('src');await expect(hero.locator('.loop-video-poster')).toBeVisible();await expect(video).toHaveAttribute('data-ready','false');
 const requests=[];page.on('request',request=>{if(request.url().includes('/videos/nudges/')&&request.url().endsWith('.mp4'))requests.push(request.url())});
 await page.reload();await expect(page.locator('.case-study-hero-media .loop-video-poster')).toBeVisible();await expect(page.locator('.case-study-hero-media video')).not.toHaveAttribute('src');expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('Stadia preview hugs its media without changing the preview height or right alignment',async({page,browser})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),art=nav.locator('.recent-preview-content');
 for(const viewport of [{width:1440,height:1000},{width:900,height:800},{width:1440,height:600}]){
  await page.setViewportSize(viewport);await nav.getByRole('link',{name:/Stadia Store Redesign/}).hover();await expect(nav).toHaveAttribute('data-active-project','stadia-store-redesign');
  const image=nav.locator('.recent-preview-image');await expect(image).toHaveJSProperty('complete',true);
  await expect.poll(async()=>(await art.boundingBox()).height).toBeCloseTo((viewport.width>=1100?489:450)/1.8,0);
  const frame=await art.boundingBox(),media=await image.boundingBox(),bounds=await nav.boundingBox();
  expect(frame.width/frame.height).toBeCloseTo(640/429,2);expect(media.width).toBeCloseTo(frame.width,1);expect(media.height).toBeCloseTo(frame.height,1);expect(media.x).toBeCloseTo(frame.x,1);
  expect(frame.x+frame.width).toBeCloseTo(bounds.x+bounds.width,1);
 }
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  const mobile=await context.newPage();await disableWebGL(mobile);await mobile.route('**/api/listening',route=>route.fulfill({status:204}));await mobile.route('**/api/weather',route=>route.fulfill({status:204}));await mobile.goto(new URL('/',page.url()).href);
  const navigation=mobile.getByRole('navigation',{name:'Recent projects'});
  await navigation.getByRole('button',{name:/Stadia Store Redesign/}).tap();const image=navigation.locator('.recent-preview-image');await expect(image).toHaveJSProperty('complete',true);
  const content=navigation.locator('.recent-preview-content'),inline=navigation.locator('.recent-inline-preview');
  await expect.poll(async()=>(await content.boundingBox()).height).toBeCloseTo((await inline.boundingBox()).width/1.8,0);
  const frame=await content.boundingBox(),media=await image.boundingBox();
  expect(media.width).toBeCloseTo(frame.width,1);expect(media.height).toBeCloseTo(frame.height,1);expect(frame.x+frame.width).toBeLessThanOrEqual(390);
  await expect(navigation.getByRole('link',{name:'Open project'})).toBeVisible();
 }finally{await context.close()}
});
