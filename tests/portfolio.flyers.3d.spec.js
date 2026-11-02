import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test("zine snapshot is downloadable and preserved edition remains runnable", async ({ page, request }) => {
  test.setTimeout(120000);
  const response = await request.get("/versions/portfolio-zine-v1-source.zip"); expect(response.ok()).toBe(true);
  const bytes = await response.body(); expect(bytes.subarray(0, 2).toString()).toBe("PK"); expect(bytes.length).toBeGreaterThan(100000);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/zine/?project=about");
  await expect(page.locator(".spellbook")).toHaveAttribute("data-presentation", "ready", { timeout: 90000 });
  await expect(page.locator(".book-stage")).toHaveAttribute("data-phase", "ready", { timeout: 90000 });
  await expect(page.getByRole("link", { name: "Download zine source" })).toHaveAttribute("href", "/versions/portfolio-zine-v1-source.zip");
  await expect(page.getByRole("link", { name: "Download zine source" })).toHaveAttribute("download", "");
});

test("flyer layouts preserve every source aspect ratio and fill a consistent physical page", async ({ page }) => {
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const {prepareFlyerPages,flyerPage}=await import('/src/after-hours/flyers.js');
    const spreads=await prepareFlyerPages();
    return {page:flyerPage,faces:spreads.flatMap(spread=>[spread.left,spread.right]).map(canvas=>({id:canvas.dataset.flyerId,fit:canvas.dataset.fit?JSON.parse(canvas.dataset.fit):null,size:[canvas.width,canvas.height]}))};
  });
  expect(result.faces.map(face=>face.id).filter(Boolean)).toEqual(['wavform','metronome','ghosts-n-stuff','jornada-coffee','picnic']);
  for(const face of result.faces){expect(face.size).toEqual([1110,1280]);if(!face.fit)continue;const fit=face.fit;expect(fit.width/fit.height).toBeCloseTo(fit.sourceWidth/fit.sourceHeight,8);expect(fit.x).toBeGreaterThanOrEqual(0);expect(fit.y).toBeGreaterThanOrEqual(0);expect(fit.x+fit.width).toBeLessThanOrEqual(1110.001);expect(fit.y+fit.height).toBeLessThanOrEqual(1280.001);}
  expect(result.faces[3].fit.x).toBe(103);expect(result.faces[4].fit.y).toBeGreaterThan(0);
});

test("flyer zine prints one flyer per page through forward and reverse turns", async ({ page }) => {
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/after-hours/');
  const book=page.getByRole('region',{name:'Interactive zine of extracurriculars'});
  await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});await expect(book).toHaveAttribute('data-flyer-count','5');await expect(book).toHaveAttribute('data-page-count','8');
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Home'})).toHaveAttribute('href','/');
  await expect(page.locator('.after-hours [data-reveal]')).toHaveCount(2);
  await expect(page.locator('.zine-footer,.zine-pagination,.zine-current')).toHaveCount(0);
  await expect(page.locator('.zine-heading')).toHaveCount(0);
  await expect(book).toHaveAttribute('data-paper-inserts','5');
  await expect(page.getByText('Vol. 01',{exact:true})).toHaveCount(0);
  await expect(page.locator('.after-hours')).toHaveCSS('background-color','rgb(240, 240, 240)');
  expect(Number(await book.getAttribute('data-page-aspect'))).toBeCloseTo(1110/1280,8);
  await page.getByRole('button',{name:'Switch to dark mode'}).focus();
  const faces=[['wavform','metronome'],['ghosts-n-stuff','jornada-coffee'],['picnic','']];
  const maps=[];
  for(let i=0;i<faces.length;i++){await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print',faces[i][0]);await expect(book).toHaveAttribute('data-right-print',faces[i][1]);maps.push([await book.getAttribute('data-left-artwork'),await book.getAttribute('data-right-artwork')]);}
  await page.keyboard.press('ArrowLeft');await expect(book).toHaveAttribute('data-left-print','ghosts-n-stuff');
  expect([await book.getAttribute('data-left-artwork'),await book.getAttribute('data-right-artwork')]).toEqual(maps[1]);
  await page.setViewportSize({width:390,height:844});await expect(book).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('r');await expect(book).toHaveAttribute('data-view','cover');
  await book.evaluate(el=>el.blur());
  await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print','wavform');
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(book).toHaveAttribute('data-left-print','wavform');
  await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
  await expect(page.locator('.after-hours')).toHaveCSS('background-color','rgb(16, 17, 16)');
  await page.evaluate(()=>{const input=document.createElement('input');input.value='typing';document.body.append(input);input.focus();});
  await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print','wavform');
});

test("sticky notes open their own readable notes without turning or dragging the page", async ({page})=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/after-hours/');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const book=page.getByRole('region',{name:'Interactive zine of extracurriculars'});
  await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-left-print','wavform');
  const hit=JSON.parse(await book.getAttribute('data-note-hits')).find(hit=>hit.id==='metronome');
  await page.mouse.click(hit.x,hit.y);
  const dialog=page.getByRole('dialog',{name:'Metronome'});await expect(dialog).toBeVisible();await expect(dialog).toContainText('my collective kiteclub.fm took over the nighttime commute,');await expect(dialog).toHaveCSS('border-radius','0px');
  await expect(dialog.locator('p')).toHaveCount(1);await expect(dialog.locator('.zine-note-eyebrow')).toHaveCount(0);
  const copy=await dialog.locator('#zine-note-body').textContent();expect(copy).toBe(copy.toLowerCase());expect(copy).not.toContain('—');
  expect(await dialog.locator('#zine-note-body').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Caveat');
  expect(await page.evaluate(()=>document.fonts.check('400 26px "Caveat"'))).toBe(true);
  await expect(page.getByRole('button',{name:'Close note',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('r');await expect(book).toHaveAttribute('data-settled-boundary','1');
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  const shortcut=page.getByRole('button',{name:'Read note for Wavform',exact:true});await shortcut.focus();await expect(shortcut).toBeVisible();await shortcut.press('Enter');
  await expect(page.getByRole('dialog',{name:'Wavform',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close note',exact:true}).click();await expect(shortcut).toBeFocused();
  const before=await book.getAttribute('data-orientation'),grab=JSON.parse(await book.getAttribute('data-note-hits')).find(hit=>hit.id==='metronome');
  await page.mouse.move(grab.x,grab.y);await page.mouse.down();await page.mouse.move(grab.x-70,grab.y+35,{steps:8});await page.mouse.up();
  await expect(page.locator('.zine-note-dialog')).toHaveCount(0);await expect(book).not.toHaveAttribute('data-orientation',before);await expect(book).toHaveAttribute('data-settled-boundary','1');
  expect(errors).toEqual([]);
});

test("tucked paper inserts stay attached to their leaf through opening and resetting",async({page})=>{
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {SkinnedLeaf,createLeafGeometry}=await import('/src/book/leaf.ts');
    const {createPaperInserts,hoverPaperInsert}=await import('/src/book/paper-inserts.ts');
    const geometry=createLeafGeometry(.006,4.7*1110/1280);
    const ids=[['','wavform'],['metronome','ghosts-n-stuff'],['jornada-coffee','picnic'],['','']];
    const leaves=Array.from({length:4},(_,i)=>{
      const materials=Array.from({length:6},()=>new THREE.MeshStandardMaterial({map:new THREE.Texture()}));
      ids[i].forEach((id,face)=>{const canvas=document.createElement('canvas');if(id)canvas.dataset.flyerId=id;materials[face+2].map=new THREE.CanvasTexture(canvas)});
      return new SkinnedLeaf(i,i===0||i===3,4,geometry,materials,4.7*1110/1280);
    });
    const meshes=createPaperInserts(leaves,params=>new THREE.MeshStandardMaterial(params),map=>map);
    let hoverLift=0,adhesiveShift=0,hoverResetError=0;
    for(const mesh of meshes){
      const p=mesh.geometry.attributes.position,rest=new Float32Array(p.array);
      hoverPaperInsert(mesh,1);
      for(let i=0;i<p.count;i++){
        const delta=Math.abs(p.getY(i)-rest[i*3+1]);hoverLift=Math.max(hoverLift,delta);
        if(rest[i*3]<=leaves[0].width&&Math.abs(rest[i*3+2])<=2.35)adhesiveShift=Math.max(adhesiveShift,delta);
      }
      hoverPaperInsert(mesh,0);
      for(let i=0;i<p.array.length;i++)hoverResetError=Math.max(hoverResetError,Math.abs(p.array[i]-rest[i]));
    }
    const sample=mesh=>mesh.getVertexPosition(49,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
    leaves.forEach(leaf=>leaf.updateWorld());const before=meshes.map(sample);
    leaves.forEach(leaf=>{leaf.snap(1);leaf.updateWorld()});const opened=meshes.map(sample);
    leaves.forEach(leaf=>{leaf.snap(0);leaf.updateWorld()});const restored=meshes.map(sample);
    const onSurface=meshes.every(mesh=>{const p=mesh.geometry.attributes.position,side=mesh.userData.printFace===0?1:-1,min=leaves[mesh.userData.leaf].cover?.007:.004;for(let i=0;i<p.count;i++)if(p.getX(i)<=leaves[0].width&&Math.abs(p.getZ(i))<=2.35&&side*p.getY(i)<min)return false;return true});
    const square=meshes.every(mesh=>{const p=mesh.geometry.attributes.position;return Math.abs(Math.hypot(p.getX(0)-p.getX(98),p.getZ(0)-p.getZ(98))-1.05*Math.SQRT2)<.00001});
    const readable=meshes.every(mesh=>{const uv=mesh.geometry.attributes.uv;return (uv.getX(8)-uv.getX(0))*(mesh.userData.printFace===0?1:-1)>0});
    return {count:meshes.length,onSurface,square,readable,hoverLift,adhesiveShift,hoverResetError,ids:meshes.map(mesh=>mesh.userData.flyerId),sizes:meshes.map(mesh=>[mesh.geometry.parameters.width,mesh.geometry.parameters.height]),shared:meshes.every(mesh=>mesh.skeleton===leaves[mesh.userData.leaf].mesh.skeleton),
      crossesSpine:before.every((v,i)=>v.x>0&&opened[i].x<0),resetError:Math.max(...before.map((v,i)=>v.distanceTo(restored[i]))),
      finite:[...before,...opened,...restored].every(v=>v.toArray().every(Number.isFinite))};
  });
  expect(result.count).toBe(5);expect(result.onSurface).toBe(true);expect(result.square).toBe(true);expect(result.ids).toEqual(['wavform','metronome','ghosts-n-stuff','jornada-coffee','picnic']);expect(result.sizes).toEqual(Array(5).fill([1.05,1.05]));expect(result.shared).toBe(true);expect(result.crossesSpine).toBe(true);expect(result.finite).toBe(true);expect(result.resetError).toBeLessThan(.00001);
  expect(result.hoverLift).toBeGreaterThan(.1);expect(result.adhesiveShift).toBe(0);expect(result.hoverResetError).toBe(0);
  expect(result.readable).toBe(true);
});

test("printed ink preserves source colors under bright light and can still darken in shadow",async({page})=>{
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {preservePrintColors}=await import('/src/book/printed-paper.ts');
    const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(8,8);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=2;
    const light=new THREE.AmbientLight('#ffffff',10);scene.add(light);
    const geometry=new THREE.PlaneGeometry(2,2),pixels=new Uint8Array([32,154,69,255]);
    const map=new THREE.DataTexture(pixels,1,1);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;
    const swatches=[[32,154,69],[55,126,240],[239,82,35],[36,36,36]],samples=[];
    const read=()=>{renderer.render(scene,camera);const out=new Uint8Array(4),gl=renderer.getContext();gl.readPixels(4,4,1,1,gl.RGBA,gl.UNSIGNED_BYTE,out);return [...out].slice(0,3)};
    for(const Material of [THREE.MeshPhongMaterial,THREE.MeshPhysicalMaterial]){
      const material=preservePrintColors(new Material({map})),mesh=new THREE.Mesh(geometry,material);scene.add(mesh);light.intensity=10;
      const bright=swatches.map(rgb=>{pixels.set(rgb);map.needsUpdate=true;return read()});light.intensity=.05;const dark=read();samples.push({bright,dark});scene.remove(mesh);material.dispose();
    }
    map.dispose();geometry.dispose();renderer.dispose();renderer.forceContextLoss();return {swatches,samples};
  });
  for(const sample of result.samples){sample.bright.forEach((rgb,i)=>rgb.forEach((value,channel)=>expect(Math.abs(value-result.swatches[i][channel])).toBeLessThanOrEqual(2)));expect(sample.dark.every(value=>value<30)).toBe(true);}
});

test("binding follows cover hinges and stays below opened cover surfaces through reversals", async ({ page }) => {
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {SkinnedLeaf,createLeafGeometry}=await import('/src/book/leaf.ts');
    const {TurnScheduler}=await import('/src/book/turn-scheduler.ts');
    const {createBinding}=await import('/src/book/binding.ts');
    const material=new THREE.MeshPhongMaterial({map:new THREE.Texture()});
    const leaves=Array.from({length:4},(_,i)=>new SkinnedLeaf(i,i===0||i===3,4,createLeafGeometry(i===0||i===3?.012:.006,4.0758),Array(6).fill(material),4.0758));
    const binding=createBinding(material,material,material,leaves),scheduler=new TurnScheduler(leaves);
    let maxJoinDistance=0, minFoldClearance=Infinity, penetrations=0, invalid=0, openStates=0;
    const inspect=()=>{
      binding.update();
      const p=binding.spine.geometry.attributes.position,uv=binding.spine.geometry.attributes.uv;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i);if(!Number.isFinite(x+y))invalid++;
        if(uv.getX(i)===0)maxJoinDistance=Math.max(maxJoinDistance,Math.hypot(x-leaves[0].group.position.x,y-leaves[0].group.position.y));
        if(uv.getX(i)===1)maxJoinDistance=Math.max(maxJoinDistance,Math.hypot(x-leaves[3].group.position.x,y-leaves[3].group.position.y));
        for(const cover of [leaves[0],leaves[3]]){
          const a=cover.hingeAngle+cover.bones[0].rotation.z,dx=x-cover.group.position.x,dy=y-cover.group.position.y;
          const along=dx*Math.cos(a)+dy*Math.sin(a),normal=-dx*Math.sin(a)+dy*Math.cos(a);
          if(along>.026&&Math.abs(normal)<.006)penetrations++;
        }
      }
      if(binding.fold.visible){
        openStates++;const boundary=leaves.findIndex(l=>l.progress<.5),q=binding.fold.geometry.attributes.position;
        const underside=Math.min(...[leaves[boundary-1],leaves[boundary]].map(l=>l.group.position.y-(l.cover?.006:.003)));
        for(let i=0;i<q.count;i++)minFoldClearance=Math.min(minFoldClearance,underside-q.getY(i));
      }
    };
    for(let boundary=0;boundary<=4;boundary++){scheduler.snap(boundary);inspect();}
    scheduler.snap(0);
    for(let frame=0;frame<720;frame++){
      if(frame===0)scheduler.request(4);if(frame===45)scheduler.request(0);if(frame===100)scheduler.request(3);if(frame===240)scheduler.request(1);if(frame===400)scheduler.request(4);if(frame===560)scheduler.request(0);
      scheduler.step(1/60,0);inspect();
    }
    return {maxJoinDistance,minFoldClearance,penetrations,invalid,openStates};
  });
  expect(result.maxJoinDistance).toBeLessThan(.021);expect(result.minFoldClearance).toBeGreaterThan(.0015);
  expect(result.penetrations).toBe(0);expect(result.invalid).toBe(0);expect(result.openStates).toBeGreaterThan(2);
});

test('notes peel from the book, reverse on dismissal, and keep their irregular handwriting',async({page})=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/after-hours/');
  const book=page.locator('.after-hours-book');await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});
  await page.keyboard.press('ArrowRight');await expect(book).toHaveAttribute('data-settled-boundary','1');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const hit=JSON.parse(await book.getAttribute('data-note-hits')).find(item=>item.id==='metronome');
  await page.mouse.click(hit.x,hit.y);
  const dialog=page.getByRole('dialog',{name:'Metronome'});await expect(dialog).toBeVisible();
  const flight=await dialog.locator('.zine-note-paper').evaluate(el=>{
    const animation=el.getAnimations()[0];animation.pause();animation.currentTime=0;
    const rect=el.getBoundingClientRect(),matrix=getComputedStyle(el).transform;
    return {width:rect.width,matrix};
  });
  expect(flight.matrix).toContain('matrix3d');expect(flight.width).toBeLessThan(250);
  await dialog.locator('.zine-note-paper').evaluate(el=>{const animation=el.getAnimations()[0];animation.currentTime=600;animation.play()});
  await expect(dialog).toHaveAttribute('data-state','reading');
  expect(await dialog.locator('.zine-note-scrim').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(255, 255, 255, 0.88)');
  const poses=await dialog.locator('.handwritten-word').evaluateAll(words=>words.map(word=>getComputedStyle(word).transform));expect(new Set(poses).size).toBeGreaterThan(15);
  await page.mouse.move(4,4);await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');await expect(dialog).toHaveAttribute('data-state','returning');
  await expect(dialog).toHaveCount(0);await expect(book).toHaveAttribute('data-settled-boundary','1');
  const shortcut=page.getByRole('button',{name:'Read note for Metronome',exact:true});await shortcut.focus();await shortcut.press('Enter');
  await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(shortcut).toBeFocused();
  await shortcut.press('Enter');await expect(dialog).toHaveAttribute('data-state','reading');await page.mouse.click(8,8);await expect(dialog).toHaveCount(0);
});

test('author tuning stays opt-in, applies live, persists, exports and resets',async({page})=>{
  test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/after-hours/?tune=1');
  const book=page.locator('.after-hours-book'),panel=page.getByRole('complementary',{name:'Zine motion tuning'});
  await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});await expect(panel).toBeVisible();
  const speed=page.locator('#physics-turnSpeed');await speed.focus();await speed.press('End');
  await expect.poll(()=>book.getAttribute('data-paper-physics').then(JSON.parse).then(value=>value.turnSpeed)).toBe(1.5);
  await panel.getByRole('button',{name:'Next page',exact:true}).click();await expect(book).toHaveAttribute('data-view','spread');
  await panel.getByRole('button',{name:'Save',exact:true}).click();await expect(panel.locator('.physics-status')).toHaveText('Saved in this browser');
  await page.reload();await expect(book).toHaveAttribute('data-phase','ready',{timeout:90000});await expect(speed).toHaveValue('1.5');
  const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export JSON'}).click();const exported=await download;expect(exported.suggestedFilename()).toBe('zine-physics.json');
  const {readFile}=await import('node:fs/promises');const data=JSON.parse(await readFile(await exported.path(),'utf8'));expect(data.physics.turnSpeed).toBe(1.5);
  await panel.getByRole('button',{name:'Reset',exact:true}).click();await expect(speed).toHaveValue('1');
  expect(await page.evaluate(()=>localStorage.getItem('zine-paper-physics-v1'))).toBe(null);
  await page.goto('/after-hours/');await expect(page.getByRole('link',{name:'Home',exact:true})).toBeVisible();await expect(panel).toHaveCount(0);
 });

test('page turns reverse their spine bend while gravity stays in world space',async({page})=>{
 await page.goto('/tests/fixtures/blank.html');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const {SkinnedLeaf,createLeafGeometry}=await import('/src/book/leaf.ts');const {normalizePaperPhysics}=await import('/src/book/paper-physics.ts');
  const texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:texture}),geometry=createLeafGeometry();
  const leaf=new SkinnedLeaf(0,false,1,geometry,Array(6).fill(material));const root=new THREE.Group();root.add(leaf.group);
  const config=normalizePaperPhysics({gravitySag:0});leaf.setPhysics(config);
  const sample=forward=>{leaf.snap(forward?0:1);leaf.turnTo(forward);for(let i=0;i<400;i++){leaf.step(1/120,0);if(forward?leaf.progress>=.5:leaf.progress<=.5)break}return leaf.bones.slice(0,9).reduce((n,b)=>n+b.rotation.z,0)};
  const forward=sample(true),backward=sample(false);
  const sag=(strength,rotation)=>{root.rotation.z=rotation;leaf.setPhysics(normalizePaperPhysics({gravitySag:strength}));leaf.snap(0);return leaf.bones.reduce((n,b)=>n+b.rotation.z,0)};
  const flat=sag(0,0),down=sag(.7,0),inverted=sag(.7,Math.PI);
  leaf.dispose();geometry.dispose();material.dispose();texture.dispose();return{forward,backward,flat,down,inverted};
 });
 expect(result.forward).toBeLessThan(-.2);expect(result.backward).toBeGreaterThan(.2);expect(result.down).toBeLessThan(result.flat);expect(result.inverted).toBeGreaterThan(result.flat);
});
