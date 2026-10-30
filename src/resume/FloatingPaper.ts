import type { PaperSurface } from "./PaperSurface";
/** One input/animation clock drives the flexible surface, with a DOM fallback. */
export class FloatingPaper {
  private frame = 0;
  private last = 0;
  private time = 0;
  private disposed = false;
  private visible = true;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private observer: IntersectionObserver;
  private grip: { id: number; x: number; y: number; moved: boolean } | null = null;
  private pitch = -1.6;
  private yaw = 0.7;
  private targetPitch = -1.6;
  private targetYaw = 0.7;
  private velocityPitch = 0;
  private velocityYaw = 0;
  private suppressClick = false;
  private surface: PaperSurface | null = null;
  private grabX = 0;
  private grabY = 0;
  private bendX = 0;
  private bendY = 0;
  private targetBendX = 0;
  private targetBendY = 0;
  private velocityBendX = 0;
  private velocityBendY = 0;
  private gripWidth = 1;
  private gripHeight = 1;

  constructor(private host: HTMLElement) {
    host.addEventListener("pointerdown", this.onDown);
    host.addEventListener("pointermove", this.onMove);
    host.addEventListener("pointerup", this.onUp);
    host.addEventListener("pointercancel", this.onCancel);
    host.addEventListener("lostpointercapture", this.onCancel);
    host.addEventListener("click", this.onClick, true);
    document.addEventListener("visibilitychange", this.sync);
    this.motion.addEventListener("change", this.onMotion);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.sync(); });
    this.observer.observe(host);
    this.onMotion();
    import("./PaperSurface").then(({PaperSurface})=>{
      if(this.disposed)return;
      this.surface=new PaperSurface(host,()=>this.paint());this.paint();
    }).catch(()=>{if(!this.disposed)host.dataset.surface="fallback"});
  }
  private onDown = (event: PointerEvent) => {
    this.suppressClick = false;
    if (event.button !== 0 || !event.isPrimary || event.pointerType === "touch" || (event.target as HTMLElement).closest("a,button")) return;
    this.grip = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    const box=this.host.getBoundingClientRect();this.gripWidth=box.width;this.gripHeight=box.height;
    this.grabX=Math.max(-1,Math.min(1,(event.clientX-box.left)/box.width*2-1));
    this.grabY=Math.max(-1,Math.min(1,1-(event.clientY-box.top)/box.height*2));
    this.suppressClick = false;
  };
  private onMove = (event: PointerEvent) => {
    const grip = this.grip;
    if (!grip || event.pointerId !== grip.id) return;
    const dx = event.clientX - grip.x, dy = event.clientY - grip.y;
    if (!grip.moved && Math.hypot(dx, dy) < 5) return;
    grip.moved = true;
    this.host.setPointerCapture(event.pointerId);
    this.host.dataset.dragging = "true";
    event.preventDefault();
    this.targetYaw = Math.max(-16.1, Math.min(16.1, 0.7 + dx * 0.05175));
    this.targetPitch = Math.max(-11.5, Math.min(11.5, -1.6 - dy * 0.04025));
    this.targetBendX=Math.max(-.65,Math.min(.65,dx/this.gripWidth*1.6));
    this.targetBendY=Math.max(-.65,Math.min(.65,-dy/this.gripHeight*1.6));
    if (this.motion.matches) { this.pitch = this.targetPitch; this.yaw = this.targetYaw; this.bendX=this.targetBendX;this.bendY=this.targetBendY;this.paint(); }
    this.schedule();
  };
  private release() {
    const grip = this.grip; this.grip = null;
    this.host.dataset.dragging = "false";
    if (grip && this.host.hasPointerCapture(grip.id)) this.host.releasePointerCapture(grip.id);
    this.targetPitch = this.motion.matches ? 0 : -1.6;
    this.targetYaw = this.motion.matches ? 0 : 0.7;
    this.targetBendX=this.targetBendY=0;
    if (this.motion.matches) { this.pitch = this.yaw = this.bendX = this.bendY = 0; this.paint(); }
    this.schedule();
  }
  private onUp = (event: PointerEvent) => {
    if (this.grip?.id !== event.pointerId) return;
    this.suppressClick = this.grip.moved; this.release();
  };
  private onCancel = (event: PointerEvent) => {
    if (this.grip?.id !== event.pointerId) return;
    this.suppressClick = this.grip.moved; this.release();
  };
  private onClick = (event: MouseEvent) => {
    if (this.suppressClick) { event.preventDefault(); event.stopPropagation(); this.suppressClick = false; }
  };
  reset = () => {
    this.release(); this.velocityPitch = this.velocityYaw = 0;
    this.bendX=this.bendY=this.velocityBendX=this.velocityBendY=0;
    this.pitch = this.targetPitch; this.yaw = this.targetYaw; this.time = 0;
    this.paint(); this.schedule();
  };
  private onMotion = () => {
    if (this.grip) this.release();
    this.velocityPitch = this.velocityYaw = 0;
    this.bendX=this.bendY=this.targetBendX=this.targetBendY=this.velocityBendX=this.velocityBendY=0;
    this.targetPitch = this.pitch = this.motion.matches ? 0 : -1.6;
    this.targetYaw = this.yaw = this.motion.matches ? 0 : 0.7;
    this.host.dataset.dragging = "false"; this.paint(); this.sync();
  };
  private sync = () => {
    if (document.hidden && this.grip) this.release();
    cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0;
    if (!document.hidden && this.visible) this.schedule();
  };
  private schedule() {
    if (this.frame || this.disposed || !this.visible || document.hidden || this.motion.matches) return;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    this.frame = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now; this.time += dt;
    // Small fixed substeps keep the lightly damped return stable across frame rates.
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120);
      this.velocityPitch += ((this.targetPitch - this.pitch) * 100 - this.velocityPitch * 16) * step;
      this.velocityYaw += ((this.targetYaw - this.yaw) * 100 - this.velocityYaw * 16) * step;
      this.pitch += this.velocityPitch * step; this.yaw += this.velocityYaw * step;
      this.velocityBendX+=((this.targetBendX-this.bendX)*110-this.velocityBendX*17)*step;
      this.velocityBendY+=((this.targetBendY-this.bendY)*110-this.velocityBendY*17)*step;
      this.bendX+=this.velocityBendX*step;this.bendY+=this.velocityBendY*step;
      remaining -= step;
    }
    this.paint(); this.schedule();
  };
  private paint() {
    const moving = !this.motion.matches && !this.grip;
    // A queued frame can observe the new preference before its change event.
    const reducedRest = this.motion.matches && !this.grip;
    const pitch = reducedRest ? 0 : this.pitch + (moving ? Math.sin(this.time * 0.6) * 0.9 : 0);
    const yaw = reducedRest ? 0 : this.yaw + (moving ? Math.sin(this.time * 0.43) * 1.1 : 0);
    this.host.style.setProperty("--paper-pitch", `${pitch.toFixed(3)}deg`);
    this.host.style.setProperty("--paper-yaw", `${yaw.toFixed(3)}deg`);
    this.host.style.setProperty("--paper-roll", this.motion.matches ? "0deg" : `${(-0.3 + Math.sin(this.time * 0.37) * 0.28).toFixed(3)}deg`);
    this.host.style.setProperty("--paper-lift", `${moving ? (Math.sin(this.time * 0.85) * 5).toFixed(2) : 0}px`);
    this.host.dataset.orientation = `${pitch.toFixed(3)},${yaw.toFixed(3)}`;
    this.host.dataset.motion = this.motion.matches ? "reduced" : "floating";
    this.surface?.render({pitch,yaw,roll:this.motion.matches?0:-.3+Math.sin(this.time*.37)*.28,lift:moving?Math.sin(this.time*.85)*5:0,bendX:this.bendX,bendY:this.bendY,grabX:this.grabX,grabY:this.grabY});
  }
  dispose() {
    this.disposed = true; this.release(); cancelAnimationFrame(this.frame);
    this.surface?.dispose();this.surface=null;
    this.observer.disconnect(); this.motion.removeEventListener("change", this.onMotion);
    document.removeEventListener("visibilitychange", this.sync);
    this.host.removeEventListener("pointerdown", this.onDown);
    this.host.removeEventListener("pointermove", this.onMove);
    this.host.removeEventListener("pointerup", this.onUp);
    this.host.removeEventListener("pointercancel", this.onCancel);
    this.host.removeEventListener("lostpointercapture", this.onCancel);
    this.host.removeEventListener("click", this.onClick, true);
    for (const property of ["pitch", "yaw", "roll", "lift"]) this.host.style.removeProperty(`--paper-${property}`);
    delete this.host.dataset.orientation; delete this.host.dataset.motion;
  }
}
