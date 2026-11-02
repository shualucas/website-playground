import { test, expect, funFacts, names, dates, body, load, choose, point } from "./support/portfolio.js";

test("camera flash clears the grip and the strap sags in world gravity after a camera rotation", async ({ page }) => {
  await page.goto('/tests/fixtures/blank.html');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {aboutMiniatures}=await import('/src/book/miniatures.ts');
    const {CameraStrap}=await import('/src/cartridge/CameraStrap.ts');
    const scene=new THREE.Scene(),model=aboutMiniatures(params=>new THREE.MeshPhysicalMaterial(params),()=>{},true).camera;scene.add(model);
    const box=name=>new THREE.Box3().setFromObject(model.getObjectByName(name));
    const overlap=box('camera-front-grip').intersectsBox(box('camera-flash-bezel'));
    const strap=new CameraStrap(model,scene),initial=strap.report();
    const center=()=>{const p=strap.mesh.geometry.getAttribute('position'),v=new THREE.Vector3();for(let j=0;j<6;j++)v.add(new THREE.Vector3().fromBufferAttribute(p,12*6+j));return v.multiplyScalar(1/6)};
    const before=center();model.rotation.z=Math.PI;model.updateMatrixWorld(true);strap.step(0,false);const inertialDistance=before.distanceTo(center());
    for(let i=0;i<360;i++)strap.step(1/120,false);
    const rotated=strap.report();
    return {overlap,inertialDistance,initial,rotated,worldSpace:strap.mesh.parent===scene};
  });
  expect(result.overlap).toBe(false);expect(result.worldSpace).toBe(true);expect(result.inertialDistance).toBeLessThan(.00001);
  for(const pose of [result.initial,result.rotated]){expect(pose.bottom).toBeLessThan(pose.anchor[1]-.15);expect(pose.stretch).toBeLessThan(.15);}
});

test('photos use a loose Polaroid spread and retain the zine at its own address',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos/');
  await expect(page.getByRole('heading',{name:'Film photographs'})).toHaveCount(1);
  await expect(page.locator('.polaroid')).toHaveCount(6);await expect(page.locator('.after-hours-book,.photo-entry-camera')).toHaveCount(0);
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect.poll(()=>page.locator('.polaroid').evaluateAll(cards=>cards.every(card=>card.clientWidth>100))).toBe(true);
    const layout=await page.locator('.polaroid').evaluateAll(cards=>cards.map(card=>getComputedStyle(card).transform));
    expect(new Set(layout).size).toBeGreaterThan(3);
  }
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
  await page.getByRole('link',{name:'Back to Josh Lucas'}).click();
  await page.getByRole('link',{name:/Zine of Extracurriculars/}).click();await expect(page).toHaveURL(/after-hours/);
  expect(errors).toEqual([]);
});

test('camera and zine ASCII sample their live render and release capture after revealing',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await load(page);await page.emulateMedia({reducedMotion:'no-preference'});const nav=page.getByRole('navigation',{name:'Recent projects'});
 for(const name of [/Say cheese!/,/Zine of Extracurriculars/]){
  await nav.getByRole('link',{name}).hover();const ascii=nav.locator('.recent-preview-ascii');await expect(ascii).toHaveAttribute('data-source','content',{timeout:60000});await expect(ascii).toHaveAttribute('data-state','complete',{timeout:15000});await expect(nav.locator('[data-ascii-capture]')).toHaveCount(0);await expect(nav.locator('.recent-preview-source')).toHaveCSS('opacity','1');
  const coverage=await ascii.evaluate(el=>{const pixels=el.getContext('2d').getImageData(0,0,el.width,el.height).data;return pixels.filter((v,i)=>i%4===3&&v>0).length/(el.width*el.height)});expect(coverage).toBeGreaterThan(.005);expect(coverage).toBeLessThan(.3);
 }
});
