import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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

  constructor(private host:HTMLElement,private cartridge:Cartridge,private callbacks:Callbacks) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.transmissionResolutionScale=.5;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.95;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.VSMShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden","true");host.append(this.renderer.domElement);
    this.camera.position.set(0,0,8);this.camera.lookAt(0,0,0);
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
    this.resize();void this.prepare();
  }
  private async prepare() {
    try {
      const label=await new THREE.TextureLoader().loadAsync(this.cartridge.label);
      if(this.disposed){label.dispose();return}
      this.textures.add(label);label.colorSpace=THREE.SRGBColorSpace;label.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      const model=await loadExternalShell(label,this.cartridge.shell,undefined,this.cartridge.finish);
      if(!model)throw new Error("Cartridge model unavailable");
      if(this.disposed){this.disposeModel(model);return}
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        const materials=Array.isArray(object.material)?object.material:[object.material];
        object.castShadow=!object.userData.label&&materials.some(material=>material.visible&&!((material as THREE.MeshPhysicalMaterial).transmission>.05));
        object.receiveShadow=false;
      });
      this.root.add(model);this.root.updateMatrixWorld(true);
      new THREE.Box3().setFromObject(this.root).getSize(this.size);this.resize();
      await this.renderer.compileAsync(this.scene,this.camera);
      if(this.disposed)return;
      this.ready=true;this.draw();this.callbacks.onReady();this.sync();
    } catch { if(!this.disposed){this.dispose();this.callbacks.onError()} }
  }
  private setPose() {
    const t=this.motion.matches?0:this.time;
    this.root.rotation.set(.26+Math.sin(t*.55)*.025,-.22+Math.sin(t*.4)*.035,-.05+Math.sin(t*.35)*.012);
    this.root.position.y=Math.sin(t*.7)*.025;
  }
  private updateTheme=()=>{
    const dark=document.documentElement.dataset.colorMode==="dark";
    this.background.set(dark?"#1b1c1b":"#f0f0f0");this.shadow.opacity=dark?.16:.085;
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
  private preference=()=>{this.time=0;this.sync()};
  private sync=()=>{
    cancelAnimationFrame(this.frame);this.frame=0;this.last=0;
    if(this.disposed||!this.ready)return;
    const animate=this.visible&&!document.hidden&&!this.motion.matches;
    this.host.dataset.motion=this.motion.matches?"reduced":animate?"ambient":"idle";
    if(this.visible&&!document.hidden)this.draw();
    if(animate)this.frame=requestAnimationFrame(this.tick);
  };
  private tick=(now:number)=>{
    this.frame=0;if(this.disposed)return;
    if(this.last&&now-this.last<1000/30){this.frame=requestAnimationFrame(this.tick);return}
    this.time+=this.last?Math.min(.1,(now-this.last)/1000):0;this.last=now;this.draw();
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
    this.renderer.domElement.removeEventListener("webglcontextlost",this.contextLost);
    this.disposeModel(this.root);this.receiver.geometry.dispose();this.shadow.dispose();this.key.shadow.dispose();
    this.environment.dispose();this.pmrem.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
    delete this.host.dataset.motion;
  }
}
