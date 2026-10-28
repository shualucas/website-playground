import * as THREE from "three";
import { ConvexHull } from "three/addons/math/ConvexHull.js";
import { SkinnedLeaf } from "./leaf";
import { TurnScheduler } from "./turn-scheduler";
import { PAGE_WIDTH as W } from "./materials";

export const FRAME_MARGIN = 0.92;

/** Measure independent, off-scene leaves once; the live animation is never altered. */
export function measureTurnEnvelope(
  leaves: SkinnedLeaf[],
  samples: number[],
  props: THREE.Vector3[],
) {
  const rig = new THREE.Group();
  const copies = leaves.map(
    (leaf) =>
      new SkinnedLeaf(
        leaf.id,
        leaf.cover,
        leaf.count,
        leaf.mesh.geometry,
        leaf.mesh.material,
      ),
  );
  copies.forEach((leaf) => rig.add(leaf.group));
  const scheduler = new TurnScheduler(copies),
    points = [...props];
  const destinations = new Map([
    [0, copies.length],
    [85, 0],
    [170, copies.length],
    [202, 1],
    [225, Math.min(3, copies.length)],
    [260, 0],
  ]);
  for (let frame = 0; frame < 340; frame++) {
    if (destinations.has(frame)) scheduler.request(destinations.get(frame)!);
    scheduler.step(1 / 30, 0);
    rig.position.x =
      (-W / 2) * (1 - copies[0].progress) + (W / 2) * copies.at(-1)!.progress;
    rig.updateMatrixWorld(true);
    for (const leaf of copies) {
      leaf.updateWorld();
      for (const index of samples)
        points.push(
          leaf.mesh
            .getVertexPosition(index, new THREE.Vector3())
            .applyMatrix4(leaf.mesh.matrixWorld),
        );
    }
  }
  copies.forEach((leaf) => leaf.dispose());
  // Perspective frustum constraints are linear in world coordinates. A compact
  // convex hull preserves their extrema without testing thousands of points per drag.
  const hull = new ConvexHull().setFromPoints(points),
    vertices = new Set<THREE.Vector3>();
  for (const face of hull.faces) {
    let edge = face.edge;
    do {
      vertices.add(edge.head().point);
      edge = edge.next;
    } while (edge !== face.edge);
  }
  return [...vertices].map((point) => point.clone().multiplyScalar(1.035));
}

/** Find the closest fixed camera and optical center that contain a complete turn. */
export function fitTurnEnvelope(
  points: THREE.Vector3[],
  rotation: THREE.Quaternion,
  fov: number,
  aspect: number,
) {
  const inverse = rotation.clone().invert(),
    view = points.map((point) => point.clone().applyQuaternion(inverse));
  const vertical = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * FRAME_MARGIN,
    horizontal = vertical * aspect;
  let low = Math.max(...view.map((p) => p.z)) + 0.01,
    high = Math.max(10, low * 2);
  const range = (distance: number) => {
    let x0 = -Infinity,
      x1 = Infinity,
      y0 = -Infinity,
      y1 = Infinity;
    for (const p of view) {
      const depth = distance - p.z;
      x0 = Math.max(x0, p.x - horizontal * depth);
      x1 = Math.min(x1, p.x + horizontal * depth);
      y0 = Math.max(y0, p.y - vertical * depth);
      y1 = Math.min(y1, p.y + vertical * depth);
    }
    return { x0, x1, y0, y1, fits: x0 <= x1 && y0 <= y1 };
  };
  while (!range(high).fits) high *= 2;
  for (let i = 0; i < 30; i++) {
    const middle = (low + high) / 2;
    if (range(middle).fits) high = middle;
    else low = middle;
  }
  const bounds = range(high);
  return {
    distance: high,
    focus: new THREE.Vector3(
      (bounds.x0 + bounds.x1) / 2,
      (bounds.y0 + bounds.y1) / 2,
      0,
    ).applyQuaternion(rotation),
  };
}
