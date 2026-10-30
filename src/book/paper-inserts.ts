import * as THREE from "three";
import { PAGE_HEIGHT as H } from "./materials";
import { LEAF_SEGMENTS, type SkinnedLeaf, type PaperMaterial } from "./leaf";

export const INSERT_SAMPLES = [0,8,45,49,53,90,98];
const NOTE_SIZE=1.05;
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

/** Notes rest on their printed face and extend beyond it, sharing the page skeleton. */
export function createPaperInserts(leaves:readonly SkinnedLeaf[],surface:Surface,keep:(texture:THREE.Texture)=>THREE.Texture) {
  const W=leaves[0].width;
  // Discover the printed faces in reading order; covers and the blank page get no note.
  const prints=leaves.flatMap(leaf=>[0,1].flatMap(face=>{
    const id=(leaf.faces[face].image as HTMLCanvasElement)?.dataset?.flyerId;
    return id?[{leaf,face,id}]:[];
  }));
  // Edge, position along that edge, exposed length, skew, stock, graph paper.
  const placements:["top"|"right"|"bottom",number,number,number,string,boolean][]=[
    ["top",W*.28,.48,-.06,"#efda7d",true],
    ["right",-1.05,.66,.05,"#e9a096",false],
    ["bottom",W*.63,.36,-.06,"#c9b5e2",false],
    ["right",1.05,.54,-.05,"#abcbb4",true],
    ["top",W*.75,.28,.06,"#b8cadf",false],
  ];
  return prints.map(({leaf,face,id},index)=>{
    const [edge,along,peek,angle,color,grid]=placements[index%placements.length];
    const width=NOTE_SIZE,height=NOTE_SIZE;
    const cx=edge==="right"?W-width/2+peek:along;
    const cz=edge==="top"?-H/2+height/2-peek:edge==="bottom"?H/2-height/2+peek:along;
    const side=face===0?1:-1;
    const geometry=new THREE.PlaneGeometry(width,height,8,10);geometry.rotateX(-Math.PI/2);
    const p=geometry.attributes.position,indices:number[]=[],weights:number[]=[];
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    const surfaceOffset=leaf.cover ? 0.0075 : 0.0045;
    for(let i=0;i<p.count;i++){
      let px=p.getX(i),pz=p.getZ(i);
      // Clip the tiny corners, with a slightly uneven free edge like cut paper.
      if(Math.abs(px)>width/2-.015&&Math.abs(pz)>height/2-.015){px-=Math.sign(px)*.018;pz-=Math.sign(pz)*.018}
      const x=cx+px*cosine-pz*sine,z=cz+px*sine+pz*cosine;
      const exposed=Math.max(0,x-W,Math.abs(z)-H/2);
      // Put the adhesive area just above its own printed face, never on the reverse.
      p.setXYZ(i,x,side*(surfaceOffset+exposed*exposed*.24),z);
      const along=THREE.MathUtils.clamp(x/W,0,1),joint=Math.min(LEAF_SEGMENTS-1,Math.floor(along*LEAF_SEGMENTS)),blend=along*LEAF_SEGMENTS-joint;
      indices.push(joint,joint+1,0,0);weights.push(1-blend,blend,0,0);
    }
    geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));geometry.computeVertexNormals();
    const material=surface({map:keep(noteTexture(color,grid)),roughness:.97,metalness:0,side:THREE.DoubleSide});
    const mesh=new THREE.SkinnedMesh(geometry,material);
    mesh.name=`tucked-paper-${id}`;mesh.userData.leaf=leaf.id;mesh.userData.paperInsert=true;mesh.userData.flyerId=id;mesh.userData.printFace=face;
    mesh.castShadow=mesh.receiveShadow=true;
    mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(W+.8,H/2+.8)+.4);
    leaf.group.add(mesh);mesh.bind(leaf.mesh.skeleton,leaf.mesh.bindMatrix);
    return mesh;
  });
}
