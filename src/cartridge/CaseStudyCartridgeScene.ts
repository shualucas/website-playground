import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { applyCartridgeTheme } from "./cartridge-theme";
import { cartridges } from "./config";
import { loadExternalShell } from "./model";

type Cartridge = typeof cartridges[number];
type Callbacks = { onReady: () => void; onError: () => void };

/** One original home-page cartridge, framed for a readable case-study introduction. */
export class CaseStudyCartridgeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-2,2,1.5,-1.5,.1,80);
  private root = new THREE.Group();
  private environment: THREE.WebGLRenderTarget;
  private pmrem: THREE.PMREMGenerator;
  private background = new THREE.Color();
  private shadow = new THREE.ShadowMaterial({opacity:.085,depthWrite:false});
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
  private visible = true;
  private ready = false;
  private disposed = false;
  private control: HTMLElement;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private spin = new THREE.Vector2();
  private targetSpin = new THREE.Vector2();
  private spinVelocity = new THREE.Vector2();
  private drag: { id:number; x:number; y:number; startX:number; startY:number; moved:boolean } | null = null;

  constructor(private host:HTMLElement,private cartridge:Cartridge,private callbacks:Callbacks) {
    this.control=host.parentElement||host;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.transmissionResolutionScale=.5;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.95;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.VSMShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden","true");host.append(this.renderer.domElement);
    this.camera.position.set(0,0,8);this.camera.lookAt(0,0,0);
    this.camera.zoom=.9;
    this.pmrem=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();this.environment=this.pmrem.fromScene(room,.045);room.dispose();
    this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.65;
    this.scene.environmentRotation.set(.32,.34,0);
    this.scene.background=this.background;
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
    this.resize();void this.prepare();
  }
  private async prepare() {
    try {
      const label=await new THREE.TextureLoader().loadAsync(this.cartridge.label);
      if(this.disposed){label.dispose();return}
      this.textures.add(label);label.colorSpace=THREE.SRGBColorSpace;label.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      const model=await loadExternalShell(label,this.cartridge.shell,undefined,this.cartridge.finish,this.cartridge.id==="gmail");
      if(!model)throw new Error("Cartridge model unavailable");
      if(this.disposed){this.disposeModel(model);return}
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        const materials=Array.isArray(object.material)?object.material:[object.material];
        object.castShadow=!object.userData.label&&materials.some(material=>material.visible&&!((material as THREE.MeshPhysicalMaterial).transmission>.05));
        object.receiveShadow=Boolean(object.userData.label);
      });
      this.root.add(model);applyCartridgeTheme(this.root,document.documentElement.dataset.colorMode==="dark");this.root.updateMatrixWorld(true);
      new THREE.Box3().setFromObject(this.root).getSize(this.size);this.resize();
      await this.renderer.compileAsync(this.scene,this.camera);
      if(this.disposed)return;
      this.ready=true;this.draw();this.callbacks.onReady();this.sync();
    } catch { if(!this.disposed){this.dispose();this.callbacks.onError()} }
  }
  private setPose() {
    const t=this.motion.matches?0:this.time;
    // Match the camera's one-turn entrance, then let this scene's same clock drift.
    const p=this.motion.matches?1:Math.min(1,t/1.1),ease=1-Math.pow(1-p,4);
    const turn=Math.max(0,t-1.1)*Math.PI*2/45;
    this.root.rotation.set(.26+Math.sin(t*.55)*.035+Math.sin(p*Math.PI)*.12+this.spin.x,-.22+Math.sin(t*.4)*.055-Math.PI*2*(1-ease)+turn+this.spin.y,-.05+Math.sin(t*.35)*.02);
    this.root.position.y=Math.sin(t*.7)*.055;
    this.host.dataset.intro=p<1?"spinning":"settled";
    this.host.dataset.float=[this.root.position.y,this.root.rotation.x,this.root.rotation.y,this.root.rotation.z].map(value=>value.toFixed(5)).join(",");
    this.host.dataset.rotation=[this.spin.x,this.spin.y].map(value=>value.toFixed(5)).join(",");
    this.host.dataset.interactive=String(this.canInteract());
  }
  private canInteract() {
    return this.ready&&!this.disposed&&this.visible&&!document.hidden&&(this.motion.matches||this.time>=1.1)&&this.control.dataset.revealReady==="true"&&!this.control.closest("[inert]");
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
    applyCartridgeTheme(this.root,dark);this.host.dataset.shellTheme=dark?"dark":"light";
    this.background.set(dark?"#101110":"#f0f0f0");this.shadow.opacity=dark?.16:.085;
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
  private preference=()=>{this.cancelDrag();this.time=this.motion.matches?0:1.1;this.spin.copy(this.targetSpin);this.spinVelocity.set(0,0);this.sync()};
  private sync=()=>{
    cancelAnimationFrame(this.frame);this.frame=0;this.last=0;
    if(this.disposed||!this.ready)return;
    if(!this.visible||document.hidden)this.cancelDrag();
    const animate=this.visible&&!document.hidden&&!this.motion.matches;
    this.host.dataset.motion=this.motion.matches?"reduced":animate?"ambient":"idle";
    if(this.visible&&!document.hidden)this.draw();
    if(animate)this.frame=requestAnimationFrame(this.tick);
  };
  private tick=(now:number)=>{
    this.frame=0;if(this.disposed)return;
    const dt=this.last?Math.min(.1,(now-this.last)/1000):0;this.last=now;
    if(!this.drag)this.time+=dt;
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
    this.disposeModel(this.root);this.receiver.geometry.dispose();this.shadow.dispose();this.key.shadow.dispose();
    this.environment.dispose();this.pmrem.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
    delete this.host.dataset.motion;
    delete this.host.dataset.intro;delete this.host.dataset.float;
    delete this.host.dataset.rotation;delete this.host.dataset.dragging;delete this.host.dataset.interactive;
  }
}
