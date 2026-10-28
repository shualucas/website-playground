import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { cartridgeModel } from "./config";

const rounded = (w: number, h: number, d: number, radius = .035) => new RoundedBoxGeometry(w, h, d, 3, radius);

/** An original DMG-like silhouette, modeled locally; no third-party cartridge asset. */
export function makeCartridge(color: string, label: THREE.Texture, grain: THREE.Texture) {
  const group = new THREE.Group();
  const shell = new THREE.MeshPhysicalMaterial({ color, roughness: .52, metalness: 0, clearcoat: .12, clearcoatRoughness: .58, bumpMap: grain, bumpScale: .006 });
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
  mesh(half.clone(), shell, 0, 0, -.119).name = "Back shell";
  mesh(rounded(2.38, 2.66, .018, .008), seam, 0, -.01, .016).name = "Shell seam";
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
  const stamp = document.createElement("canvas"); stamp.width = 768; stamp.height = 100;
  const ctx = stamp.getContext("2d")!; ctx.clearRect(0, 0, 768, 100);
  ctx.fillStyle = "#30372e"; ctx.font = 'bold 36px Arial'; ctx.textAlign = "center";
  ctx.fillText("JOSH LUCAS", 384, 65);
  const stampTexture = new THREE.CanvasTexture(stamp); stampTexture.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(1.45, .19), new THREE.MeshBasicMaterial({ map: stampTexture, transparent: true, depthWrite: false, opacity: .65 }), -.04, 1.04, .19);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) mesh(rounded(.19, .026, .025, .008), frame, side * 1.085, .62 + i * .075, .17);
  mesh(rounded(1.77, .085, .04, .012), dark, 0, -1.33, .152).name = "Connector recess";
  const gold = new THREE.MeshStandardMaterial({ color: "#baa367", metalness: .7, roughness: .48 });
  for (let i = 0; i < 18; i++) mesh(new THREE.BoxGeometry(.045, .055, .008), gold, -.76 + i * .089, -1.33, .177);
  mesh(rounded(1.88, 1.7, .012, .06), frame, 0, -.1, -.15).name = "Back plate";
  const screw = mesh(new THREE.CylinderGeometry(.065, .065, .016, 16), dark, 0, .94, -.16); screw.rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(.07, .012, .005), frame, 0, .94, -.172);
  for (let i = 0; i < 3; i++) mesh(rounded(.65 - i * .1, .018, .01, .006), seam, 0, -.65 - i * .09, -.161);
  return group;
}

export async function loadExternalShell(label: THREE.Texture, color: string): Promise<THREE.Group | null> {
  if (!cartridgeModel.url) return null;
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(cartridgeModel.url);
  const group = gltf.scene;
  group.rotation.set(...cartridgeModel.rotation); group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group), center = bounds.getCenter(new THREE.Vector3());
  const normalized = new THREE.Group(); normalized.add(group);
  group.position.sub(center); normalized.scale.setScalar(2.4 / bounds.getSize(new THREE.Vector3()).x);
  let hasLabel = false;
  const labelMap = label.clone(); labelMap.flipY = false; labelMap.needsUpdate = true;
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = object.receiveShadow = true;
    if (object.name === cartridgeModel.labelMesh) {
      object.material = new THREE.MeshBasicMaterial({ map: labelMap, toneMapped: false }); hasLabel = true;
    } else {
      const tint = (material: THREE.Material) => { const clone = material.clone(); if ("color" in clone) (clone as THREE.MeshStandardMaterial).color.set(color); return clone; };
      object.material = Array.isArray(object.material) ? object.material.map(tint) : tint(object.material);
    }
  });
  if (!hasLabel) throw new Error(`The model needs a label mesh named "${cartridgeModel.labelMesh}". Check cartridge/config.ts.`);
  return normalized;
}
