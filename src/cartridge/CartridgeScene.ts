import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { cartridgeModel, cartridges, type CartridgeId } from "./config";
import { loadExternalShell, makeCartridge } from "./model";

type Callbacks = {
  onHover: (id: CartridgeId | null) => void;
  onOpen: (id: CartridgeId) => void;
  onReady: () => void;
  onError: () => void;
};
type Item = { id: CartridgeId; root: THREE.Group; spin: THREE.Vector2; rest: THREE.Vector3; roll: number; inspected: boolean };

/** One owned renderer/clock; React owns the accessible controls and reader. */
export class CartridgeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 70);
  private items: Item[] = [];
  private pmrem: THREE.PMREMGenerator;
  private environment: THREE.WebGLRenderTarget;
  private observer: ResizeObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private projected = new THREE.Vector3();
  private selected: CartridgeId = "about";
  private hovered: CartridgeId | null = null;
  private drag: { id: number; item: Item; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private readyAt = 0;
  private disposed = false;
  private paused = false;
  private grain: THREE.CanvasTexture;
  private shadow: THREE.Mesh;
  private backdrop = new THREE.Color("#f6f5f1");
  private cleanup = new Set<THREE.Texture>();

  constructor(private host: HTMLElement, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(this.backdrop, 1);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(this.renderer.domElement);
    this.camera.position.set(4, 10, 13); this.camera.lookAt(0, .2, 0);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = this.pmrem.fromScene(room, .045); room.dispose();
    this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .6;
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#d6cbbd", .55));
    const key = new THREE.DirectionalLight("#fff9ef", 1.8);
    key.position.set(-3, 9, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6; key.shadow.camera.far = 22;
    key.shadow.normalBias = .025; key.shadow.bias = -.00015; key.shadow.radius = 4;
    this.scene.add(key);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .16 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = -.03; this.shadow.receiveShadow = true;
    this.scene.add(this.shadow);
    this.grain = this.makeGrain(); this.cleanup.add(this.grain);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    this.resize();
    host.addEventListener("pointerdown", this.down);
    host.addEventListener("pointermove", this.move);
    host.addEventListener("pointerup", this.up);
    host.addEventListener("pointercancel", this.cancel);
    host.addEventListener("lostpointercapture", this.cancel);
    host.addEventListener("pointerleave", this.leave);
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost);
    document.addEventListener("visibilitychange", this.visibility);
    this.motion.addEventListener("change", this.preference);
    void this.prepare();
  }

  private makeGrain() {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!, data = ctx.createImageData(128, 128);
    let seed = 7319;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const shade = 110 + (seed % 36);
      data.data[i] = data.data[i + 1] = data.data[i + 2] = shade; data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(5, 5);
    return texture;
  }

  private async prepare() {
    try {
      const loader = new THREE.TextureLoader();
      const maps = await Promise.all(cartridges.map(async (config) => {
        const texture = await loader.loadAsync(config.label);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        if (this.disposed) texture.dispose(); else this.cleanup.add(texture);
        return texture;
      }));
      if (this.disposed) return;
      for (let i = 0; i < cartridges.length; i++) {
        const config = cartridges[i];
        const root = await loadExternalShell(maps[i], config.shell) ?? makeCartridge(config.shell, maps[i], this.grain);
        if (this.disposed) { this.disposeObject(root); return; }
        const rest = new THREE.Vector3((i % 2 ? 1 : -1) * 1.48, .4, (i < 2 ? -1 : 1) * 1.62);
        root.position.copy(rest); root.rotation.set(-Math.PI / 2 + .1, 0, [ .07, -.13, .14, -.06 ][i]);
        if (!this.motion.matches) { root.position.y += 1.4; root.scale.setScalar(.85); }
        root.userData.cartridgeId = config.id;
        root.traverse((o) => { o.userData.cartridgeId = config.id; });
        this.scene.add(root);
        this.items.push({ id: config.id, root, spin: new THREE.Vector2(), rest, roll: root.rotation.z, inspected: false });
      }
      this.host.dataset.model = cartridgeModel.url ? "external-glb" : "original-procedural";
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.disposed) return;
      this.readyAt = performance.now();
      this.host.dataset.ready = "true";
      this.callbacks.onReady(); this.start();
    } catch (error) {
      if (!this.disposed) { console.error("Cartridge scene could not prepare", error); this.callbacks.onError(); }
    }
  }

  setSelected(id: CartridgeId) { this.selected = id; this.start(); }
  setPaused(value: boolean) { this.paused = value; if (value) this.stop(); else this.start(); }
  setTheme(dark: boolean) {
    this.backdrop.set(dark ? "#1b1c1b" : "#f6f5f1"); this.renderer.setClearColor(this.backdrop, 1);
    (this.shadow.material as THREE.ShadowMaterial).opacity = dark ? .36 : .16;
    this.start();
  }
  reset() {
    for (const item of this.items) { item.spin.set(0, 0); item.inspected = false; }
    this.start();
  }
  private resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const span = Math.max(7.2, 7.8 / aspect);
    this.camera.top = span / 2; this.camera.bottom = -span / 2;
    this.camera.left = -span * aspect / 2; this.camera.right = span * aspect / 2;
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height); this.start();
  }
  private pick(event: PointerEvent) {
    const rect = this.host.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = this.ray.intersectObjects(this.items.map((i) => i.root), true)[0];
    return hit ? this.items.find((i) => i.id === hit.object.userData.cartridgeId) ?? null : null;
  }
  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.paused || this.drag) return;
    const item = this.pick(event); if (!item) return;
    event.preventDefault(); this.host.setPointerCapture(event.pointerId);
    this.drag = { id: event.pointerId, item, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    this.host.dataset.dragging = "false"; this.start();
  };
  private move = (event: PointerEvent) => {
    if (this.paused) return;
    if (this.drag && this.drag.id === event.pointerId) {
      const d = this.drag;
      if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 6) d.moved = true;
      if (d.moved) {
        d.item.spin.y += (event.clientX - d.x) * .013;
        d.item.spin.x += (event.clientY - d.y) * .013;
        d.item.inspected = true;
        this.host.dataset.dragging = "true"; this.host.style.cursor = "grabbing";
      }
      d.x = event.clientX; d.y = event.clientY;
    } else {
      const id = this.pick(event)?.id ?? null;
      if (id !== this.hovered) { this.hovered = id; this.callbacks.onHover(id); }
      this.host.style.cursor = id ? "grab" : "default";
    }
    this.start();
  };
  private up = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const d = this.drag; this.drag = null;
    this.host.dataset.dragging = "false"; this.host.style.cursor = "grab";
    if (this.host.hasPointerCapture(event.pointerId)) this.host.releasePointerCapture(event.pointerId);
    if (!d.moved && !this.paused) this.callbacks.onOpen(d.item.id);
    this.start();
  };
  private cancel = () => {
    this.drag = null; this.host.dataset.dragging = "false"; this.host.style.cursor = "default"; this.start();
  };
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
    this.raf = 0;
    if (this.disposed || this.paused || document.hidden) return;
    const dt = Math.min((now - this.last) / 1000, .05); this.last = now; this.elapsed += dt;
    const blend = 1 - Math.exp(-12 * dt), reduced = this.motion.matches;
    let settling = false;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const focused = (this.hovered ?? this.selected) === item.id;
      const hover = focused ? .16 : 0;
      const bob = reduced ? 0 : Math.sin(this.elapsed * .7 + i * 1.7) * .018;
      const arrive = reduced ? 1 : THREE.MathUtils.clamp((now - this.readyAt - i * 80) / 850, 0, 1);
      const ease = 1 - (1 - arrive) ** 3;
      const y = item.inspected ? 2.12 : item.rest.y + hover + bob;
      const targetY = y + (1 - ease) * 1.4;
      const pitch = -Math.PI / 2 + .1 + item.spin.x + (focused && !item.inspected ? .09 : 0);
      const factor = reduced ? 1 : blend;
      item.root.position.y = THREE.MathUtils.lerp(item.root.position.y, targetY, factor);
      item.root.rotation.x = THREE.MathUtils.lerp(item.root.rotation.x, pitch, factor);
      item.root.rotation.y = THREE.MathUtils.lerp(item.root.rotation.y, item.spin.y, factor);
      item.root.scale.setScalar(reduced ? 1 : .85 + ease * .15);
      if (Math.abs(item.root.position.y - targetY) > .001 || Math.abs(item.root.rotation.x - pitch) > .001 || Math.abs(item.root.rotation.y - item.spin.y) > .001 || arrive < 1) settling = true;
      this.host.dataset[`rotation${i}`] = item.root.rotation.toArray().slice(0, 3).join(",");
    }
    this.renderer.render(this.scene, this.camera);
    for (let i = 0; i < this.items.length; i++) {
      this.projected.set(0, 0, .2).applyMatrix4(this.items[i].root.matrixWorld).project(this.camera);
      this.host.dataset[`hit${i}`] = JSON.stringify({ x: (this.projected.x + 1) * this.host.clientWidth / 2, y: (1 - this.projected.y) * this.host.clientHeight / 2 });
    }
    // Reduced motion draws on input/resize, with no perpetual idle loop.
    if (!reduced || settling || this.drag) this.raf = requestAnimationFrame(this.frame);
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
