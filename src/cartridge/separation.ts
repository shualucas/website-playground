import * as THREE from "three";

/** Rigid oriented bounds, including the visual hover offset, reused each frame. */
export type RigidBounds = { center: THREE.Vector3; half: THREE.Vector3; axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3] };
export function makeBounds(): RigidBounds {
  return { center: new THREE.Vector3(), half: new THREE.Vector3(), axes: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
}
export function updateBounds(bounds: RigidBounds, localCenter: THREE.Vector3, half: THREE.Vector3, matrix: THREE.Matrix4) {
  bounds.center.copy(localCenter).applyMatrix4(matrix);
  const e = matrix.elements;
  for (let i = 0; i < 3; i++) bounds.axes[i].set(e[i * 4], e[i * 4 + 1], e[i * 4 + 2]).normalize();
  bounds.half.copy(half).addScalar(.016);
}

/** SAT: returns the smallest translation that moves B out of A, or zero when separated. */
export class Separation {
  private delta = new THREE.Vector3();
  private cross = new THREE.Vector3();
  private best = new THREE.Vector3();
  private project(box: RigidBounds, axis: THREE.Vector3) {
    return Math.abs(box.axes[0].dot(axis)) * box.half.x + Math.abs(box.axes[1].dot(axis)) * box.half.y + Math.abs(box.axes[2].dot(axis)) * box.half.z;
  }
  correction(a: RigidBounds, b: RigidBounds, result: THREE.Vector3) {
    result.set(0, 0, 0); this.delta.subVectors(b.center, a.center);
    let minimum = Infinity;
    const check = (axis: THREE.Vector3) => {
      if (axis.lengthSq() < 1e-10) return true;
      const distance = this.delta.dot(axis);
      const overlap = this.project(a, axis) + this.project(b, axis) - Math.abs(distance);
      if (overlap <= 1e-6) return false;
      if (overlap < minimum) { minimum = overlap; this.best.copy(axis).multiplyScalar(distance < 0 ? -1 : 1); }
      return true;
    };
    for (let i = 0; i < 3; i++) if (!check(a.axes[i]) || !check(b.axes[i])) return result;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      this.cross.crossVectors(a.axes[i], b.axes[j]);
      if (this.cross.lengthSq() > 1e-10 && !check(this.cross.normalize())) return result;
    }
    return result.copy(this.best).multiplyScalar(minimum + .001);
  }
}
