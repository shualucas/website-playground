import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { aboutMiniatures } from "../book/miniatures";

export const loadingModelNames = ["Film camera", "CDJ-3000", "Zine", "Lightbulb"];

/** Original clay props; the camera is the same geometry used in the zine. */
export function makeLoadingModels(surface: (params: THREE.MeshPhysicalMaterialParameters) => THREE.MeshPhysicalMaterial) {
  const cache = new Map<string, THREE.Material>();
  const material = (color: string) => {
    if (!cache.has(color)) cache.set(color, surface({ color }));
    return cache.get(color)!;
  };
  const add = (group: THREE.Group, geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material(color)); mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  const box = (g: THREE.Group, w: number, h: number, d: number, c: string, x = 0, y = 0, z = 0, r = .025) =>
    add(g, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)), c, x, y, z);
  const disc = (g: THREE.Group, r: number, d: number, c: string, x: number, y: number, z: number) => {
    const geometry = new THREE.CylinderGeometry(r, r, d, 40); geometry.rotateX(Math.PI / 2);
    return add(g, geometry, c, x, y, z);
  };
  const camera = aboutMiniatures(surface, () => {}, true).camera;
  camera.rotation.set(.18, -.35, -.13);

  const deck = new THREE.Group(); deck.name = "CDJ-3000-inspired clay deck";
  box(deck, 1.4, 1.95, .19, "#111419", 0, 0, 0, .08);
  box(deck, 1.31, 1.83, .035, "#20252b", 0, .015, .105, .055);
  box(deck, .95, .43, .045, "#080d12", -.08, .62, .15, .04);
  box(deck, .86, .32, .012, "#163043", -.08, .62, .18, .015);
  for (let i = 0; i < 17; i++) box(deck, .025, .025 + (Math.sin(i * 1.7) + 1) * .055, .008, i < 9 ? "#7abcc7" : "#e9ad5b", -.45 + i * .046, .60, .19, .004);
  box(deck, .72, .018, .01, "#7d98a0", -.1, .73, .19, .004);
  for (let i = 0; i < 8; i++) box(deck, .105, .063, .035, i < 4 ? "#e5e5dd" : "#e9a651", -.54 + i * .147, .29, .15, .01);
  disc(deck, .46, .065, "#080b10", -.03, -.30, .17);
  disc(deck, .405, .035, "#56616b", -.03, -.30, .21);
  disc(deck, .35, .025, "#212a32", -.03, -.30, .235);
  disc(deck, .23, .01, "#0b151d", -.03, -.30, .25);
  box(deck, .16, .012, .009, "#99bac2", -.03, -.30, .26, .003);
  box(deck, .025, .61, .015, "#080b10", .55, -.33, .14, .005);
  box(deck, .14, .055, .04, "#d9d9ce", .55, -.19, .17, .01);
  disc(deck, .095, .026, "#a7ce61", -.53, -.78, .15);
  disc(deck, .075, .023, "#e6bd69", -.53, -.57, .15);
  for (let i = 0; i < 4; i++) box(deck, .12, .045, .02, "#7e8588", -.29 + i * .19, -.84, .14, .008);
  deck.rotation.set(.18, -.38, -.1);

  const zine = new THREE.Group(); zine.name = "Small RISO zine";
  box(zine, 1.2, 1.58, .035, "#282a28", 0, 0, -.09, .045);
  for (let i = 0; i < 5; i++) box(zine, 1.15, 1.53, .02, i % 2 ? "#d9d6c9" : "#f2efe2", .018, -.008, -.06 + i * .029, .025);
  box(zine, 1.21, 1.6, .035, "#f4ecd9", 0, 0, .105, .045);
  const ink = box(zine, .61, .95, .008, "#d84964", -.1, .10, .129, .01); ink.rotation.z = -.13;
  disc(zine, .33, .009, "#ed8b43", .15, -.15, .139);
  box(zine, .73, .045, .008, "#303534", 0, .59, .135, .003);
  for (const y of [-.45, .45]) box(zine, .025, .12, .013, "#7b817c", -.56, y, .135, .006);
  zine.rotation.set(.16, -.35, -.12);

  const bulb = new THREE.Group(); bulb.name = "Clay lightbulb";
  const profile = [[.18, 0], [.18, .12], [.24, .22], [.42, .43], [.50, .65], [.46, .89], [.29, 1.10], [0, 1.19]].map(([x, y]) => new THREE.Vector2(x, y));
  const globe = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), surface({ color: "#f7cf68", emissive: "#e5a52b", emissiveIntensity: .12 })); bulb.add(globe);
  add(bulb, new THREE.CylinderGeometry(.195, .18, .35, 32), "#8d969c", 0, -.17, 0);
  for (let i = 0; i < 5; i++) { const ring = add(bulb, new THREE.TorusGeometry(.19 - i * .003, .025, 8, 32), "#b9bec0", 0, -.035 - i * .065, 0); ring.rotation.x = Math.PI / 2; }
  add(bulb, new THREE.CylinderGeometry(.10, .085, .07, 24), "#2c343a", 0, -.38, 0);
  bulb.rotation.set(.08, -.2, -.16);
  return [camera, deck, zine, bulb];
}
