import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PaperMaterial } from "./leaf";

type Finish = "matte" | "metal" | "rubber" | "glass" | "plastic";

/** Original stylized miniatures; every visible detail is geometry, not an external model. */
export function aboutMiniatures(
  surface: (params: THREE.MeshPhysicalMaterialParameters) => PaperMaterial,
  register: (mesh: THREE.Mesh) => void,
) {
  const materials = new Map<string, PaperMaterial>();
  const material = (color: string, finish: Finish = "matte") => {
    const key = color + finish;
    if (!materials.has(key))
      materials.set(
        key,
        surface({
          color,
          roughness:
            finish === "glass"
              ? 0.13
              : finish === "metal"
                ? 0.35
                : finish === "plastic"
                  ? 0.48
                  : 0.85,
          metalness: finish === "metal" ? 0.7 : finish === "glass" ? 0.3 : 0,
          clearcoat: finish === "glass" || finish === "plastic" ? 0.4 : 0,
        }),
      );
    return materials.get(key)!;
  };
  const mesh = (
    g: THREE.Group,
    geometry: THREE.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    finish: Finish = "matte",
  ) => {
    const result = new THREE.Mesh(geometry, material(color, finish));
    result.position.set(x, y, z);
    result.castShadow = result.receiveShadow = true;
    geometry.computeBoundingBox();
    register(result);
    g.add(result);
    return result;
  };
  const box = (
    g: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: string,
    x: number,
    y: number,
    z: number,
    finish: Finish = "matte",
    radius = 0.03,
  ) =>
    mesh(
      g,
      new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)),
      color,
      x,
      y,
      z,
      finish,
    );
  const disc = (
    g: THREE.Group,
    radius: number,
    depth: number,
    color: string,
    x: number,
    y: number,
    z: number,
    finish: Finish = "matte",
    sides = 32,
  ) => {
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, sides);
    geometry.rotateX(Math.PI / 2);
    return mesh(g, geometry, color, x, y, z, finish);
  };
  const rod = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    sides = 8,
  ) => {
    const d = b.clone().sub(a),
      geometry = new THREE.CylinderGeometry(radius, radius, d.length(), sides);
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        d.normalize(),
      ),
    );
    geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return geometry;
  };

  const camera = new THREE.Group();
  camera.name = "35mm film camera";
  box(camera, 1.24, 0.68, 0.42, "#272727", 0, 0.42, 0, "rubber", 0.07);
  box(camera, 1.26, 0.12, 0.43, "#b9b9b7", 0, 0.79, 0, "metal");
  box(camera, 1.22, 0.07, 0.43, "#b9b9b7", 0, 0.09, 0, "metal");
  box(camera, 0.29, 0.56, 0.08, "#131313", -0.43, 0.42, 0.23, "rubber", 0.04);
  for (let i = 0; i < 7; i++)
    box(
      camera,
      0.018,
      0.46,
      0.012,
      "#383838",
      -0.54 + i * 0.038,
      0.42,
      0.278,
      "rubber",
      0.003,
    );
  box(camera, 0.29, 0.18, 0.26, "#b9b9b7", -0.04, 0.92, -0.015, "metal");
  box(camera, 0.19, 0.1, 0.04, "#242424", -0.04, 0.93, 0.132, "glass");
  disc(camera, 0.29, 0.11, "#c4c4c2", 0.1, 0.45, 0.25, "metal");
  disc(camera, 0.265, 0.29, "#191919", 0.1, 0.45, 0.37, "rubber");
  for (let i = 0; i < 4; i++)
    mesh(
      camera,
      new THREE.TorusGeometry(0.264, 0.013, 6, 40),
      "#4a4a4a",
      0.1,
      0.45,
      0.29 + i * 0.06,
      "metal",
    );
  disc(camera, 0.23, 0.035, "#858585", 0.1, 0.45, 0.53, "metal");
  disc(camera, 0.196, 0.018, "#101310", 0.1, 0.45, 0.553, "glass");
  disc(camera, 0.13, 0.008, "#292b28", 0.1, 0.45, 0.565, "glass");
  disc(camera, 0.068, 0.008, "#080908", 0.1, 0.45, 0.572, "glass");
  const reflection = disc(
    camera,
    0.048,
    0.004,
    "#bcbfb8",
    0.04,
    0.51,
    0.579,
    "glass",
  );
  reflection.scale.y = 0.4;
  for (const x of [-0.43, 0.42])
    mesh(
      camera,
      new THREE.CylinderGeometry(0.11, 0.11, 0.09, 24),
      "#424242",
      x,
      0.9,
      -0.02,
      "metal",
    );
  mesh(
    camera,
    new THREE.CylinderGeometry(0.055, 0.055, 0.035, 20),
    "#d8d8d6",
    0.42,
    0.96,
    0.02,
    "metal",
  );
  box(camera, 0.15, 0.055, 0.025, "#e6e6e2", 0.44, 0.63, 0.224);

  const racket = new THREE.Group();
  racket.name = "tennis racket with coral grip tape";
  const hoop = new THREE.Shape();
  hoop.absellipse(0, 1.12, 0.43, 0.59, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 1.12, 0.365, 0.515, 0, Math.PI * 2, true, 0);
  hoop.holes.push(hole);
  mesh(
    racket,
    new THREE.ExtrudeGeometry(hoop, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      curveSegments: 40,
      steps: 1,
    }),
    "#282828",
    0,
    0,
    -0.035,
    "plastic",
  );
  const rim = new THREE.TorusGeometry(1, 0.012, 6, 64);
  rim.scale(0.405, 0.56, 1);
  mesh(racket, rim, "#deded9", 0, 1.12, 0.049, "metal");
  const strings: THREE.BufferGeometry[] = [];
  for (let i = -6; i <= 6; i++) {
    const x = i * 0.052,
      dy = 0.505 * Math.sqrt(Math.max(0, 1 - (x / 0.365) ** 2));
    strings.push(
      rod(
        new THREE.Vector3(x, 1.12 - dy, 0.004),
        new THREE.Vector3(x, 1.12 + dy, 0.004),
        0.0035,
        5,
      ),
    );
  }
  for (let i = -8; i <= 8; i++) {
    const y = i * 0.057,
      dx = 0.359 * Math.sqrt(Math.max(0, 1 - (y / 0.515) ** 2));
    strings.push(
      rod(
        new THREE.Vector3(-dx, 1.12 + y, 0.008),
        new THREE.Vector3(dx, 1.12 + y, 0.008),
        0.0035,
        5,
      ),
    );
  }
  mesh(racket, mergeGeometries(strings)!, "#c0c0b9", 0, 0, 0, "matte");
  strings.forEach((g) => g.dispose());
  for (const side of [-1, 1])
    mesh(
      racket,
      rod(
        new THREE.Vector3(0, 0.35, 0),
        new THREE.Vector3(side * 0.23, 0.66, 0),
        0.026,
        10,
      ),
      "#303030",
      0,
      0,
      0,
      "plastic",
    );
  mesh(
    racket,
    new THREE.CylinderGeometry(0.052, 0.061, 0.38, 8),
    "#252525",
    0,
    0.2,
    0,
    "rubber",
  );
  const tapePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 150; i++) {
    const t = i / 150;
    tapePoints.push(
      new THREE.Vector3(
        Math.cos(t * Math.PI * 16) * 0.057,
        0.025 + t * 0.35,
        Math.sin(t * Math.PI * 16) * 0.057,
      ),
    );
  }
  mesh(
    racket,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(tapePoints),
      150,
      0.013,
      5,
      false,
    ),
    "#ed785b",
    0,
    0,
    0,
    "rubber",
  );
  mesh(
    racket,
    new THREE.CylinderGeometry(0.066, 0.066, 0.04, 8),
    "#e3e3de",
    0,
    0.018,
    0,
    "plastic",
  );

  const controller = new THREE.Group();
  controller.name = "purple GameCube controller";
  const body = new THREE.Shape();
  body.moveTo(-0.47, 0.7);
  body.bezierCurveTo(-0.7, 0.75, -0.85, 0.2, -0.71, 0.03);
  body.bezierCurveTo(-0.61, -0.12, -0.36, 0.22, -0.3, 0.25);
  body.lineTo(0.29, 0.25);
  body.bezierCurveTo(0.44, 0.05, 0.65, -0.16, 0.75, 0.04);
  body.bezierCurveTo(0.9, 0.28, 0.7, 0.78, 0.44, 0.72);
  body.bezierCurveTo(0.1, 0.81, -0.13, 0.8, -0.47, 0.7);
  body.closePath();
  mesh(
    controller,
    new THREE.ExtrudeGeometry(body, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelThickness: 0.055,
      bevelSize: 0.055,
      curveSegments: 20,
      steps: 1,
    }),
    "#7351a7",
    0,
    0.12,
    -0.11,
    "plastic",
  );
  for (const x of [-0.43, 0.43])
    box(
      controller,
      0.3,
      0.12,
      0.3,
      "#c4c3c9",
      x,
      0.86,
      -0.045,
      "plastic",
      0.055,
    );
  disc(controller, 0.148, 0.025, "#4e397a", -0.39, 0.7, 0.157, "plastic", 8);
  disc(controller, 0.105, 0.105, "#c6c7cb", -0.39, 0.7, 0.2, "rubber");
  disc(controller, 0.065, 0.025, "#919399", -0.39, 0.7, 0.267, "rubber");
  disc(controller, 0.12, 0.065, "#26aa85", 0.3, 0.7, 0.19, "plastic");
  disc(controller, 0.07, 0.06, "#d95155", 0.105, 0.56, 0.18, "plastic");
  disc(controller, 0.11, 0.025, "#55417b", 0.33, 0.39, 0.16, "plastic", 8);
  disc(controller, 0.077, 0.085, "#f0ca4c", 0.33, 0.39, 0.2, "rubber");
  box(
    controller,
    0.23,
    0.065,
    0.06,
    "#b6b7bf",
    -0.19,
    0.4,
    0.18,
    "rubber",
    0.013,
  );
  box(
    controller,
    0.065,
    0.23,
    0.06,
    "#b6b7bf",
    -0.19,
    0.4,
    0.18,
    "rubber",
    0.013,
  );
  box(controller, 0.09, 0.05, 0.035, "#b6b7bf", -0.015, 0.7, 0.177, "plastic");
  const xButton = box(
    controller,
    0.19,
    0.07,
    0.065,
    "#b6b7bf",
    0.51,
    0.78,
    0.18,
    "plastic",
  );
  xButton.rotation.z = -0.6;
  const yButton = box(
    controller,
    0.19,
    0.07,
    0.065,
    "#b6b7bf",
    0.29,
    0.88,
    0.18,
    "plastic",
  );
  yButton.rotation.z = 0.12;
  return { camera, racket, controller };
}
