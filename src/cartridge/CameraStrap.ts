import * as THREE from "three";

const COUNT = 25, SIDES = 6, RADIUS = .022, STEP = 1 / 120;
const BODY_MIN = [-.675, .025, -.225], BODY_MAX = [.675, .81, .265];

/** A world-space cord: fixed-step Verlet particles, length/bend constraints,
 * self-contact and camera collision. Only its eyelet follows the camera. */
export class CameraStrap {
  private points = Array.from({ length: COUNT }, () => new THREE.Vector3());
  private previous = Array.from({ length: COUNT }, () => new THREE.Vector3());
  private rest = new Float64Array(COUNT - 1);
  private bends = new Float64Array(COUNT - 2);
  private anchor = new THREE.Vector3();
  private local = new THREE.Vector3();
  private before = new THREE.Vector3();
  private delta = new THREE.Vector3();
  private inverse = new THREE.Matrix4();
  private lastMatrix = new THREE.Matrix4();
  private tangent = new THREE.Vector3();
  private normal = new THREE.Vector3();
  private binormal = new THREE.Vector3();
  private accumulator = 0;
  private initialized = false;
  readonly mesh: THREE.Mesh;

  constructor(private model: THREE.Group, scene: THREE.Scene) {
    const mesh = model.getObjectByName("camera-wrist-strap") as THREE.Mesh;
    this.mesh = mesh;
    mesh.removeFromParent(); mesh.geometry.dispose();
    const geometry = new THREE.BufferGeometry(), indices: number[] = [];
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * SIDES * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(COUNT * SIDES * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const uv = new Float32Array(COUNT * SIDES * 2);
    for (let i = 0; i < COUNT; i++) for (let j = 0; j < SIDES; j++) { uv[(i * SIDES + j) * 2] = j / SIDES; uv[(i * SIDES + j) * 2 + 1] = i / (COUNT - 1) * 3; }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    for (let i = 0; i < COUNT - 1; i++) for (let j = 0; j < SIDES; j++) {
      const a = i * SIDES + j, b = i * SIDES + (j + 1) % SIDES, c = a + SIDES, d = b + SIDES;
      indices.push(a, b, c, b, d, c);
    }
    geometry.setIndex(indices); mesh.geometry = geometry; scene.add(mesh);
    this.reset();
  }
  reset() {
    this.model.updateWorldMatrix(true, false); this.inverse.copy(this.model.matrixWorld).invert();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.708, .55, .025), new THREE.Vector3(.91, .40, .05),
      new THREE.Vector3(1.00, .09, .08), new THREE.Vector3(.90, -.13, .10),
      new THREE.Vector3(.75, .05, .065), new THREE.Vector3(.72, .33, .03), new THREE.Vector3(.708, .55, .025),
    ]);
    for (let i = 0; i < COUNT; i++) {
      this.points[i].copy(curve.getPointAt(i / (COUNT - 1))).applyMatrix4(this.model.matrixWorld);
      this.previous[i].copy(this.points[i]);
      if (i) this.rest[i - 1] = this.points[i].distanceTo(this.points[i - 1]);
      if (i > 1) this.bends[i - 2] = this.points[i].distanceTo(this.points[i - 2]);
    }
    this.anchor.copy(this.points[0]);
    for (let i = 0; i < 120; i++) this.integrate();
    this.previous.forEach((p, i) => p.copy(this.points[i]));
    this.lastMatrix.copy(this.model.matrixWorld); this.initialized = true; this.accumulator = 0; this.updateGeometry();
  }
  step(delta: number, reduced: boolean) {
    this.model.updateWorldMatrix(true, false);
    if (reduced && (!this.initialized || !this.lastMatrix.equals(this.model.matrixWorld))) { this.reset(); return; }
    this.inverse.copy(this.model.matrixWorld).invert();
    this.anchor.set(.708, .55, .025).applyMatrix4(this.model.matrixWorld);
    this.accumulator += Math.min(.05, Math.max(0, delta));
    while (!reduced && this.accumulator >= STEP) { this.integrate(); this.accumulator -= STEP; }
    this.pin(); this.lastMatrix.copy(this.model.matrixWorld); this.updateGeometry();
  }
  private pin() {
    this.points[0].copy(this.anchor); this.points[COUNT - 1].copy(this.anchor);
    this.previous[0].copy(this.anchor); this.previous[COUNT - 1].copy(this.anchor);
  }
  private constrain(a: number, b: number, length: number, strength = 1) {
    this.delta.subVectors(this.points[b], this.points[a]);
    const distance = this.delta.length(); if (distance < 1e-7) return;
    const fixedA = a === 0, fixedB = b === COUNT - 1;
    this.delta.multiplyScalar((distance - length) / distance * strength / (fixedA || fixedB ? 1 : 2));
    if (!fixedA) this.points[a].add(this.delta);
    if (!fixedB) this.points[b].sub(this.delta);
  }
  private collide(index: number) {
    const point = this.points[index]; this.local.copy(point).applyMatrix4(this.inverse); this.before.copy(this.local);
    const min = BODY_MIN, max = BODY_MAX;
    if (this.local.x > min[0] && this.local.x < max[0] && this.local.y > min[1] && this.local.y < max[1] && this.local.z > min[2] && this.local.z < max[2]) {
      let smallest = Infinity, axis = 0, face = 0;
      for (let i = 0; i < 3; i++) {
        const value = this.local.getComponent(i);
        if (value - min[i] < smallest) { smallest = value - min[i]; axis = i; face = min[i]; }
        if (max[i] - value < smallest) { smallest = max[i] - value; axis = i; face = max[i]; }
      }
      this.local.setComponent(axis, face);
    }
    const x = this.local.x - .07, y = this.local.y - .36, radial = Math.hypot(x, y);
    if (this.local.z > .18 && this.local.z < .335 && radial < .26) {
      if (.335 - this.local.z < .26 - radial) this.local.z = .335;
      else { const factor = .26 / Math.max(1e-6, radial); this.local.x = .07 + x * factor; this.local.y = .36 + y * factor; }
    }
    if (!this.local.equals(this.before)) {
      this.local.applyMatrix4(this.model.matrixWorld);
      this.previous[index].add(this.delta.subVectors(this.local, point)); point.copy(this.local);
    }
  }
  private integrate() {
    const damping = Math.exp(-2.5 * STEP);
    for (let i = 1; i < COUNT - 1; i++) {
      const point = this.points[i]; this.before.copy(point);
      point.add(this.delta.subVectors(point, this.previous[i]).multiplyScalar(damping)); point.y -= 6.5 * STEP * STEP;
      this.previous[i].copy(this.before);
    }
    for (let pass = 0; pass < 12; pass++) {
      this.pin();
      for (let i = 0; i < COUNT - 1; i++) this.constrain(i, i + 1, this.rest[i]);
      for (let i = 0; i < COUNT - 2; i++) this.constrain(i, i + 2, this.bends[i], .12);
      for (let i = 1; i < COUNT - 1; i++) this.collide(i);
      if (pass % 4 === 0) for (let i = 1; i < COUNT - 1; i++) for (let j = i + 3; j < COUNT - 1; j++) {
        if (COUNT - 1 - (j - i) <= 2) continue;
        this.delta.subVectors(this.points[j], this.points[i]); const length = this.delta.length();
        if (length > 1e-6 && length < RADIUS * 2) { this.delta.multiplyScalar((RADIUS * 2 - length) / (length * 2)); this.points[i].sub(this.delta); this.points[j].add(this.delta); }
      }
    }
    this.pin();
  }
  private updateGeometry() {
    const positions = this.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const normals = this.mesh.geometry.getAttribute("normal") as THREE.BufferAttribute;
    this.normal.set(0, 0, 1);
    for (let i = 0; i < COUNT; i++) {
      this.tangent.subVectors(this.points[Math.min(COUNT - 1, i + 1)], this.points[Math.max(0, i - 1)]).normalize();
      this.normal.addScaledVector(this.tangent, -this.normal.dot(this.tangent));
      if (this.normal.lengthSq() < .001) this.normal.set(1, 0, 0).addScaledVector(this.tangent, -this.tangent.x);
      this.normal.normalize(); this.binormal.crossVectors(this.tangent, this.normal).normalize();
      for (let j = 0; j < SIDES; j++) {
        const angle = j / SIDES * Math.PI * 2;
        this.delta.copy(this.normal).multiplyScalar(Math.cos(angle)).addScaledVector(this.binormal, Math.sin(angle));
        normals.setXYZ(i * SIDES + j, this.delta.x, this.delta.y, this.delta.z);
        positions.setXYZ(i * SIDES + j, this.points[i].x + this.delta.x * RADIUS, this.points[i].y + this.delta.y * RADIUS, this.points[i].z + this.delta.z * RADIUS);
      }
    }
    positions.needsUpdate = normals.needsUpdate = true; this.mesh.geometry.computeBoundingSphere();
  }
  report() {
    let bottom = Infinity, stretch = 0;
    for (let i = 0; i < COUNT; i++) { bottom = Math.min(bottom, this.points[i].y); if (i) stretch = Math.max(stretch, Math.abs(this.points[i].distanceTo(this.points[i - 1]) / this.rest[i - 1] - 1)); }
    return { anchor: this.anchor.toArray(), bottom, stretch };
  }
}
