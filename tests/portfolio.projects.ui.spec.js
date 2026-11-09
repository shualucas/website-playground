import { test, expect, disableWebGL, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });
const nudgesTitle = 'AI Mode Nudges';

test("recent projects use one column with native reader links and restore focus on Back", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"});

  await page.goto("/");
  await expect(page.locator('.collection')).toHaveAttribute('data-status','fallback');await page.evaluate(()=>document.fonts.ready);
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
    await links.nth(i).click(); await expect(page.getByRole('heading',{name:i===0?nudgesTitle:titles[i],exact:true})).toBeFocused();
    await expect(page.locator(i===0?'.case-showcase-introduction':'.case-study-facts dd:last-child').last()).toContainText(i===0?'In 2026, I defined':/^I /);
    await expect(page.locator('.case-study-facts')).toHaveCount(i===0?0:1);
    await expect(page.locator('.case-study-cartridge')).toHaveCount(i===0?1:0);
    if(i===0)await expect(page.locator('.case-study .eyebrow')).toHaveCount(0);
    else expect(await page.locator('.case-study .eyebrow').evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
    await expect(page.locator('.case-star-story > section > h2')).toHaveText(i===0?[]:['Problem','Goal','What I did']);
    await expect(page.locator('.case-study .case-outcome-grid dd')).toHaveText([
      ['+3.87%','+1.84%','21.9%'],['48M+','5M','20+'],['+12%','2','~6 mo.']
    ][i]);
    expect(await page.locator('.case-study-hero').evaluate(el=>Boolean(el.compareDocumentPosition(el.closest('.case-study-measure').querySelector('.case-star-story,.case-showcase-story'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(page.locator(i===0?'[data-showcase-section="problem"] > p':'[data-story-stage="task"] > p')).not.toBeEmpty();
    const story=page.locator(i===0?'.case-showcase-story':'.case-star-story');
    await expect(story.locator(i===0?'[data-showcase-section="input"],[data-showcase-section="model"]':'.case-decisions > li')).toHaveCount(i===0?2:3);
    await expect(story.locator('.case-story-media')).toHaveCount(i===0?4:0);
    await expect(story.locator('.case-story-media-placeholder')).toHaveCount(i===0?4:0);
    const sizes=await page.locator('.case-study-editorial').evaluate(root=>{
      const body=[...root.querySelectorAll('.case-study-deck,.case-study-facts dt,.case-study-facts dd,.case-editorial-section > p,.case-showcase-copy,.case-showcase-introduction,.case-section-content > p,.case-section-content h3,.case-patterns dt,.case-patterns dd,.case-pattern-status,.case-result-list li,.case-decisions h3,.case-decisions p,figcaption,.eyebrow,.case-impact,.case-outcome-grid:not(.case-highlight-grid) dt')];
      return [...new Set(body.map(el=>getComputedStyle(el).fontSize))];
    });expect(sizes).toEqual(i===0?['21px','11px']:['16px']);
    await page.setViewportSize({width:390,height:844});expect(await page.locator('.case-study').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    if(i!==0)await expect(page.locator('.case-study-facts dd').first()).toHaveText(titles[i]==='Search Labs'?'Core Product Designer':'Lead Product Designer');
    await page.setViewportSize({width:1440,height:1000});await page.goBack(); await expect(page.locator('.case-study')).toHaveCount(0); await expect(links.nth(i)).toBeFocused();
  }
  await expect(page.locator('.collection-hero')).toHaveCSS('min-height','480px');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.mouse.move(2,2);
  await links.first().hover();
  await expect(navigation).toHaveAttribute('data-active-project','ai-mode-nudges');
  const before=await navigation.evaluate(el=>({height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top+scrollY}));
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
  await main.evaluate(el=>el.getAnimations()[0].finish());await expect(page.getByRole('heading',{name:nudgesTitle,exact:true})).toBeFocused();
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

test('hover backgrounds cover the viewport while page content exits in either theme',async({page},testInfo)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const [width,mode,project]of[[1440,'light','ai-mode-nudges'],[900,'dark','search-labs'],[390,'dark','rave-flyer-zine']]){
    await page.setViewportSize({width,height:900});await page.goto('/');
    if(await page.locator('html').getAttribute('data-color-mode')!==mode){await page.getByRole('button',{name:`Switch to ${mode} mode`}).click();await expect(page.locator('html')).not.toHaveClass(/theme-transition/)}
    await page.evaluate(()=>{const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const animation=animate.call(this,frames,options);if(this.matches('main.collection')){animation.pause();animation.currentTime=150}return animation}});
    const main=page.locator('main.collection'),wash=page.locator('.project-hue-wash'),link=page.locator(`[data-project="${project}"] .recent-project-link`);
    await link.hover();await wash.evaluate(async el=>{getComputedStyle(el).backgroundColor;await Promise.allSettled(el.getAnimations().map(animation=>animation.finished))});
    await link.click();await expect(main).toHaveAttribute('data-exiting','true');await expect(wash).toHaveAttribute('data-exiting','true');
    const surface=await wash.evaluate(el=>{
      getComputedStyle(el).opacity;
      const fade=el.getAnimations().find(animation=>animation.transitionProperty==='opacity');fade.pause();fade.currentTime=150;
      const rect=el.getBoundingClientRect();return{x:rect.x,y:rect.y,width:rect.width,height:rect.height,opacity:Number(getComputedStyle(el).opacity),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    expect(surface.x).toBe(0);expect(surface.y).toBe(0);expect(surface.width).toBe(width);expect(surface.height).toBe(900);expect(surface.opacity).toBeGreaterThan(0);expect(surface.opacity).toBeLessThan(1);expect(surface.overflow).toBe(false);
    await page.screenshot({path:testInfo.outputPath(`project-background-exit-${width}-${mode}.png`)});
    await page.keyboard.press('Escape');await expect(main).toHaveAttribute('data-exiting','false');await expect(wash).toHaveAttribute('data-exiting','false');await expect(wash).toHaveCSS('opacity','1');await expect(page.locator('.case-study')).toHaveCount(0);
  }
});

test('AI Mode case study shows the supplied story and outcomes at the home project width',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));

  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  const navigation=page.getByRole('navigation',{name:'Recent projects'}),homeWidth=(await navigation.boundingBox()).width;
  const homeType=await page.locator('.intro-name').evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.fontStyle,s.lineHeight,s.letterSpacing]});
  const homeMuted=await page.locator('.bio-continuation').evaluate(el=>{const s=getComputedStyle(el);return {font:[s.fontFamily,s.fontWeight,s.fontStyle,s.color],size:parseFloat(s.fontSize)}});
  await navigation.getByRole('link',{name:/AI Mode Nudges/}).click();
  const study=page.getByRole('region',{name:'AI Mode Nudges case study'});
  await expect(study).toBeVisible();await expect(study.getByRole('heading',{name:nudgesTitle,exact:true})).toBeFocused();
  const cartridge=study.getByRole('img',{name:'Google Search cartridge'});
  await expect(cartridge).toHaveAttribute('data-cartridge','search');await expect(cartridge).toHaveAttribute('data-status','fallback');
  expect(await cartridge.evaluate(el=>Boolean(el.compareDocumentPosition(el.parentElement.querySelector('.case-study-hero'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect((await study.locator('.case-study-measure').boundingBox()).width).toBeCloseTo(homeWidth,0);
  await expect(study.locator('.case-outcome-grid dd')).toHaveText(['+3.87%','+1.84%','21.9%']);
  await expect(study.locator('.case-study-hero .case-outcome-grid')).toHaveCount(1);
  await expect(study.locator('.case-study-facts,.eyebrow')).toHaveCount(0);
  await expect(study.locator('.case-study-deck')).toHaveText('Helping people follow-up on answers across Google Search.');
  await expect(study.locator('.case-study-hero')).toHaveCSS('text-align','center');
  await expect(study.locator('.case-highlight-grid dt')).toHaveText(['follow-ups',"AI Mode DAU's",'reduction in manual typing']);
  await expect(study.locator('.case-highlight-note')).toHaveCount(0);
  expect(await study.locator('h1').evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.fontStyle,s.lineHeight,s.letterSpacing]})).toEqual(homeType);
  const subtext=await study.locator('.case-study-deck').evaluate(el=>{const s=getComputedStyle(el);return {font:[s.fontFamily,s.fontWeight,s.fontStyle,s.color],size:parseFloat(s.fontSize)}});
  expect(subtext.font).toEqual(homeMuted.font);expect(subtext.size).toBeLessThan(homeMuted.size);expect(subtext.size).toBeGreaterThanOrEqual(homeMuted.size*.9);
  const paragraphs=await study.locator('.case-showcase-introduction,.case-showcase-passage > p,.case-showcase-copy > p,.case-showcase-next').evaluateAll(elements=>elements.map(el=>{const s=getComputedStyle(el);return {font:[s.fontFamily,s.fontWeight,s.fontStyle,s.color],size:parseFloat(s.fontSize)}}));
  const bodyType={...subtext,font:[...subtext.font.slice(0,3),paragraphs[0].font[3]]};
  for(const paragraph of paragraphs)expect(paragraph).toEqual(bodyType);
  expect(bodyType.font[3]).not.toBe(subtext.font[3]);
  await expect(study.locator('.case-showcase-introduction')).toHaveText('In 2026, I defined the design, principles, and rules for a shared follow-up system across AI Overviews and AI Mode in Google Search, bringing 10+ product teams from one-off patterns onto one approach.');
  expect(await study.locator('.case-study-hero-figure').evaluate(el=>Boolean(el.compareDocumentPosition(el.parentElement.querySelector('.case-showcase-introduction'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(study.locator('.case-study-hero-media')).toHaveCSS('border-top-left-radius','24px');
  const center=await study.locator('.case-study-measure').boundingBox(),cart=await cartridge.boundingBox();expect(cart.x+cart.width/2).toBeCloseTo(center.x+center.width/2,0);
  const back=study.locator('.case-study-nav .back-to-zine');
  await expect(back).toHaveCSS('color',await study.locator('.case-highlight-grid dt').first().evaluate(el=>getComputedStyle(el).color));
  await back.hover();await expect(back).toHaveCSS('color',await study.locator('h1').evaluate(el=>getComputedStyle(el).color));
  expect(await back.evaluate(el=>getComputedStyle(el).getPropertyValue('--link-active').trim())).toBe('1');
  await page.mouse.move(2,2);
  await page.screenshot({path:testInfo.outputPath('nudges-centered-header-desktop.png')});
  await expect(study.locator('.case-study-hero-figure figcaption')).toHaveCount(0);
  await expect(study.locator('[data-showcase-section="problem"] > p')).toHaveText('AI answers often ended with a suggested next step written as plain text, forcing people to retype the suggestion or phrase the next question themselves. Meanwhile, 10+ vertical teams across Shopping, Travel, Finance, and Education were each designing separate buttons, chips, and quizzes at the bottom of answers.');
  await expect(study.locator('[data-showcase-section="system"]')).toContainText('plain text for open-ended replies');await expect(study.locator('[data-showcase-section="system"]')).toContainText('clarification cards for narrowing down choices like budget, pace, or dates');
  await expect(study.locator('.case-showcase-passage')).toHaveCount(4);
  await expect(study.locator('[data-showcase-section="input"]')).toContainText('"Something else"');await expect(study.locator('[data-showcase-section="model"]')).toContainText('a lightweight post-processing step');await expect(study.locator('[data-showcase-section="collapsed"]')).toHaveCount(0);
  await expect(study.locator('[data-showcase-section="result"] p')).toHaveCount(2);
  await expect(study.locator('[data-showcase-section="result"] p').first()).toContainText('Inline nudges launched globally');
  await expect(study.locator('[data-showcase-section="result"] p').last()).toContainText('Before this project, 10+ teams');
  await expect(study.locator('[data-showcase-section="result"]')).not.toContainText(/1\.50%|21\.9%|3\.87%|1\.84%/);
  await expect(study.locator('[data-showcase-section="result"] .case-outcome-grid,.case-measurement-note')).toHaveCount(0);
  await expect(study.locator('.case-study-preview,.case-study-note')).toHaveCount(0);await expect(study.locator('.case-story-media')).toHaveCount(4);
  for(const passage of await study.locator('.case-showcase-passage').all()) {
    await expect(passage.locator('.case-story-media-placeholder')).toHaveCount(1);
    expect(await passage.locator('p').first().evaluate(el=>Boolean(el.compareDocumentPosition(el.parentElement.querySelector('figure'))&Node.DOCUMENT_POSITION_PRECEDING))).toBe(true);
  }
  const system=study.locator('[data-showcase-section="system"]');
  expect((await system.locator('figure').boundingBox()).width).toBeCloseTo(homeWidth,0);
  expect((await system.locator('.case-showcase-copy').boundingBox()).width).toBeLessThan(homeWidth);
  await system.evaluate(el=>el.closest('.case-study').scrollTop+=el.getBoundingClientRect().top-110);
  await page.screenshot({path:testInfo.outputPath('nudges-showcase-desktop.png')});
  await expect(study.locator('.case-study-hero-media .loop-video-poster')).toHaveAttribute('src','/videos/nudges/nudges-hero-poster.jpg');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>study.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect.poll(async()=>{
    const bounds=await study.locator('.case-outcome-grid dd').evaluateAll(elements=>elements.map(el=>({width:el.clientWidth,scroll:el.scrollWidth})));
    return bounds.every(r=>r.scroll<=r.width+1);
  }).toBe(true);
  const cards=await study.locator('.case-highlight-grid > div').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().top));expect(new Set(cards).size).toBe(1);
  for(const [width,height] of [[1440,1000],[1280,800],[390,844],[375,667]]) {
    await page.setViewportSize({width,height});await study.evaluate(el=>el.scrollTop=0);
    await expect.poll(async()=>{
      const top=(await study.locator('.case-study-hero-media').boundingBox()).y;
      return top>=height-148&&top<=height-112;
    }).toBe(true);
    const cover=await study.locator('.case-showcase-cover').boundingBox(),cartridge=await study.locator('.case-study-cartridge').boundingBox(),hero=await study.locator('.case-study-hero').boundingBox();
    expect((cartridge.y+hero.y+hero.height)/2).toBeCloseTo(cover.y+cover.height/2,0);
  }
  await page.setViewportSize({width:390,height:844});
  await study.evaluate(el=>el.scrollTop=0);await page.screenshot({path:testInfo.outputPath('nudges-centered-header-mobile.png')});
  await study.locator('[data-showcase-section="input"]').evaluate(el=>el.closest('.case-study').scrollTop+=el.getBoundingClientRect().top-90);
  await page.screenshot({path:testInfo.outputPath('nudges-showcase-mobile.png')});
  await study.getByRole('button',{name:'Home',exact:true}).first().click();await expect(study).toHaveCount(0);
  await expect(navigation.getByRole('link',{name:/AI Mode Nudges/})).toBeFocused();expect(errors).toEqual([]);
});

test('project headers reveal a centered title past the hero over a fading blur scrim',async({page},testInfo)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [id,title,width,height]of[['ai-mode-nudges','AI Mode Nudges',1440,1000],['ai-mode-nudges','AI Mode Nudges',390,844],['stadia-store-redesign','Stadia Store Redesign',320,844],['search-labs','Search Labs',1440,700]]){
    await page.setViewportSize({width,height});await page.goto(`/?project=${id}&view=case-study`);
    const reader=page.locator('.case-study'),header=reader.locator('.case-study-nav'),name=header.locator('.case-study-nav-title');
    await expect(name).toHaveCSS('opacity','0');await expect(name).toHaveAttribute('aria-hidden','true');
    const appearance=await header.evaluate(el=>{const style=getComputedStyle(el),scrim=getComputedStyle(el,'::before');return{top:style.paddingTop,bottom:style.paddingBottom,fill:style.backgroundColor,gradient:scrim.backgroundImage,blur:scrim.backdropFilter,mask:scrim.maskImage}});
    expect(appearance.top).toBe(appearance.bottom);expect(appearance.fill).toBe('rgba(0, 0, 0, 0)');expect(appearance.gradient).toContain('linear-gradient');expect(appearance.blur).toContain('blur(');expect(appearance.mask).toContain('linear-gradient');
    await reader.evaluate(el=>{el.scrollTop+=el.querySelector('.case-study-hero').getBoundingClientRect().bottom-el.querySelector('.case-study-nav').getBoundingClientRect().bottom+4});
    await expect(name).toHaveCSS('opacity','1');await expect(name).toHaveText(title);await expect(name).toHaveAttribute('aria-hidden','false');
    const navBox=await header.boundingBox(),titleBox=await name.boundingBox();expect(titleBox.x+titleBox.width/2).toBeCloseTo(navBox.x+navBox.width/2,0);expect(titleBox.y+titleBox.height/2).toBeCloseTo(navBox.y+navBox.height/2,0);
    for(const button of await header.getByRole('button').all()){const box=await button.boundingBox();expect(box.y+box.height/2).toBeCloseTo(navBox.y+navBox.height/2,0)}
    expect(await reader.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    if(width===1440&&id==='ai-mode-nudges')await page.screenshot({path:testInfo.outputPath('project-nav-scrolled-desktop.png')});
    // Hide as soon as the hero re-enters, including its first pixel below the sticky header.
    await reader.evaluate(el=>{el.scrollTop=Math.floor(el.scrollTop+el.querySelector('.case-study-hero').getBoundingClientRect().bottom-el.querySelector('.case-study-nav').getBoundingClientRect().bottom)});
    await expect(name).toHaveCSS('opacity','0');await expect(name).toHaveAttribute('aria-hidden','true');
    await reader.evaluate(el=>el.scrollTop=0);await expect(name).toHaveCSS('opacity','0');
  }
});

test('media rail tracks the reader, labels each stop, and jumps without navigating',async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(()=>{
    window.mediaNavGate=[];window.readerScrolls=[];
    new MutationObserver(records=>{for(const {target}of records)if(target.matches?.('.case-media-nav-track'))window.mediaNavGate.push({ready:target.dataset.revealReady,inert:target.inert})}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-reveal-ready']});
    document.addEventListener('scroll',event=>{if(event.target.matches?.('.case-study'))window.readerScrolls.push(event.target.scrollTop)},{capture:true});
  });
  await page.goto('/?project=ai-mode-nudges&view=case-study');
  const reader=page.locator('.case-study'),rail=page.getByRole('navigation',{name:'Case study media'}),buttons=rail.getByRole('button'),media=reader.locator('[data-media-label], [data-takeaways]');
  await expect(buttons).toHaveCount(6);await expect(rail.locator('.case-media-nav-track')).toHaveAttribute('data-reveal-ready','true');
  expect(await page.evaluate(()=>window.mediaNavGate.some(state=>state.ready==='false'&&state.inert))).toBe(true);
  const labels=await media.evaluateAll(elements=>elements.map(el=>`Jump to ${el.dataset.mediaLabel||'Takeaways'}`));
  for(let i=0;i<labels.length;i++)await expect(buttons.nth(i)).toHaveAccessibleName(labels[i]);
  await expect(buttons.first()).toHaveAttribute('aria-current','location');
  const initial=await rail.boundingBox(),measure=await reader.locator('.case-study-measure').boundingBox();expect(initial.x+initial.width).toBeLessThanOrEqual(measure.x);
  const track=await rail.locator('.case-media-nav-track').boundingBox();expect(track.y+track.height/2).toBeCloseTo(500,0);
  await buttons.nth(3).hover();await expect(buttons.nth(3).locator('.case-media-nav-label')).toHaveCSS('opacity','1');
  await page.screenshot({path:testInfo.outputPath('media-rail-desktop.png')});
  const before=await page.evaluate(()=>({url:location.href,history:history.length,windowY:scrollY}));
  const aligned=index=>media.nth(index).evaluate(el=>{const reader=el.closest('.case-study'),header=reader.querySelector('.case-study-nav').getBoundingClientRect();return Math.abs(el.getBoundingClientRect().top-header.bottom-16)});
  await buttons.nth(3).click();await expect.poll(()=>aligned(3)).toBeLessThan(2);await expect(buttons.nth(3)).toHaveAttribute('aria-current','location');
  expect(await page.evaluate(()=>window.readerScrolls.length)).toBeGreaterThan(2);
  await media.nth(5).evaluate(el=>{el.closest('.case-study').scrollTop+=el.getBoundingClientRect().top-200});await expect(buttons.nth(5)).toHaveAttribute('aria-current','location');
  await buttons.last().click();await expect(buttons.last()).toHaveAccessibleName('Jump to Takeaways');await expect(buttons.last()).toHaveAttribute('aria-current','location');await expect(reader.locator('[data-takeaways] p').last()).toBeVisible();
  const scrolled=await rail.boundingBox();expect(scrolled.x).toBeCloseTo(initial.x,0);expect(scrolled.y).toBeCloseTo(initial.y,0);
  await page.mouse.move(2,2);await page.keyboard.press('Tab');await buttons.first().focus();await expect(buttons.first().locator('.case-media-nav-label')).toHaveCSS('opacity','1');await buttons.first().press('Enter');await expect.poll(()=>aligned(0)).toBeLessThan(2);
  expect(await page.evaluate(()=>({url:location.href,history:history.length,windowY:scrollY}))).toEqual(before);
  for(const width of [900,600]){await page.setViewportSize({width,height:1000});const railBox=await rail.boundingBox(),content=await reader.locator('.case-study-measure').boundingBox();expect(railBox.x).toBeGreaterThanOrEqual(0);expect(railBox.x+railBox.width).toBeLessThanOrEqual(content.x+.5)}
  await page.setViewportSize({width:1440,height:1000});
  await reader.locator('.case-study-nav').getByRole('button',{name:'Home',exact:true}).click();await expect(reader).toHaveCount(0);
  await page.getByRole('link',{name:/Search Labs/}).click();await expect(page.locator('.case-media-nav')).toBeHidden();
});

test('touch media navigation fits the gutter and makes reduced-motion jumps below the header',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try{
    const page=await context.newPage();await disableWebGL(page);await page.route('**/api/listening',route=>route.fulfill({status:204}));await page.route('**/api/weather',route=>route.fulfill({status:204}));
    await page.goto('http://127.0.0.1:3000/?project=ai-mode-nudges&view=case-study');
    const reader=page.locator('.case-study'),rail=page.getByRole('navigation',{name:'Case study media'}),buttons=rail.getByRole('button');await expect(buttons).toHaveCount(6);
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});const bounds=await rail.boundingBox(),measure=await reader.locator('.case-study-measure').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(measure.x+.5);
      const track=await rail.locator('.case-media-nav-track').boundingBox();expect(track.y+track.height/2).toBeCloseTo(422,0);
      for(const button of await buttons.all()){const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(24);expect(box.height).toBeGreaterThanOrEqual(24)}
      await buttons.nth(4).tap();await expect(buttons.nth(4)).toHaveAttribute('aria-current','location');
      await expect.poll(()=>reader.locator('[data-media-label]').nth(4).evaluate(el=>Math.abs(el.getBoundingClientRect().top-el.closest('.case-study').querySelector('.case-study-nav').getBoundingClientRect().bottom-16))).toBeLessThan(2);
      expect(await reader.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(await page.evaluate(()=>scrollY)).toBe(0);
      await buttons.first().tap();await expect(buttons.first()).toHaveAttribute('aria-current','location');
    }
    await buttons.last().tap();await expect(buttons.last()).toHaveAccessibleName('Jump to Takeaways');await expect(buttons.last()).toHaveAttribute('aria-current','location');await expect(reader.locator('[data-takeaways] p').last()).toBeVisible();
    await expect(reader.locator('.case-study-nav-title')).toHaveCSS('opacity','1');
    await reader.locator('.case-study-nav').getByRole('button',{name:'Switch to dark mode'}).tap();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
    await expect(buttons.first().locator('.case-media-nav-label')).toHaveCSS('background-color','rgb(16, 17, 16)');
    await page.screenshot({path:testInfo.outputPath('media-rail-mobile-dark.png')});
  }finally{await context.close()}
});

test('case studies reuse the home footer with one music widget and working history controls',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  const track={title:'Footer track',artist:'Footer artist',url:'https://www.last.fm/music/footer',artwork:'/cartridges/labels/search-tonal.svg',playing:true};
  await page.route('**/api/listening',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({track,recent:[{...track,title:'Previous track',playing:false}]})}));
  await page.goto('/');const links=await page.locator('.collection-footer .profile-links a').evaluateAll(elements=>elements.map(el=>el.getAttribute('href')));
  const titles=['AI Mode Nudges','Search Labs','Stadia Store Redesign'];
  for(let i=0;i<titles.length;i++){
    await page.getByRole('link',{name:new RegExp(titles[i])}).click();const study=page.locator('.case-study'),footer=study.locator('.collection-footer');
    await footer.scrollIntoViewIfNeeded();await expect(page.locator('.listening-widget')).toHaveCount(1);
    expect(await footer.locator('.profile-links a').evaluateAll(elements=>elements.map(el=>el.getAttribute('href')))).toEqual(links);
    await expect(footer.getByRole('button',{name:'Home',exact:true})).toHaveCount(0);await expect(footer.locator('.now-playing')).toHaveAttribute('data-track','Footer track');
    const bounds=await footer.boundingBox(),measure=await study.locator('.case-study-measure').boundingBox();expect(bounds.x).toBeCloseTo(measure.x,0);expect(bounds.width).toBeCloseTo(measure.width,0);
    const toggle=footer.getByRole('button',{name:'Show last five songs'});await toggle.click();await expect(footer.getByRole('region',{name:'Recently listened'})).toContainText('Previous track');
    await toggle.press('Escape');await expect(footer.getByRole('region',{name:'Recently listened'})).not.toBeVisible();await expect(study).toBeVisible();
    if(i===0){await page.setViewportSize({width:390,height:844});await footer.scrollIntoViewIfNeeded();expect(await study.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.setViewportSize({width:1440,height:1000})}
    if(i===titles.length-1)await page.emulateMedia({reducedMotion:'no-preference'});
    await study.locator('.case-study-nav').getByRole('button',{name:'Home',exact:true}).click();await expect(study).toHaveCount(0);
    const home=page.locator('.collection-footer');await home.scrollIntoViewIfNeeded();await expect(home.locator('.footer-links')).toHaveAttribute('data-reveal-ready','true');
    await expect(home.locator('.now-playing')).toHaveAttribute('data-track','Footer track');await expect(page.locator('.listening-widget')).toHaveCount(1);
  }
});

test('all current pages expose a working header theme toggle and preserve the selection',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});let mode='light';
  for(const path of ['/','/?project=ai-mode-nudges&view=case-study','/?project=search-labs&view=case-study','/?project=stadia-store-redesign&view=case-study','/resume/','/after-hours/','/photos/']){
    await page.goto(path);await expect(page.locator('html')).toHaveAttribute('data-color-mode',mode);await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content',mode==='dark'?'#101110':'#f0f0f0');
    const header=path.includes('case-study')?page.locator('.case-study-nav'):page.locator('header').first();
    const next=mode==='light'?'dark':'light';await header.getByRole('button',{name:`Switch to ${next} mode`,exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('data-color-mode',next);
    expect(await page.evaluate(()=>localStorage.getItem('cartridge-color-mode'))).toBe(next);
    await expect(header.getByRole('button',{name:`Switch to ${mode} mode`,exact:true})).toBeVisible();mode=next;
    if(path.includes('case-study')){
      await header.getByRole('button',{name:'Home',exact:true}).click();await expect(page.locator('.case-study')).toHaveCount(0);
      await expect(page.locator('.collection-header').getByRole('button',{name:`Switch to ${mode==='light'?'dark':'light'} mode`,exact:true})).toBeVisible();
    }
  }
});

test('hero metrics count upward with a left-to-right blur entrance and honor reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});
  await page.addInitScript(()=>{
    window.metricEntrances=[];
    new MutationObserver(records=>{for(const {target} of records){
      if(!target.matches?.('.case-highlight-grid > [data-metric-state="counting"]'))continue;
      const value=target.querySelector('.case-metric-value'),style=getComputedStyle(value);
      window.metricEntrances.push({index:[...target.parentElement.children].indexOf(target),time:performance.now(),value:value.dataset.value,announced:target.querySelector('.sr-only').textContent,filter:style.filter,color:style.color,y:new DOMMatrixReadOnly(style.transform).m42,width:value.getBoundingClientRect().width});
    }}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-metric-state']});
  });
  await page.goto('/?project=ai-mode-nudges&view=case-study');
  const grid=page.locator('.case-highlight-grid'),cards=grid.locator(':scope > div'),values=grid.locator('.case-metric-value');
  const final=['+3.87%','+1.84%','21.9%'];
  await expect(cards.locator('dd')).toHaveText(final);
  await expect.poll(()=>cards.evaluateAll(elements=>elements.every(el=>el.dataset.metricState==='complete'))).toBe(true);
  const entrances=await page.evaluate(()=>window.metricEntrances);
  const digitWidths=await values.first().evaluate(async node=>{
    await document.fonts.load('500 20px "Portfolio Metrics"','0123456789');
    const probe=node.cloneNode();probe.dataset.final='';probe.style.cssText='position:absolute;visibility:hidden';node.parentElement.append(probe);
    const widths=[...'0123456789'].map(digit=>{probe.dataset.value=digit;return probe.getBoundingClientRect().width});probe.remove();return widths;
  });
  expect(Math.max(...digitWidths)-Math.min(...digitWidths)).toBeLessThan(.02);
  expect(entrances.map(entry=>entry.index)).toEqual([0,1,2]);
  for(let i=0;i<entrances.length;i++){
    expect(parseFloat(entrances[i].value)).toBeLessThan(parseFloat(final[i]));
    expect(entrances[i].filter).not.toBe('none');expect(entrances[i].y).toBeGreaterThan(0);
    if(i)expect(entrances[i].time-entrances[i-1].time).toBeGreaterThan(80);
    expect(entrances[i].announced).toBe(final[i]);
    expect(await grid.getByRole('definition').nth(i).ariaSnapshot()).toContain(final[i]);
    await expect(values.nth(i)).toHaveAttribute('data-value',final[i]);
    await expect(values.nth(i)).toHaveAttribute('aria-hidden','true');
    await expect(values.nth(i)).toHaveCSS('filter','none');
    await expect(values.nth(i)).toHaveCSS('color','rgb(35, 122, 66)');expect(entrances[i].color).not.toBe('rgb(35, 122, 66)');
    expect((await values.nth(i).boundingBox()).width).toBeCloseTo(entrances[i].width,0);
  }
  // A preference change during the count must reveal every exact value immediately.
  await page.reload();await expect(cards.first()).toHaveAttribute('data-metric-state','counting');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(cards.locator('dd')).toHaveText(final);
  await expect.poll(()=>cards.evaluateAll(elements=>elements.every(el=>el.dataset.metricState==='complete'))).toBe(true);
  for(let i=0;i<final.length;i++){await expect(values.nth(i)).toHaveAttribute('data-value',final[i]);await expect(values.nth(i)).toHaveCSS('filter','none');await expect(values.nth(i)).toHaveCSS('animation-name','none')}
  await page.locator('.case-study-nav').getByRole('button',{name:'Switch to dark mode'}).click();
  for(const value of await values.all())await expect(value).toHaveCSS('color','rgb(98, 214, 141)');
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
  await expect(preview).toHaveCSS('transition-duration','0.16s');
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
  await page.getByRole('link',{name:/AI Mode Nudges/}).click();await expect(page.locator('.case-study')).toBeVisible();await page.getByRole('button',{name:'Home',exact:true}).first().click();await expect(page.locator('.case-study')).toHaveAttribute('data-exiting','true');await expect(page.locator('.case-study')).toHaveCount(0);
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

test('only zine and film resolve through ASCII, replay on return and stay static for reduced motion',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});await page.addInitScript(()=>{

  window.asciiReveals=[];new MutationObserver(records=>{for(const {target}of records){if(!target.matches?.('.recent-preview-ascii')||target.dataset.state!=='revealing')continue;const pixels=target.getContext('2d').getImageData(0,0,target.width,target.height).data;window.asciiReveals.push({kind:target.closest('.recent-preview-content').dataset.kind,painted:pixels.some((v,i)=>i%4===3&&v>0)})}}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-state']});
 });await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),links=nav.locator('.recent-project-link');await expect(nav.locator('[data-project="film"]')).toHaveAttribute('data-reveal-ready','true');
 for(const link of await links.all()){
  await page.mouse.move(2,2);
  await link.hover();const ascii=nav.locator('.recent-project-preview .recent-preview-ascii'),kind=await nav.locator('.recent-preview-content').getAttribute('data-kind');if(!['film','zine'].includes(kind)){await expect(ascii).toHaveCount(0);continue}await expect(ascii).toHaveAttribute('data-state','complete',{timeout:15000});await expect(ascii).toBeHidden();expect(await page.evaluate(kind=>window.asciiReveals.some(entry=>entry.kind===kind&&entry.painted),kind)).toBe(true);
 }
 const before=await page.evaluate(()=>window.asciiReveals.filter(entry=>entry.kind==='film').length);await page.mouse.move(2,2);await links.last().hover();await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-state','complete');expect(await page.evaluate(()=>window.asciiReveals.filter(entry=>entry.kind==='film').length)).toBeGreaterThan(before);
 await page.emulateMedia({reducedMotion:'reduce'});await links.nth(3).hover();await expect(nav.locator('.recent-preview-ascii')).toBeHidden();await expect(nav.locator('.recent-preview-ascii')).toHaveAttribute('data-state','complete');
});

test('film ASCII uses source pixels and crossfades uniformly over 1.2 seconds',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});await page.addInitScript(()=>{

  window.dissolve={};new MutationObserver(()=>{
   const visual=document.querySelector('.recent-preview-content[data-kind="film"] .recent-preview-source');
   if(visual&&!visual.querySelector('[data-test-source]')){const source=document.createElement('canvas');source.width=360;source.height=200;source.dataset.testSource='true';source.style.cssText='position:absolute;inset:0;width:100%;height:100%';const ctx=source.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(30,40,100,120);ctx.fillStyle='#eee';ctx.beginPath();ctx.arc(280,100,40,0,Math.PI*2);ctx.fill();visual.prepend(source)}
   const ascii=document.querySelector('.recent-preview-ascii[data-source="content"]');if(!ascii)return;
   const state=window.dissolve,opacity=Number(ascii.style.opacity),content=Number(ascii.parentElement.style.getPropertyValue('--preview-content-opacity'));
   if(ascii.dataset.state==='revealing'){
    state.start??=performance.now();
    if(opacity>.5&&content===0&&!state.fadeIn){state.fadeIn=ascii.toDataURL();state.visiblePixels=ascii.getContext('2d').getImageData(0,0,ascii.width,ascii.height).data.some((v,i)=>i%4===3&&v>0)}
    if(content>.5&&opacity<.5&&!state.fadeOut)state.fadeOut=ascii.toDataURL();
   }else if(ascii.dataset.state==='complete')state.duration??=performance.now()-state.start;
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-state','style','data-source']});
 });await page.goto('/');const nav=page.getByRole('navigation',{name:'Recent projects'});await expect(nav.locator('[data-project="film"]')).toHaveAttribute('data-reveal-ready','true');await nav.getByRole('link',{name:/Say cheese!/}).hover();const ascii=nav.locator('.recent-preview-ascii');await expect(ascii).toHaveAttribute('data-state','complete');await expect(ascii).toHaveAttribute('data-source','content');
 const result=await page.evaluate(()=>window.dissolve);expect(result.visiblePixels).toBe(true);expect(result.fadeIn).toBeTruthy();expect(result.fadeOut).toBe(result.fadeIn);expect(result.duration).toBeGreaterThanOrEqual(1180);expect(result.duration).toBeLessThan(2500);
 const shape=await ascii.evaluate(el=>{const {data,width,height}=el.getContext('2d').getImageData(0,0,el.width,el.height);let left=0,right=0,gap=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(!data[(y*width+x)*4+3])continue;if(x<width*.4)left++;else if(x>width*.65)right++;else if(x>width*.42&&x<width*.62)gap++}return{left,right,gap}});expect(shape.left).toBeGreaterThan(100);expect(shape.right).toBeGreaterThan(100);expect(shape.gap).toBe(0);await expect(nav.locator('.recent-preview-source')).toHaveCSS('opacity','1');
});

test('case-study previews switch instantly between rows and fade on first entry',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),links=nav.locator('.recent-project-link'),visual=nav.locator('.recent-solid-visual');
 await expect(nav.locator('[data-project="film"]')).toHaveAttribute('data-reveal-ready','true');
 await links.nth(1).hover();await expect(visual).toHaveAttribute('data-entry','gradual');await expect(visual).toHaveCSS('animation-name','preview-media-enter');
 // An interrupted entrance must never carry opacity or a delayed reveal into another row.
 for(const link of [links.nth(2),links.first()]){await link.hover();await expect(visual).toHaveAttribute('data-entry','instant');await expect(visual).toHaveCSS('opacity','1');await expect(visual).toHaveCSS('animation-name','none');await expect(nav.locator('.recent-preview-ascii')).toHaveCount(0)}
 await page.mouse.move(2,2);await expect(nav).toHaveAttribute('data-preview-active','false');
 await links.nth(1).hover();await expect(visual).toHaveAttribute('data-entry','gradual');
 // Keyboard browsing shares immediate swaps; special previews still use ASCII.
 await page.keyboard.press('Tab');await links.nth(2).focus();await expect(nav).toHaveAttribute('data-active-project','stadia-store-redesign');await expect(visual).toHaveAttribute('data-entry','instant');
 for(const link of [links.nth(3),links.nth(4)]){await link.focus();const ascii=nav.locator('.recent-preview-ascii');await expect(ascii).toHaveAttribute('data-state','revealing');await expect(ascii).toHaveAttribute('data-state','complete',{timeout:15000})}
});

test('Search Labs and Stadia use uniform solid placeholders in both themes without requesting old media',async({page})=>{
 const requests=[];page.on('request',request=>{if(request.url().includes('stadia-store-redesign.'))requests.push(request.url())});
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'});
 for(const dark of [false,true]){
  if(dark)await page.getByRole('button',{name:'Switch to dark mode'}).click();
  for(const name of [/Search Labs/,/Stadia Store Redesign/]){
   await nav.getByRole('link',{name}).hover();const visual=nav.locator('.recent-solid-visual');await expect(visual).toBeVisible();await expect(visual).toHaveAttribute('data-placeholder','true');await expect(visual).toHaveCSS('background-image','none');await expect(visual.locator('img,video,canvas')).toHaveCount(0);await expect(nav.locator('.recent-preview-ascii')).toHaveCount(0);
   expect(await visual.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  }
 }
 expect(requests).toEqual([]);
});

test('Nudges hover video loads on demand without ASCII and resets when leaving',async({page})=>{
 const requests=[];page.on('request',request=>{if(request.url().includes('/videos/nudges/')&&request.url().endsWith('.mp4'))requests.push(request.url())});
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),row=nav.getByRole('link',{name:/AI Mode Nudges/});await expect(row).toBeVisible();expect(requests).toEqual([]);
 await row.hover();const video=nav.locator('.loop-video video'),art=nav.locator('.recent-preview-art');
 await expect.poll(()=>video.evaluate(el=>el.readyState)).toBeGreaterThanOrEqual(2);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 expect(await video.evaluate(el=>el.duration)).toBeGreaterThan(27);
 await expect(nav.locator('.recent-preview-ascii')).toHaveCount(0);
 const frame=await art.boundingBox();expect(frame.width/frame.height).toBeCloseTo(1.6,2);expect(frame.height).toBeCloseTo(489/1.8,0);
 expect(await video.evaluate(el=>({muted:el.muted,loop:el.loop,inline:el.playsInline,controls:el.controls}))).toEqual({muted:true,loop:true,inline:true,controls:false});
 await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeGreaterThan(0);
 await page.mouse.move(2,2);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(true);await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeLessThan(.1); // The MP4's first presentation timestamp is 0.041s.
 await row.hover();await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(video).not.toHaveAttribute('src');await expect(video).toHaveAttribute('data-ready','false');await expect(nav.locator('.loop-video-poster')).toBeVisible();
 expect(requests.every(url=>url.endsWith('/nudges-hero-1280.mp4'))).toBe(true);
});

test('Nudges hero uses responsive video sources, pauses offscreen and shows its poster for reduced motion',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?project=ai-mode-nudges&view=case-study');
 const hero=page.locator('.case-study-hero-media'),video=hero.locator('video');await hero.scrollIntoViewIfNeeded();
 await expect.poll(()=>video.evaluate(el=>el.currentSrc)).toMatch(/nudges-hero-1920\.mp4$/);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 const frame=await hero.boundingBox(),measure=await page.locator('.case-study-measure').boundingBox();expect(frame.width).toBeCloseTo(measure.width,1);expect(frame.width/frame.height).toBeCloseTo(1.6,2);
 await page.setViewportSize({width:1440,height:600});await page.locator('.case-study-content footer').scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(true);
 await page.setViewportSize({width:390,height:844});await hero.scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(el=>el.currentSrc)).toMatch(/nudges-hero-1280\.mp4$/);await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(video).not.toHaveAttribute('src');await expect(hero.locator('.loop-video-poster')).toBeVisible();await expect(video).toHaveAttribute('data-ready','false');
 const requests=[];page.on('request',request=>{if(request.url().includes('/videos/nudges/')&&request.url().endsWith('.mp4'))requests.push(request.url())});
 await page.reload();await expect(page.locator('.case-study-hero-media .loop-video-poster')).toBeVisible();await expect(page.locator('.case-study-hero-media video')).not.toHaveAttribute('src');expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('solid preview fills its container and retains height, right alignment and mobile layout',async({page,browser})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Recent projects'}),art=nav.locator('.recent-preview-content');
 for(const viewport of [{width:1440,height:1000},{width:900,height:800},{width:1440,height:600}]){
  await page.setViewportSize(viewport);await nav.getByRole('link',{name:/Stadia Store Redesign/}).hover();await expect(nav).toHaveAttribute('data-active-project','stadia-store-redesign');
  const image=nav.locator('.recent-solid-visual');await expect(image).toBeVisible();
  await expect.poll(async()=>(await art.boundingBox()).height).toBeCloseTo((viewport.width>=1100?489:450)/1.8,0);
  const frame=await art.boundingBox(),media=await image.boundingBox(),bounds=await nav.boundingBox();
  expect(frame.width/frame.height).toBeCloseTo(1.8,2);expect(media.width).toBeCloseTo(frame.width,1);expect(media.height).toBeCloseTo(frame.height,1);expect(media.x).toBeCloseTo(frame.x,1);
  expect(frame.x+frame.width).toBeCloseTo(bounds.x+bounds.width,1);
 }
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  const mobile=await context.newPage();await disableWebGL(mobile);await mobile.route('**/api/listening',route=>route.fulfill({status:204}));await mobile.route('**/api/weather',route=>route.fulfill({status:204}));await mobile.goto(new URL('/',page.url()).href);
  const navigation=mobile.getByRole('navigation',{name:'Recent projects'});
  await navigation.getByRole('button',{name:/Stadia Store Redesign/}).tap();const image=navigation.locator('.recent-solid-visual');await expect(image).toBeVisible();
  const content=navigation.locator('.recent-preview-content'),inline=navigation.locator('.recent-inline-preview');
  await expect.poll(async()=>(await content.boundingBox()).height).toBeCloseTo((await inline.boundingBox()).width/1.8,0);
  const frame=await content.boundingBox(),media=await image.boundingBox();
  expect(media.width).toBeCloseTo(frame.width,1);expect(media.height).toBeCloseTo(frame.height,1);expect(frame.x+frame.width).toBeLessThanOrEqual(390);
  await expect(navigation.getByRole('link',{name:'Open project'})).toBeVisible();
 }finally{await context.close()}
});

test('project colors ripple once after the rows finish loading without opening previews',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  window.rowPulses=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('.recent-project-list > li')&&frames[0]?.backgroundColor){window.rowPulses.push({project:this.dataset.project,ready:[...this.parentElement.children].every(row=>row.dataset.revealReady==='true'),delay:options.delay,color:frames[1].backgroundColor})}
   return animate.call(this,frames,options);
  };
 });
 await page.goto('/');const nav=page.getByRole('navigation',{name:'Recent projects'});await expect(nav).toHaveAttribute('data-color-intro','complete');
 const pulses=await page.evaluate(()=>window.rowPulses);expect(pulses.map(p=>p.project)).toEqual(['ai-mode-nudges','search-labs','stadia-store-redesign','rave-flyer-zine','film']);expect(pulses.every(p=>p.ready)).toBe(true);expect(pulses.map(p=>p.delay)).toEqual([0,75,150,225,300]);expect(new Set(pulses.map(p=>p.color)).size).toBe(5);
 await expect(nav).toHaveAttribute('data-preview-active','false');await expect(nav.locator('.recent-preview-ascii,.loop-video video')).toHaveCount(0);
 for(const row of await nav.locator('.recent-project-list > li').all())await expect(row).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await nav.getByRole('link',{name:/AI Mode Nudges/}).click();await expect(page.locator('.case-study')).toBeVisible();await page.locator('.case-study-nav').getByRole('button',{name:'Home',exact:true}).click();await expect(page.locator('.case-study')).toHaveCount(0);expect(await page.evaluate(()=>window.rowPulses.length)).toBe(5);
});

test('project color intros yield to interaction and stay off for reduced motion',async({page})=>{
 await page.setViewportSize({width:1440,height:1200});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const animation=animate.call(this,frames,options);if(this.matches('.recent-project-list > li')&&frames[0]?.backgroundColor)animation.pause();return animation};
 });
 await page.goto('/');const nav=page.getByRole('navigation',{name:'Recent projects'});await expect(nav).toHaveAttribute('data-color-intro','running');
 const highlights=await nav.locator('li').evaluateAll(rows=>rows.map(row=>{const animation=row.getAnimations().find(animation=>animation.effect.getKeyframes()[0]?.backgroundColor);animation.currentTime=animation.effect.getTiming().delay+100;return getComputedStyle(row).backgroundColor}));expect(new Set(highlights).size).toBe(5);expect(highlights.every(color=>color!=='rgba(0, 0, 0, 0)')).toBe(true);
 await nav.getByRole('link',{name:/Search Labs/}).hover();await expect(nav).toHaveAttribute('data-color-intro','complete');await expect(nav).toHaveAttribute('data-active-project','search-labs');
 expect(await nav.locator('li').evaluateAll(rows=>rows.every(row=>!row.getAnimations().some(animation=>animation.effect.getKeyframes()[0]?.backgroundColor)))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(nav).toHaveAttribute('data-color-intro','complete');
 expect(await nav.locator('li').evaluateAll(rows=>rows.every(row=>!row.getAnimations().some(animation=>animation.effect.getKeyframes()[0]?.backgroundColor)))).toBe(true);
});
