import * as THREE from "three";
/** Critically damped pickup; gravity, friction and a small rebound on release. */
export class BookMotion {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly target = new THREE.Vector3();
  state: "rest" | "held" | "falling" = "rest";
  private impacted = false;
  grab(position: THREE.Vector3) {
    this.position.copy(position);
    this.target.copy(position);
    this.target.y = 0.72;
    this.velocity.set(0, 0, 0);
    this.impacted = false;
    this.state = "held";
  }
  release() {
    if (this.state === "held") {
      this.state = "falling";
      this.velocity.x *= 0.25;
      this.velocity.z *= 0.25;
      this.velocity.y = Math.min(this.velocity.y, 0.15);
    }
  }
  reset(x = 0, z = 0) {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.target.copy(this.position);
    this.state = "rest";
  }
  step(dt: number) {
    let impact = false;
    const duration = Math.min(Math.max(0, dt), 0.5);
    if (this.state === "held") {
      for (const axis of ["x", "y", "z"] as const) {
        const k = axis === "y" ? 17 : 23,
          offset = this.position[axis] - this.target[axis],
          v = this.velocity[axis],
          b = v + k * offset,
          e = Math.exp(-k * duration);
        this.position[axis] = this.target[axis] + (offset + b * duration) * e;
        this.velocity[axis] = (v - k * b * duration) * e;
      }
    } else if (this.state === "falling") {
      const n = Math.max(1, Math.ceil(duration * 120)),
        step = duration / n;
      for (let i = 0; i < n; i++) {
        this.velocity.y -= 5.8 * step;
        this.position.addScaledVector(this.velocity, step);
        this.velocity.x *= Math.exp(-7 * step);
        this.velocity.z *= Math.exp(-7 * step);
        if (this.position.y <= 0) {
          this.position.y = 0;
          if (!this.impacted && this.velocity.y < -0.4) {
            impact = true;
            this.impacted = true;
          }
          this.velocity.y = -this.velocity.y * 0.12;
          if (this.velocity.y < 0.14) {
            this.position.y = 0;
            this.velocity.y = 0;
          }
        }
      }
      if (
        this.position.y === 0 &&
        Math.abs(this.velocity.y) < 0.01 &&
        Math.hypot(this.velocity.x, this.velocity.z) < 0.035
      ) {
        this.velocity.set(0, 0, 0);
        this.state = "rest";
      }
    }
    return impact;
  }
}
