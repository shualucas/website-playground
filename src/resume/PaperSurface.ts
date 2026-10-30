import * as THREE from "three";
import { softenShadowEdges } from "../book/effects";

export type PaperPose = { pitch:number; yaw:number; roll:number; lift:number; bendX:number; bendY:number; grabX:number; grabY:number };
const H = 4.7, W = H * 595 / 842;

/** A thin, locally flexible sheet. FloatingPaper owns the only animation clock. */
export class PaperSurface {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private geometry = new THREE.PlaneGeometry(W,H,36,50);
  private positions = this.geometry.attributes.position as THREE.BufferAttribute;
  private rest = new Float32Array(this.positions.array);
  private front: THREE.Mesh;
  private back: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private backMaterial = new THREE.MeshStandardMaterial({color:"#fffdf8",roughness:.9,side:THREE.BackSide});
  private texture: THREE.Texture;
  private floorMaterial = softenShadowEdges(new THREE.ShadowMaterial({opacity:.18,depthWrite:false}));
  private floor = new THREE.Mesh(new THREE.PlaneGeometry(40,40),this.floorMaterial);
  private key = new THREE.DirectionalLight("#fffefa",2.5);
  private observer: ResizeObserver;
  private theme: MutationObserver;
  private width = 1;
  private height = 1;
  private scale = 1;
  private disposed = false;
  private vector = new THREE.Vector3();
  private rotation = new THREE.Euler(0,0,0,"XYZ");
  private lastFlex = [NaN,NaN,NaN,NaN];
  private contacts: {element:HTMLAnchorElement; x:number; y:number; style:string|null}[];
  constructor(private host:HTMLElement, private invalidate:()=>void) {
    const image = host.querySelector<HTMLImageElement>(".resume-artwork img")!;
    this.renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.domElement.className = "resume-paper-canvas";
    this.renderer.domElement.setAttribute("aria-hidden","true");
    this.texture = new THREE.Texture(image);this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.needsUpdate=true;
    this.texture.anisotropy = Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    // Normalize studio illumination without filmic tone mapping lifting the printed blacks.
    this.material = new THREE.MeshStandardMaterial({map:this.texture,color:"#eeeeee",roughness:.86,metalness:0,toneMapped:false});
    this.front = new THREE.Mesh(this.geometry,this.material); this.front.castShadow=true;
    this.back = new THREE.Mesh(this.geometry,this.backMaterial);
    this.scene.add(this.front,this.back);
    // Zine's overhead studio, rotated from its Y-up table into this XY sheet.
    const hemisphere=new THREE.HemisphereLight("#ffffff","#63635f",1.05);hemisphere.position.set(0,0,1);
    this.key.position.set(-1.5,2,15);this.key.castShadow=true;
    this.key.shadow.mapSize.set(1024,1024);
    Object.assign(this.key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:1,far:40});
    this.key.shadow.radius=14;this.key.shadow.blurSamples=12;
    this.key.shadow.normalBias=.015;this.key.shadow.bias=-.0001;
    const fill=new THREE.DirectionalLight("#ffffff",.18);fill.position.set(5,4,6);
    this.floor.position.z=-2.4;this.floor.receiveShadow=true;
    this.scene.add(hemisphere,this.key,fill,this.floor);
    this.contacts=[...host.querySelectorAll<HTMLAnchorElement>(".paper-contact")].map(element=>({element,x:parseFloat(element.style.left)/100,y:parseFloat(element.style.top)/100,style:element.getAttribute("style")}));
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.observer.observe(host.parentElement!);
    this.theme=new MutationObserver(()=>{this.floorMaterial.opacity=document.documentElement.dataset.colorMode==="dark"?.4:.18;this.invalidate()});
    this.theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-color-mode"]});
    this.floorMaterial.opacity=document.documentElement.dataset.colorMode==="dark"?.4:.18;
    host.parentElement!.prepend(this.renderer.domElement);
    this.resize();host.dataset.surface="webgl";
    this.renderer.domElement.addEventListener("webglcontextlost",this.onLost);
  }
  private onLost=(event:Event)=>{event.preventDefault();this.dispose();this.invalidate()};
  private resize=()=>{
    if(this.disposed)return;
    const stage=this.host.parentElement!;
    this.width=stage.clientWidth;this.height=stage.clientHeight;this.scale=this.host.clientWidth/W;
    if(!this.width||!this.height||!this.scale)return;
    this.renderer.setSize(this.width,this.height,false);
    const perspective=2400;
    this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(this.height/(2*perspective)));
    this.camera.aspect=this.width/this.height;this.camera.near=.1;this.camera.far=150;
    this.camera.position.set(0,0,perspective/this.scale);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
    this.invalidate();
  };
  private flex(x:number,y:number,pose:PaperPose) {
    const u=x/W*2,v=y/H*2,dx=u-pose.grabX,dy=v-pose.grabY;
    const influence=Math.exp(-(dx*dx*1.5+dy*dy*1.2));
    const edge=.25+.75*Math.pow(Math.max(Math.abs(pose.grabX),Math.abs(pose.grabY)),2);
    // A broad curved fold near the grip, tapering continuously into the sheet.
    return edge*influence*(Math.hypot(pose.bendX,pose.bendY)*1.35+pose.bendX*dx*.7+pose.bendY*dy*.7);
  }
  render(pose:PaperPose) {
    if(this.disposed||!this.scale)return;
    if(pose.bendX!==this.lastFlex[0]||pose.bendY!==this.lastFlex[1]||pose.grabX!==this.lastFlex[2]||pose.grabY!==this.lastFlex[3]){
      for(let i=0;i<this.positions.count;i++){
        const x=this.rest[i*3],y=this.rest[i*3+1],z=this.flex(x,y,pose);
        this.positions.setXYZ(i,x-pose.grabX*z*.4,y-pose.grabY*z*.4,z);
      }
      this.positions.needsUpdate=true;this.geometry.computeVertexNormals();
      this.lastFlex[0]=pose.bendX;this.lastFlex[1]=pose.bendY;this.lastFlex[2]=pose.grabX;this.lastFlex[3]=pose.grabY;
    }
    // Fixed conservative bounds include the curl without recomputing them each frame.
    this.geometry.boundingSphere ??= new THREE.Sphere(new THREE.Vector3(),3.5);
    this.rotation.set(THREE.MathUtils.degToRad(pose.pitch),THREE.MathUtils.degToRad(pose.yaw),THREE.MathUtils.degToRad(pose.roll));
    this.front.rotation.copy(this.rotation);this.back.rotation.copy(this.rotation);
    this.front.position.y=this.back.position.y=-pose.lift/this.scale;
    this.front.updateMatrixWorld();
    this.renderer.render(this.scene,this.camera);
    for(const contact of this.contacts){
      const x=(contact.x-.5)*W,y=(.5-contact.y)*H;
      const z=this.flex(x,y,pose);
      this.vector.set(x-pose.grabX*z*.4,y-pose.grabY*z*.4,z).applyMatrix4(this.front.matrixWorld).project(this.camera);
      contact.element.style.left=`${(this.vector.x*this.width/2+this.host.clientWidth/2).toFixed(2)}px`;
      contact.element.style.top=`${(-this.vector.y*this.height/2+this.host.clientHeight/2).toFixed(2)}px`;
      contact.element.style.transform="translateY(-50%)";
    }
    this.host.dataset.bend=Math.hypot(pose.bendX,pose.bendY).toFixed(3);
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.observer.disconnect();this.theme.disconnect();
    this.renderer.domElement.removeEventListener("webglcontextlost",this.onLost);
    this.renderer.domElement.remove();this.renderer.dispose();this.renderer.forceContextLoss();
    this.geometry.dispose();this.material.dispose();this.backMaterial.dispose();this.texture.dispose();
    this.floor.geometry.dispose();this.floorMaterial.dispose();this.key.shadow.dispose();
    for(const {element,style} of this.contacts){if(style===null)element.removeAttribute("style");else element.setAttribute("style",style)}
    delete this.host.dataset.surface;delete this.host.dataset.bend;
  }
}
