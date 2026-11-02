import { Quaternion, Vector3 } from "three";

/** Hover-only motion, advanced by BookScene's existing clock. */
export class PreviewSpin {
  private elapsed = Infinity;
  private axis = new Vector3();
  private rockAxis = new Vector3();
  private rock = new Quaternion();
  angle = 0;

  get active() { return Number.isFinite(this.elapsed); }

  start(cameraOrientation: Quaternion) {
    this.elapsed = 0;
    this.axis.set(0, 1, 0).applyQuaternion(cameraOrientation);
    this.rockAxis.set(1, 0, 0).applyQuaternion(cameraOrientation);
  }

  stop() { this.elapsed = Infinity; this.angle = 0; }

  advance(dt: number) {
    if (!this.active) return;
    this.elapsed += dt;
    if (this.elapsed >= 1.1) this.stop();
  }

  apply(orientation: Quaternion) {
    if (!this.active) return;
    const p = Math.min(1, this.elapsed / 1.1), ease = 1 - Math.pow(1 - p, 4);
    this.angle = -Math.PI * 2 * (1 - ease);
    orientation.setFromAxisAngle(this.axis, this.angle)
      .multiply(this.rock.setFromAxisAngle(this.rockAxis, Math.sin(p * Math.PI) * .12));
  }
}
