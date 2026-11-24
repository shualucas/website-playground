import {test,expect} from './support/portfolio.js';
test.use({webgl:false});
test('dark defaults persist and the light preference tooltip anchors to the theme dot',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
 const toggle=page.getByRole('button',{name:'Switch to light mode'});const b=await toggle.boundingBox();await toggle.click();
 const tip=page.getByRole('tooltip');await expect(tip).toHaveText('Josh prefers dark theme on this site.');
 const t=await tip.boundingBox();expect(t.y).toBeGreaterThan(b.y+b.height);expect(t.x+t.width).toBeLessThanOrEqual(b.x+b.width+1);
 await page.keyboard.press('Escape');await expect(tip).toHaveCount(0);await page.reload();await expect(page.locator('html')).toHaveAttribute('data-color-mode','light');
 await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(tip).toHaveCount(0);
});
test('all rotating roles keep the identity line stable and previews are capped at seventy percent',async({page})=>{
 await page.clock.install();await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.clock.runFor(1100);
 const rect=()=>page.locator('.intro-identity').evaluate(el=>{const r=el.getBoundingClientRect();return[r.x,r.y,r.width,r.height]});const before=await rect();
 const roles=new Set();for(let i=0;i<8;i++){roles.add(await page.locator('.role-rotator').getAttribute('data-role'));expect(await rect()).toEqual(before);await page.clock.fastForward(2281)}
 expect(roles.has('prototyper')).toBe(true);expect(roles.has('storyteller')).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.locator('.recent-project-link').first().hover();
 for(const [width,height] of [[1440,1000],[2560,500]]){await page.setViewportSize({width,height});await page.locator('.recent-project-link').first().hover();const art=await page.locator('.recent-preview-art').boundingBox();expect(art.width).toBeCloseTo(Math.min(width/2-56,(height-32)*1.6)*.7,1)}
});
test('song changes briefly announce a random phrase without a waveform, then restore metadata',async({page})=>{
 await page.clock.install();await page.emulateMedia({reducedMotion:'reduce'});let title='First song';
 await page.route('**/api/listening',r=>r.fulfill({json:{track:{title,artist:'Artist',url:'https://www.last.fm/music/fixture',playing:true},recent:[]}}));
 await page.goto('/');await expect(page.locator('.now-playing-title')).toHaveText(title);await expect(page.locator('.listening-waveform')).toHaveCount(0);
 title='Second song';await page.clock.fastForward(20001);await expect(page.locator('.now-playing-title')).toHaveText(/Now playing|Now scrobbling|Now jammin/);await expect(page.locator('.now-playing-artist')).toHaveCount(0);
 await page.clock.fastForward(1601);await expect(page.locator('.now-playing-title')).toHaveText(title);await expect(page.locator('.now-playing-artist')).toHaveText('Artist');
 await page.clock.fastForward(20001);await expect(page.locator('.now-playing-title')).toHaveText(title);
});

test('main content centers between the header and bottom footer and matches muted heading typography',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 for(const [width,height]of [[1440,1200],[900,1100],[390,1100]]){
  await page.setViewportSize({width,height});
  const layout=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{main:rect('.collection-main'),hero:rect('.collection-hero'),projects:rect('.recent-projects'),footer:rect('.collection-footer'),header:rect('.collection-header')}});
  expect((layout.hero.y+layout.projects.bottom)/2).toBeCloseTo((layout.main.y+layout.main.bottom)/2,0);
  expect(layout.footer.bottom).toBeCloseTo(height-(width<880?28:30),0);expect(layout.hero.y).toBeGreaterThanOrEqual(layout.header.bottom);
  const styles=await page.locator('.recent-projects h2,.bio-continuation').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return[s.color,s.fontSize,s.fontWeight,s.letterSpacing,s.lineHeight]}));expect(styles[0]).toEqual(styles[1]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
test('light tooltip waits for the completed theme transition then expires',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.getByRole('button',{name:'Switch to light mode'}).click();
 const tip=page.getByRole('tooltip');await expect(page.locator('html')).toHaveClass(/theme-transition/);await expect(tip).toHaveCount(0);
 await expect(page.locator('html')).not.toHaveClass(/theme-transition/);await expect(tip).toBeVisible();await expect(tip).toHaveCount(0,{timeout:4000});
});

test('theme preference unfolds compactly and remains mounted through its folding exit',async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.getByRole('button',{name:'Switch to light mode'}).click();
 await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
 const tip=page.locator('.theme-preference-tip');await expect(tip).toHaveAttribute('data-state','open');
 await expect(tip).toHaveText('Josh prefers dark theme on this site.');
 await tip.evaluate(async el=>{await Promise.allSettled(el.getAnimations({subtree:true}).map(a=>a.finished))});
 const size=await tip.boundingBox();expect(size.height).toBeLessThan(40);expect(size.width).toBeLessThanOrEqual(240);
 await tip.screenshot({path:testInfo.outputPath('compact-theme-tooltip.png')});
 await page.keyboard.press('Escape');await expect(tip).toHaveAttribute('data-state','closing');await expect(tip).toHaveAttribute('aria-hidden','true');
 await expect(page.getByRole('tooltip')).toHaveCount(0);await expect(tip).toHaveCount(0);
});
