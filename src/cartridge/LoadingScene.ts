import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { acquireClayGrain } from "../book/clay";
import { makeLoadingModels } from "./loading-models";

/** Four real miniatures, a complete >=3-second visual cycle, then real readiness. */
export class LoadingScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, .1, 20);
  private grain: ReturnType<typeof acquireClayGrain>;
  private environment: THREE.WebGLRenderTarget;
  private pmrem: THREE.PMREMGenerator;
  private models: THREE.Group[];
  private observer: ResizeObserver;
  private media = matchMedia("(prefers-reduced-motion: reduce)");
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private active = -1;
  private minimumReached = false;

  constructor(private host: HTMLElement, private callbacks: { onIndex: (index: number) => void; onReady: () => void; onMinimum: () => void }) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setClearColor(0, 0); this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1; this.renderer.domElement.setAttribute("aria-hidden", "true"); host.appendChild(this.renderer.domElement);
    this.grain = acquireClayGrain(); this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment(); this.environment = this.pmrem.fromScene(room, .045); room.dispose();
    this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .75;
    const surface = (params: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ ...params,
      roughness: .88, metalness: 0, clearcoat: 0, transmission: 0, specularIntensity: .18,
      normalMap: this.grain.normal, normalScale: new THREE.Vector2(.14, .14), roughnessMap: this.grain.roughness });
    this.models = makeLoadingModels(surface).map((model) => {
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
      model.position.sub(bounds.getCenter(new THREE.Vector3()));
      const carrier = new THREE.Group(); carrier.add(model); carrier.scale.setScalar(2.15 / Math.max(size.x, size.y, size.z));
      const pivot = new THREE.Group(); pivot.add(carrier); pivot.visible = false; this.scene.add(pivot); return pivot;
    });
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#b9bcc2", .8));
    const key = new THREE.DirectionalLight("#fffdf5", 2.4); key.position.set(-3, 5, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight("#e7edf8", 1.1); rim.position.set(3, 1, 2); this.scene.add(rim);
    this.camera.position.set(0, 0, 5); this.camera.lookAt(0, 0, 0);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }
  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return;
    this.camera.left = -1.5 * w / h; this.camera.right = 1.5 * w / h; this.camera.top = 1.5; this.camera.bottom = -1.5;
    this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false);
  }
  private frame = (now: number) => {
    if (!this.last) this.last = now;
    this.elapsed += Math.min((now - this.last) / 1000, .06); this.last = now;
    const index = Math.floor(this.elapsed / .75) % 4, phase = (this.elapsed % .75) / .75;
    if (index !== this.active) { this.active = index; this.models.forEach((model, i) => model.visible = i === index); this.callbacks.onIndex(index); }
    const model = this.models[index], enter = THREE.MathUtils.clamp(phase / .2, 0, 1), exit = THREE.MathUtils.clamp((1 - phase) / .16, 0, 1);
    const pop = 1 + 2.6 * (enter - 1) ** 3 + 1.6 * (enter - 1) ** 2;
    model.scale.setScalar(this.media.matches ? 1 : Math.max(.001, pop * exit * exit));
    model.position.y = this.media.matches ? 0 : (1 - Math.min(1, pop)) * -.12;
    model.rotation.y = this.media.matches ? 0 : (phase - .5) * .2;
    this.renderer.render(this.scene, this.camera);
    if (this.elapsed === 0) this.callbacks.onReady();
    if (!this.minimumReached && this.elapsed >= 3) { this.minimumReached = true; this.callbacks.onMinimum(); }
    this.raf = requestAnimationFrame(this.frame);
  };
  dispose() {
    cancelAnimationFrame(this.raf); this.observer.disconnect();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse((object) => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m); } });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); this.grain.release();
    this.environment.dispose(); this.pmrem.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
