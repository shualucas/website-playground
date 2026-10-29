import * as THREE from "three";

/** Dense pigmented jelly: glossy highlights without washing out the color. */
export function jellyFinish(params: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterialParameters {
  return { ...params, roughness: .24, metalness: 0, transmission: 0, opacity: 1,
    transparent: false, clearcoat: 1, clearcoatRoughness: .12, specularIntensity: .85,
    ior: 1.4, normalScale: new THREE.Vector2(.025, .025) };
}
