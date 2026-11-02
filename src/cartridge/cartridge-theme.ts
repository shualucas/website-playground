import * as THREE from "three";

type Finish = { color:THREE.Color; attenuation:THREE.Color; roughness:number; env:number; clearcoat:number };
const original = new WeakMap<THREE.MeshPhysicalMaterial,Finish>();
/** Only molded plastic changes with the room; printed label ink stays authored. */
export function applyCartridgeTheme(root:THREE.Object3D,dark:boolean) {
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]) {
      if(!(material instanceof THREE.MeshPhysicalMaterial)||material.name!=="Cartridge Shell")continue;
      let base=original.get(material);
      if(!base){base={color:material.color.clone(),attenuation:material.attenuationColor.clone(),roughness:material.roughness,env:material.envMapIntensity,clearcoat:material.clearcoat};original.set(material,base)}
      material.color.copy(base.color).multiplyScalar(dark?.58:1);
      material.attenuationColor.copy(base.attenuation).multiplyScalar(dark?.8:1);
      material.roughness=base.roughness+(dark?.08:0);
      material.envMapIntensity=base.env*(dark?.5:1);
      material.clearcoat=base.clearcoat*(dark?.6:1);
    }
  });
}
