import * as THREE from "three";

/** Printed sticker stock receives the studio shadows without bleaching its ink. */
export function labelMaterial(map:THREE.Texture,grain?:THREE.Texture,muted=false) {
  if(!grain){
    const pixels=new Uint8Array(32*32*4);let seed=17;
    for(let i=0;i<pixels.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i]=pixels[i+1]=pixels[i+2]=116+seed%24;pixels[i+3]=255}
    grain=new THREE.DataTexture(pixels,32,32);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(5,5);grain.needsUpdate=true;
  }
  const material=new THREE.MeshPhysicalMaterial({name:"Project label",map,color:"#ffffff",roughness:.68,
    metalness:0,clearcoat:.12,clearcoatRoughness:.55,bumpMap:grain,bumpScale:.0008,
    toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  material.onBeforeCompile=shader=>{
    if(muted)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float inkChroma=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b)-min(min(diffuseColor.r,diffuseColor.g),diffuseColor.b);
      float inkLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
      vec3 mutedInk=mix(vec3(inkLuma),diffuseColor.rgb,.9)*.84;
      diffuseColor.rgb=mix(diffuseColor.rgb,mutedInk,smoothstep(.02,.4,inkChroma));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 illumination=outgoingLight/max(diffuseColor.rgb,vec3(.001));
      float brightness=dot(illumination,vec3(.2126,.7152,.0722));
      outgoingLight=diffuseColor.rgb*clamp(brightness,0.,1.);
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>`lit-cartridge-print-v1-${muted}`;
  return material;
}
