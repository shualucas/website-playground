/** Bounded presentation controls: topology and collision clearance stay fixed. */
export const physicsControls = {
  turnSpeed: {label:"Turn speed",min:.65,max:1.5,step:.05,value:1},
  curl: {label:"Page curvature",min:.4,max:1.15,step:.05,value:1},
  spineCurl: {label:"Bend near the spine",min:.5,max:1.4,step:.05,value:1},
  gravitySag: {label:"Gravity sag",min:0,max:.7,step:.05,value:.35},
  edgeStiffness: {label:"Edge stiffness",min:.65,max:1.6,step:.05,value:.8},
  coverStiffness: {label:"Cover stiffness",min:1.1,max:2.4,step:.1,value:1.1},
  rotationFlex: {label:"Flex while rotating",min:0,max:1.8,step:.1,value:1.4},
  reboundDamping: {label:"Rebound damping",min:5,max:12,step:.5,value:6},
  turnSpacing: {label:"Time between turns",min:.75,max:2,step:.05,value:1},
} as const;
export type PaperPhysics = {[K in keyof typeof physicsControls]:number};
export const defaultPaperPhysics=Object.fromEntries(Object.entries(physicsControls).map(([key,control])=>[key,control.value])) as PaperPhysics;
export const physicsStorageKey="zine-paper-physics-v1";
export function normalizePaperPhysics(input:unknown):PaperPhysics {
  const source=input&&typeof input==="object"?input as Record<string,unknown>:{};
  return Object.fromEntries(Object.entries(physicsControls).map(([key,control])=>{
    const value=source[key];return [key,typeof value==="number"&&Number.isFinite(value)?Math.max(control.min,Math.min(control.max,value)):control.value];
  })) as PaperPhysics;
}
export function loadPaperPhysics():PaperPhysics {
  try{return normalizePaperPhysics(JSON.parse(localStorage.getItem(physicsStorageKey)||"null"))}catch{return {...defaultPaperPhysics}}
}
