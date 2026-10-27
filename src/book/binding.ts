import * as THREE from "three";
import { PAGE_HEIGHT as H, SURFACE } from "./materials";
type Surface = THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
export const gutterDip = (x: number) => -0.075 * Math.exp(-((x / 0.15) ** 2));
export function createBinding(
  leather: Surface,
  paper: Surface,
  thread: Surface,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.25, 0.53);
  shape.bezierCurveTo(-0.38, 0.28, -0.32, -0.16, 0, -0.16);
  shape.bezierCurveTo(0.32, -0.16, 0.38, 0.28, 0.25, 0.53);
  shape.bezierCurveTo(0.16, 0.61, -0.16, 0.61, -0.25, 0.53);
  const backGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: H + 0.16,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 18,
    steps: 1,
  });
  backGeometry.scale(1, SURFACE / 0.73, 1);
  backGeometry.translate(0, 0, -(H + 0.16) / 2);
  const spine = new THREE.Mesh(backGeometry, leather);
  spine.castShadow = spine.receiveShadow = true;
  const geometry = new THREE.PlaneGeometry(0.74, H - 0.025, 32, 8);
  geometry.rotateX(-Math.PI / 2);
  const fold = new THREE.Mesh(geometry, paper);
  fold.receiveShadow = true;
  const seams = new THREE.Group();
  const threadBases: Float32Array[] = [];
  for (const z of [-1.85, -0.93, 0, 0.93, 1.85]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.14, SURFACE - 0.026, z),
      new THREE.Vector3(0, SURFACE - 0.095, z + 0.018),
      new THREE.Vector3(0.14, SURFACE - 0.026, z),
    ]);
    const tube = new THREE.TubeGeometry(curve, 18, 0.005, 5, false);
    threadBases.push(new Float32Array(tube.attributes.position.array));
    seams.add(new THREE.Mesh(tube, thread));
  }
  function update(left: number, right: number, open: number) {
    const scale = 1 + 0.95 * (1 - open);
    spine.scale.y = scale;
    spine.position.y = 0.16 * (scale - 1);
    spine.scale.x = 1 + 0.08 * (1 - open);
    const height = (x: number) =>
      THREE.MathUtils.lerp(
        left,
        right,
        THREE.MathUtils.clamp(x / 0.74 + 0.5, 0, 1),
      ) +
      0.018 +
      gutterDip(x);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i)) - 0.008);
    p.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    seams.children.forEach((mesh, index) => {
      const geo = (mesh as THREE.Mesh).geometry,
        positions = geo.attributes.position,
        base = threadBases[index];
      for (let i = 0; i < positions.count; i++) {
        const x = base[i * 3];
        positions.setY(
          i,
          base[i * 3 + 1] + height(x) - (SURFACE + 0.018 + gutterDip(x)),
        );
      }
      positions.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingBox();
    });
    fold.visible = seams.visible = open > 0.96;
  }
  update(SURFACE, SURFACE, 1);
  return { spine, fold, seams, update };
}
/** Compress the inner paper edge into the same sewn gutter rather than ending in a square cut. */
export function shapeInnerEdge(
  geometry: THREE.BufferGeometry,
  centerX: number,
  depth: number,
  fraction = 1,
) {
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + centerX,
      weight =
        depth > 0.05
          ? THREE.MathUtils.clamp((p.getY(i) + depth / 2) / depth, 0, 1)
          : fraction;
    p.setY(i, p.getY(i) + gutterDip(x) * weight * 0.88);
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
