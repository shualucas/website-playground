import type { PaperSurface } from "./PaperSurface";
const REST_PITCH = -20, REST_YAW = -12, REST_ROLL = -3;
const TAP_SLOP = 6;
/** One input/animation clock drives the flexible surface, with a DOM fallback. */
export class FloatingPaper {
  readonly ready:Promise<boolean>;
  private active=true;
  private hovered=false;
  private scale=1;
  private velocityScale=0;
  private frame = 0;
  private last = 0;
  private time = 0;
  private disposed = false;
  private visible = true;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private observer: IntersectionObserver;
  private grip: { id: number; x: number; y: number; moved: boolean; touch: boolean } | null = null;
  private pitch = REST_PITCH;
  private yaw = REST_YAW;
  private targetPitch = REST_PITCH;
  private targetYaw = REST_YAW;
  private velocityPitch = 0;
  private velocityYaw = 0;
  private tapEligible = false;
  private input: HTMLElement;
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

  constructor(private host: HTMLElement, private onRead: () => void) {
    // The rendered sheet can lean outside its untransformed DOM footprint.
    this.input = host.parentElement!;
    this.input.addEventListener("pointerdown", this.onDown);
    this.input.addEventListener("pointermove", this.onMove);
    this.input.addEventListener("pointerleave",this.onLeave);
    this.input.addEventListener("pointerup", this.onUp);
    this.input.addEventListener("pointercancel", this.onCancel);
    this.input.addEventListener("lostpointercapture", this.onCancel);
    this.input.addEventListener("click", this.onClick, true);
    document.addEventListener("visibilitychange", this.sync);
    this.motion.addEventListener("change", this.onMotion);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.sync(); });
    this.observer.observe(host);
    this.onMotion();
    this.ready=import("./PaperSurface").then(({PaperSurface})=>{
      if(this.disposed)return false;
      this.surface=new PaperSurface(host,()=>this.paint());this.paint();return true;
    }).catch(()=>{if(!this.disposed)host.dataset.surface="fallback";return true});
  }
  setActive(active:boolean){this.active=active;this.hovered=false;this.velocityScale=0;this.tapEligible=false;if(this.grip)this.release();this.paint();this.sync()}
  capture(){this.paint();return this.surface?.capture()??null}
  private onLeave=()=>{this.hovered=false;this.schedule()};
  private isContact(event: Event) {
    return !!(event.target as Element).closest("a,button:not(.resume-read-target)");
  }
  private onPaper(event: MouseEvent) {
    return this.host.dataset.surface === "webgl"
      ? !!this.surface?.containsPoint(event.clientX, event.clientY)
      : this.host.contains(document.elementFromPoint(event.clientX,event.clientY));
  }
  private onDown = (event: PointerEvent) => {
    this.tapEligible = false;
    if(!this.active)return;
    if (this.grip) { this.grip.moved = true; return; }
    if (event.button !== 0 || !event.isPrimary || this.isContact(event) || !this.onPaper(event)) return;
    this.grip = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, touch: event.pointerType === "touch" };
    if (!this.grip.touch) this.input.setPointerCapture(event.pointerId);
    const box=this.host.getBoundingClientRect();this.gripWidth=box.width;this.gripHeight=box.height;
    this.grabX=Math.max(-1,Math.min(1,(event.clientX-box.left)/box.width*2-1));
    this.grabY=Math.max(-1,Math.min(1,1-(event.clientY-box.top)/box.height*2));
  };
  private onMove = (event: PointerEvent) => {
    const grip = this.grip;
    if(!this.active)return;
    if (!grip) {if(event.pointerType!=="touch"){this.hovered=this.onPaper(event);this.schedule()}return;}
    if(event.pointerId !== grip.id)return;
    const dx = event.clientX - grip.x, dy = event.clientY - grip.y;
    if (!grip.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    grip.moved = true;
    // Keep native touch scrolling/pinching, while remembering this was not a tap.
    if (grip.touch) return;
    this.host.dataset.dragging = "true";
    event.preventDefault();
    this.targetYaw = (this.motion.matches ? 0 : REST_YAW) + Math.max(-16.1, Math.min(16.1, dx * 0.05175));
    this.targetPitch = (this.motion.matches ? 0 : REST_PITCH) + Math.max(-11.5, Math.min(11.5, -dy * 0.04025));
    this.targetBendX=Math.max(-.18,Math.min(.18,dx/this.gripWidth*.4));
    this.targetBendY=Math.max(-.18,Math.min(.18,-dy/this.gripHeight*.4));
    if (this.motion.matches) { this.pitch = this.targetPitch; this.yaw = this.targetYaw; this.bendX=this.targetBendX;this.bendY=this.targetBendY;this.paint(); }
    this.schedule();
  };
  private release() {
    const grip = this.grip; this.grip = null;
    this.host.dataset.dragging = "false";
    if (grip && this.input.hasPointerCapture(grip.id)) this.input.releasePointerCapture(grip.id);
    this.targetPitch = this.motion.matches ? 0 : REST_PITCH;
    this.targetYaw = this.motion.matches ? 0 : REST_YAW;
    this.targetBendX=this.targetBendY=0;
    if (this.motion.matches) { this.pitch = this.yaw = this.bendX = this.bendY = 0; this.paint(); }
    this.schedule();
  }
  private onUp = (event: PointerEvent) => {
    if (this.grip?.id !== event.pointerId) return;
    this.tapEligible = !this.grip.moved && Math.hypot(event.clientX-this.grip.x,event.clientY-this.grip.y)<TAP_SLOP && this.onPaper(event);
    this.release();
  };
  private onCancel = (event: PointerEvent) => {
    if (this.grip?.id !== event.pointerId) return;
    this.tapEligible = false; this.release();
  };
  private onClick = (event: MouseEvent) => {
    if (!this.active || this.isContact(event)) return;
    const keyboard = event.detail === 0 && !!(event.target as Element).closest(".resume-read-target");
    const activate = keyboard || (this.tapEligible && this.onPaper(event));
    this.tapEligible = false;
    event.preventDefault(); event.stopPropagation();
    if (activate) this.onRead();
  };
  reset = () => {
    this.tapEligible = false;
    this.release(); this.velocityPitch = this.velocityYaw = 0;
    this.bendX=this.bendY=this.velocityBendX=this.velocityBendY=0;
    this.pitch = this.targetPitch; this.yaw = this.targetYaw; this.time = 0;
    this.paint(); this.schedule();
  };
  private onMotion = () => {
    if (this.grip) this.release();
    this.velocityPitch = this.velocityYaw = 0;
    this.scale=1;this.velocityScale=0;
    this.bendX=this.bendY=this.targetBendX=this.targetBendY=this.velocityBendX=this.velocityBendY=0;
    this.targetPitch = this.pitch = this.motion.matches ? 0 : REST_PITCH;
    this.targetYaw = this.yaw = this.motion.matches ? 0 : REST_YAW;
    this.host.dataset.dragging = "false"; this.paint(); this.sync();
  };
  private sync = () => {
    if (document.hidden && this.grip) this.release();
    cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0;
    if (this.active && !document.hidden && this.visible) this.schedule();
  };
  private schedule() {
    if (!this.active || this.frame || this.disposed || !this.visible || document.hidden || this.motion.matches) return;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    this.frame = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    // Hold the current float phase while grabbed, rather than snapping to rest.
    if (!this.grip) this.time += dt;
    // Small fixed substeps keep the lightly damped return stable across frame rates.
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120);
      this.velocityPitch += ((this.targetPitch - this.pitch) * 100 - this.velocityPitch * 16) * step;
      this.velocityYaw += ((this.targetYaw - this.yaw) * 100 - this.velocityYaw * 16) * step;
      this.pitch += this.velocityPitch * step; this.yaw += this.velocityYaw * step;
      this.velocityBendX+=((this.targetBendX-this.bendX)*150-this.velocityBendX*25)*step;
      this.velocityBendY+=((this.targetBendY-this.bendY)*150-this.velocityBendY*25)*step;
      this.bendX+=this.velocityBendX*step;this.bendY+=this.velocityBendY*step;
      const targetScale=this.hovered&&!this.grip?1.06:1;
      this.velocityScale+=((targetScale-this.scale)*420-this.velocityScale*20)*step;
      this.scale+=this.velocityScale*step;
      remaining -= step;
    }
    this.paint(); this.schedule();
  };
  private paint() {
    const moving = !this.motion.matches;
    // A queued frame can observe the new preference before its change event.
    const reducedRest = this.motion.matches && !this.grip;
    const pitch = reducedRest ? 0 : this.pitch + (moving ? Math.sin(this.time * 0.6) * 3 : 0);
    const yaw = reducedRest ? 0 : this.yaw + (moving ? Math.sin(this.time * 0.43) * 4 : 0);
    const roll = this.motion.matches ? 0 : REST_ROLL + (moving ? Math.sin(this.time * 0.37) * 1.3 : 0);
    const lift = moving ? Math.sin(this.time * 0.85) * 14 : 0;
    this.host.style.setProperty("--paper-pitch", `${pitch.toFixed(3)}deg`);
    this.host.style.setProperty("--paper-yaw", `${yaw.toFixed(3)}deg`);
    this.host.style.setProperty("--paper-roll", `${roll.toFixed(3)}deg`);
    this.host.style.setProperty("--paper-lift", `${lift.toFixed(2)}px`);
    this.host.dataset.orientation = `${pitch.toFixed(3)},${yaw.toFixed(3)}`;
    this.host.dataset.motion = !this.active ? "paused" : this.motion.matches ? "reduced" : "floating";
    this.host.dataset.hoverScale=this.scale.toFixed(4);
    this.host.style.setProperty("--paper-scale",String(this.scale));
    this.surface?.render({pitch,yaw,roll,lift,scale:this.scale,bendX:this.bendX,bendY:this.bendY,grabX:this.grabX,grabY:this.grabY});
  }
  dispose() {
    this.disposed = true; this.release(); cancelAnimationFrame(this.frame);
    this.surface?.dispose();this.surface=null;
    this.observer.disconnect(); this.motion.removeEventListener("change", this.onMotion);
    document.removeEventListener("visibilitychange", this.sync);
    this.input.removeEventListener("pointerdown", this.onDown);
    this.input.removeEventListener("pointermove", this.onMove);
    this.input.removeEventListener("pointerleave",this.onLeave);
    this.input.removeEventListener("pointerup", this.onUp);
    this.input.removeEventListener("pointercancel", this.onCancel);
    this.input.removeEventListener("lostpointercapture", this.onCancel);
    this.input.removeEventListener("click", this.onClick, true);
    for (const property of ["pitch", "yaw", "roll", "lift", "scale"]) this.host.style.removeProperty(`--paper-${property}`);
    delete this.host.dataset.hoverScale;
    delete this.host.dataset.orientation; delete this.host.dataset.motion;
  }
}
