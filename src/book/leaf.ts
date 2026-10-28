import * as THREE from "three";
import { PAGE_WIDTH as WIDTH, PAGE_HEIGHT as HEIGHT } from "./materials";

export type PaperMaterial =
  THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
export const LEAF_SEGMENTS = 30;
export const LEAF_GAP = 0.009;
export const LEAF_RADIUS = Math.hypot(WIDTH, HEIGHT / 2) + 0.3;

/** Shared bind-pose geometry. Only bone matrices change after construction. */
export function createLeafGeometry(thickness = 0.006) {
  const geometry = new THREE.BoxGeometry(
    WIDTH,
    thickness,
    HEIGHT,
    LEAF_SEGMENTS,
    2,
    2,
  );
  geometry.translate(WIDTH / 2, 0, 0);
  const positions = geometry.attributes.position,
    normals = geometry.attributes.normal,
    uv = geometry.attributes.uv,
    indices: number[] = [],
    weights: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const along = THREE.MathUtils.clamp(positions.getX(i) / WIDTH, 0, 1),
      joint = Math.min(LEAF_SEGMENTS - 1, Math.floor(along * LEAF_SEGMENTS)),
      blend = along * LEAF_SEGMENTS - joint;
    indices.push(joint, joint + 1, 0, 0);
    weights.push(1 - blend, blend, 0, 0);
    if (Math.abs(normals.getY(i)) > 0.9) {
      uv.setXY(
        i,
        normals.getY(i) < 0 ? 1 - along : along,
        0.5 - positions.getZ(i) / HEIGHT,
      );
    }
  }
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(indices, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  return geometry;
}

/** Exact critically damped integration; state stores adjacent value/velocity pairs. */
function damp(
  state: Float64Array,
  index: number,
  target: number,
  rate: number,
  dt: number,
) {
  const offset = state[index] - target,
    b = state[index + 1] + rate * offset,
    e = Math.exp(-rate * dt);
  state[index] = target + (offset + b * dt) * e;
  state[index + 1] = (state[index + 1] - rate * b * dt) * e;
}

/** A physical leaf keeps the same geometry, identity and printed faces through every turn.
 * Inspired by the reference's articulated skeleton; dimensions, motion and face layout
 * are independently adapted to the zine's X/Z page plane and fixed-camera scene.
 */
export class SkinnedLeaf {
  readonly group = new THREE.Group();
  readonly mesh: THREE.SkinnedMesh<THREE.BoxGeometry, PaperMaterial[]>;
  readonly bones: THREE.Bone[] = [];
  readonly faces: readonly [THREE.Texture, THREE.Texture];
  target = 0;
  settled = true;
  private hinge = new Float64Array(2);
  private bends = new Float64Array((LEAF_SEGMENTS + 1) * 2);
  private folds = new Float64Array((LEAF_SEGMENTS + 1) * 2);
  private poseError = 0;
  private lastFlex = NaN;
  private direction = 1;

  constructor(
    readonly id: number,
    readonly cover: boolean,
    readonly count: number,
    geometry: THREE.BoxGeometry,
    materials: PaperMaterial[],
  ) {
    this.mesh = new THREE.SkinnedMesh(geometry, materials);
    this.faces = [materials[2].map!, materials[3].map!];
    this.mesh.name = `zine-leaf-${id}`;
    this.mesh.userData.leaf = id;
    for (let i = 0; i <= LEAF_SEGMENTS; i++) {
      const bone = new THREE.Bone();
      bone.position.x = i ? WIDTH / LEAF_SEGMENTS : 0;
      if (i) this.bones[i - 1].add(bone);
      this.bones.push(bone);
    }
    this.mesh.add(this.bones[0]);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    // Conservative deformed bounds serve culling and raycasting without CPU vertex rewrites.
    this.mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(),
      LEAF_RADIUS,
    );
    this.mesh.boundingBox = new THREE.Box3(
      new THREE.Vector3(-WIDTH - 0.2, -WIDTH - 0.2, -HEIGHT / 2 - 0.2),
      new THREE.Vector3(WIDTH + 0.2, WIDTH + 0.2, HEIGHT / 2 + 0.2),
    );
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
    this.snap(0);
  }
  get progress() {
    return this.hinge[0];
  }
  get velocity() {
    return this.hinge[1];
  }
  get hingeAngle() {
    return this.progress * Math.PI;
  }
  get error() {
    return this.poseError;
  }
  turnTo(open: boolean) {
    const next = open ? 1 : 0;
    if (next !== this.target) {
      this.direction = next ? 1 : -1;
      this.target = next;
      this.settled = false;
    }
  }
  snap(open: number) {
    this.target = this.hinge[0] = open;
    this.hinge[1] = 0;
    this.shape(0, 0, true);
    this.settled = true;
    this.sync();
  }
  step(delta: number, flex: number, speed = 1) {
    if (this.settled && Math.abs(flex - this.lastFlex) < 0.00005) return false;
    const dt = Math.min(Math.max(delta, 0), 0.25) * speed;
    damp(this.hinge, 0, this.target, this.cover ? 7.2 : 5.8, dt);
    this.shape(dt, flex, false);
    if (
      Math.abs(this.target - this.progress) < 0.0008 &&
      Math.abs(this.velocity) < 0.012 &&
      this.poseError < 0.0015
    ) {
      this.hinge[0] = this.target;
      this.hinge[1] = 0;
      this.settled = true;
    } else this.settled = false;
    this.sync();
    return true;
  }
  private tangent(u: number, p: number, flex: number) {
    const moving = Math.sin(p * Math.PI),
      side = 1 - 2 * p,
      paper = this.cover ? 0.65 : 1;
    return (
      side * (0.15 + flex * 0.28) * Math.cos(Math.PI * u) * (1 - moving) +
      moving *
        paper *
        this.direction *
        (0.64 * Math.sin(Math.PI * u) - 0.42 * u - 0.12)
    );
  }
  private shape(dt: number, flex: number, immediate: boolean) {
    const p = this.progress,
      moving = Math.sin(p * Math.PI),
      paper = this.cover ? 0.6 : 1;
    let previousBend = 0,
      previousFold = 0;
    this.poseError = 0;
    for (let i = 0; i <= LEAF_SEGMENTS; i++) {
      const u = i / LEAF_SEGMENTS,
        tangent = this.tangent(u, p, flex),
        fold = moving * paper * this.direction * 0.11 * u * u,
        bendTarget = tangent - previousBend,
        foldTarget = fold - previousFold,
        offset = i * 2;
      previousBend = tangent;
      previousFold = fold;
      if (immediate) {
        this.bends[offset] = bendTarget;
        this.folds[offset] = foldTarget;
        this.bends[offset + 1] = this.folds[offset + 1] = 0;
      } else {
        // The outer joints settle later, carrying their own bend and fold velocity.
        damp(this.bends, offset, bendTarget, 12 - u * 3, dt);
        damp(this.folds, offset, foldTarget, 14 - u * 3, dt);
      }
      this.bones[i].rotation.set(this.folds[offset], 0, this.bends[offset]);
      this.poseError = Math.max(
        this.poseError,
        Math.abs(this.bends[offset] - bendTarget),
        Math.abs(this.folds[offset] - foldTarget),
        Math.abs(this.bends[offset + 1]) * 0.05,
        Math.abs(this.folds[offset + 1]) * 0.05,
      );
    }
    this.lastFlex = flex;
  }
  private sync() {
    this.group.rotation.z = this.hingeAngle;
    this.group.position.y =
      0.025 +
      LEAF_GAP *
        THREE.MathUtils.lerp(this.count - 1 - this.id, this.id, this.progress);
    this.group.updateMatrixWorld(true);
    this.mesh.skeleton.update();
  }
  updateWorld() {
    this.group.updateMatrixWorld(true);
    this.mesh.skeleton.update();
  }
  dispose() {
    this.mesh.skeleton.dispose();
  }
}
