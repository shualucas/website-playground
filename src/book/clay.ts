import * as THREE from "three";

let shared: { normal: THREE.DataTexture; roughness: THREE.DataTexture } | null =
  null;
let owners = 0;
/** Tiny shared pore maps give matte pigment some tactile variation without new geometry. */
export function acquireClayGrain() {
  if (!shared) {
    const size = 128,
      heights = new Float32Array(size * size),
      normal = new Uint8Array(size * size * 4),
      roughness = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let h = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        heights[y * size + x] = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx =
            heights[y * size + ((x + 1) % size)] -
            heights[y * size + ((x + size - 1) % size)],
          dy =
            heights[((y + 1) % size) * size + x] -
            heights[((y + size - 1) % size) * size + x],
          i = (y * size + x) * 4;
        normal.set([128 - dx * 35, 128 - dy * 35, 252, 255], i);
        const r = 226 + Math.round(heights[y * size + x] * 29);
        roughness.set([r, r, r, 255], i);
      }
    const map = (data: Uint8Array) => {
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
      return texture;
    };
    shared = { normal: map(normal), roughness: map(roughness) };
  }
  owners++;
  let released = false;
  return {
    ...shared,
    release() {
      if (released) return;
      released = true;
      if (--owners === 0) {
        shared!.normal.dispose();
        shared!.roughness.dispose();
        shared = null;
      }
    },
  };
}
