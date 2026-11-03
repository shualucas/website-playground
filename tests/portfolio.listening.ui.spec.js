import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test.use({ webgl: false });

test("footer links and music stay usable on small screens without WebGL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/");
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true");
  await expect(page.locator(".collection-header").getByRole("link", { name: "Zine edition" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download zine source" })).toHaveCount(0);
  const footer = page.locator(".collection-footer");
  await expect(footer.getByRole("link", { name: "shualucas on X" })).toHaveAttribute("href", "https://x.com/shualucas");
  await expect(footer.locator("figcaption")).toHaveCount(0);
  const idleColors=await footer.locator(".profile-links .link-copy").evaluateAll(links=>links.map(link=>getComputedStyle(link).color));expect(new Set(idleColors).size).toBe(1);
  await expect(footer.locator(".now-playing")).toHaveAttribute("href", "https://www.last.fm/user/shualucas");
  const href = await footer.locator(".now-playing").getAttribute("href");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(footer.locator(".now-playing")).toHaveAttribute("href", href);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const link of await footer.locator('.profile-links a').all()) { const box=await link.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44); }
  await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("Last.fm refreshes every 20 seconds and reveals history above the song without moving the page", async ({ page }) => {
  const initial = new Date("2026-10-29T12:00:00Z"); await page.clock.install({ time:initial }); await page.clock.pauseAt(new Date(initial.getTime()+1000));
  let request = 0;

  await page.route("**/api/listening", route => {
    request++;
    const track = {title:"Fixture track",artist:"Fixture artist",url:"https://www.last.fm/music/fixture",artwork:"/cartridges/labels/search-tonal.svg",playing:request===1};
    return route.fulfill({status:request>2?502:200,contentType:"application/json",body:JSON.stringify({track,recent:Array.from({length:5},(_,i)=>({...track,title:`Past track ${i+1}`,playing:false}))})});
  });
  await page.goto("/"); const footer=page.locator(".now-playing");
  await expect(footer).toHaveAttribute("data-track","Fixture track"); await expect(footer).toContainText(/now-ish listening|currently spinning|in the rotation/);
  await expect(footer).toContainText("Fixture artist"); await expect(footer.locator(".listening-indicator")).toHaveCount(1);
  await expect(footer.locator("img")).toHaveAttribute("src","/cartridges/labels/search-tonal.svg");
  const toggle=page.getByRole("button",{name:"Show last five songs"}); await toggle.scrollIntoViewIfNeeded();
  await page.evaluate(()=>document.fonts.ready);await expect(page.locator('.listening-current')).toHaveAttribute('data-reveal-ready','true');await toggle.focus();
  const before=await page.evaluate(()=>({scrollY, height:document.documentElement.scrollHeight, current:document.querySelector('.listening-current').getBoundingClientRect().y}));
  await toggle.click();
  const dialog=page.getByRole("region",{name:"Recently listened"});await expect(dialog).toBeVisible();await expect(dialog.locator("li")).toHaveCount(5);
  const panel=await dialog.boundingBox(), current=await page.locator(".listening-current").boundingBox();expect(panel.y+panel.height).toBeLessThanOrEqual(current.y+1);
  await expect(toggle).toBeFocused();
  expect(await dialog.evaluate(el=>getComputedStyle(el).position)).toBe("absolute");
  expect(await dialog.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  expect(await dialog.evaluate(el=>getComputedStyle(el).paddingTop)).toBe("0px");
  expect(await dialog.evaluate(el=>getComputedStyle(el).borderRadius)).toBe("0px");
  expect(await dialog.evaluate(el=>getComputedStyle(el).boxShadow)).toBe("none");
  expect(await dialog.locator("li").first().evaluate(el=>el.style.getPropertyValue("--history-delay"))).toBe("260ms");
  expect(await dialog.locator("li").last().evaluate(el=>el.style.getPropertyValue("--history-delay"))).toBe("0ms");
  const after=await page.evaluate(()=>({scrollY, height:document.documentElement.scrollHeight, current:document.querySelector('.listening-current').getBoundingClientRect().y}));
  expect(after).toEqual(before);
  const art=await footer.locator(".listening-artwork").boundingBox(),copy=await footer.locator(".now-playing-copy").boundingBox();
  const pastArt=await dialog.locator(".listening-artwork").first().boundingBox(),pastCopy=await dialog.locator(".listening-song").first().boundingBox();
  expect(pastArt.x).toBeCloseTo(art.x,1);expect(pastCopy.x).toBeCloseTo(copy.x,1);
  expect(art.height).toBeCloseTo(copy.height,1);expect(copy.height).toBeCloseTo(37.96875,1);await expect(page.locator('.listening-widget')).toHaveCSS('width','200px');await expect(footer.locator('.now-playing-title')).toHaveCSS('font-size','9.375px');await expect(dialog.locator("ol")).toHaveCSS("gap","7.5px");
  expect(art.x+art.width).toBeLessThan(copy.x);expect(art.height).toBeCloseTo(pastArt.height,2);expect(art.width).toBeCloseTo(pastArt.width,2);
  const green=await footer.locator(".listening-indicator").evaluate(el=>getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number));
  expect(green[1]).toBeGreaterThan(green[0]);expect(green[1]).toBeGreaterThan(green[2]);
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);await expect(toggle).toBeFocused();
  await page.clock.fastForward(20000);await expect(footer).toContainText("last listened");await expect(footer.locator(".listening-indicator")).toHaveCount(0);expect(request).toBe(2);
  await page.clock.fastForward(20000);await expect(footer).toContainText("last listened");await expect(footer).toHaveAttribute("data-track","Fixture track");
  await expect(page.locator(".listening-widget")).toHaveAttribute("data-listening-status","unavailable");
  await toggle.click();await expect(dialog).toContainText("Showing your last available history.");
  await expect(footer).toHaveAttribute("href","https://www.last.fm/music/fixture");
});

test("listening history animates closed, can reopen mid-exit, and dismisses immediately with reduced motion", async ({ page }) => {
  const initial=new Date('2026-10-29T19:00:00Z');await page.clock.install({time:initial});await page.clock.pauseAt(new Date(initial.getTime()+1000));
  await page.emulateMedia({reducedMotion:'no-preference'});

  const track={title:'Current song',artist:'Fixture artist',url:'https://www.last.fm/music/fixture',playing:true,artwork:''};
  await page.route('**/api/listening',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({track,recent:Array.from({length:5},(_,i)=>({...track,title:`Past song ${i+1}`,playing:false}))})}));
  await page.goto('/');await expect(page.locator('.now-playing')).toHaveAttribute('data-track','Current song');
  const toggle=page.getByRole('button',{name:'Show last five songs'}),panel=page.locator('.listening-history');
  await toggle.scrollIntoViewIfNeeded();await page.clock.fastForward(5000);
  await toggle.click();await expect(panel).toHaveAttribute('data-state','open');
  const before=await page.evaluate(()=>({scrollY,height:document.documentElement.scrollHeight,y:document.querySelector('.listening-current').getBoundingClientRect().y}));
  await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(panel).toHaveAttribute('data-state','closing');await expect(panel).toHaveAttribute('aria-hidden','true');await expect(panel).toHaveAttribute('inert','');
  await expect(panel).toHaveCSS('transition-duration','0.28s');
  await page.clock.fastForward(150);await expect(panel).toHaveCount(1);
  // Reopening cancels the previous dismissal timer, without a forced remount.
  await toggle.click();await expect(panel).toHaveAttribute('data-state','open');await expect(panel).not.toHaveAttribute('inert','');
  await page.clock.fastForward(400);await expect(panel).toHaveCount(1);await expect(toggle).toHaveAttribute('aria-expanded','true');
  await panel.locator('a').first().focus();await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(panel).toHaveAttribute('data-state','closing');
  await page.clock.fastForward(321);await expect(panel).toHaveCount(0);
  expect(await page.evaluate(()=>({scrollY,height:document.documentElement.scrollHeight,y:document.querySelector('.listening-current').getBoundingClientRect().y}))).toEqual(before);
  await page.emulateMedia({reducedMotion:'reduce'});await toggle.click();await expect(panel).toHaveCount(1);await toggle.click();await expect(panel).toHaveCount(0);
});

test("empty listening history, unavailable artwork and API failure remain usable", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});

  let payload={track:null,recent:[]},failed=false;
  await page.route("**/api/listening",route=>route.fulfill({status:failed?502:200,contentType:"application/json",body:JSON.stringify(payload)}));
  await page.route("**/missing-art.png",route=>route.fulfill({status:404,body:""}));
  await page.goto("/");await expect(page.locator(".now-playing")).toContainText("Nothing scrobbled yet");
  await page.getByRole("button",{name:"Show last five songs"}).click();await expect(page.getByRole("region",{name:"Recently listened"})).toContainText("Your first scrobbles will appear here.");
  await page.getByRole("button",{name:"Show last five songs"}).click();
  payload={track:{title:"No artwork",artist:"An artist",artwork:"/missing-art.png",url:"https://www.last.fm/music/fixture",playing:false},recent:[]};
  await page.reload();await expect(page.locator(".now-playing img")).toHaveCount(0);await expect(page.locator(".now-playing .listening-artwork svg")).toBeVisible();
  await expect(page.locator(".now-playing")).toContainText("No artwork");
  failed=true;await page.reload();await expect(page.locator(".now-playing")).toContainText("Listening unavailable");
  await page.getByRole("button",{name:"Show last five songs"}).click();await expect(page.getByRole("region",{name:"Recently listened"})).toContainText("temporarily unavailable");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator("audio,video")).toHaveCount(0);
});

test("song changes crossfade without shifting the footer or replaying on unchanged polls", async ({ page }) => {
  const initial=new Date('2026-10-29T19:00:00Z');await page.clock.install({time:initial});await page.clock.pauseAt(new Date(initial.getTime()+1000));
  await page.emulateMedia({reducedMotion:'no-preference'});

  let calls=0;await page.route('**/api/listening',route=>{calls++;const title=calls===1?'First song':calls<4?'Second song':'Third song';return route.fulfill({contentType:'application/json',body:JSON.stringify({track:{title,artist:'Fixture artist',url:`https://www.last.fm/music/${calls===1?'first':calls<4?'second':'third'}`,playing:true,artwork:''},recent:[]})});});
  await page.goto('/');const link=page.locator('.now-playing');await expect(link).toHaveAttribute('data-track','First song');await link.scrollIntoViewIfNeeded();
  await page.evaluate(()=>document.fonts.ready);await page.clock.fastForward(5000);await expect(page.locator('.listening-current')).toHaveAttribute('data-reveal-ready','true');
  const before=await page.locator('.listening-current').boundingBox();
  await page.clock.fastForward(20000);await expect(link).toHaveAttribute('data-track','Second song');
  const outgoing=link.locator('.now-playing-outgoing');await expect(outgoing).toHaveAttribute('aria-hidden','true');await expect(outgoing).toContainText('First song');
  await expect(link.locator('.now-playing-track.is-entering')).toHaveCSS('animation-name','track-enter');
  await expect(link).toHaveAttribute('href','https://www.last.fm/music/second');
  const during=await page.locator('.listening-current').boundingBox();expect(during.height).toBe(before.height);expect(during.y).toBe(before.y);
  await page.clock.fastForward(401);await expect(outgoing).toHaveCount(0);
  await page.clock.fastForward(20000);await expect(link.locator('.now-playing-transition')).toHaveAttribute('data-changing','false');
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.fastForward(20000);await expect(link).toHaveAttribute('data-track','Third song');await expect(outgoing).toHaveCount(0);
});

test('history songs share the current-track gap and dismiss for project browsing without reopening',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});

  const track={title:'Current track',artist:'An artist',url:'https://www.last.fm/music/fixture',artwork:'',playing:true};
  await page.route('**/api/listening',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({track,recent:Array.from({length:5},(_,i)=>({...track,title:`Previous ${i+1}`,playing:false}))})}));
  await page.goto('/');await expect(page.locator('.collection')).toHaveAttribute('data-status','fallback');
  const toggle=page.getByRole('button',{name:'Show last five songs'}),history=page.locator('.listening-history');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await toggle.click();await expect(history).toHaveCount(1);
    const gaps=await page.evaluate(()=>{
      const all=[...document.querySelectorAll('.listening-history .listening-artwork'),document.querySelector('.listening-current .listening-artwork')].map(el=>el.getBoundingClientRect());
      return all.slice(1).map((art,i)=>art.top-all[i].bottom);
    });
    expect(gaps).toHaveLength(5);for(const gap of gaps)expect(gap).toBeCloseTo(7.5,1);
    await toggle.click();await expect(history).toHaveCount(0);
  }
  await page.setViewportSize({width:1440,height:1000});
  const links=page.getByRole('navigation',{name:'Recent projects'}).locator('.recent-project-link');
  for(const link of await links.all()){
    await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');await link.hover();
    await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(history).toHaveCount(0);
    await page.mouse.move(2,2);await expect(toggle).toHaveAttribute('aria-expanded','false');
  }
  await toggle.click();await expect(history).toHaveCount(1);await page.getByRole('button',{name:'Open Search cartridge',exact:true}).hover();await expect(history).toHaveCount(0);
  await page.mouse.move(2,2);await toggle.click();await expect(history).toHaveCount(1);
  await links.first().focus();await page.keyboard.press('Tab');await expect(links.nth(1)).toBeFocused();await expect(history).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});await toggle.click();await expect(history).toHaveAttribute('data-state','open');
  await links.first().hover();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(history).toHaveAttribute('data-state','closing');await expect(history).toHaveCount(0);
});
