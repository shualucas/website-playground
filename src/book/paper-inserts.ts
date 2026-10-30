import * as THREE from "three";
import { PAGE_HEIGHT as H } from "./materials";
import { LEAF_SEGMENTS, type SkinnedLeaf, type PaperMaterial } from "./leaf";

export const INSERT_SAMPLES = [0,8,45,49,53,90,98];
type Surface = (params:THREE.MeshPhysicalMaterialParameters)=>PaperMaterial;

function noteTexture(color:string,grid:boolean) {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  ctx.strokeStyle="#52515a24";ctx.lineWidth=1;
  if(grid){
    for(let n=24;n<256;n+=24){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,256);ctx.moveTo(0,n);ctx.lineTo(256,n);ctx.stroke()}
  }else{
    ctx.strokeStyle="#55505c45";ctx.lineWidth=2;ctx.lineCap="round";
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(28,70+i*30);ctx.bezierCurveTo(65,65+i*30,110,76+i*30,174-i*18,69+i*30);ctx.stroke()}
  }
  let seed=701;
  for(let i=0;i<1600;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%256;seed=(Math.imul(seed,1664525)+1013904223)>>>0;ctx.fillStyle=i%2?"#ffffff18":"#39312b0c";ctx.fillRect(x,seed%256,1,1)}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  return map;
}

/** Tucked-in sheets share their host leaf's skeleton and animation clock. */
export function createPaperInserts(leaves:readonly SkinnedLeaf[],surface:Surface,keep:(texture:THREE.Texture)=>THREE.Texture) {
  const W=leaves[0].width;
  // x/z centers, width, height, in-plane angle, leaf index, stock, graph paper.
  const pieces:[number,number,number,number,number,number,string,boolean][]=[
    [W*.27,-H/2-.17,.76,.78,-.09,1,"#faf5df",true],
    [W*.65,-H/2-.13,.56,.58,.08,2,"#edcf6a",false],
    [W*.88,-H/2-.12,.46,.54,-.14,1,"#b9cdda",true],
    [W+.12,-1.30,.58,.40,.07,2,"#c5b2df",false],
    [W+.15,-.30,.64,.47,-.10,1,"#ebcd69",false],
    [W+.10,.75,.57,.44,.12,2,"#e8a89c",false],
    [W+.12,1.66,.57,.46,-.08,1,"#f8f3e6",true],
    [W*.33,H/2+.14,.84,.67,.10,2,"#faf5e9",true],
    [W*.73,H/2+.12,.60,.58,-.11,1,"#b9cbbb",false],
  ];
  return pieces.map(([cx,cz,width,height,angle,index,color,grid],id)=>{
    const leaf=leaves[Math.min(index,leaves.length-2)];
    const geometry=new THREE.PlaneGeometry(width,height,8,10);geometry.rotateX(-Math.PI/2);
    const p=geometry.attributes.position,indices:number[]=[],weights:number[]=[];
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    for(let i=0;i<p.count;i++){
      let px=p.getX(i),pz=p.getZ(i);
      // Clip the tiny corners, with a slightly uneven free edge like cut paper.
      if(Math.abs(px)>width/2-.015&&Math.abs(pz)>height/2-.015){px-=Math.sign(px)*.018;pz-=Math.sign(pz)*.018}
      const x=cx+px*cosine-pz*sine,z=cz+px*sine+pz*cosine;
      const exposed=Math.max(0,x-W,Math.abs(z)-H/2);
      p.setXYZ(i,x,-.004+exposed*exposed*.24,z);
      const along=THREE.MathUtils.clamp(x/W,0,1),joint=Math.min(LEAF_SEGMENTS-1,Math.floor(along*LEAF_SEGMENTS)),blend=along*LEAF_SEGMENTS-joint;
      indices.push(joint,joint+1,0,0);weights.push(1-blend,blend,0,0);
    }
    geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));geometry.computeVertexNormals();
    const material=surface({map:keep(noteTexture(color,grid)),roughness:.97,metalness:0,side:THREE.DoubleSide});
    const mesh=new THREE.SkinnedMesh(geometry,material);
    mesh.name=`tucked-paper-${id}`;mesh.userData.leaf=leaf.id;mesh.userData.paperInsert=true;
    mesh.castShadow=mesh.receiveShadow=true;
    mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(W+.8,H/2+.8)+.4);
    leaf.group.add(mesh);mesh.bind(leaf.mesh.skeleton,leaf.mesh.bindMatrix);
    return mesh;
  });
}
