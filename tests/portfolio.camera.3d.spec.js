import { filmPhotos } from "../src/content/film-photos.js";
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

test('camera and zine dither sample their live render and release capture after revealing',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>{window.previewCoverage={};new MutationObserver(()=>{
  const el=document.querySelector('.recent-preview-dither[data-source="content"][data-state="revealing"]');if(!el)return;
  const kind=el.closest('.recent-preview-content').dataset.kind,pixels=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  window.previewCoverage[kind]=Math.max(window.previewCoverage[kind]||0,pixels.filter((v,i)=>i%4===3&&v>0).length/(el.width*el.height));
 }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-state','data-source']})});
 await load(page);await page.emulateMedia({reducedMotion:'no-preference'});const nav=page.getByRole('navigation',{name:'Recent projects'});
 for(const name of [/Say cheese!/,/Zine of Extracurriculars/]){
  await nav.getByRole('link',{name}).hover();const dither=nav.locator('.recent-preview-dither');await expect(dither).toHaveAttribute('data-source','content',{timeout:60000});await expect(dither).toHaveAttribute('data-state','complete',{timeout:15000});await expect(nav.locator('[data-preview-capture]')).toHaveCount(0);await expect(nav.locator('.recent-preview-source')).toHaveCSS('opacity','1');
  const coverage=await dither.evaluate(el=>window.previewCoverage[el.closest('.recent-preview-content').dataset.kind]);expect(coverage).toBeGreaterThan(.005);expect(coverage).toBeLessThan(.3);
 }
});
