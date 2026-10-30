import * as THREE from "three";
import { PAGE_HEIGHT as H } from "./materials";
import { LEAF_SEGMENTS, type SkinnedLeaf, type PaperMaterial } from "./leaf";
import { zineNotes } from "../content/zine-notes";
import { drawHandwrittenNote } from "../content/handwriting";

export const INSERT_SAMPLES = [0,8,45,49,53,90,98];
const NOTE_SIZE=1.05;
type Surface = (params:THREE.MeshPhysicalMaterialParameters)=>PaperMaterial;

function noteTexture(color:string,text:string,id:string) {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  drawHandwrittenNote(ctx,text,id);
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
  // Edge, position along that edge, exposed length, skew.
  const placements:["top"|"right"|"bottom",number,number,number][]=[
    ["top",W*.57,.48,-.06],
    ["right",.26,.66,.05],
    ["bottom",W*.63,.36,-.06],
    ["right",.52,.54,-.05],
    ["top",W*.62,.28,.06],
  ];
  return prints.map(({leaf,face,id},index)=>{
    const [edge,along,peek,angle]=placements[index%placements.length];
    const note=zineNotes.find(note=>note.id===id),color=note?.color??"#efda7d";
    const width=NOTE_SIZE,height=NOTE_SIZE;
    const cx=edge==="right"?W-width/2+peek:along;
    const cz=edge==="top"?-H/2+height/2-peek:edge==="bottom"?H/2-height/2+peek:along;
    const side=face===0?1:-1;
    const geometry=new THREE.PlaneGeometry(width,height,8,10);geometry.rotateX(-Math.PI/2);
    // A reverse-face note is read after its page turns over, so mirror its UVs.
    if(face===1){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i))}
    const p=geometry.attributes.position,indices:number[]=[],weights:number[]=[];
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    const surfaceOffset=leaf.cover ? 0.0075 : 0.0045;
    for(let i=0;i<p.count;i++){
      const px=p.getX(i),pz=p.getZ(i);
      const x=cx+px*cosine-pz*sine,z=cz+px*sine+pz*cosine;
      const exposed=Math.max(0,x-W,Math.abs(z)-H/2);
      // Put the adhesive area just above its own printed face, never on the reverse.
      p.setXYZ(i,x,side*(surfaceOffset+exposed*exposed*.24),z);
      const along=THREE.MathUtils.clamp(x/W,0,1),joint=Math.min(LEAF_SEGMENTS-1,Math.floor(along*LEAF_SEGMENTS)),blend=along*LEAF_SEGMENTS-joint;
      indices.push(joint,joint+1,0,0);weights.push(1-blend,blend,0,0);
    }
    geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));geometry.computeVertexNormals();
    const material=surface({map:keep(noteTexture(color,note?.text??"",id)),roughness:.97,metalness:0,side:THREE.DoubleSide,emissive:"#f7e4a7",emissiveIntensity:0});
    const mesh=new THREE.SkinnedMesh(geometry,material);
    mesh.name=`tucked-paper-${id}`;mesh.userData.leaf=leaf.id;mesh.userData.paperInsert=true;mesh.userData.flyerId=id;mesh.userData.printFace=face;
    mesh.userData.restPositions=new Float32Array(p.array);mesh.userData.pageWidth=W;mesh.userData.hoverStrength=0;
    mesh.castShadow=mesh.receiveShadow=true;
    mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(W+.8,H/2+.8)+.4);
    leaf.group.add(mesh);mesh.bind(leaf.mesh.skeleton,leaf.mesh.bindMatrix);
    return mesh;
  });
}

/** Only the free edge peels up. The adhesive area and square corners stay fixed. */
export function hoverPaperInsert(mesh:THREE.SkinnedMesh,strength:number) {
  if(Math.abs(mesh.userData.hoverStrength-strength)<.0001)return false;
  mesh.userData.hoverStrength=strength;
  const rest=mesh.userData.restPositions as Float32Array,p=mesh.geometry.attributes.position;
  const side=mesh.userData.printFace===0?1:-1,W=mesh.userData.pageWidth as number;
  for(let i=0;i<p.count;i++){
    const exposed=Math.max(0,rest[i*3]-W,Math.abs(rest[i*3+2])-H/2);
    p.setY(i,rest[i*3+1]+side*.18*Math.pow(Math.min(1,exposed/.6),2)*strength);
  }
  p.needsUpdate=true;mesh.geometry.computeVertexNormals();return true;
}
