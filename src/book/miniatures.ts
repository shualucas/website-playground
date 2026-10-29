import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PaperMaterial } from "./leaf";

type Finish = "matte" | "metal" | "rubber" | "glass" | "plastic";

/** Original stylized miniatures; every visible detail is geometry, not an external model. */
export function aboutMiniatures(
  surface: (params: THREE.MeshPhysicalMaterialParameters) => PaperMaterial,
  register: (mesh: THREE.Mesh) => void,
  cameraOnly = false,
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
  camera.name = "black point-and-shoot film camera with wrist strap";
  box(camera, 1.3, 0.73, 0.4, "#090b0e", 0, 0.41, 0, "plastic", 0.105);
  box(
    camera,
    0.27,
    0.63,
    0.052,
    "#16191d",
    -0.48,
    0.41,
    0.215,
    "rubber",
    0.065,
  );
  box(camera, 0.42, 0.17, 0.03, "#dedfe0", -0.3, 0.66, 0.222, "plastic", 0.024);
  for (let i = 0; i < 8; i++)
    box(
      camera,
      0.012,
      0.12,
      0.007,
      "#909396",
      -0.47 + i * 0.047,
      0.66,
      0.242,
      "plastic",
      0.002,
    );
  box(
    camera,
    0.23,
    0.14,
    0.035,
    "#252b31",
    0.33,
    0.65,
    0.225,
    "plastic",
    0.028,
  );
  box(camera, 0.16, 0.085, 0.012, "#14353e", 0.33, 0.65, 0.25, "glass", 0.018);
  disc(camera, 0.235, 0.045, "#25292e", 0.07, 0.36, 0.222, "plastic");
  disc(camera, 0.196, 0.032, "#080b10", 0.07, 0.36, 0.258, "plastic");
  mesh(
    camera,
    new THREE.TorusGeometry(0.181, 0.012, 8, 40),
    "#4b535a",
    0.07,
    0.36,
    0.278,
    "metal",
  );
  disc(camera, 0.155, 0.012, "#103332", 0.07, 0.36, 0.284, "glass");
  disc(camera, 0.11, 0.008, "#071118", 0.07, 0.36, 0.294, "glass");
  const highlight = disc(
    camera,
    0.035,
    0.003,
    "#688a8e",
    0.02,
    0.41,
    0.301,
    "glass",
  );
  highlight.scale.y = 0.4;
  mesh(
    camera,
    new THREE.CylinderGeometry(0.067, 0.067, 0.03, 24),
    "#313940",
    0.36,
    0.79,
    0,
    "plastic",
  );
  disc(camera, 0.015, 0.012, "#df4237", 0.49, 0.49, 0.221, "plastic", 12);
  box(
    camera,
    0.13,
    0.03,
    0.02,
    "#3c4349",
    -0.41,
    0.15,
    0.222,
    "plastic",
    0.008,
  );
  mesh(
    camera,
    new THREE.TorusGeometry(0.045, 0.012, 6, 18),
    "#3a4045",
    0.668,
    0.55,
    0.01,
    "metal",
  );
  const strapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.68, 0.55, 0.02),
    new THREE.Vector3(0.91, 0.77, 0.04),
    new THREE.Vector3(1.12, 0.61, 0.06),
    new THREE.Vector3(1.08, 0.26, 0.09),
    new THREE.Vector3(0.88, 0.18, 0.1),
    new THREE.Vector3(0.82, 0.41, 0.04),
    new THREE.Vector3(0.68, 0.55, 0.02),
  ]);
  mesh(
    camera,
    new THREE.TubeGeometry(strapCurve, 56, 0.022, 8, false),
    "#181d23",
    0,
    0,
    0,
    "rubber",
  );

  // The cartridge edition reuses this exact camera without building the other
  // two miniatures. The zine's existing default path is unchanged.
  if (cameraOnly) return { camera, racket: new THREE.Group(), controller: new THREE.Group() };

  const racket = new THREE.Group();
  racket.name = "EZONE-inspired blue tennis racket with lime grip tape";
  const hoop = new THREE.Shape();
  hoop.moveTo(0, 1.71);
  hoop.bezierCurveTo(0.28, 1.71, 0.43, 1.57, 0.43, 1.2);
  hoop.bezierCurveTo(0.43, 0.87, 0.26, 0.55, 0, 0.53);
  hoop.bezierCurveTo(-0.26, 0.55, -0.43, 0.87, -0.43, 1.2);
  hoop.bezierCurveTo(-0.43, 1.57, -0.28, 1.71, 0, 1.71);
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
    "#064c9d",
    0,
    0,
    -0.035,
    "plastic",
  );
  const rim = new THREE.TorusGeometry(1, 0.012, 6, 64);
  rim.scale(0.405, 0.56, 1);
  mesh(racket, rim, "#36a6ef", 0, 1.12, 0.049, "metal");
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
    "#8bad22",
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
    "#b9f12c",
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
    "#632daf",
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
