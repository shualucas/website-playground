import * as THREE from "three";

const SIZE = 512;
function hash(x: number, y: number, seed = 0) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, seed = 0) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let fx = x - ix,
    fy = y - iy;
  fx *= fx * (3 - 2 * fx);
  fy *= fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx),
    THREE.MathUtils.lerp(
      hash(ix, iy + 1, seed),
      hash(ix + 1, iy + 1, seed),
      fx,
    ),
    fy,
  );
}
function surfaceMap(
  data: Uint8Array,
  size: number,
  repeatX: number,
  repeatY: number,
  color = false,
) {
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 8;
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.needsUpdate = true;
  return map;
}
export function surfaceDetail(kind: "leather" | "paper" | "stone") {
  const height = new Float32Array(SIZE * SIZE),
    normal = new Uint8Array(SIZE * SIZE * 4),
    roughness = new Uint8Array(SIZE * SIZE * 4),
    albedo = new Uint8Array(SIZE * SIZE * 4);
  const cells = kind === "leather" ? 40 : kind === "stone" ? 12 : 44;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const u = (x / SIZE) * cells,
        v = (y / SIZE) * cells;
      let value = 0;
      if (kind === "leather") {
        const ix = Math.floor(u),
          iy = Math.floor(v);
        let first = 10,
          second = 10;
        for (let j = -1; j <= 1; j++)
          for (let i = -1; i <= 1; i++) {
            const xx = ix + i,
              yy = iy + j,
              wx = (xx + cells) % cells,
              wy = (yy + cells) % cells;
            const dx = u - xx - (0.2 + 0.6 * hash(wx, wy, 3)),
              dy = v - yy - (0.2 + 0.6 * hash(wx, wy, 7)),
              d = dx * dx + dy * dy;
            if (d < first) {
              second = first;
              first = d;
            } else if (d < second) second = d;
          }
        const pebble = 1 - Math.exp(-(second - first) * 8);
        value =
          pebble * 0.78 +
          hash(x, y, 11) * 0.08 +
          noise(u * 2, v * 0.4, 14) * 0.14;
      } else if (kind === "paper")
        value =
          noise(u, v, 20) * 0.42 +
          hash(x, y, 7) * 0.26 +
          noise(u * 0.12, v * 0.6, 10) * 0.32;
      else
        value =
          noise(u, v, 3) * 0.48 +
          noise(u * 3.5, v * 3.5, 5) * 0.3 +
          hash(x, y, 9) * 0.22;
      height[y * SIZE + x] = value;
      const i = (y * SIZE + x) * 4,
        r =
          kind === "leather"
            ? Math.round(150 + (1 - value) * 85)
            : kind === "paper"
              ? Math.round(220 + value * 33)
              : Math.round(190 + value * 55);
      roughness.set([r, r, r, 255], i);
      const shade =
        kind === "leather"
          ? Math.round(184 + value * 62)
          : kind === "paper"
            ? Math.round(229 + value * 25)
            : Math.round(155 + value * 85);
      albedo.set([shade, shade, shade, 255], i);
    }
  const strength = kind === "leather" ? 4.5 : kind === "paper" ? 1.15 : 2.6;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const dx =
          (height[y * SIZE + ((x + 1) % SIZE)] -
            height[y * SIZE + ((x + SIZE - 1) % SIZE)]) *
          strength,
        dy =
          (height[((y + 1) % SIZE) * SIZE + x] -
            height[((y + SIZE - 1) % SIZE) * SIZE + x]) *
          strength,
        len = Math.hypot(dx, dy, 1),
        i = (y * SIZE + x) * 4;
      normal.set(
        [
          Math.round(128 - (dx / len) * 127),
          Math.round(128 + (dy / len) * 127),
          Math.round(128 + 127 / len),
          255,
        ],
        i,
      );
    }
  const repeat =
    kind === "leather" ? [2.3, 3.2] : kind === "paper" ? [2, 2.8] : [1, 1];
  return {
    normal: surfaceMap(normal, SIZE, repeat[0], repeat[1]),
    roughness: surfaceMap(roughness, SIZE, repeat[0], repeat[1]),
    albedo: surfaceMap(albedo, SIZE, repeat[0], repeat[1], true),
  };
}

/** Soft rectangular studio reflections, generated locally as a small HDR environment. */
export function studioEnvironment(
  renderer: THREE.WebGLRenderer,
  simple = false,
) {
  const width = 256,
    height = 128,
    data = new Float32Array(width * height * 4);
  const panel = (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => Math.exp(-(((a - c) / e) ** 8 + ((b - d) / f) ** 8));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const lon = (x / width - 0.5) * Math.PI * 2,
        lat = (0.5 - y / height) * Math.PI;
      const softA = panel(lon, lat, -1.65, 0.62, 0.58, 0.45),
        softB = panel(lon, lat, 0.85, 0.4, 0.32, 0.7),
        top = panel(lon, lat, 0, 1.25, 2, 0.17),
        ambient = 0.12 + 0.12 * Math.max(0, Math.sin(lat));
      const i = (y * width + x) * 4;
      data[i] = ambient + softA * 3.6 + softB * 2.1 + top * 2.3;
      data[i + 1] = ambient + softA * 3.3 + softB * 2.3 + top * 2.3;
      data[i + 2] = ambient + softA * 2.9 + softB * 2.6 + top * 2.2;
      data[i + 3] = 1;
    }
  const hdr = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  hdr.needsUpdate = true;
  if (simple) {
    const cube = new THREE.WebGLCubeRenderTarget(64, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    cube.fromEquirectangularTexture(renderer, hdr);
    hdr.dispose();
    return cube;
  }
  const generator = new THREE.PMREMGenerator(renderer),
    target = generator.fromEquirectangular(hdr);
  hdr.dispose();
  generator.dispose();
  return target;
}

/** Independent corner radius in the X/Z plane; a thin slab no longer forces square corners. */
export function roundedSlab(
  width: number,
  length: number,
  thickness: number,
  corner: number,
  bevel = 0.035,
) {
  const x = -width / 2,
    y = -length / 2,
    r = corner,
    shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + length - r);
  shape.quadraticCurveTo(x + width, y + length, x + width - r, y + length);
  shape.lineTo(x + r, y + length);
  shape.quadraticCurveTo(x, y + length, x, y + length - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const edge = Math.min(bevel, thickness * 0.3),
    geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness - edge * 2,
      bevelEnabled: true,
      bevelThickness: edge,
      bevelSize: edge,
      bevelSegments: 4,
      curveSegments: 10,
      steps: 1,
    });
  const pos = geometry.attributes.position,
    norm = geometry.attributes.normal,
    uv = geometry.attributes.uv;
  const materialIndices: number[][] = [[], [], []];
  for (let i = 0; i < pos.count; i += 3) {
    const nz = norm.getZ(i),
      material = nz > 0.9 ? 0 : nz < -0.9 ? 1 : 2;
    materialIndices[material].push(i, i + 1, i + 2);
    for (let j = 0; j < 3; j++) {
      const k = i + j;
      if (material === 2)
        uv.setXY(
          k,
          Math.abs(norm.getX(k)) > 0.5
            ? pos.getY(k) / length + 0.5
            : pos.getX(k) / width + 0.5,
          (pos.getZ(k) + edge) / thickness,
        );
      else uv.setXY(k, pos.getX(k) / width + 0.5, pos.getY(k) / length + 0.5);
    }
  }
  geometry.setIndex(materialIndices.flat());
  geometry.clearGroups();
  let start = 0;
  materialIndices.forEach((indices, material) => {
    geometry.addGroup(start, indices.length, material);
    start += indices.length;
  });
  geometry.translate(0, 0, -(thickness - edge * 2) / 2);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
