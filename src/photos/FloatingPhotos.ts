import * as THREE from 'three';
import {ditherMask} from './dither-transition';
import {screenVertex,fluidFragment,photoFragment} from './floating-shaders';
type Photo={src:string;alt:string;width:number;height:number};
type Item={mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;button:HTMLButtonElement;photo:Photo;base:THREE.Vector3;seed:number;angle:number;width:number;height:number;reveal:{value:number}};
const palettes={dark:['#0b0c0b','#30332f','#777b73','#bdc2b5','#f0f0eb'],light:['#171a16','#484e44','#878e7f','#c1c7b9','#f0f0f0']};
const random=(i:number)=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const rgb=(hex:string)=>new THREE.Vector3(...[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255) as [number,number,number]);

/** One clock owns drift, camera sway, pointer fluid, and the final dither pass. */
export class FloatingPhotos {
 private renderer:THREE.WebGLRenderer|null=null;
 private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(38,1,.1,30);
 private screen=new THREE.Scene();private fluidScene=new THREE.Scene();private screenCamera=new THREE.Camera();
 private geometry=new THREE.PlaneGeometry(2,2);private target:THREE.WebGLRenderTarget|null=null;
 private fields:THREE.WebGLRenderTarget[]=[];private fluidMaterial:THREE.ShaderMaterial|null=null;private post:THREE.ShaderMaterial|null=null;
 private items:Item[]=[];private textures=new Set<THREE.Texture>();private frame=0;private last=0;private time=0;
 private width=1;private height=1;private active=true;private visible=true;private disposed=false;
 private pointer=new THREE.Vector2(-2,-2);private previous=new THREE.Vector2(-2,-2);private hovering=false;private focused=-1;
 private drag:null|{id:number;index:number;x:number;y:number;point:THREE.Vector3;base:THREE.Vector3;moved:boolean}=null;
 private fades=new Map<number,{from:number;to:number;start:number;done:()=>void}>();
 private suppress=false;private ray=new THREE.Raycaster();private motion=matchMedia('(prefers-reduced-motion: reduce)');
 private resizeObserver:ResizeObserver;private themeObserver:MutationObserver;private observer:IntersectionObserver;
 constructor(private host:HTMLElement,photos:Photo[],private onReady:(status:string)=>void){
  this.camera.position.z=9;
  try{
   this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,powerPreference:'high-performance'});
   this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);this.renderer.autoClear=true;
   this.renderer.domElement.className='floating-photos-canvas';this.renderer.domElement.setAttribute('aria-hidden','true');host.prepend(this.renderer.domElement);
   this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
   this.fields=[0,1].map(()=>new THREE.WebGLRenderTarget(192,128,{type:THREE.HalfFloatType,depthBuffer:false}));
   this.fluidMaterial=new THREE.ShaderMaterial({vertexShader:screenVertex,fragmentShader:fluidFragment,uniforms:{previous:{value:this.fields[0].texture},texel:{value:new THREE.Vector2(1/192,1/128)},pointer:{value:this.pointer},lastPointer:{value:this.previous},dt:{value:0},aspect:{value:1},deposit:{value:0}},depthTest:false,depthWrite:false});
   this.post=new THREE.ShaderMaterial({vertexShader:screenVertex,fragmentShader:photoFragment,uniforms:{sceneTexture:{value:this.target.texture},flow:{value:this.fields[0].texture},resolution:{value:new THREE.Vector2(1,1)},pointer:{value:this.pointer},focus:{value:new THREE.Vector2(-2,-2)},background:{value:new THREE.Vector3()},ramp0:{value:new THREE.Vector3()},ramp1:{value:new THREE.Vector3()},ramp2:{value:new THREE.Vector3()},ramp3:{value:new THREE.Vector3()},ramp4:{value:new THREE.Vector3()},time:{value:0},aspect:{value:1},reduced:{value:0},hasFocus:{value:0},hovering:{value:0}},depthTest:false,depthWrite:false});
   this.fluidScene.add(new THREE.Mesh(this.geometry,this.fluidMaterial));this.screen.add(new THREE.Mesh(this.geometry,this.post));
   for(const field of this.fields){this.renderer.setRenderTarget(field);this.renderer.clear()}this.renderer.setRenderTarget(null);
  }catch{this.renderer?.dispose();this.renderer?.domElement.remove();this.renderer=null}
  photos.forEach((photo,index)=>{
   const material=new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide,toneMapped:false});
   const reveal={value:1};
   material.onBeforeCompile=shader=>{
    shader.uniforms.photoReveal=reveal;
    shader.fragmentShader='uniform float photoReveal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
     vec2 cell=mod(floor(gl_FragCoord.xy/3.),4.);
     float rank=0.;
     if(cell.y<1.){if(cell.x<1.)rank=0.;else if(cell.x<2.)rank=8.;else if(cell.x<3.)rank=2.;else rank=10.;}
     else if(cell.y<2.){if(cell.x<1.)rank=12.;else if(cell.x<2.)rank=4.;else if(cell.x<3.)rank=14.;else rank=6.;}
     else if(cell.y<3.){if(cell.x<1.)rank=3.;else if(cell.x<2.)rank=11.;else if(cell.x<3.)rank=1.;else rank=9.;}
     else{if(cell.x<1.)rank=15.;else if(cell.x<2.)rank=7.;else if(cell.x<3.)rank=13.;else rank=5.;}
     if((rank+.5)/16.>photoReveal)discard;
    `);
   };
   material.customProgramCacheKey=()=>'floating-photo-dissolve-v1';
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);this.scene.add(mesh);
   const button=host.querySelector<HTMLButtonElement>(`[data-photo-index="${index}"]`)!;
   this.items.push({mesh,button,photo,base:new THREE.Vector3(),seed:random(index+1)*Math.PI*2,angle:(random(index+30)-.5)*.4,width:1,height:1,reveal});
  });
  host.addEventListener('pointerdown',this.down);host.addEventListener('pointermove',this.move);host.addEventListener('pointerup',this.up);host.addEventListener('pointercancel',this.cancel);host.addEventListener('lostpointercapture',this.cancel);host.addEventListener('pointerleave',this.leave);host.addEventListener('click',this.click,true);host.addEventListener('keydown',this.key);host.addEventListener('focusin',this.focus);host.addEventListener('focusout',this.blur);
  window.addEventListener('blur',this.cancel);document.addEventListener('visibilitychange',this.sync);this.motion.addEventListener('change',this.sync);
  this.resizeObserver=new ResizeObserver(this.resize);this.resizeObserver.observe(host);
  this.themeObserver=new MutationObserver(this.theme);this.themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
  this.observer=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;this.sync()});this.observer.observe(host);
  this.theme();this.resize();
  const loader=new THREE.TextureLoader();
  Promise.all(this.items.map(async item=>{
   try{const texture=await loader.loadAsync(item.photo.src);if(this.disposed){texture.dispose();return}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=this.renderer?Math.min(8,this.renderer.capabilities.getMaxAnisotropy()):1;this.textures.add(texture);item.mesh.material.map=texture;item.mesh.material.opacity=1;item.mesh.material.needsUpdate=true;
    if(!this.renderer)this.fallback(item,texture.image);
   }catch{item.button.dataset.imageError='true'}
  })).then(()=>{if(!this.disposed){host.dataset.status=this.renderer?'ready':'fallback';this.onReady(this.renderer?'ready':'fallback');this.draw(0);this.sync()}});
  this.sync();
 }
 private fallback(item:Item,image:HTMLImageElement){
  const c=document.createElement('canvas');c.width=240;c.height=Math.round(c.width*item.photo.height/item.photo.width);const ctx=c.getContext('2d');if(!ctx)return;
  ctx.drawImage(image,0,0,c.width,c.height);const pixels=ctx.getImageData(0,0,c.width,c.height),ramp=palettes[document.documentElement.dataset.colorMode==='dark'?'dark':'light'].map(rgb);
  const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,v=(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114)/255,step=Math.min(1,Math.floor(v*9+(bayer[(y%4)*4+x%4]+.5)/16)/9),scaled=step*4,n=Math.min(3,Math.floor(scaled)),color=ramp[n].clone().lerp(ramp[n+1],scaled-n);pixels.data[i]=color.x*255;pixels.data[i+1]=color.y*255;pixels.data[i+2]=color.z*255}
  ctx.putImageData(pixels,0,0);item.button.querySelector<HTMLImageElement>('.floating-dither-fallback')!.src=c.toDataURL();
 }
 private theme=()=>{
  const palette=palettes[document.documentElement.dataset.colorMode==='dark'?'dark':'light'];
  if(this.post){const bg=new THREE.Color(getComputedStyle(this.host).getPropertyValue('--scene-bg').trim());bg.convertLinearToSRGB();this.post.uniforms.background.value.set(bg.r,bg.g,bg.b)}
  palette.forEach((color,i)=>{if(this.post)this.post.uniforms['ramp'+i].value.copy(rgb(color))});
  if(!this.renderer)for(const item of this.items)if(item.mesh.material.map)this.fallback(item,item.mesh.material.map.image);
  this.draw(0);
 };
 private resize=()=>{
  this.cancel();const box=this.host.getBoundingClientRect();this.width=Math.max(1,box.width);this.height=Math.max(1,box.height);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();
  const rows=Math.ceil(this.items.length/(this.width<600?3:this.width<1000?4:5)),cols=Math.ceil(this.items.length/rows),cellX=this.width/(cols+.3),cellY=this.height/(rows+.25),short=Math.max(44,Math.min(170,cellX*.57,cellY*.61));
  const worldHeight=2*Math.tan(THREE.MathUtils.degToRad(19))*9,unit=worldHeight/this.height;
  this.items.forEach((item,i)=>{
   const ratio=item.photo.width/item.photo.height,w=ratio>1?short*Math.min(ratio,1.55):short,h=w/ratio;
   const angle=i*2.399963+1.1,radius=Math.sqrt((i+.8)/this.items.length)*.84;
   const x=.5+Math.cos(angle)*radius*.46,y=.5+Math.sin(angle)*radius*.46,z=(random(i+60)-.5)*1.1;
   item.base.set((x-.5)*worldHeight*this.camera.aspect,(.5-y)*worldHeight,z);item.width=w*unit;item.height=h*unit;item.mesh.scale.set(item.width,item.height,1);
  });
  if(this.renderer){this.renderer.setSize(this.width,this.height,false);const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.target!.setSize(size.x,size.y);this.post!.uniforms.resolution.value.copy(size);this.post!.uniforms.aspect.value=this.camera.aspect;this.fluidMaterial!.uniforms.aspect.value=this.camera.aspect}
  this.draw(0);
 };
 private index(event:Event){const button=(event.target as HTMLElement)?.closest<HTMLElement>('[data-photo-index]');return button?Number(button.dataset.photoIndex):-1}
 private planePoint(x:number,y:number,z:number){const box=this.host.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-box.left)/this.width*2-1,-(y-box.top)/this.height*2+1),this.camera);return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-z),new THREE.Vector3())}
 private down=(event:PointerEvent)=>{
  const i=this.index(event);if(!this.active||i<0||event.button!==0||!event.isPrimary)return;
  const item=this.items[i],point=this.planePoint(event.clientX,event.clientY,item.base.z);if(!point)return;
  this.suppress=false;this.drag={id:event.pointerId,index:i,x:event.clientX,y:event.clientY,point,base:item.base.clone(),moved:false};item.button.setPointerCapture(event.pointerId);
 };
 private move=(event:PointerEvent)=>{
  const box=this.host.getBoundingClientRect();this.pointer.set((event.clientX-box.left)/this.width,1-(event.clientY-box.top)/this.height);this.hovering=true;
  const drag=this.drag;if(drag&&drag.id===event.pointerId){
   if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
   drag.moved=true;this.suppress=true;const item=this.items[drag.index],point=this.planePoint(event.clientX,event.clientY,item.base.z);
   if(point){item.base.x=drag.base.x+point.x-drag.point.x;item.base.y=drag.base.y+point.y-drag.point.y;this.clamp(item);item.button.dataset.dragging='true';item.mesh.material.depthTest=false;item.mesh.renderOrder=100}
  }
  if(this.motion.matches)this.draw(0);
 };
 private clamp(item:Item){const h=2*Math.tan(THREE.MathUtils.degToRad(19))*(9-item.base.z),w=h*this.camera.aspect;item.base.x=THREE.MathUtils.clamp(item.base.x,-w*.48+item.width/2,w*.48-item.width/2);item.base.y=THREE.MathUtils.clamp(item.base.y,-h*.48+item.height/2,h*.48-item.height/2)}
 private up=(event:PointerEvent)=>{
  if(this.drag?.id!==event.pointerId)return;const tap=event.pointerType==='touch'&&!this.drag.moved,button=this.items[this.drag.index].button;this.release();
  // Captured touch pointers do not consistently synthesize clicks after a drag.
  if(tap){event.preventDefault();this.suppress=true;button.click()}
 };
 private release(){const drag=this.drag;if(!drag)return;this.drag=null;const item=this.items[drag.index];item.button.dataset.dragging='false';item.mesh.material.depthTest=true;item.mesh.renderOrder=0;if(item.button.hasPointerCapture(drag.id))item.button.releasePointerCapture(drag.id);this.draw(0)}
 private cancel=()=>{if(this.drag){this.suppress=true;this.items[this.drag.index].base.copy(this.drag.base);this.release()}};
 private click=(event:MouseEvent)=>{if(this.suppress&&event.detail){event.preventDefault();event.stopPropagation();this.suppress=false}};
 private leave=()=>{this.hovering=false;if(this.motion.matches)this.draw(0)};
 private focus=(event:FocusEvent)=>{if((event.target as HTMLElement).matches(':focus-visible')){this.focused=this.index(event);this.draw(0)}};
 private blur=()=>{this.focused=-1;this.draw(0)};
 private key=(event:KeyboardEvent)=>{
  const i=this.index(event);if(i<0)return;const v:{[key:string]:number[]}={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,.15],ArrowDown:[0,-.15]};
  if(event.key==='Escape'){this.cancel();return}if(!v[event.key])return;event.preventDefault();this.items[i].base.x+=v[event.key][0];this.items[i].base.y+=v[event.key][1];this.clamp(this.items[i]);this.draw(0);
 };
 dissolve(index:number,show:boolean):Promise<void>{
  const item=this.items[index];if(!item||this.disposed)return Promise.resolve();this.fades.get(index)?.done();
  return new Promise(done=>{this.fades.set(index,{from:item.reveal.value,to:show?1:0,start:performance.now(),done});this.sync()});
 }
 setActive(active:boolean){this.active=active;if(!active)this.cancel();this.sync()}
 private sync=()=>{this.host.dataset.motion=this.motion.matches?'reduced':this.active&&this.visible&&!document.hidden?'floating':'paused';cancelAnimationFrame(this.frame);this.frame=0;this.last=0;if(document.hidden)this.cancel();if((this.active||this.fades.size)&&this.visible&&!document.hidden){this.draw(0);if(!this.motion.matches)this.frame=requestAnimationFrame(this.tick)}};
 private tick=(now:number)=>{this.frame=0;if(this.disposed)return;const dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;if(this.active)this.time+=dt;this.draw(dt);if((this.active||this.fades.size)&&this.visible&&!document.hidden&&!this.motion.matches)this.frame=requestAnimationFrame(this.tick)};
 private draw(dt:number){
  if(this.disposed)return;const t=this.motion.matches?0:this.time;
  for(const [index,fade] of this.fades){
   const p=this.motion.matches?1:Math.min(1,(performance.now()-fade.start)/320),item=this.items[index];
   item.reveal.value=fade.from+(fade.to-fade.from)*p;item.button.dataset.reveal=item.reveal.value.toFixed(3);
   item.button.style.maskSize='12px 12px';item.button.style.maskImage=this.renderer?'none':ditherMask(item.reveal.value);
   if(p===1){this.fades.delete(index);fade.done()}
  }
  this.camera.position.x=this.hovering&&!this.motion.matches?(this.pointer.x-.5)*.08:0;this.camera.position.y=this.hovering&&!this.motion.matches?(this.pointer.y-.5)*.06:0;this.camera.updateMatrixWorld();
  this.items.forEach((item,i)=>{
   const moving=this.drag?.index!==i;
   item.mesh.position.copy(item.base);if(moving){item.mesh.position.x+=Math.cos(t*.24+item.seed)*.045;item.mesh.position.y+=Math.sin(t*.38+item.seed)*.065}
   item.mesh.rotation.set(Math.sin(t*.27+item.seed)*.09,Math.cos(t*.31+item.seed)*.12,item.angle+Math.sin(t*.2+item.seed)*.035);
   item.mesh.updateMatrixWorld();const center=item.mesh.position.clone().project(this.camera),unit=2*Math.tan(THREE.MathUtils.degToRad(19))*(9-item.mesh.position.z)/this.height;
   item.button.style.left=((center.x+1)*this.width/2)+'px';item.button.style.top=((1-center.y)*this.height/2)+'px';item.button.style.width=(item.width/unit)+'px';item.button.style.height=(item.height/unit)+'px';item.button.style.transform=`translate(-50%,-50%) rotate(${-item.mesh.rotation.z}rad)`;item.button.style.zIndex=String(Math.round(20+item.base.z*10));
   if(i===this.focused&&this.post)this.post.uniforms.focus.value.set((center.x+1)/2,(center.y+1)/2);
  });
  if(this.renderer&&this.post&&this.fluidMaterial&&this.target){
   const renderer=this.renderer;
   if(dt>0){const u=this.fluidMaterial.uniforms;u.previous.value=this.fields[0].texture;u.dt.value=dt;u.deposit.value=this.hovering&&this.pointer.distanceTo(this.previous)>.0001?1:0;renderer.setRenderTarget(this.fields[1]);renderer.render(this.fluidScene,this.screenCamera);this.fields.reverse()}
   this.previous.copy(this.pointer);
   renderer.setRenderTarget(this.target);renderer.setClearColor(0,0);renderer.clear();renderer.render(this.scene,this.camera);
   const u=this.post.uniforms;u.flow.value=this.fields[0].texture;u.time.value=t;u.reduced.value=this.motion.matches?1:0;u.hasFocus.value=this.focused>=0?1:0;u.hovering.value=this.hovering?1:0;
   renderer.setRenderTarget(null);renderer.render(this.screen,this.screenCamera);
  }
  this.host.dataset.time=this.time.toFixed(3);this.host.dataset.motion=this.motion.matches?'reduced':this.active&&this.visible&&!document.hidden?'floating':'paused';this.host.dataset.wake=this.hovering?'active':'fading';
 }
 dispose(){this.disposed=true;this.fades.forEach(fade=>fade.done());this.fades.clear();this.cancel();cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.themeObserver.disconnect();this.observer.disconnect();this.motion.removeEventListener('change',this.sync);window.removeEventListener('blur',this.cancel);document.removeEventListener('visibilitychange',this.sync);
  this.host.removeEventListener('click',this.click,true);
  this.host.removeEventListener('pointerdown',this.down);this.host.removeEventListener('pointermove',this.move);this.host.removeEventListener('pointerup',this.up);this.host.removeEventListener('pointercancel',this.cancel);this.host.removeEventListener('lostpointercapture',this.cancel);this.host.removeEventListener('pointerleave',this.leave);this.host.removeEventListener('keydown',this.key);this.host.removeEventListener('focusin',this.focus);this.host.removeEventListener('focusout',this.blur);
  this.items.forEach(item=>{item.mesh.geometry.dispose();item.mesh.material.dispose()});this.textures.forEach(texture=>texture.dispose());this.geometry.dispose();this.fluidMaterial?.dispose();this.post?.dispose();this.fields.forEach(target=>target.dispose());this.target?.dispose();this.renderer?.dispose();this.renderer?.domElement.remove();
 }
}
