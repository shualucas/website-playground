import { AsciiRenderer } from "./renderer";
import { World } from "./world";

const STEP = 1 / 60;
const MAX_STEPS = 4;

/**
 * Wires World + AsciiRenderer to a canvas: fixed-timestep loop, resize,
 * pointer input, pausing off-screen, and prefers-reduced-motion.
 */
export class SkyEngine {
  private world: World;
  private renderer: AsciiRenderer;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private visible = true;
  private reducedMotion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private disposed = false;
  private paused = false;
  private frames = 0;
  private lastAction = "none";

  constructor(private canvas: HTMLCanvasElement) {
    this.world = new World();
    this.renderer = new AsciiRenderer(canvas);
    this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.paused = this.reducedMotion.matches;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);

    this.reducedMotion.addEventListener("change", this.onMotionPreference);
    window.addEventListener("pointermove", this.onPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", this.onPointerDown, {
      passive: true,
    });
    document.documentElement.addEventListener(
      "pointerleave",
      this.onPointerLeave,
    );
    window.addEventListener("blur", this.onPointerLeave);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerLeave);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.resize();
    // Canvas text can't trigger a webfont load; once the mono face is in, redraw.
    document.fonts
      ?.load(`600 16px ${getComputedStyle(canvas).fontFamily}`)
      .then(() => {
        if (!this.disposed && this.paused) this.drawStill();
      });
    this.schedule();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.reducedMotion.removeEventListener("change", this.onMotionPreference);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    document.documentElement.removeEventListener(
      "pointerleave",
      this.onPointerLeave,
    );
    window.removeEventListener("blur", this.onPointerLeave);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerLeave);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(rect.width, rect.height, dpr);
    this.world.resize(rect.width, rect.height);
    this.drawStill();
    this.report();
    this.canvas.dataset.ready = "true";
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    if (this.disposed || !this.visible || this.paused || document.hidden)
      return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.world.step(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.renderer.render(this.world, dt);
    this.frames++;
    this.report();
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Render an immediate frame for resizing, explicit input, or reduced motion. */
  private drawStill() {
    this.renderer.render(this.world, STEP);
    this.frames++;
    this.report();
  }

  togglePaused() {
    this.paused = !this.paused;
    cancelAnimationFrame(this.raf);
    this.acc = 0;
    this.report();
    if (!this.paused) this.schedule();
  }

  private report() {
    const data = this.canvas.dataset;
    data.rendering = "ascii-sky";
    data.balloons = String(this.world.balloons.length);
    data.clouds = String(this.world.clouds.length);
    data.targets = JSON.stringify(this.world.targets());
    data.balloonStates = JSON.stringify(
      this.world.balloons.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        speed: b.speed,
        lifts: b.lifts,
        liftVelocity: b.liftVelocity,
      })),
    );
    data.cloudStates = JSON.stringify(
      this.world.clouds.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        speed: c.speed,
        dispersing: c.dispersing,
        opacity: c.opacity,
        splits: c.splits,
        spread: Math.max(...c.puffs.map((p) => Math.hypot(p.x, p.y))),
      })),
    );
    data.lastAction = this.lastAction;
    data.time = this.world.time.toFixed(4);
    data.frames = String(this.frames);
    data.paused = String(this.paused);
    data.pointer = String(this.world.pointer.active);
    data.worldWidth = String(this.world.width);
    data.worldHeight = String(this.world.height);
  }

  private onMotionPreference = () => {
    this.paused = this.reducedMotion.matches;
    cancelAnimationFrame(this.raf);
    this.acc = 0;
    if (this.paused) this.drawStill();
    else this.schedule();
  };

  private onVisibility = () => {
    cancelAnimationFrame(this.raf);
    if (!document.hidden) this.schedule();
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === "touch") this.onPointerLeave();
  };

  private toLocal(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    return { x, y, inside };
  }

  private onPointerMove = (e: PointerEvent) => {
    const { x, y, inside } = this.toLocal(e);
    const p = this.world.pointer;
    p.x = x;
    p.y = y;
    p.active = inside;
    this.canvas.style.cursor = this.world.hit(x, y) ? "pointer" : "default";
    this.report();
  };

  private onPointerDown = (e: PointerEvent) => {
    const { x, y, inside } = this.toLocal(e);
    if (!inside) return;
    this.world.selected = null;
    const action = this.world.activate(x, y);
    if (action) {
      this.lastAction = `${action.type}:${action.id}`;
      if (this.paused) {
        this.world.step(1 / 30);
        this.drawStill();
      }
      this.report();
    }
  };

  select(direction: number) {
    this.world.select(direction);
    this.drawStill();
  }
  activateSelected() {
    const action = this.world.activateSelected();
    if (action) {
      this.lastAction = `${action.type}:${action.id}`;
      if (this.paused) this.world.step(1 / 30);
      this.drawStill();
    }
  }
  clearSelection() {
    this.world.selected = null;
    this.drawStill();
  }

  private onPointerLeave = () => {
    this.world.pointer.active = false;
    this.report();
  };
}
