/** Slow compositor transforms keep the full-page color wash calm and inexpensive. */
export class AmbientGradient {
  private frame = 0;
  private last = 0;
  private time = 0;
  private x = 0;
  private y = 0;
  private targetX = 0;
  private targetY = 0;
  private disposed = false;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private pink: HTMLElement;
  private warm: HTMLElement;
  constructor(private host: HTMLElement) {
    this.pink = host.querySelector<HTMLElement>(".resume-wash-pink")!;
    this.warm = host.querySelector<HTMLElement>(".resume-wash-warm")!;
    window.addEventListener("pointermove", this.onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.recenter);
    window.addEventListener("blur", this.recenter);
    document.addEventListener("visibilitychange", this.sync);
    this.motion.addEventListener("change", this.sync);
    this.paint(); this.sync();
  }
  private onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch" || this.motion.matches) return;
    this.targetX = (Math.max(0, Math.min(1, event.clientX / Math.max(1, innerWidth))) - .5) * 24;
    this.targetY = (Math.max(0, Math.min(1, event.clientY / Math.max(1, innerHeight))) - .5) * 18;
  };
  private recenter = () => { this.targetX = this.targetY = 0; };
  private sync = () => {
    cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0;
    if (this.motion.matches) { this.x = this.y = this.targetX = this.targetY = 0; this.paint(); }
    if (!this.disposed && !document.hidden && !this.motion.matches) this.frame = requestAnimationFrame(this.tick);
  };
  private tick = (now: number) => {
    this.frame = 0;
    if (this.disposed || document.hidden || this.motion.matches) return;
    const dt = this.last ? Math.min(.05, (now - this.last) / 1000) : 0;
    this.last = now; this.time += dt;
    const ease = 1 - Math.exp(-3 * dt);
    this.x += (this.targetX - this.x) * ease; this.y += (this.targetY - this.y) * ease;
    this.paint(); this.frame = requestAnimationFrame(this.tick);
  };
  private paint() {
    const t = this.motion.matches ? 0 : this.time;
    this.pink.style.transform = `translate3d(${(Math.sin(t * .15) * 24 + this.x).toFixed(2)}px,${(Math.cos(t * .12) * 14 - 14 + this.y).toFixed(2)}px,0)`;
    this.warm.style.transform = `translate3d(${(Math.sin(t * .11) * 20 - this.x * .65).toFixed(2)}px,${(Math.sin(t * .14) * 16 - this.y * .65).toFixed(2)}px,0)`;
    this.host.dataset.motion = this.motion.matches ? "reduced" : "ambient";
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame);
    window.removeEventListener("pointermove", this.onMove);
    document.documentElement.removeEventListener("pointerleave", this.recenter);
    window.removeEventListener("blur", this.recenter);
    document.removeEventListener("visibilitychange", this.sync);
    this.motion.removeEventListener("change", this.sync);
    this.pink.style.removeProperty("transform"); this.warm.style.removeProperty("transform");
    delete this.host.dataset.motion;
  }
}
