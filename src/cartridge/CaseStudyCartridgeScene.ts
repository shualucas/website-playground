import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { applyCartridgeTheme } from "./cartridge-theme";
import { ditherShadow } from "./dither-shadow";
import { CartridgeDissolve } from "./cartridge-dissolve";
import { type DisplayCartridge } from "./config";
import { loadExternalShell } from "./model";

type Callbacks = { onReady: () => void; onError: () => void };
type Options = { transparentBackground?:boolean; entranceScale?:number; hoverToFront?:boolean };
type Appearance = { cartridge:DisplayCartridge; model:THREE.Group; dissolve:CartridgeDissolve; weight:number; from:number; resolveFrom:number };

/** One original home-page cartridge, framed for a readable case-study introduction. */
export class CaseStudyCartridgeScene {
  private renderer: THREE.WebGLRenderer;
  private readonly transparentBackground:boolean;
  private readonly entranceDuration:number;
  private readonly entranceTurn:number;
  private readonly hoverToFront:boolean;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-2,2,1.5,-1.5,.1,80);
  private root = new THREE.Group();
  private environment: THREE.WebGLRenderTarget;
  private pmrem: THREE.PMREMGenerator;
  private background = new THREE.Color();
  private shadow = ditherShadow(new THREE.ShadowMaterial({opacity:.085,depthWrite:false}));
  private receiver = new THREE.Mesh(new THREE.PlaneGeometry(8,8),this.shadow);
  private key = new THREE.DirectionalLight("#fffefb",.85);
  private size = new THREE.Vector3(2.4,1.8,.5);
  private resizeObserver: ResizeObserver;
  private visibilityObserver: IntersectionObserver;
  private themeObserver: MutationObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private textures = new Set<THREE.Texture>();
  private frame = 0;
  private last = 0;
  private time = 0;
  private turn = 0;
  private turnTarget = 0;
  private turnVelocity = 0;
  private turnBraking = false;
  private visible = true;
  private ready = false;
  private dissolve = new CartridgeDissolve();
  private disposed = false;
  private paused = false;
  private requested = "";
  private generation = 0;
  private models = new Map<string,Promise<THREE.Group | null>>();
  private loaded = new Set<THREE.Group>();
  private appearances = new Map<string,Appearance>();
  private appearanceTime = .18;
  private appearanceDuration = .18;
  private tintDelay = 0;
  private materializeTime = .7;
  private previewTint:string|null = null;
  private aboutMode:"idle"|"hover"|"exit"="idle";
  private aboutSpeed=0;
  private aboutTurn=0;
  private tintColor = new THREE.Color();
  private tintTarget = new THREE.Color();
  private control: HTMLElement;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private spin = new THREE.Vector2();
  private targetSpin = new THREE.Vector2();
  private spinVelocity = new THREE.Vector2();
  private drag: { id:number; x:number; y:number; startX:number; startY:number; moved:boolean } | null = null;

  constructor(private host:HTMLElement,private cartridge:DisplayCartridge,private callbacks:Callbacks,options:Options={}) {
    this.transparentBackground=options.transparentBackground??false;
    this.entranceDuration=1.1*(options.entranceScale??1);
    this.entranceTurn=Math.PI*2*(options.entranceScale??1);
    this.hoverToFront=options.hoverToFront??false;
    this.control=host.parentElement||host;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.transmissionResolutionScale=.5;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.95;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.VSMShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden","true");this.renderer.domElement.dataset.cartridgeRenderer='webgl';host.append(this.renderer.domElement);
    this.dissolve.pixelSize.value=2*this.renderer.getPixelRatio();this.dissolve.apply(this.shadow,false);
    this.camera.position.set(0,0,8);this.camera.lookAt(0,0,0);
    this.camera.zoom=.9;
    this.pmrem=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();this.environment=this.pmrem.fromScene(room,.045);room.dispose();
    this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.65;
    this.scene.environmentRotation.set(.32,.34,0);
    this.scene.background=this.transparentBackground?null:this.background;
    this.scene.add(new THREE.HemisphereLight("#ffffff","#d6d3cd",.35));
    this.key.position.set(-1.1,2.5,45);this.key.castShadow=true;
    this.key.shadow.mapSize.set(512,512);this.key.shadow.radius=8;this.key.shadow.blurSamples=8;
    this.key.shadow.bias=-.00015;this.key.shadow.normalBias=.025;
    Object.assign(this.key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:1,far:60});
    this.receiver.position.z=-.9;this.receiver.receiveShadow=true;
    this.scene.add(this.root,this.key,this.receiver);
    this.setPose();this.updateTheme();
    this.resizeObserver=new ResizeObserver(this.resize);this.resizeObserver.observe(host);
    this.visibilityObserver=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;this.sync()});this.visibilityObserver.observe(host);
    this.themeObserver=new MutationObserver(this.updateTheme);this.themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:["data-color-mode"]});
    this.motion.addEventListener("change",this.preference);document.addEventListener("visibilitychange",this.sync);
    this.renderer.domElement.addEventListener("webglcontextlost",this.contextLost);
    host.addEventListener("pointerdown",this.down);host.addEventListener("pointermove",this.move);
    host.addEventListener("pointerup",this.up);host.addEventListener("pointercancel",this.up);host.addEventListener("lostpointercapture",this.up);
    this.control.addEventListener("keydown",this.keydown);window.addEventListener("blur",this.cancelDrag);
    this.resize();void this.setCartridge(cartridge);
  }
  private loadModel(cartridge:DisplayCartridge) {
    const existing=this.models.get(cartridge.id);if(existing)return existing;
    const pending=(async()=>{
      const label=await new THREE.TextureLoader().loadAsync(cartridge.label);
      if(this.disposed){label.dispose();return null}
      this.textures.add(label);label.colorSpace=THREE.SRGBColorSpace;label.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      const model=await loadExternalShell(label,cartridge.shell,undefined,cartridge.finish,cartridge.id==="gmail");
      if(!model)throw new Error("Cartridge model unavailable");
      if(this.disposed){this.disposeModel(model);return null}
      const dissolve=new CartridgeDissolve();dissolve.pixelSize.value=this.dissolve.pixelSize.value;
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        const materials=Array.isArray(object.material)?object.material:[object.material];
        for(const material of materials)dissolve.apply(material);
        object.castShadow=!object.userData.label&&materials.some(material=>material.visible&&!((material as THREE.MeshPhysicalMaterial).transmission>.05));
        object.receiveShadow=Boolean(object.userData.label);
      });
      this.loaded.add(model);this.appearances.set(cartridge.id,{cartridge,model,dissolve,weight:0,from:0,resolveFrom:0});
      applyCartridgeTheme(model,document.documentElement.dataset.colorMode==="dark");
      await this.renderer.compileAsync(model,this.camera,this.scene);
      return this.disposed?null:model;
    })();
    this.models.set(cartridge.id,pending);
    return pending;
  }
  async preload(cartridges:readonly DisplayCartridge[]) {
    await Promise.allSettled(cartridges.map(cartridge=>this.loadModel(cartridge)));
  }
  async setCartridge(cartridge:DisplayCartridge) {
    if(this.disposed||this.requested===cartridge.id)return;
    this.requested=cartridge.id;const generation=++this.generation;
    try {
      const model=await this.loadModel(cartridge);
      if(this.disposed||!model||generation!==this.generation)return;
      const initial=!this.ready;
      // Blend from the currently visible mix, including when a quick hover interrupts a fade.
      for(const appearance of this.appearances.values()){
        appearance.from=appearance.weight;
        appearance.resolveFrom=appearance.weight>0?appearance.dissolve.resolve.value:0;
      }
      const exiting=!initial&&cartridge.id==='personal'&&this.cartridge.id!=='personal';
      if(exiting&&!this.motion.matches&&!this.previewTint){
        const ink=this.appearances.get(this.cartridge.id)?.dissolve.ink.value;
        if(ink)this.tintColor.copy(ink);
        this.tintDelay=.12;
      }
      this.appearanceDuration=exiting?.32:.18;
      this.cartridge=cartridge;this.appearanceTime=(initial||this.motion.matches) ? this.appearanceDuration : 0;
      this.materializeTime=(initial||this.motion.matches||cartridge.id==='personal') ? .7 : 0;
      this.updateAppearance(0);
      if(initial){
        // Frame the shared geometry once; later swaps inherit the live pose and camera.
        this.root.rotation.set(.26,-.22,-.05);this.root.updateMatrixWorld(true);
        new THREE.Box3().setFromObject(this.root).getSize(this.size);this.resize();
      }
      if(!initial&&this.hoverToFront&&cartridge.id!=='personal'){
        // Settle manual offsets smoothly too, so a previously dragged cart still lands label-first.
        this.targetSpin.set(0,0);
        if(this.motion.matches){this.spin.set(0,0);this.spinVelocity.set(0,0);this.turn=Math.ceil(this.turn/(Math.PI*2))*Math.PI*2;this.turnTarget=this.turn}
      }
      if(!initial&&!this.motion.matches){
        this.turnBraking=cartridge.id==='personal';
        // Enter adds a turn from the live pose. Exit only settles the existing momentum.
        this.turnTarget=this.turnBraking?this.turn+this.turnVelocity/24:Math.ceil((this.turn+Math.PI/2)/(Math.PI*2))*Math.PI*2;
      }
      this.host.dataset.cartridge=cartridge.id;
      this.updateTheme();
      if(initial){this.ready=true;this.draw();this.callbacks.onReady();this.sync()}
      else if(!this.frame)this.sync();
    } catch { if(!this.disposed&&generation===this.generation){this.dispose();this.callbacks.onError()} }
  }
  setPaused(paused:boolean) {
    if(this.paused===paused)return;
    this.paused=paused;this.sync();
  }
  setAboutMotion(mode:"idle"|"hover"|"exit") {
    if(this.aboutMode===mode)return;
    this.aboutMode=mode;
    if(mode!=="idle")this.cancelDrag();
    this.host.dataset.aboutMotion=mode;
    this.sync();
  }
  setPreviewColor(color?:string|null) {
    const tint=color||null;if(this.previewTint===tint)return;
    this.previewTint=tint;this.host.dataset.previewTint=tint||'';
    if(tint)this.time=Math.max(this.time,this.entranceDuration);
    this.updateTheme();this.sync();
  }
  private tintMoving() {
    return Math.max(Math.abs(this.tintColor.r-this.tintTarget.r),Math.abs(this.tintColor.g-this.tintTarget.g),Math.abs(this.tintColor.b-this.tintTarget.b))>.001;
  }
  private updateTint(dt:number) {
    if(this.tintDelay>0)this.tintDelay=Math.max(0,this.tintDelay-dt);
    else this.tintColor.lerp(this.tintTarget,1-Math.exp(-dt/.085));
    if(!this.tintMoving())this.tintColor.copy(this.tintTarget);
    const personal=this.appearances.get('personal');
    if(personal)personal.dissolve.ink.value.copy(this.tintColor);
    if(this.cartridge.id==='personal')this.host.dataset.ditherInk=`#${this.tintColor.getHexString()}`;
  }
  private updateAppearance(dt:number) {
    this.appearanceTime=Math.min(this.appearanceDuration,this.appearanceTime+dt);
    this.materializeTime=Math.min(.7,this.materializeTime+dt);
    const p=this.appearanceTime/this.appearanceDuration,ease=p*p*(3-2*p);
    let edge=0;
    // Disjoint ranges of the same Bayer pattern crossfade surfaces without alpha sorting.
    for(const appearance of this.appearances.values()){
      const {cartridge,model,dissolve,from}=appearance;
      appearance.weight=THREE.MathUtils.lerp(from,cartridge.id===this.cartridge.id?1:0,ease);
      dissolve.range.value.set(edge,edge+appearance.weight);edge+=appearance.weight;
      if(cartridge.id===this.cartridge.id){
        // The new shell arrives as colored dots, then resolves into its authored materials.
        const inkIn=THREE.MathUtils.smoothstep(this.materializeTime,0,.1);
        const modelIn=THREE.MathUtils.smoothstep(this.materializeTime,.38,.7);
        dissolve.resolve.value=THREE.MathUtils.lerp(appearance.resolveFrom,0,inkIn)+modelIn;
      }
      else if(this.cartridge.id==='personal')dissolve.resolve.value=THREE.MathUtils.lerp(appearance.resolveFrom,0,THREE.MathUtils.smoothstep(this.appearanceTime,0,.12));
      model.visible=appearance.weight>0;
      if(model.visible&&model.parent!==this.root){applyCartridgeTheme(model,document.documentElement.dataset.colorMode==='dark');this.root.add(model)}
      else if(!model.visible&&model.parent===this.root)this.root.remove(model);
    }
    this.host.dataset.appearanceState=p<1?'fading':'settled';
    this.host.dataset.fadeProgress=p.toFixed(4);
    const resolve=this.appearances.get(this.cartridge.id)?.dissolve.resolve.value??1;
    this.host.dataset.surfaceReveal=resolve.toFixed(4);
    this.host.dataset.renderStyle=this.cartridge.id==='personal'||resolve<1?'dither':'model';

  }
  private setPose() {
    const t=this.motion.matches?0:this.time;
    // Each surface has its own entrance, followed by the same gentle ambient drift.
    const p=this.motion.matches?1:Math.min(1,t/this.entranceDuration),ease=1-Math.pow(1-p,4);
    this.dissolve.progress.value=p;
    this.receiver.visible=p===1&&this.cartridge.id!=='personal'&&(this.appearances.get(this.cartridge.id)?.dissolve.resolve.value??1)===1;
    this.host.dataset.shadow=String(this.receiver.visible);
    for(const appearance of this.appearances.values())appearance.dissolve.progress.value=p;
    this.host.dataset.dissolve=p<1?'revealing':'complete';
    this.host.dataset.revealProgress=p.toFixed(4);
    // Hero hover turns always land at the front; project pages retain their ambient rotation.
    const ambientTurn=this.hoverToFront?0:Math.max(0,t-this.entranceDuration)*Math.PI*2/45;
    const drift=this.hoverToFront?(this.appearances.get('personal')?.weight??0):0;
    this.root.rotation.set(.26+Math.sin(t*.55)*(.035+.035*drift)+Math.sin(p*Math.PI)*.12+this.spin.x,-.22+Math.sin(t*.4)*(.055+.18*drift)-this.entranceTurn*(1-ease)+ambientTurn+this.turn+this.spin.y+(this.motion.matches?0:this.aboutTurn),-.05+Math.sin(t*.35)*(.02+.025*drift));
    this.root.position.y=Math.sin(t*.7)*(.055+.035*drift);
    this.host.dataset.intro=p<1?"spinning":"settled";
    this.host.dataset.float=[this.root.position.y,this.root.rotation.x,this.root.rotation.y,this.root.rotation.z].map(value=>value.toFixed(5)).join(",");
    this.host.dataset.rotation=[this.spin.x,this.spin.y].map(value=>value.toFixed(5)).join(",");
    this.host.dataset.turn=[this.turn,this.turnVelocity,this.turnTarget].map(value=>value.toFixed(5)).join(",");
    this.host.dataset.turnState=Math.abs(this.turnTarget-this.turn)<.005&&Math.abs(this.turnVelocity)<.05?'settled':'spinning';
    this.host.dataset.interactive=String(this.canInteract());
  }
  private canInteract() {
    return this.ready&&!this.disposed&&!this.paused&&!this.previewTint&&this.visible&&!document.hidden&&(this.motion.matches||this.time>=this.entranceDuration)&&this.control.dataset.revealReady==="true"&&!this.control.closest("[inert]");
  }
  private down=(event:PointerEvent)=>{
    if(event.button!==0||!event.isPrimary||this.drag||!this.canInteract()||event.target!==this.renderer.domElement)return;
    const rect=this.host.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
    this.root.updateMatrixWorld(true);this.ray.setFromCamera(this.pointer,this.camera);
    if(!this.ray.intersectObject(this.root,true).length)return;
    event.preventDefault();this.host.setPointerCapture(event.pointerId);
    this.drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
  };
  private move=(event:PointerEvent)=>{
    const drag=this.drag;if(!drag||drag.id!==event.pointerId)return;
    event.preventDefault();
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>7)drag.moved=true;
    if(drag.moved){
      this.targetSpin.x+=(event.clientY-drag.y)*.013;this.targetSpin.y+=(event.clientX-drag.x)*.013;
      this.host.dataset.dragging="true";this.applyManualPose();
    }
    drag.x=event.clientX;drag.y=event.clientY;
  };
  private up=(event:PointerEvent)=>{if(this.drag?.id===event.pointerId)this.cancelDrag()};
  private cancelDrag=()=>{
    const drag=this.drag;this.drag=null;this.host.dataset.dragging="false";
    if(drag&&this.host.hasPointerCapture(drag.id))this.host.releasePointerCapture(drag.id);
  };
  private keydown=(event:KeyboardEvent)=>{
    if(!this.canInteract()||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==="ArrowLeft")this.targetSpin.y-=.15;
    else if(event.key==="ArrowRight")this.targetSpin.y+=.15;
    else if(event.key==="ArrowUp")this.targetSpin.x-=.15;
    else if(event.key==="ArrowDown")this.targetSpin.x+=.15;
    else if(event.key.toLowerCase()==="r")this.targetSpin.set(0,0);
    else return;
    event.preventDefault();event.stopPropagation();this.applyManualPose();
  };
  private applyManualPose() {
    if(this.motion.matches||this.drag){this.spin.copy(this.targetSpin);this.spinVelocity.set(0,0)}
    // The owned frame loop paints normal input once per display frame.
    if(this.motion.matches)this.draw();
  }
  private updateTheme=()=>{
    const dark=document.documentElement.dataset.colorMode==="dark";
    this.tintTarget.set(this.previewTint||(dark?'#ffffff':'#000000'));
    if(!this.ready||this.motion.matches)this.tintColor.copy(this.tintTarget);
    applyCartridgeTheme(this.root,dark);this.host.dataset.shellTheme=dark?"dark":"light";
    this.background.set(dark?"#0b0c0b":"#f0f0f0");this.shadow.opacity=dark?.16:.085;
    if(this.transparentBackground)this.renderer.setClearColor(this.background,0);
    for(const {cartridge,dissolve} of this.appearances.values()){
      const monochrome=cartridge.id==='personal';
      dissolve.persistent.value=monochrome?1:0;
      const ink=monochrome?(dark?'#ffffff':'#000000'):this.hoverToFront?cartridge.accent:cartridge.id==='search'?'#6988d8':cartridge.id==='stadia'?'#e5633d':cartridge.accent;
      if(monochrome)dissolve.ink.value.copy(this.tintColor);else dissolve.ink.value.set(ink).multiplyScalar(dark?1:.65);
      if(cartridge.id===this.cartridge.id){this.dissolve.ink.value.copy(dissolve.ink.value);this.host.dataset.ditherInk=`#${dissolve.ink.value.getHexString()}`}
    }
    if(this.ready)this.draw();
  };
  private resize=()=>{
    if(this.disposed)return;
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    const aspect=w/h,half=Math.max(this.size.y*.68,this.size.x/aspect*.66,.85);
    this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);if(this.ready)this.draw();
  };
  private draw() {if(!this.disposed&&this.host.clientWidth&&this.host.clientHeight){this.setPose();this.renderer.render(this.scene,this.camera)}}
  private preference=()=>{this.cancelDrag();this.time=this.motion.matches?0:this.entranceDuration;this.spin.copy(this.targetSpin);this.spinVelocity.set(0,0);this.turnTarget=this.turn;this.turnVelocity=0;this.turnBraking=false;if(this.motion.matches)this.updateAppearance(.7);this.sync()};
  private sync=()=>{
    cancelAnimationFrame(this.frame);this.frame=0;this.last=0;
    if(this.disposed||!this.ready)return;
    if(!this.visible||document.hidden||this.paused)this.cancelDrag();
    const animate=this.visible&&!document.hidden&&!this.paused&&!this.motion.matches;
    this.host.dataset.motion=this.motion.matches?"reduced":animate?"ambient":"idle";
    if(this.visible&&!document.hidden&&!this.paused)this.draw();
    if(animate)this.frame=requestAnimationFrame(this.tick);
  };
  private tick=(now:number)=>{
    this.frame=0;if(this.disposed)return;
    const dt=this.last?Math.min(.1,(now-this.last)/1000):0;this.last=now;
    if(!this.drag)this.time+=dt*(this.previewTint?2:1);
    const aboutTarget=this.aboutMode==='exit'?5.6:this.aboutMode==='hover'?2.8:0;
    this.aboutSpeed+=(aboutTarget-this.aboutSpeed)*(1-Math.exp(-dt*10));
    this.aboutTurn+=this.aboutSpeed*dt;
    if(this.aboutMode==='idle')this.aboutTurn+=Math.atan2(Math.sin(-this.aboutTurn),Math.cos(-this.aboutTurn))*(1-Math.exp(-dt*5));
    this.host.dataset.aboutTurn=this.aboutTurn.toFixed(5);
    this.updateAppearance(dt);this.updateTint(dt);
    if(!this.drag)for(let i=0;i<4;i++){
      if(this.turnBraking){
        const decay=Math.exp(-24*dt/4);
        this.turn+=this.turnVelocity*(1-decay)/24;this.turnVelocity*=decay;
      }else{
        this.turnVelocity+=((this.turnTarget-this.turn)*140-this.turnVelocity*24)*dt/4;
        this.turnVelocity=THREE.MathUtils.clamp(this.turnVelocity,-18,18);
        this.turn+=this.turnVelocity*dt/4;
      }
    }
    if(Math.abs(this.turnTarget-this.turn)<.005&&Math.abs(this.turnVelocity)<.05){this.turn=this.turnTarget;this.turnVelocity=0}
    // Direct manipulation while held; spring settling for keyboard changes.
    if(!this.drag)for(let i=0;i<4;i++)for(const axis of ["x","y"] as const){
      this.spinVelocity[axis]+=((this.targetSpin[axis]-this.spin[axis])*230-this.spinVelocity[axis]*27)*dt/4;
      this.spin[axis]+=this.spinVelocity[axis]*dt/4;
    }
    this.draw();
    this.frame=requestAnimationFrame(this.tick);
  };
  private contextLost=(event:Event)=>{event.preventDefault();this.dispose();this.callbacks.onError()};
  private disposeModel(root:THREE.Object3D) {
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    root.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material)}});
    for(const material of materials){
      // These maps were created for this instance; other GLB maps belong to the shared template.
      if(material.name==="Project label"||material.name==="Green PCB with gold contacts")for(const value of Object.values(material))if(value instanceof THREE.Texture)this.textures.add(value);
      material.dispose();
    }
    geometries.forEach(geometry=>geometry.dispose());
    this.textures.forEach(texture=>texture.dispose());this.textures.clear();
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();this.visibilityObserver.disconnect();this.themeObserver.disconnect();
    this.motion.removeEventListener("change",this.preference);document.removeEventListener("visibilitychange",this.sync);
    this.cancelDrag();this.host.removeEventListener("pointerdown",this.down);this.host.removeEventListener("pointermove",this.move);
    this.host.removeEventListener("pointerup",this.up);this.host.removeEventListener("pointercancel",this.up);this.host.removeEventListener("lostpointercapture",this.up);
    this.control.removeEventListener("keydown",this.keydown);window.removeEventListener("blur",this.cancelDrag);
    this.renderer.domElement.removeEventListener("webglcontextlost",this.contextLost);
    const models=new THREE.Group();for(const model of this.loaded)models.add(model);this.loaded.clear();this.models.clear();this.appearances.clear();
    this.disposeModel(models);this.receiver.geometry.dispose();this.shadow.dispose();this.key.shadow.dispose();
    this.environment.dispose();this.pmrem.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
    delete this.host.dataset.motion;
    delete this.host.dataset.intro;delete this.host.dataset.float;
    delete this.host.dataset.rotation;delete this.host.dataset.dragging;delete this.host.dataset.interactive;
    delete this.host.dataset.dissolve;delete this.host.dataset.revealProgress;
    delete this.host.dataset.cartridge;
    delete this.host.dataset.renderStyle;
    delete this.host.dataset.turn;delete this.host.dataset.turnState;
    delete this.host.dataset.appearanceState;delete this.host.dataset.fadeProgress;
    delete this.host.dataset.surfaceReveal;delete this.host.dataset.ditherInk;
    delete this.host.dataset.previewTint;delete this.host.dataset.aboutMotion;delete this.host.dataset.aboutTurn;
  }
}
