import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { cartridgeModel, type ShellFinish } from "./config";
import { circuitBoardMaps, mapBoardGeometry } from "./circuit-board";

const rounded = (w: number, h: number, d: number, radius = .035) => new RoundedBoxGeometry(w, h, d, 3, radius);

/** An original DMG-like silhouette, modeled locally; no third-party cartridge asset. */
export function makeCartridge(color: string, label: THREE.Texture, grain: THREE.Texture) {
  const group = new THREE.Group();
  const shell = new THREE.MeshPhysicalMaterial({ color, roughness: .6, metalness: 0, clearcoat: .08, clearcoatRoughness: .6, bumpMap: grain, bumpScale: .006 });
  const dark = new THREE.MeshStandardMaterial({ color: "#343936", roughness: .8 });
  const frame = new THREE.MeshStandardMaterial({ color, roughness: .72 });
  frame.color.multiplyScalar(.86);
  // Print stays color-accurate; shell and recessed frame carry the studio highlights.
  const paper = new THREE.MeshBasicMaterial({ map: label, toneMapped: false });
  const seam = new THREE.MeshStandardMaterial({ color, roughness: .7 }); seam.color.multiplyScalar(.55);
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  };
  const outline = new THREE.Shape();
  outline.moveTo(-1.15, -1.36); outline.lineTo(1.15, -1.36);
  outline.quadraticCurveTo(1.2, -1.36, 1.2, -1.31);
  outline.lineTo(1.2, 1.04); outline.lineTo(1.02, 1.04); outline.lineTo(1.02, 1.34);
  outline.lineTo(-1.14, 1.34); outline.quadraticCurveTo(-1.2, 1.34, -1.2, 1.28);
  outline.lineTo(-1.2, -1.31); outline.quadraticCurveTo(-1.2, -1.36, -1.15, -1.36);
  const half = new THREE.ExtrudeGeometry(outline, { depth: .115, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 3, curveSegments: 5 });
  mesh(half, shell, 0, 0, .032).name = "Front shell";
  mesh(half.clone(), shell, 0, 0, -.145).name = "Back shell";
  mesh(new THREE.ExtrudeGeometry(outline, { depth: .009, bevelEnabled: true, bevelSize: .012, bevelThickness: .001, bevelSegments: 2, curveSegments: 5 }), seam, 0, 0, -.004).name = "Shell seam";
  mesh(rounded(2.13, 1.92, .025), frame, 0, -.25, .181).name = "Recessed label surround";
  // Plane UVs stay rectangular, with actual rounded paper geometry and no extrusion UV seams.
  const labelShape = new THREE.Shape();
  const w = 2.035, h = 1.826, r = .065;
  labelShape.moveTo(-w / 2 + r, -h / 2);
  labelShape.lineTo(w / 2 - r, -h / 2); labelShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  labelShape.lineTo(w / 2, h / 2 - r); labelShape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  labelShape.lineTo(-w / 2 + r, h / 2); labelShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  labelShape.lineTo(-w / 2, -h / 2 + r); labelShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const lg = new THREE.ShapeGeometry(labelShape, 8), pos = lg.attributes.position;
  const uv = lg.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + .5, pos.getY(i) / h + .5);
  mesh(lg, paper, 0, -.25, .197).name = "Label";
  // Upper molded inset and recessed grip grooves, visible from either side.
  mesh(rounded(1.79, .31, .018, .06), frame, -.04, 1.04, .177);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) mesh(rounded(.19, .026, .025, .008), frame, side * 1.085, .62 + i * .075, .17);
  mesh(rounded(1.77, .085, .04, .012), dark, 0, -1.33, .152).name = "Connector recess";
  const gold = new THREE.MeshStandardMaterial({ color: "#baa367", metalness: .7, roughness: .48 });
  for (let i = 0; i < 18; i++) mesh(new THREE.BoxGeometry(.045, .055, .008), gold, -.76 + i * .089, -1.33, .177);
  mesh(rounded(1.88, 1.7, .012, .06), frame, 0, -.1, -.18).name = "Back plate";
  const screw = mesh(new THREE.CylinderGeometry(.065, .065, .016, 16), dark, 0, .94, -.189); screw.rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(.07, .012, .005), frame, 0, .94, -.201);
  for (let i = 0; i < 3; i++) mesh(rounded(.65 - i * .1, .018, .01, .006), seam, 0, -.65 - i * .09, -.191);
  return group;
}

let template: { url: string; promise: Promise<THREE.Group> } | null = null;

/** Decode once, with a locally served worker/WASM; instances own their geometry/materials. */
async function externalTemplate(url: string) {
  if (!template || template.url !== url) {
    const promise = (async () => {
      const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import("three/addons/loaders/GLTFLoader.js"), import("three/addons/loaders/DRACOLoader.js"),
      ]);
      const decoder = new DRACOLoader().setDecoderPath("/cartridges/draco/").setDecoderConfig({ type: "wasm" }).setWorkerLimit(1);
      try { return (await new GLTFLoader().setDRACOLoader(decoder).loadAsync(url)).scene; }
      finally { decoder.dispose(); }
    })();
    template = { url, promise };
    promise.catch(() => { if (template?.promise === promise) template = null; });
  }
  return template.promise;
}

export async function loadExternalShell(label: THREE.Texture, color: string, grain?: THREE.Texture, finish?: ShellFinish): Promise<THREE.Group | null> {
  if (!cartridgeModel.url) return null;
  const group = (await externalTemplate(cartridgeModel.url)).clone(true);
  group.rotation.set(...cartridgeModel.rotation); group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group), center = bounds.getCenter(new THREE.Vector3());
  const normalized = new THREE.Group(); normalized.add(group);
  group.position.sub(center); normalized.scale.setScalar(2.4 / bounds.getSize(new THREE.Vector3()).x);
  normalized.updateMatrixWorld(true);
  const board = group.getObjectByName("PCB"), boardBounds = board ? new THREE.Box3().setFromObject(board) : null;
  const circuitry = boardBounds ? circuitBoardMaps() : null;
  let hasLabel = false;
  const labelMap = label.clone(); labelMap.flipY = false; labelMap.needsUpdate = true;
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry = object.geometry.clone();
    object.castShadow = object.receiveShadow = true;
    const adapt = (material: THREE.Material) => {
      // The GLB's Label node is a group: identify its artwork primitive by
      // material, and suppress the second, overlapping paper primitive.
      if (material.name === "Label (Artwork)" || object.name === cartridgeModel.labelMesh) {
        hasLabel = true; object.userData.label = true;
        return new THREE.MeshPhysicalMaterial({ name: "Project label", map: labelMap, color: "#fff", metalness: 0,
          roughness: .66, clearcoat: .24, clearcoatRoughness: .43, side: THREE.DoubleSide,
          polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      }
      const clone = material.clone() as THREE.MeshStandardMaterial;
      if (material.name === "Label (Paper)") { clone.visible = false; object.castShadow = false; }
      else if (material.name === "PCB (Back)" && circuitry && boardBounds) {
        mapBoardGeometry(object, boardBounds);
        clone.name = "Green PCB with gold contacts"; clone.color.set("#ffffff");
        clone.map = circuitry.map; clone.metalnessMap = circuitry.metalnessMap;
        clone.metalness = .85; clone.roughness = .46; clone.side = THREE.DoubleSide;
      }
      else if (material.name === "Cartridge Shell") {
        if (finish && finish.transmission > 0) {
          clone.dispose();
          const tint = new THREE.Color(color).lerp(new THREE.Color("#ffffff"), .015);
          return new THREE.MeshPhysicalMaterial({ name: "Cartridge Shell", color: tint, metalness: 0,
            roughness: finish.roughness, transmission: finish.transmission, thickness: finish.thickness,
            attenuationColor: new THREE.Color(color), attenuationDistance: finish.attenuationDistance,
            ior: 1.46, clearcoat: .18, clearcoatRoughness: .35, envMapIntensity: 1,
            transparent: false, opacity: 1, side: THREE.FrontSide });
        }
        clone.color.set(color); clone.metalness = 0; clone.roughness = finish?.roughness ?? .6; clone.envMapIntensity = .85;
        if (grain && object.geometry.hasAttribute("uv")) { clone.bumpMap = grain; clone.bumpScale = .003; }
      }
      return clone;
    };
    object.material = Array.isArray(object.material) ? object.material.map(adapt) : adapt(object.material);
  });
  if (!hasLabel) {
    group.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); for (const m of Array.isArray(object.material) ? object.material : [object.material]) m.dispose(); } });
    labelMap.dispose(); throw new Error(`No label artwork found in ${cartridgeModel.url}. Check cartridge/config.ts.`);
  }
  return normalized;
}
