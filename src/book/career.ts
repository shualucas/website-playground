import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export type GoogleAsset = {
  parts: THREE.BufferGeometry[];
  texture: THREE.CanvasTexture;
  blizzard: THREE.BufferGeometry[];
};

/** Preserve the published 2025 gradient G's vector silhouette and rasterized gradients. */
export async function loadGoogleAsset(): Promise<GoogleAsset> {
  const [svg, blizzardSvg] = await Promise.all(
    ["/models/google-g.svg", "/models/blizzard-entertainment.svg"].map(
      async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Logo unavailable");
        return response.text();
      },
    ),
  );
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, 512, 512);
  // Extend boundary colors into empty texels so bevels cannot sample a black fringe.
  const pixels = ctx.getImageData(0, 0, 512, 512),
    data = pixels.data;
  const visited = new Uint8Array(512 * 512),
    queue = new Int32Array(512 * 512);
  let head = 0,
    tail = 0;
  for (let i = 0; i < visited.length; i++)
    if (data[i * 4 + 3] > 128) {
      visited[i] = 1;
      queue[tail++] = i;
      data[i * 4 + 3] = 255;
    }
  while (head < tail) {
    const i = queue[head++],
      x = i % 512;
    for (const next of [
      x > 0 ? i - 1 : -1,
      x < 511 ? i + 1 : -1,
      i - 512,
      i + 512,
    ]) {
      if (next < 0 || next >= visited.length || visited[next]) continue;
      visited[next] = 1;
      queue[tail++] = next;
      data[next * 4] = data[i * 4];
      data[next * 4 + 1] = data[i * 4 + 1];
      data[next * 4 + 2] = data[i * 4 + 2];
      data[next * 4 + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // The source paints gradients through a clipping silhouette. Extrude that outline
  // once, rather than extruding overlapping color/filter patches into separate solids.
  const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const outline = svgDocument.querySelector("clipPath path")!;
  const transform = svgDocument
    .querySelector("svg > g")!
    .getAttribute("transform");
  const silhouette = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${transform}"><path fill="#ffffff" d="${outline.getAttribute("d")}"/></g></svg>`;
  const parsed = new SVGLoader().parse(silhouette);
  const parts = parsed.paths.flatMap((path) =>
    SVGLoader.createShapes(path).map((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 22,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelThickness: 3,
        bevelSize: 2,
        curveSegments: 20,
        steps: 1,
      });
      geometry.scale(1.1 / 268.152, -1.1 / 273.883, 1.1 / 268.152);
      geometry.translate(-0.55, 1.25, -0.04);
      // Reflecting the SVG's Y axis also reverses triangle winding.
      for (const attribute of Object.values(geometry.attributes)) {
        const a = attribute as THREE.BufferAttribute;
        for (let i = 0; i < a.count; i += 3)
          for (let k = 0; k < a.itemSize; k++) {
            const j = (i + 1) * a.itemSize + k,
              l = (i + 2) * a.itemSize + k,
              v = a.array[j];
            a.array[j] = a.array[l];
            a.array[l] = v;
          }
      }
      const p = geometry.attributes.position,
        uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++)
        uv.setXY(i, (p.getX(i) + 0.55) / 1.1, (p.getY(i) - 0.15) / 1.1);
      geometry.computeVertexNormals();
      return geometry;
    }),
  );
  const blizzard = new SVGLoader().parse(blizzardSvg).paths.flatMap((path) =>
    SVGLoader.createShapes(path).map((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 18,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelThickness: 1.4,
        bevelSize: 1.1,
        curveSegments: 12,
        steps: 1,
      });
      const scale = 1.5 / 340.926;
      geometry.scale(scale, -scale, scale);
      geometry.translate(-0.75, 0.98, -0.04);
      reverseWinding(geometry);
      geometry.computeVertexNormals();
      return geometry;
    }),
  );
  return { parts, texture, blizzard };
}

function reverseWinding(geometry: THREE.BufferGeometry) {
  for (const attribute of Object.values(geometry.attributes)) {
    const a = attribute as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i += 3)
      for (let k = 0; k < a.itemSize; k++) {
        const j = (i + 1) * a.itemSize + k,
          l = (i + 2) * a.itemSize + k,
          v = a.array[j];
        a.array[j] = a.array[l];
        a.array[l] = v;
      }
  }
}

export function careerMiniatures(
  asset: GoogleAsset,
  material: (p: THREE.MeshPhysicalMaterialParameters) => THREE.Material,
  register: (m: THREE.Mesh) => void,
) {
  const add = (
    g: THREE.Group,
    geometry: THREE.BufferGeometry,
    color: string,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new THREE.Mesh(geometry, material({ color, roughness: 0.35 }));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    geometry.computeBoundingBox();
    register(mesh);
    g.add(mesh);
    return mesh;
  };
  const box = (
    g: THREE.Group,
    w: number,
    h: number,
    d: number,
    c: string,
    x: number,
    y: number,
    z: number,
  ) =>
    add(
      g,
      new RoundedBoxGeometry(w, h, d, 2, Math.min(0.025, w / 3, h / 3, d / 3)),
      c,
      x,
      y,
      z,
    );
  const google = new THREE.Group();
  google.name = "Google gradient G";
  for (const part of asset.parts) {
    const m = add(google, part, "#ffffff");
    (m.material as THREE.MeshStandardMaterial).map = asset.texture;
  }
  const blizzard = new THREE.Group();
  blizzard.name = "Blizzard Entertainment logo";
  asset.blizzard.forEach((part) => add(blizzard, part, "#087cdb"));
  const bridge = new THREE.Group();
  bridge.name = "Golden Gate Bridge";
  box(bridge, 1.65, 0.09, 0.32, "#e95723", 0, 0.4, 0);
  for (const x of [-0.46, 0.46]) {
    for (const z of [-0.12, 0.12])
      box(bridge, 0.065, 1.3, 0.065, "#e7481b", x, 0.66, z);
    for (const y of [0.68, 1, 1.28])
      box(bridge, 0.09, 0.04, 0.3, "#f5703d", x, y, 0);
  }
  for (const z of [-0.15, 0.15]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.81, 0.43, z),
      new THREE.Vector3(-0.46, 1.34, z),
      new THREE.Vector3(0, 0.7, z),
      new THREE.Vector3(0.46, 1.34, z),
      new THREE.Vector3(0.81, 0.43, z),
    ]);
    add(bridge, new THREE.TubeGeometry(curve, 48, 0.016, 6, false), "#f26532");
    for (let i = 1; i < 16; i++) {
      const p = curve.getPoint(i / 16);
      if (p.y < 0.45) continue;
      add(
        bridge,
        new THREE.CylinderGeometry(0.006, 0.006, p.y - 0.43, 5),
        "#f56c34",
        p.x,
        (p.y + 0.43) / 2,
        z,
      );
    }
  }
  return { google, blizzard, bridge };
}
