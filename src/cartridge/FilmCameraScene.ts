import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { aboutMiniatures } from "../book/miniatures";
import { acquireClayGrain } from "../book/clay";

/** Original clay camera with gentle motion, active only while visible. */
export class FilmCameraScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 20);
  private grain: ReturnType<typeof acquireClayGrain>;
  private environment: THREE.WebGLRenderTarget;
  private pmrem: THREE.PMREMGenerator;
  private observer: ResizeObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private rig = new THREE.Group();
  private inspection = new THREE.Group();
  private inView = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private size = new THREE.Vector3();
  private fill = new THREE.HemisphereLight("#ffffff", "#bbc1ca", .8);

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    this.grain = acquireClayGrain();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0, 0); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.setAttribute("aria-hidden", "true"); host.appendChild(this.renderer.domElement);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment(); this.environment = this.pmrem.fromScene(room, .045); room.dispose();
    this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .75;
    const model = aboutMiniatures((params) => new THREE.MeshPhysicalMaterial({
      ...params, roughness: .88, metalness: 0, clearcoat: 0, transmission: 0,
      specularIntensity: .15, normalMap: this.grain.normal, normalScale: new THREE.Vector2(.14, .14), roughnessMap: this.grain.roughness,
    }), () => {}, true).camera;
    model.rotation.set(.18, -.35, -.13); this.rig.add(model); this.inspection.add(this.rig); this.scene.add(this.inspection);
    const bounds = new THREE.Box3().setFromObject(model);
    model.position.sub(bounds.getCenter(new THREE.Vector3())); bounds.getSize(this.size);
    this.scene.add(this.fill);
    const key = new THREE.DirectionalLight("#fffdf8", 2.4); key.position.set(-3, 5, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight("#e7edf8", 1.2); rim.position.set(3, 1, 2); this.scene.add(rim);
    this.camera.position.set(0, 0, 5); this.camera.lookAt(0, 0, 0);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    this.motion.addEventListener("change", this.sync); document.addEventListener("visibilitychange", this.sync);
    window.addEventListener("scroll", this.sync, { passive: true }); window.addEventListener("resize", this.sync);
    this.resize();
  }
  setTheme(dark: boolean) { this.fill.intensity = dark ? 1.1 : .8; this.draw(); }
  rotateBy(dx: number, dy: number) {
    this.inspection.rotation.y += dx * .018; this.inspection.rotation.x += dy * .018;
    this.host.dataset.rotation = this.inspection.rotation.toArray().slice(0, 3).join(","); this.draw();
  }
  resetRotation() { this.inspection.rotation.set(0, 0, 0); this.host.dataset.rotation = "0,0,0"; this.draw(); }
  private resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) { this.sync(); return; }
    const aspect = width / height, halfHeight = this.size.length() * .54 / Math.min(aspect, 1);
    this.camera.left = -halfHeight * aspect; this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight; this.camera.bottom = -halfHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false); this.draw(); this.sync();
  }
  private draw() { if (this.host.clientWidth && this.host.clientHeight) this.renderer.render(this.scene, this.camera); }
  private sync = () => {
    // Read the current viewport on scroll/resize. IntersectionObserver can keep
    // stale root bounds across viewport changes in embedded browser previews.
    const rect = this.host.getBoundingClientRect();
    this.inView = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    const animate = this.inView && !document.hidden && !this.motion.matches && Boolean(this.host.clientWidth);
    this.host.dataset.motion = this.motion.matches ? "reduced" : animate ? "ambient" : "idle";
    if (!animate) {
      cancelAnimationFrame(this.raf); this.raf = 0;
      if (this.motion.matches) { this.rig.position.y = 0; this.rig.rotation.set(0, 0, 0); this.host.dataset.float = "0,0,0"; this.draw(); }
    } else if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  };
  private frame = (now: number) => {
    this.raf = 0; this.time += Math.min((now - this.last) / 1000, .05); this.last = now;
    this.rig.position.y = Math.sin(this.time * 1.05) * .09;
    this.rig.rotation.set(Math.sin(this.time * .67) * .04, Math.sin(this.time * .81) * .09, Math.sin(this.time * .63) * .065);
    this.host.dataset.float = [this.rig.position.y, this.rig.rotation.y, this.rig.rotation.z].map((v) => v.toFixed(5)).join(",");
    this.draw(); this.raf = requestAnimationFrame(this.frame);
  };
  dispose() {
    cancelAnimationFrame(this.raf); this.observer.disconnect();
    this.motion.removeEventListener("change", this.sync); document.removeEventListener("visibilitychange", this.sync);
    window.removeEventListener("scroll", this.sync); window.removeEventListener("resize", this.sync);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.grain.release(); this.environment.dispose(); this.pmrem.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
