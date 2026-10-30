import * as THREE from "three";
import { softenShadowEdges } from "../book/effects";
import { studioEnvironment, surfaceDetail } from "../book/surfaces";

export type PaperPose = { scale:number; pitch:number; yaw:number; roll:number; lift:number; bendX:number; bendY:number; grabX:number; grabY:number };
const H = 4.7, W = H * 595 / 842, FLOAT_GAP = .75, FOCUS_Y = -.38;

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
  private material: THREE.MeshPhysicalMaterial;
  private depth:THREE.MeshDepthMaterial;
  private backMaterial = new THREE.MeshStandardMaterial({color:"#fffdf8",roughness:.9,side:THREE.BackSide});
  private texture: THREE.Texture;
  private detail:ReturnType<typeof surfaceDetail>;
  private environment: THREE.WebGLRenderTarget;
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
  private pointer = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
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
    const gl=this.renderer.getContext(),debug=gl.getExtension("WEBGL_debug_renderer_info");
    const software=!!debug&&/swiftshader|llvmpipe/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)));
    this.environment=studioEnvironment(this.renderer,software);
    this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.72;
    this.renderer.domElement.className = "resume-paper-canvas";
    this.renderer.domElement.setAttribute("aria-hidden","true");
    this.texture = new THREE.Texture(image);this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.needsUpdate=true;
    this.texture.anisotropy = Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.detail=surfaceDetail("paper");
    // Normalize studio illumination without filmic tone mapping lifting the printed blacks.
    this.material = new THREE.MeshPhysicalMaterial({map:this.texture,roughness:.5,normalMap:this.detail.normal,normalScale:new THREE.Vector2(.055,.055),roughnessMap:this.detail.roughness,clearcoat:.35,clearcoatRoughness:.36,metalness:0,toneMapped:false,shadowSide:THREE.DoubleSide});
    this.depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
    for(const material of [this.material,this.backMaterial,this.depth]){
      material.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vPaperUv;').replace('#include <uv_vertex>','#include <uv_vertex>\nvPaperUv=uv;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vPaperUv;').replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          vec2 paperQ=abs((vPaperUv-.5)*vec2(${W},${H}))-(vec2(${W},${H})*.5-.065);
          if(length(max(paperQ,0.0))+min(max(paperQ.x,paperQ.y),0.0)>.065)discard;`);
        if(material===this.material)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
          // Satin highlights stay restrained over the original printed ink.
          float inkLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          outgoingLight=min(outgoingLight,diffuseColor.rgb+vec3(.018+.07*smoothstep(.25,.8,inkLuma)));
          #include <opaque_fragment>`);
      };
      material.customProgramCacheKey=()=>`resume-rounded-satin-${material.type}-v1`;
    }
    this.front = new THREE.Mesh(this.geometry,this.material); this.front.castShadow=true;this.front.customDepthMaterial=this.depth;
    this.back = new THREE.Mesh(this.geometry,this.backMaterial);
    this.scene.add(this.front,this.back);
    // Keep the zine's actual Y-up studio. The document is upright, above an XZ floor.
    const hemisphere=new THREE.HemisphereLight("#ffffff","#63635f",1.05);
    this.key.position.set(-1.5,15,-2);this.key.castShadow=true;
    this.key.shadow.mapSize.set(software?512:2048,software?512:2048);
    Object.assign(this.key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:80});
    this.key.shadow.radius=software?11:44;this.key.shadow.blurSamples=software?8:12;
    this.key.shadow.normalBias=.015;this.key.shadow.bias=-.0001;
    const fill=new THREE.DirectionalLight("#ffffff",.18);fill.position.set(5,6,-4);
    // A broad unshadowed bounce keeps printed ink readable on the vertical face.
    const bounce=new THREE.DirectionalLight("#ffffff",2.05);bounce.position.set(0,4,9);
    this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-H/2-FLOAT_GAP;this.floor.receiveShadow=true;
    this.scene.add(hemisphere,this.key,fill,bounce,this.floor);
    this.contacts=[...host.querySelectorAll<HTMLAnchorElement>(".paper-contact")].map(element=>({element,x:parseFloat(element.style.left)/100,y:parseFloat(element.style.top)/100,style:element.getAttribute("style")}));
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.observer.observe(host.parentElement!);
    this.theme=new MutationObserver(()=>{this.floorMaterial.opacity=document.documentElement.dataset.colorMode==="dark"?.4:.18;this.invalidate()});
    this.theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-color-mode"]});
    this.floorMaterial.opacity=document.documentElement.dataset.colorMode==="dark"?.4:.18;
    host.parentElement!.prepend(this.renderer.domElement);
    this.resize();host.dataset.surface="webgl";
    host.dataset.groundY=String(this.floor.position.y);
    host.dataset.groundNormal="0,1,0";
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
    const distance=perspective/this.scale;
    this.camera.position.set(0,FOCUS_Y+distance*.1,distance);this.camera.lookAt(0,FOCUS_Y,0);
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
    this.invalidate();
  };
  private flex(x:number,y:number,pose:PaperPose) {
    const u=x/W*2,v=y/H*2,dx=u-pose.grabX,dy=v-pose.grabY;
    const influence=Math.exp(-(dx*dx*5+dy*dy*5));
    const edge=.06+.94*Math.pow(Math.max(Math.abs(pose.grabX),Math.abs(pose.grabY)),4);
    // Firm stock: only the grabbed edge yields; the body stays nearly planar.
    return edge*influence*(Math.hypot(pose.bendX,pose.bendY)*.65+pose.bendX*dx*.25+pose.bendY*dy*.25);
  }
  containsPoint(clientX:number,clientY:number) {
    if(this.disposed)return false;
    const bounds=this.renderer.domElement.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return false;
    this.pointer.set((clientX-bounds.left)/bounds.width*2-1,1-(clientY-bounds.top)/bounds.height*2);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.intersectObject(this.front,false)[0];
    if(!hit?.uv)return false;
    const x=Math.abs((hit.uv.x-.5)*W)-(W/2-.065),y=Math.abs((hit.uv.y-.5)*H)-(H/2-.065);
    return Math.hypot(Math.max(x,0),Math.max(y,0))+Math.min(Math.max(x,y),0)<=.065;
  }
  render(pose:PaperPose) {
    if(this.disposed||!this.scale)return;
    if(pose.bendX!==this.lastFlex[0]||pose.bendY!==this.lastFlex[1]||pose.grabX!==this.lastFlex[2]||pose.grabY!==this.lastFlex[3]){
      for(let i=0;i<this.positions.count;i++){
        const x=this.rest[i*3],y=this.rest[i*3+1],z=this.flex(x,y,pose);
        this.positions.setXYZ(i,x-pose.grabX*z*.15,y-pose.grabY*z*.15,z);
      }
      this.positions.needsUpdate=true;this.geometry.computeVertexNormals();
      this.lastFlex[0]=pose.bendX;this.lastFlex[1]=pose.bendY;this.lastFlex[2]=pose.grabX;this.lastFlex[3]=pose.grabY;
    }
    // Fixed conservative bounds include the curl without recomputing them each frame.
    this.geometry.boundingSphere ??= new THREE.Sphere(new THREE.Vector3(),3.5);
    this.rotation.set(THREE.MathUtils.degToRad(pose.pitch),THREE.MathUtils.degToRad(pose.yaw),THREE.MathUtils.degToRad(pose.roll));
    this.front.rotation.copy(this.rotation);this.back.rotation.copy(this.rotation);
    this.front.scale.setScalar(pose.scale);this.back.scale.setScalar(pose.scale);
    this.front.position.y=this.back.position.y=-pose.lift/this.scale;
    this.front.updateMatrixWorld();
    this.renderer.render(this.scene,this.camera);
    const originX=(this.width-this.host.clientWidth)/2,originY=(this.height-this.host.clientHeight)/2-this.host.clientHeight*.08;
    for(const contact of this.contacts){
      const x=(contact.x-.5)*W,y=(.5-contact.y)*H;
      const z=this.flex(x,y,pose);
      this.vector.set(x-pose.grabX*z*.15,y-pose.grabY*z*.15,z).applyMatrix4(this.front.matrixWorld).project(this.camera);
      contact.element.style.left=`${((this.vector.x+1)*this.width/2-originX).toFixed(2)}px`;
      contact.element.style.top=`${((1-this.vector.y)*this.height/2-originY).toFixed(2)}px`;
      contact.element.style.transform="translateY(-50%)";
    }
    this.host.dataset.bend=Math.hypot(pose.bendX,pose.bendY).toFixed(3);
    this.host.dataset.paperY=String(this.front.position.y);
    this.host.dataset.paperNormal=this.vector.set(0,0,1).applyQuaternion(this.front.quaternion).toArray().map(n=>n.toFixed(3)).join(",");
  }
  capture(){
    if(this.disposed)return null;
    const bounds=this.renderer.domElement.getBoundingClientRect();
    const points=[];
    for(let i=0;i<this.positions.count;i++){
      this.vector.fromBufferAttribute(this.positions,i).applyMatrix4(this.front.matrixWorld).project(this.camera);
      points.push({x:(this.vector.x+1)*this.width/2,y:(1-this.vector.y)*this.height/2});
    }
    const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))-2),top=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))-2);
    const right=Math.min(this.width,Math.ceil(Math.max(...points.map(p=>p.x)))+2),bottom=Math.min(this.height,Math.ceil(Math.max(...points.map(p=>p.y)))+2);
    const canvas=document.createElement('canvas'),ratio=this.renderer.getPixelRatio();canvas.width=Math.ceil((right-left)*ratio);canvas.height=Math.ceil((bottom-top)*ratio);
    this.renderer.render(this.scene,this.camera);
    canvas.getContext('2d')!.drawImage(this.renderer.domElement,left*ratio,top*ratio,(right-left)*ratio,(bottom-top)*ratio,0,0,canvas.width,canvas.height);
    const shadow=document.createElement('canvas');shadow.width=this.renderer.domElement.width;shadow.height=this.renderer.domElement.height;
    const ctx=shadow.getContext('2d')!;ctx.drawImage(this.renderer.domElement,0,0);ctx.clearRect(left*ratio,top*ratio,(right-left)*ratio,(bottom-top)*ratio);
    return {canvas,rect:new DOMRect(bounds.left+left,bounds.top+top,right-left,bottom-top),shadow:{canvas:shadow,rect:bounds}};
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.observer.disconnect();this.theme.disconnect();
    this.renderer.domElement.removeEventListener("webglcontextlost",this.onLost);
    this.renderer.domElement.remove();
    this.geometry.dispose();this.depth.dispose();this.material.dispose();this.backMaterial.dispose();this.texture.dispose();
    Object.values(this.detail).forEach(map=>map.dispose());
    this.environment.dispose();
    this.floor.geometry.dispose();this.floorMaterial.dispose();this.key.shadow.dispose();
    this.renderer.dispose();this.renderer.forceContextLoss();
    for(const {element,style} of this.contacts){if(style===null)element.removeAttribute("style");else element.setAttribute("style",style)}
    for(const name of ["surface","bend","paperY","paperNormal","groundY","groundNormal"])delete this.host.dataset[name];
  }
}
