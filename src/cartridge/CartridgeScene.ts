import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { cartridgeModel, cartridges, type CartridgeId } from "./config";
import { loadExternalShell, makeCartridge } from "./model";

type Callbacks = {
  onHover: (id: CartridgeId | null) => void;
  onSelect: (id: CartridgeId | null) => void;
  onReady: () => void;
  onError: () => void;
};
type Item = {
  id: CartridgeId; root: THREE.Group; handling: THREE.Group; hitbox: THREE.Mesh;
  half: THREE.Vector3; spin: THREE.Vector2; angle: THREE.Euler;
  target: THREE.Vector3; targetAngle: THREE.Vector3; velocity: THREE.Vector3;
};
const PITCH = -78 * Math.PI / 180;
const AXIS = new THREE.Vector3(0, -Math.sin(PITCH), Math.cos(PITCH));
const ROLLS = [.008, -.012, .013, -.006, .01];
const YAWS = [-.019, .025, -.014, .018, -.015];
const ELEVATION = 32 * Math.PI / 180;
const VIEW_UP = new THREE.Vector3(0, Math.cos(ELEVATION), -Math.sin(ELEVATION));
const VIEW_FORWARD = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));

/** Compact spine stack on desktop, edge-on rack on touch layouts; one owned clock. */
export class CartridgeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(14, 1, .1, 100);
  private items: Item[] = [];
  private pmrem: THREE.PMREMGenerator;
  private environment: THREE.WebGLRenderTarget;
  private observer: ResizeObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private projected = new THREE.Vector3();
  private selected: CartridgeId | null = null;
  private hovered: CartridgeId | null = null;
  private drag: { id: number; item: Item; x: number; y: number; startX: number; startY: number; moved: boolean; canRotate: boolean } | null = null;
  private raf = 0;
  private last = 0;
  private readyAt = 0;
  private disposed = false;
  private paused = false;
  private entering = true;
  private mobile = false;
  private grain: THREE.CanvasTexture;
  private shadow: THREE.Mesh;
  private cleanup = new Set<THREE.Texture>();
  private extentRotation = new THREE.Matrix4();
  private backdrop = new THREE.Color("#f0f0f0");

  constructor(private host: HTMLElement, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .95;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.setClearColor(this.backdrop, 1);
    this.renderer.domElement.setAttribute("aria-hidden", "true"); host.appendChild(this.renderer.domElement);
    this.camera.position.copy(VIEW_FORWARD).multiplyScalar(31); this.camera.lookAt(0, 0, 0);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment(); this.environment = this.pmrem.fromScene(room, .045); room.dispose();
    this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .6;
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#d6cbbd", .55));
    const key = new THREE.DirectionalLight("#fffdf7", 1.8); key.position.set(-1.5, 0, 0).addScaledVector(VIEW_UP, 3).addScaledVector(VIEW_FORWARD, 15); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6; key.shadow.camera.far = 40;
    key.shadow.normalBias = .018; key.shadow.bias = -.00015; key.shadow.radius = 7; key.shadow.blurSamples = 8;
    this.scene.add(key);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: .12 }));
    this.shadow.rotation.x = -ELEVATION; this.shadow.position.copy(VIEW_FORWARD).multiplyScalar(-2.3); this.shadow.receiveShadow = true; this.scene.add(this.shadow);
    this.grain = this.makeGrain(); this.cleanup.add(this.grain);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
    host.addEventListener("pointerdown", this.down); host.addEventListener("pointermove", this.move);
    host.addEventListener("pointerup", this.up); host.addEventListener("pointercancel", this.cancel);
    host.addEventListener("lostpointercapture", this.cancel); host.addEventListener("pointerleave", this.leave);
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost);
    document.addEventListener("visibilitychange", this.visibility); this.motion.addEventListener("change", this.preference);
    void this.prepare();
  }
  private makeGrain() {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!, data = ctx.createImageData(128, 128);
    let seed = 7319;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = 110 + seed % 36; data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(5, 5); return texture;
  }
  private async prepare() {
    try {
      const loader = new THREE.TextureLoader();
      const maps = await Promise.all(cartridges.map(async (config) => {
        const texture = await loader.loadAsync(config.label); texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        if (this.disposed) texture.dispose(); else this.cleanup.add(texture); return texture;
      }));
      if (this.disposed) return;
      for (let i = 0; i < cartridges.length; i++) {
        const config = cartridges[i], model = await loadExternalShell(maps[i], config.shell) ?? makeCartridge(config.shell, maps[i], this.grain);
        if (this.disposed) { this.disposeObject(model); return; }
        const half = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).multiplyScalar(.5);
        const root = new THREE.Group(), handling = new THREE.Group(); handling.add(model); root.add(handling);
        const hitbox = new THREE.Mesh(new THREE.BoxGeometry(half.x * 2, half.y * 2, half.z * 2), new THREE.MeshBasicMaterial({ visible: false }));
        hitbox.userData.cartridgeId = config.id; root.add(hitbox); this.scene.add(root);
        this.items.push({ id: config.id, root, handling, hitbox, half, spin: new THREE.Vector2(), angle: new THREE.Euler(), target: new THREE.Vector3(), targetAngle: new THREE.Vector3(), velocity: new THREE.Vector3() });
      }
      this.layout();
      for (const item of this.items) {
        item.root.position.copy(item.target); item.root.rotation.set(item.targetAngle.x, item.targetAngle.y, item.targetAngle.z);
        if (!this.motion.matches) item.root.position.y += 2;
      }
      this.host.dataset.model = cartridgeModel.url ? "external-glb" : "original-procedural";
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.disposed) return;
      this.readyAt = performance.now(); this.host.dataset.ready = "true"; this.callbacks.onReady(); this.start();
    } catch (error) { if (!this.disposed) { console.error("Cartridge scene could not prepare", error); this.callbacks.onError(); } }
  }
  /** Bounds projected along the stack normal keep neighboring closed shells disjoint. */
  private stackExtent(item: Item, i: number) {
    this.extentRotation.makeRotationFromEuler(item.angle.set(PITCH, YAWS[i], ROLLS[i]));
    const e = this.extentRotation.elements, h = item.half;
    return 2 * (Math.abs(AXIS.x * e[0] + AXIS.y * e[1] + AXIS.z * e[2]) * h.x + Math.abs(AXIS.x * e[4] + AXIS.y * e[5] + AXIS.z * e[6]) * h.y + Math.abs(AXIS.x * e[8] + AXIS.y * e[9] + AXIS.z * e[10]) * h.z);
  }
  private layout() {
    this.host.dataset.settled = "false";
    const active = this.items.findIndex((item) => item.id === this.selected);
    const heights = this.items.map((item, i) => this.stackExtent(item, i) + .065);
    const total = heights.reduce((sum, h) => sum + h, 0); let cursor = total / 2;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (this.mobile) {
        let x = (i - (this.items.length - 1) / 2) * .46;
        if (active >= 0) x = i === active ? 0 : Math.sign(i - active) * (1.08 + Math.max(0, Math.abs(i - active) - 1) * .055);
        const y = active === i ? .18 : -.02, depth = active === i ? .8 : -.4;
        item.target.copy(VIEW_UP).multiplyScalar(y).addScaledVector(VIEW_FORWARD, depth); item.target.x = x;
        item.targetAngle.set(-ELEVATION, active === i ? 0 : 80 * Math.PI / 180, ROLLS[i]);
      } else {
        const coordinate = cursor - heights[i] / 2; cursor -= heights[i];
        item.target.copy(AXIS).multiplyScalar(coordinate); item.targetAngle.set(PITCH, YAWS[i], ROLLS[i]);
        if (active >= 0) {
          const before = active, after = this.items.length - active - 1;
          const upper = before ? 1.93 + before * .4 : 1.4;
          const lower = after ? 2.65 + after * .4 : 1.83;
          const center = (lower - upper) / 2;
          const y = i === active ? center : i < active ? center + 1.88 + (active - i - 1) * .4 : center - 2.6 - (i - active - 1) * .4;
          item.target.copy(VIEW_UP).multiplyScalar(y).addScaledVector(VIEW_FORWARD, i === active ? .8 : -.7);
          item.targetAngle.set(i === active ? -ELEVATION : -ELEVATION + PITCH, YAWS[i], ROLLS[i]);
        }
      }
      if (i === active) { item.targetAngle.x += item.spin.x; item.targetAngle.y += item.spin.y; }
    }
    this.host.dataset.composition = this.mobile ? "rack" : "stack";
    this.host.dataset.selected = this.selected ?? "";
  }
  setSelected(id: CartridgeId | null) {
    if (id !== this.selected) for (const item of this.items) item.spin.set(0, 0);
    this.selected = id; this.layout(); this.start();
  }
  setHovered(id: CartridgeId | null) { this.hovered = id; this.start(); }
  setPaused(value: boolean) { this.paused = value; if (value) this.stop(); else this.start(); }
  setTheme(dark: boolean) {
    this.backdrop.set(dark ? "#1b1c1b" : "#f0f0f0"); this.renderer.setClearColor(this.backdrop, 1);
    (this.shadow.material as THREE.ShadowMaterial).opacity = dark ? .28 : .12; this.start();
  }
  reset() { for (const item of this.items) item.spin.set(0, 0); this.layout(); this.start(); }
  private resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight; if (!width || !height) return;
    this.mobile = innerWidth < 880; this.camera.aspect = width / height;
    // Twice the previous optical magnification; extra stage height reserves room for five slots.
    const span = this.mobile ? 6.6 / this.camera.aspect : Math.max(9.3 * height / 600, 7.3 / this.camera.aspect);
    this.camera.zoom = 2;
    this.camera.position.copy(VIEW_FORWARD).multiplyScalar(span / (2 * Math.tan(7 * Math.PI / 180)));
    this.camera.lookAt(0, 0, 0);
    this.host.dataset.view = "top-down"; this.host.dataset.magnification = "2";
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height); this.layout(); this.start();
  }
  private pick(event: PointerEvent) {
    const rect = this.host.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = this.ray.intersectObjects(this.items.map((item) => item.hitbox), false)[0];
    return hit ? this.items.find((item) => item.id === hit.object.userData.cartridgeId) ?? null : null;
  }
  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.paused || this.drag || event.target !== this.renderer.domElement) return;
    const item = this.pick(event); if (!item) return;
    const canRotate = item.id === this.selected;
    if (canRotate) { event.preventDefault(); this.host.setPointerCapture(event.pointerId); }
    this.drag = { id: event.pointerId, item, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, canRotate };
    this.host.dataset.dragging = "false"; this.start();
  };
  private move = (event: PointerEvent) => {
    if (this.paused) return;
    if (this.drag && this.drag.id === event.pointerId) {
      const d = this.drag;
      if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 7) d.moved = true;
      if (d.moved && d.canRotate) {
        d.item.spin.y += (event.clientX - d.x) * .013; d.item.spin.x += (event.clientY - d.y) * .013;
        this.layout(); this.host.dataset.dragging = "true"; this.host.style.cursor = "grabbing";
      }
      d.x = event.clientX; d.y = event.clientY;
    } else {
      const item = this.pick(event), id = item?.id ?? null;
      if (id !== this.hovered) { this.hovered = id; this.callbacks.onHover(id); }
      this.host.style.cursor = id ? id === this.selected ? "grab" : "pointer" : "default";
    }
    this.start();
  };
  private up = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const d = this.drag; this.drag = null; this.host.dataset.dragging = "false";
    if (this.host.hasPointerCapture(event.pointerId)) this.host.releasePointerCapture(event.pointerId);
    if (!d.moved && !this.paused) this.callbacks.onSelect(this.selected === d.item.id ? null : d.item.id);
    this.start();
  };
  private cancel = () => { this.drag = null; this.host.dataset.dragging = "false"; this.host.style.cursor = "default"; this.start(); };
  private leave = () => { if (!this.drag) { this.hovered = null; this.callbacks.onHover(null); this.start(); } };
  private contextLost = (event: Event) => { event.preventDefault(); this.stop(); this.callbacks.onError(); };
  private visibility = () => { if (document.hidden) this.stop(); else this.start(); };
  private preference = () => { this.start(); };
  private start() {
    if (this.raf || this.disposed || this.paused || document.hidden || !this.items.length) return;
    this.last = performance.now(); this.raf = requestAnimationFrame(this.frame);
  }
  private stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  private frame = (now: number) => {
    this.raf = 0; if (this.disposed || this.paused || document.hidden) return;
    const dt = Math.min((now - this.last) / 1000, .04); this.last = now;
    const reduced = this.motion.matches, blend = reduced ? 1 : 1 - Math.exp(-13 * dt);
    let unsettled = false;
    this.entering = false;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i], { root, handling, target, targetAngle, velocity } = item;
      const progress = reduced ? 1 : THREE.MathUtils.clamp((now - this.readyAt - i * 110) / 850, 0, 1);
      const entrance = 2 * (1 - progress) ** 3;
      if (progress < 1) this.entering = true;
      // Damped spring retains velocity across rapid selections and responsive changes.
      const steps = Math.max(1, Math.ceil(dt / .008)), step = dt / steps;
      for (let j = 0; j < steps; j++) for (const axis of ["x", "y", "z"] as const) {
        const destination = target[axis] + (axis === "y" ? entrance : 0);
        if (reduced || progress < 1) { root.position[axis] = destination; velocity[axis] = 0; }
        else { velocity[axis] += ((destination - root.position[axis]) * 175 - velocity[axis] * 25) * step; root.position[axis] += velocity[axis] * step; }
      }
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, targetAngle.x, blend);
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, targetAngle.y, blend);
      root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, targetAngle.z, blend);
      const hover = this.hovered === item.id && !reduced && !this.drag;
      handling.position.z = THREE.MathUtils.lerp(handling.position.z, hover ? .045 : 0, blend);
      handling.rotation.x = THREE.MathUtils.lerp(handling.rotation.x, hover ? -.022 : 0, blend);
      const difference = root.position.distanceToSquared(target) + velocity.lengthSq() + Math.abs(root.rotation.x - targetAngle.x) + Math.abs(root.rotation.y - targetAngle.y) + Math.abs(root.rotation.z - targetAngle.z) + Math.abs(handling.position.z - (hover ? .045 : 0)) + Math.abs(handling.rotation.x - (hover ? -.022 : 0));
      if (difference > .00001) unsettled = true;
      else { root.position.copy(target); velocity.set(0, 0, 0); root.rotation.set(targetAngle.x, targetAngle.y, targetAngle.z); }
      this.host.dataset[`rotation${i}`] = root.rotation.toArray().slice(0, 3).join(",");
    }
    this.renderer.render(this.scene, this.camera);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      // In the closed desktop stack only the near edge is exposed; its center may be occluded by the shell above.
      this.projected.set(0, !this.mobile && item.id !== this.selected ? -item.half.y + .02 : 0, item.half.z).applyMatrix4(item.root.matrixWorld).project(this.camera);
      const point = { x: (this.projected.x + 1) * this.host.clientWidth / 2, y: (1 - this.projected.y) * this.host.clientHeight / 2 };
      this.host.dataset[`hit${i}`] = JSON.stringify(point);
      this.host.style.setProperty(`--hit-${i}-x`, `${point.x}px`); this.host.style.setProperty(`--hit-${i}-y`, `${point.y}px`);
      if (item.id === this.selected) {
        this.projected.copy(item.root.position).addScaledVector(VIEW_UP, -item.half.y - .22).project(this.camera);
        this.host.style.setProperty("--caption-x", `${(this.projected.x + 1) * this.host.clientWidth / 2}px`);
        this.host.style.setProperty("--caption-y", `${(1 - this.projected.y) * this.host.clientHeight / 2}px`);
      }
    }
    this.host.dataset.settled = !unsettled && !this.entering ? "true" : "false";
    if (unsettled || this.entering || this.drag) this.raf = requestAnimationFrame(this.frame);
  };
  private disposeObject(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    object.traverse((o) => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); } });
    for (const g of geometries) g.dispose();
    for (const m of materials) { for (const value of Object.values(m)) if (value instanceof THREE.Texture && !this.cleanup.has(value)) value.dispose(); m.dispose(); }
  }
  dispose() {
    this.disposed = true; this.stop(); this.observer.disconnect();
    this.host.removeEventListener("pointerdown", this.down); this.host.removeEventListener("pointermove", this.move);
    this.host.removeEventListener("pointerup", this.up); this.host.removeEventListener("pointercancel", this.cancel);
    this.host.removeEventListener("lostpointercapture", this.cancel); this.host.removeEventListener("pointerleave", this.leave);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.contextLost);
    document.removeEventListener("visibilitychange", this.visibility); this.motion.removeEventListener("change", this.preference);
    this.disposeObject(this.scene); for (const t of this.cleanup) t.dispose();
    this.environment.dispose(); this.pmrem.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
