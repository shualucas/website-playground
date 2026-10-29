import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { aboutMiniatures } from "../book/miniatures";
import { acquireClayGrain } from "../book/clay";
import { jellyFinish } from "../book/jelly-finish";

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
  private spinVelocity = new THREE.Vector2();
  private dragging = false;
  private lastInput = 0;
  private wobble = 0;
  private wobbleVelocity = 0;
  private readyLight = new THREE.Mesh(new THREE.SphereGeometry(.019, 12, 8), new THREE.MeshBasicMaterial({ color: "#3b0808", toneMapped: false }));
  private flashStart = -Infinity;
  private flashPoint = new THREE.Group();
  private flashLight = new THREE.PointLight("white", 0, 3);
  private flare: THREE.Sprite;
  private flareTexture: THREE.CanvasTexture;
  private flashProjection = new THREE.Vector3();
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
    const model = aboutMiniatures((params) => new THREE.MeshPhysicalMaterial(jellyFinish({
      ...params, normalMap: this.grain.normal, roughnessMap: this.grain.roughness,
    })), () => {}, true).camera;
    model.rotation.set(.18, -.35, -.13); this.rig.add(model); this.inspection.add(this.rig); this.scene.add(this.inspection);
    const bounds = new THREE.Box3().setFromObject(model);
    model.position.sub(bounds.getCenter(new THREE.Vector3())); bounds.getSize(this.size);
    const flareCanvas = document.createElement("canvas"); flareCanvas.width = flareCanvas.height = 64;
    const ctx = flareCanvas.getContext("2d")!, glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, "#fff"); glow.addColorStop(.12, "#fff"); glow.addColorStop(.4, "#ffffff80"); glow.addColorStop(1, "#ffffff00");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64); this.flareTexture = new THREE.CanvasTexture(flareCanvas);
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flareTexture, color: "white", transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.flare.visible = false; this.flashPoint.position.set(-.3, .66, .26); model.add(this.flashPoint); this.flashPoint.add(this.flare, this.flashLight);
    this.readyLight.position.set(.49, .49, .235); model.add(this.readyLight);
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
    if (this.dragging) {
      const now = performance.now(), dt = Math.max(.016, Math.min(.1, (now - this.lastInput) / 1000)); this.lastInput = now;
      this.spinVelocity.set(THREE.MathUtils.clamp(dy * .018 / dt, -4, 4), THREE.MathUtils.clamp(dx * .018 / dt, -4, 4));
      this.wobbleVelocity = Math.min(.4, this.wobbleVelocity + Math.hypot(dx, dy) * .001);
    }
    this.publishRotation(); if (!this.raf) this.draw();
  }
  beginDrag() { this.dragging = true; this.spinVelocity.set(0, 0); this.lastInput = performance.now(); }
  endDrag(momentum = true) {
    this.dragging = false;
    if (!momentum || this.motion.matches || performance.now() - this.lastInput > 250) this.spinVelocity.set(0, 0);
    this.sync();
  }
  private publishRotation() { this.host.dataset.rotation = this.inspection.rotation.toArray().slice(0, 3).join(","); }
  resetRotation() { this.spinVelocity.set(0, 0); this.inspection.rotation.set(0, 0, 0); this.publishRotation(); this.draw(); }
  prepareFlash() {
    this.scene.updateMatrixWorld(true); this.flashPoint.getWorldPosition(this.flashProjection).project(this.camera);
    const rect = this.host.getBoundingClientRect(), link = this.host.parentElement!;
    const x = (this.flashProjection.x + 1) / 2, y = (1 - this.flashProjection.y) / 2;
    link.style.setProperty("--flash-x", `${x * 100}%`); link.style.setProperty("--flash-y", `${y * 100}%`);
    this.readyLight.getWorldPosition(this.flashProjection).project(this.camera);
    link.style.setProperty("--ready-x", `${(this.flashProjection.x + 1) * 50}%`);
    link.style.setProperty("--ready-y", `${(1 - this.flashProjection.y) * 50}%`);
    this.readyLight.material.color.set("#ff2525"); this.readyLight.scale.setScalar(1.6); this.draw();
    return { x: rect.left + x * rect.width, y: rect.top + y * rect.height };
  }
  flash() {
    if (this.motion.matches) return;
    this.scene.updateMatrixWorld(true); this.flashPoint.getWorldPosition(this.flashProjection).project(this.camera);
    const link = this.host.parentElement!;
    link.style.setProperty("--flash-x", `${(this.flashProjection.x + 1) * 50}%`);
    link.style.setProperty("--flash-y", `${(1 - this.flashProjection.y) * 50}%`);
    this.readyLight.material.color.set("#3b0808"); this.readyLight.scale.setScalar(1);
    this.flashStart = performance.now(); this.flare.visible = true; this.flare.scale.setScalar(.15); this.flashLight.intensity = 6; this.draw(); this.sync();
  }
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
      this.spinVelocity.set(0, 0); this.wobble = this.wobbleVelocity = 0; this.host.dataset.coasting = "false"; this.flare.visible = false; this.flashLight.intensity = 0;
      if (this.motion.matches) { this.rig.position.y = 0; this.rig.rotation.set(0, 0, 0); this.rig.scale.setScalar(1); this.host.dataset.float = "0,0,0"; this.draw(); }
    } else if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  };
  private frame = (now: number) => {
    this.raf = 0; const dt = Math.min((now - this.last) / 1000, .05); this.time += dt; this.last = now;
    if (!this.dragging && this.spinVelocity.lengthSq() > .0001) {
      const decay = Math.exp(-6 * dt);
      this.inspection.rotation.x += this.spinVelocity.x * (1 - decay) / 6;
      this.inspection.rotation.y += this.spinVelocity.y * (1 - decay) / 6;
      this.spinVelocity.multiplyScalar(decay); this.publishRotation();
    } else if (!this.dragging) this.spinVelocity.set(0, 0);
    this.host.dataset.coasting = String(!this.dragging && this.spinVelocity.lengthSq() > .0001);
    for (let i = 0; i < 4; i++) { this.wobbleVelocity += (-196 * this.wobble - 14 * this.wobbleVelocity) * dt / 4; this.wobble += this.wobbleVelocity * dt / 4; }
    const stretch = 1 + THREE.MathUtils.clamp(this.wobble, -.035, .035); this.rig.scale.set(stretch, 1 / stretch, 1);
    const flash = (now - this.flashStart) / 180, strength = flash >= 0 && flash < 1 ? Math.sin(Math.PI * flash) : 0;
    this.flare.visible = strength > 0; this.flare.material.opacity = strength; this.flare.scale.setScalar(strength > 0 ? .15 + flash * .8 : .15); this.flashLight.intensity = strength * 6;
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
    this.flare.material.dispose(); this.flareTexture.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
