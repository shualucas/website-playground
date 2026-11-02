import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { cartridgeModel, cartridges, type CartridgeId } from "./config";
import { loadExternalShell, makeCartridge } from "./model";
import { applyCartridgeTheme } from "./cartridge-theme";
import { makeBounds, updateBounds, Separation, type RigidBounds } from "./separation";

type Callbacks = {
  onHover: (id: CartridgeId | null) => void;
  onSelect: (id: CartridgeId | null) => void;
  onReady: () => void;
  onError: () => void;
};
type Item = {
  id: CartridgeId; root: THREE.Group; idle: THREE.Group; handling: THREE.Group; hitbox: THREE.Mesh;
  half: THREE.Vector3; center: THREE.Vector3; bounds: RigidBounds; spin: THREE.Vector2; angle: THREE.Euler;
  target: THREE.Vector3; targetAngle: THREE.Vector3; velocity: THREE.Vector3; angularVelocity: THREE.Vector3; wait: number;
};
const MOBILE_PITCH = 80 * Math.PI / 180;
const DESKTOP_PITCH = 72 * Math.PI / 180;
// Local +Y is the cartridge's top, +Z its printed front. Positive pitch exposes
// the top edge to a long-lens camera on +Z; it does not lay the faces flat.

const ROLLS = [-.018, .018, -.016, .018];
const YAWS = [-.025, .018, -.018, .025];
const SHIFTS = [.17, -.17, .17, -.17];
const COMPONENTS = ["x", "y", "z"] as const;


/** Tilted, top-edge-first stack; rigid shells, interruptible springs, one clock. */
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
  private topPoint = new THREE.Vector3();
  private bottomPoint = new THREE.Vector3();
  private selected: CartridgeId | null = null;
  private hovered: CartridgeId | null = null;
  private hoverContact = new THREE.Vector2();
  private hoverLocal = new THREE.Vector3();
  private swipeDirection = 0;
  private swipeStrength = 0;
  private lastPointerAt = 0;
  private contactPivot = new THREE.Vector3();
  private rotatedPivot = new THREE.Vector3();
  private pointerClient = new THREE.Vector2();
  private pointerBrowsing = false;
  private pickRect: DOMRect | null = null;
  private hitboxes: THREE.Object3D[] = [];
  private hits: THREE.Intersection[] = [];
  private drag: { id: number; item: Item; x: number; y: number; startX: number; startY: number; moved: boolean; canRotate: boolean } | null = null;
  private raf = 0;
  private last = 0;
  private entranceTime = 0;
  private disposed = false;
  private paused = false;
  private entering = true;
  private captionX = 0;
  private captionY = 0;
  private captionWidth = 260;
  private captionHeight = 48;
  private ambientTime = 0;
  private inView = true;
  private mobile = false;
  private grain: THREE.CanvasTexture;
  private shadowMaterial = new THREE.ShadowMaterial({ opacity: .085, depthWrite: false });
  private key = new THREE.DirectionalLight("#fffefb", .85);
  private separation = new Separation();
  private correction = new THREE.Vector3();
  private cleanup = new Set<THREE.Texture>();
  private extentRotation = new THREE.Matrix4();
  private stackAxis = new THREE.Vector3(0, -Math.sin(DESKTOP_PITCH), Math.cos(DESKTOP_PITCH));
  private get pitch() { return this.mobile ? MOBILE_PITCH : DESKTOP_PITCH; }
  private getRoll(i: number) { return this.mobile ? (i % 2 ? -.008 : .008) : ROLLS[i]; }
  private dark = false;
  private backdrop = new THREE.Color("#f0f0f0");

  constructor(private host: HTMLElement, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    // Tinted plastic uses a shared reduced-resolution refraction buffer.
    this.renderer.transmissionResolutionScale = .5;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.setClearColor(this.backdrop, 0);
    this.renderer.domElement.setAttribute("aria-hidden", "true"); host.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 0, 68); this.camera.lookAt(0, 0, 0);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment(); this.environment = this.pmrem.fromScene(room, .045); room.dispose();
    this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .65;
    this.scene.environmentRotation.set(.32, .34, 0);
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#d6d3cd", .35));
    const key = this.key; key.position.set(-1.1, 2.5, 45); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 10; key.shadow.blurSamples = 8;
    key.shadow.bias = -.00015; key.shadow.normalBias = .025;
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 8, bottom: -8, near: 1, far: 65 });
    this.scene.add(key);
    // A single receiver behind the stack captures actual changing silhouettes.
    // A distant, broad key keeps displacement short; VSM softens the penumbra.
    const receiver = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), this.shadowMaterial);
    receiver.name = "shared soft shadow receiver"; receiver.position.z = -2.6; receiver.receiveShadow = true; this.scene.add(receiver);
    this.grain = this.makeGrain(); this.cleanup.add(this.grain);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
    host.addEventListener("pointerdown", this.down); host.addEventListener("pointermove", this.move);
    host.addEventListener("pointerup", this.up); host.addEventListener("pointercancel", this.cancel);
    host.addEventListener("lostpointercapture", this.cancel); host.addEventListener("pointerleave", this.leave);
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost);
    window.addEventListener("scroll", this.viewport, { passive: true });
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
  private refreshBounds(item: Item) {
    item.root.updateWorldMatrix(true, false); item.handling.updateWorldMatrix(true, false);
    updateBounds(item.bounds, item.center, item.half, item.handling.matrixWorld);
  }
  private verticalExtent(box: RigidBounds) {
    return Math.abs(box.axes[0].y) * box.half.x + Math.abs(box.axes[1].y) * box.half.y + Math.abs(box.axes[2].y) * box.half.z;
  }
  private keepSeparated() {
    let corrected = false;
    for (const item of this.items) this.refreshBounds(item);
    // Four bodies need only a small bounded solver; this is separation, not a full physics simulation.
    for (let pass = 0; pass < 12; pass++) {
      let changed = false;
      for (let i = 0; i < this.items.length; i++) for (let j = i + 1; j < this.items.length; j++) {
        const a = this.items[i], b = this.items[j];
        this.separation.correction(a.bounds, b.bounds, this.correction);
        const intersects = this.correction.lengthSq() >= 1e-10;
        if (!intersects && a.bounds.center.y > b.bounds.center.y + .02) continue;
        // A minimum SAT translation can exchange two slots through depth and
        // strand their springs on opposite sides. Keep the original Y order.
        const gap = intersects ? this.verticalExtent(a.bounds) + this.verticalExtent(b.bounds) + .003 : .03;
        this.correction.set(0, -Math.max(.003, gap - (a.bounds.center.y - b.bounds.center.y)), 0);
        const weightA = a.id === this.selected ? 0 : b.id === this.selected ? 1 : .5;
        a.root.position.addScaledVector(this.correction, -weightA);
        b.root.position.addScaledVector(this.correction, 1 - weightA);
        // Leave depth momentum intact so the shells can reach their clear slots.
        if (weightA) a.velocity.y = 0;
        if (weightA !== 1) b.velocity.y = 0;
        this.refreshBounds(a); this.refreshBounds(b); changed = corrected = true;
      }
      if (!changed) break;
    }
    let intersections = 0;
    for (let i = 0; i < this.items.length; i++) for (let j = i + 1; j < this.items.length; j++) {
      if (this.separation.correction(this.items[i].bounds, this.items[j].bounds, this.correction).lengthSq() > 1e-8) intersections++;
    }
    this.host.dataset.intersections = String(intersections);
    return corrected;
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
        const config = cartridges[i], model = await loadExternalShell(maps[i], config.shell, this.grain, config.finish, config.id === "gmail") ?? makeCartridge(config.shell, maps[i], this.grain);
        if (this.disposed) { this.disposeObject(model); return; }
        const modelBounds = new THREE.Box3().setFromObject(model);
        const half = modelBounds.getSize(new THREE.Vector3()).multiplyScalar(.5), center = modelBounds.getCenter(new THREE.Vector3());
        const root = new THREE.Group(), idle = new THREE.Group(), handling = new THREE.Group(); handling.add(model); idle.add(handling); root.add(idle);
        const hitbox = new THREE.Mesh(new THREE.BoxGeometry(half.x * 2, half.y * 2, half.z * 2), new THREE.MeshBasicMaterial({ visible: false }));
        hitbox.position.copy(center); hitbox.userData.cartridgeId = config.id; idle.add(hitbox); this.scene.add(root);
        this.hitboxes.push(hitbox);
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            object.castShadow = !object.userData.label && object.name !== "Label" && materials.some((m) => m.visible && !((m as THREE.MeshPhysicalMaterial).transmission > .05)); object.receiveShadow = Boolean(object.userData.label || object.name === "Label");
          }
        });
        applyCartridgeTheme(model,this.dark);
        this.items.push({ id: config.id, root, idle, handling, hitbox, half, center, bounds: makeBounds(), spin: new THREE.Vector2(), angle: new THREE.Euler(), target: new THREE.Vector3(), targetAngle: new THREE.Vector3(), velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), wait: 0 });
      }
      this.resize();
      for (const item of this.items) {
        item.root.position.copy(item.target); item.root.rotation.set(item.targetAngle.x, item.targetAngle.y, item.targetAngle.z);
        if (!this.motion.matches) { item.root.position.y += 3.2; item.root.rotation.x -= .95; }
      }
      this.host.dataset.model = cartridgeModel.url ? "external-glb" : "original-procedural";
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.disposed) return;
      this.entranceTime = 0; this.host.dataset.ready = "true"; this.callbacks.onReady(); this.start();
    } catch (error) { if (!this.disposed) { console.error("Cartridge scene could not prepare", error); this.callbacks.onError(); } }
  }
  /** Bounds projected along the stack normal keep neighboring closed shells disjoint. */
  private stackExtent(item: Item, i: number) {
    this.extentRotation.makeRotationFromEuler(item.angle.set(this.pitch, YAWS[i], this.getRoll(i)));
    const e = this.extentRotation.elements, h = item.half;
    return 2 * (Math.abs(this.stackAxis.x * e[0] + this.stackAxis.y * e[1] + this.stackAxis.z * e[2]) * h.x + Math.abs(this.stackAxis.x * e[4] + this.stackAxis.y * e[5] + this.stackAxis.z * e[6]) * h.y + Math.abs(this.stackAxis.x * e[8] + this.stackAxis.y * e[9] + this.stackAxis.z * e[10]) * h.z);
  }
  private layout() {
    this.host.dataset.settled = "false";
    const active = this.items.findIndex((item) => item.id === this.selected);
    const centerY = this.mobile ? .35 : .32;
    const heights = this.items.map((item, i) => {
      if (i !== active) return (this.stackExtent(item, i) + (this.mobile ? .12 : .10)) / Math.abs(this.stackAxis.y);
      // Fit the selected orientation instead of reserving an entire sphere.
      // The lower allowance holds the caption; rotation can widen the slot.
      this.extentRotation.makeRotationFromEuler(item.angle.set(item.spin.x, YAWS[i] + item.spin.y, this.getRoll(i)));
      const e = this.extentRotation.elements, h = item.half;
      return 2 * (Math.abs(e[1]) * h.x + Math.abs(e[5]) * h.y + Math.abs(e[9]) * h.z + item.center.length()) + .78;
    });
    let cursor = heights.reduce((sum, h) => sum + h, 0) / 2 + (active < 0 ? centerY : 0);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const y = cursor - heights[i] / 2 + (i === active ? .21 : 0); cursor -= heights[i];
      const centeredY = y - (active < 0 ? centerY : 0);
      item.target.set(i === active ? 0 : SHIFTS[i] * (this.mobile ? .25 : 1), y, i === active ? 1.8 : -.3 + centeredY * this.stackAxis.z / this.stackAxis.y);
      item.targetAngle.set(i === active ? 0 : this.pitch, YAWS[i], this.getRoll(i));
      if (i === active) { item.targetAngle.x += item.spin.x; item.targetAngle.y += item.spin.y; }
    }
    // Keep the inspected shell centered at the enlarged scale. Its neighbors
    // yield above/below and may leave the viewport, as in the reference.
    if (active >= 0) {
      const offset = this.items[active].target.y;
      for (const item of this.items) item.target.y -= offset;
    }
    this.host.dataset.composition = this.mobile ? "stack-mobile" : "zigzag-stack";
    this.host.dataset.selected = this.selected ?? "";
    // Caption belongs to the layout, not the animated shell's bounds. Use the
    // same front-facing envelope for every selection; drag/idle cannot move it.
    const halfHeight = Math.max(0, ...this.items.map((item) => item.half.y + Math.abs(item.center.y)));
    const halfDepth = Math.max(0, ...this.items.map((item) => item.half.z + Math.abs(item.center.z)));
    this.projected.set(0, -halfHeight, 1.8 + halfDepth).project(this.camera);
    this.captionX = (1 + this.projected.x) * this.host.clientWidth / 2;
    this.captionY = (1 - this.projected.y) * this.host.clientHeight / 2 + 12;
    this.host.style.setProperty("--caption-x", `${this.captionX}px`);
    this.host.style.setProperty("--caption-y", `${this.captionY}px`);
    // The canvas fades before the end of the virtual stage. Reserve the complete
    // two-line DOM caption beyond that fade, including on the stacked layout.
    const trim=parseFloat(getComputedStyle(this.host).getPropertyValue("--hero-trim"))||0;
    const captionBottom=this.captionY+Math.max(48,this.captionHeight)+12;
    const captionRoom=Math.min(trim,Math.max(0,Math.ceil(captionBottom-(this.host.clientHeight-trim))));
    this.host.closest<HTMLElement>(".collection")?.style.setProperty("--caption-room",`${captionRoom}px`);
    // Reserve the actual text rectangle in screen space. Only lower neighbors
    // yield, and only by the missing clearance; camera/selected shell stay fixed.
    let clearance = 0;
    const lowerEdge = 1 - 2 * (this.captionY + this.captionHeight + 12) / this.host.clientHeight;
    for (let i = active + 1; active >= 0 && i < this.items.length; i++) {
      const item = this.items[i];
      this.extentRotation.makeRotationFromEuler(item.angle.set(item.targetAngle.x, item.targetAngle.y, item.targetAngle.z)).setPosition(item.target);
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        this.projected.copy(item.center).add(this.topPoint.set(x * item.half.x, y * item.half.y, z * item.half.z)).applyMatrix4(this.extentRotation);
        this.bottomPoint.copy(this.projected).project(this.camera);
        this.bottomPoint.y = lowerEdge;
        this.bottomPoint.unproject(this.camera);
        clearance = Math.max(clearance, this.projected.y - this.bottomPoint.y);
      }
    }
    if (clearance > 0) for (let i = active + 1; i < this.items.length; i++) this.items[i].target.y -= clearance;
  }
  private measureCaption() {
    // Selection/resize only: pointer dragging and GPU frames reuse these sizes.
    const caption = this.host.querySelector<HTMLElement>(".cartridge-caption");
    this.captionWidth = caption?.offsetWidth || 260;
    this.captionHeight = caption?.offsetHeight || 48;
  }
  setSelected(id: CartridgeId | null) {
    if (id !== this.selected) {
      this.host.dataset.captionReady = "false";
      // Early input takes over from the exact current entry pose, without a snap.
      if (this.host.dataset.ready === "true") this.entranceTime = Math.max(2, this.entranceTime);
      const active = this.items.findIndex((item) => item.id === id);
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].spin.set(0, 0);
        this.items[i].wait = i === active ? 0 : .025 + Math.min(3, Math.abs(i - active)) * .012;
      }
    }
    this.selected = id; this.measureCaption(); this.layout(); this.start();
  }
  setHovered(id: CartridgeId | null) {
    // A keyboard focus change takes over from the last physical pointer contact.
    if(id!==this.hovered){this.pointerBrowsing=false;this.hoverContact.set(0,0);this.swipeDirection=this.swipeStrength=this.lastPointerAt=0;this.host.dataset.swipeDirection="none";this.hovered=id;this.host.dataset.hovered=id??""}
    this.start();
  }
  setPaused(value: boolean) { this.paused = value; if (value) {this.pointerBrowsing=false;this.stop()} else this.start(); }
  setTheme(dark: boolean) {
    this.dark=dark;applyCartridgeTheme(this.scene,dark);this.host.dataset.shellTheme=dark?"dark":"light";
    this.backdrop.set(dark ? "#101110" : "#f0f0f0"); this.renderer.setClearColor(this.backdrop, 0);
    this.shadowMaterial.opacity = dark ? .2 : .085; this.start();
  }
  reset() { for (const item of this.items) item.spin.set(0, 0); this.layout(); this.start(); }
  private resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight; if (!width || !height) return;
    this.mobile = innerWidth < 880; this.camera.aspect = width / height;
    this.stackAxis.set(0, -Math.sin(this.pitch), Math.cos(this.pitch));
    // Give the four-object desktop fan a compact, stable inspection size.
    // Selection/drag never alters the camera or its zoom.
    const span = 17.2;
    this.camera.zoom = this.mobile ? .9 * .75 * Math.min(4, span * this.camera.aspect / 3.2) : Math.min(2.4, span * this.camera.aspect / 2.95);
    const distance = span / (2 * Math.tan(7 * Math.PI / 180));
    this.camera.position.set(0, 0, distance);
    // Preserve depth precision for the recessed paper and shell seam. A near
    // plane at .1 wastes precision when this long lens sits ~70 units away.
    this.camera.near = Math.max(.1, distance - 12); this.camera.far = distance + 12;
    this.camera.lookAt(0, 0, 0);
    this.host.dataset.view = "tilted-top-edge"; this.host.dataset.restPitch = String(Math.round(this.pitch * 180 / Math.PI)); this.host.dataset.magnification = String(this.camera.zoom); this.host.dataset.shadow = "soft-silhouette";
    this.host.dataset.order = cartridges.map((item) => item.id).join(",");
    this.camera.clearViewOffset();this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
    if(this.mobile&&this.items.length){
      let left=Infinity;
      for(let i=0;i<this.items.length;i++){
        const item=this.items[i];
        this.extentRotation.makeRotationFromEuler(item.angle.set(this.pitch,YAWS[i],this.getRoll(i))).setPosition(SHIFTS[i]*.25,.35,0);
        for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
          this.projected.copy(item.center).add(this.topPoint.set(x*item.half.x,y*item.half.y,z*item.half.z)).applyMatrix4(this.extentRotation).project(this.camera);
          left=Math.min(left,(this.projected.x+1)*width/2);
        }
      }
      // Fixed optical offset, measured from the resting stack. Dragging never refits it.
      this.camera.setViewOffset(width,height,Math.max(0,left-12),0,width,height);
    }
    this.renderer.setSize(width, height, false); this.measureCaption(); this.layout(); this.viewport(); this.start();
  }
  private pick(event: PointerEvent) {
    this.pickRect=this.host.getBoundingClientRect();
    const hit = this.raycast(event.clientX,event.clientY)[0];
    return hit ? this.items.find((item) => item.id === hit.object.userData.cartridgeId) ?? null : null;
  }
  private raycast(x:number,y:number) {
    const rect=this.pickRect!;
    this.pointer.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
    this.ray.setFromCamera(this.pointer, this.camera);
    this.hits.length=0;this.ray.intersectObjects(this.hitboxes,false,this.hits);return this.hits;
  }
  private browse() {
    if(!this.pointerBrowsing||this.drag||!this.pickRect)return false;
    const hit=this.raycast(this.pointerClient.x,this.pointerClient.y)[0];
    // Closed members respond only on their exposed local +Y top surface.
    // Use the resting hitbox so the tiny contact response cannot flicker itself off.
    const item=hit&&(hit.object.userData.cartridgeId===this.selected||(hit.face?.normal.y??0)>.9)
      ?this.items.find(item=>item.id===hit.object.userData.cartridgeId):null;
    if(item&&hit){
      this.hoverLocal.copy(hit.point);item.hitbox.worldToLocal(this.hoverLocal);
      this.hoverContact.set(THREE.MathUtils.clamp(this.hoverLocal.x/item.half.x,-1,1),THREE.MathUtils.clamp(this.hoverLocal.z/item.half.z,-1,1));
    }
    const id=item?.id??null,changed=id!==this.hovered;
    if(changed){this.hovered=id;this.callbacks.onHover(id)}
    this.host.dataset.hovered=id??"";
    this.host.dataset.hoverContact=id?`${this.hoverContact.x.toFixed(3)},${this.hoverContact.y.toFixed(3)}`:"";
    this.host.style.cursor=id?id===this.selected?"grab":"pointer":"default";
    return changed;
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
    if(!this.drag&&event.pointerType!=="touch"){
      const dy=this.lastPointerAt?event.clientY-this.pointerClient.y:event.movementY;
      const elapsed=this.lastPointerAt?Math.max(8,event.timeStamp-this.lastPointerAt):16;
      if(Math.abs(dy)>.35){this.swipeDirection=dy>0?1:-1;this.swipeStrength=Math.min(1,Math.abs(dy)/elapsed)}
      this.lastPointerAt=event.timeStamp;
      this.host.dataset.swipeDirection=this.swipeDirection<0?"up":this.swipeDirection>0?"down":"none";
    }
    this.pointerClient.set(event.clientX,event.clientY);
    if (this.drag && this.drag.id === event.pointerId) {
      const d = this.drag;
      if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 7) d.moved = true;
      if (d.moved && d.canRotate) {
        d.item.spin.y += (event.clientX - d.x) * .013; d.item.spin.x += (event.clientY - d.y) * .013;
        this.layout(); this.host.dataset.dragging = "true"; this.host.style.cursor = "grabbing";
      }
      d.x = event.clientX; d.y = event.clientY;
    } else {
      if(event.target!==this.renderer.domElement||event.pointerType==="touch"){this.leave();return}
      this.pointerClient.set(event.clientX,event.clientY);this.pickRect=this.host.getBoundingClientRect();this.pointerBrowsing=true;this.browse();
    }
    this.start();
  };
  private up = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const d = this.drag; this.drag = null; this.host.dataset.dragging = "false";
    if (this.host.hasPointerCapture(event.pointerId)) this.host.releasePointerCapture(event.pointerId);
    this.pointerClient.set(event.clientX,event.clientY);
    this.pointerBrowsing=event.pointerType!=="touch"&&document.elementFromPoint(event.clientX,event.clientY)===this.renderer.domElement;
    if (!d.moved && !this.paused) this.callbacks.onSelect(this.selected === d.item.id ? null : d.item.id);
    this.start();
  };
  private cancel = () => { if(!this.drag)return;this.drag = null;this.host.dataset.dragging = "false";this.leave(); };
  private leave = () => { if (!this.drag) { this.pointerBrowsing=false;this.hovered = null;this.lastPointerAt=0;this.swipeDirection=this.swipeStrength=0;this.host.dataset.swipeDirection="none";this.host.dataset.hovered="";this.host.dataset.hoverContact="";this.host.style.cursor="default";this.callbacks.onHover(null);this.start(); } };
  private contextLost = (event: Event) => { event.preventDefault(); this.stop(); this.callbacks.onError(); };
  private viewport = () => { const rect = this.host.getBoundingClientRect();this.pickRect=rect;this.inView = rect.bottom > 0 && rect.top < innerHeight; if (this.inView) this.start(); else this.stop(); };
  private visibility = () => { if (document.hidden) this.stop(); else this.start(); };
  private preference = () => { this.start(); };
  private start() {
    if (this.raf || this.disposed || this.paused || document.hidden || !this.inView || !this.items.length) return;
    this.last = performance.now(); this.raf = requestAnimationFrame(this.frame);
  }
  private stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  private frame = (now: number) => {
    this.raf = 0; if (this.disposed || this.paused || document.hidden) return;
    // Preserve wall-clock timing on slower GPUs. The spring loop below uses
    // <=8ms integration steps, so catching up does not destabilize the motion.
    const dt = Math.min((now - this.last) / 1000, .25); this.last = now; this.ambientTime += dt;
    const reduced = this.motion.matches, blend = reduced ? 1 : 1 - Math.exp(-13 * dt);
    this.entranceTime = reduced ? 2 : this.entranceTime + dt;
    let unsettled = false;
    this.entering = false;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i], { root, handling, target, targetAngle, velocity, angularVelocity } = item;
      const progress = reduced ? 1 : THREE.MathUtils.clamp((this.entranceTime - (this.items.length - 1 - i) * .12) / .85, 0, 1);
      const entrance = 3.2 * (1 - progress) ** 3;
      const turnEntrance = -.95 * (1 - Math.min(1, progress / 1.25)) ** 3;
      if (progress < 1) this.entering = true;
      item.wait = reduced ? 0 : Math.max(0, item.wait - dt);
      const isSelected = this.selected === item.id;
      // Position and angle retain independent velocities when selection changes.
      const steps = Math.max(1, Math.ceil(dt / .008)), step = dt / steps;
      for (let j = 0; j < steps; j++) for (const axis of COMPONENTS) {
        const destination = target[axis] + (axis === "y" ? entrance : 0);
        if (reduced || progress < 1) { root.position[axis] = destination; velocity[axis] = 0; }
        else if (!item.wait) {
          const stiffness = axis === "z" ? 360 : isSelected ? 290 : 220;
          const damping = axis === "z" ? 36 : 29;
          velocity[axis] += ((destination - root.position[axis]) * stiffness - velocity[axis] * damping) * step;
          root.position[axis] += velocity[axis] * step;
        }
        const angle = targetAngle[axis] + (axis === "x" && progress < 1 ? turnEntrance : 0);
        if (reduced || progress < 1) { root.rotation[axis] = angle; angularVelocity[axis] = 0; }
        else {
          angularVelocity[axis] += ((angle - root.rotation[axis]) * (isSelected ? 230 : 280) - angularVelocity[axis] * (isSelected ? 27 : 29)) * step;
          root.rotation[axis] += angularVelocity[axis] * step;
        }
      }
      const drifting = isSelected && !reduced && !this.drag;
      item.idle.position.y = THREE.MathUtils.lerp(item.idle.position.y, drifting ? Math.sin(this.ambientTime * .7) * .025 : 0, blend);
      item.idle.rotation.x = THREE.MathUtils.lerp(item.idle.rotation.x, drifting ? Math.sin(this.ambientTime * .49) * .012 : 0, blend);
      item.idle.rotation.y = THREE.MathUtils.lerp(item.idle.rotation.y, drifting ? Math.sin(this.ambientTime * .43) * .025 : 0, blend);
      item.idle.rotation.z = THREE.MathUtils.lerp(item.idle.rotation.z, drifting ? Math.sin(this.ambientTime * .61) * .012 : 0, blend);
      this.host.dataset[`drift${i}`] = [item.idle.position.y, item.idle.rotation.y].join(",");
      const hover = this.hovered === item.id && !reduced && !this.drag;
      const contactPitch=hover?(this.swipeDirection||-1)*(.021+this.swipeStrength*.011)+this.hoverContact.y*.002:0,contactYaw=hover?-this.hoverContact.x*.025:0;
      handling.rotation.x = THREE.MathUtils.lerp(handling.rotation.x,contactPitch,blend);
      handling.rotation.y = THREE.MathUtils.lerp(handling.rotation.y,contactYaw,blend);
      // Keep the lower edge anchored; the contacted top does the moving.
      this.contactPivot.copy(item.center);this.contactPivot.y-=item.half.y;
      this.rotatedPivot.copy(this.contactPivot).applyEuler(handling.rotation);
      handling.position.copy(this.contactPivot).sub(this.rotatedPivot);
      const bottomMotion=this.rotatedPivot.copy(this.contactPivot).applyEuler(handling.rotation).add(handling.position).distanceTo(this.contactPivot);
      this.contactPivot.y+=item.half.y*2;
      const topMotion=this.rotatedPivot.copy(this.contactPivot).applyEuler(handling.rotation).add(handling.position).distanceTo(this.contactPivot);
      this.host.dataset[`contactMotion${i}`]=`${bottomMotion.toFixed(6)},${topMotion.toFixed(6)}`;
      this.host.dataset[`contactPose${i}`]=`${handling.position.z.toFixed(4)},${handling.rotation.x.toFixed(4)},${handling.rotation.y.toFixed(4)}`;
      const difference = root.position.distanceToSquared(target) + velocity.lengthSq() + angularVelocity.lengthSq() + Math.abs(root.rotation.x - targetAngle.x) + Math.abs(root.rotation.y - targetAngle.y) + Math.abs(root.rotation.z - targetAngle.z) + Math.abs(handling.rotation.x-contactPitch) + Math.abs(handling.rotation.y-contactYaw);
      if (difference > .00001) unsettled = true;
      else { root.position.copy(target); velocity.set(0, 0, 0); angularVelocity.set(0, 0, 0); root.rotation.set(targetAngle.x, targetAngle.y, targetAngle.z); }
      this.host.dataset[`rotation${i}`] = root.rotation.toArray().slice(0, 3).join(",");
    }
    const corrected = this.keepSeparated();
    if (corrected) unsettled = true;
    this.renderer.render(this.scene, this.camera);
    if(this.browse())unsettled=true;
    if (this.host.dataset.rendered !== "true") this.host.dataset.rendered = "true";
    const frameBounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    const captionLeft = this.captionX - this.captionWidth / 2 - 6;
    const captionRight = this.captionX + this.captionWidth / 2 + 6;
    let captionClear = Boolean(this.selected);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      let itemBottom = -Infinity;
      let itemLeft = Infinity, itemRight = -Infinity, itemTop = Infinity;
      this.host.dataset[`position${i}`] = item.root.position.toArray().join(",");
      this.host.dataset[`frontUp${i}`] = item.bounds.axes[2].y.toFixed(4);
      this.host.dataset[`frontFacing${i}`] = item.bounds.axes[2].z.toFixed(4);
      this.topPoint.set(0, item.half.y, item.half.z).applyMatrix4(item.root.matrixWorld);
      this.bottomPoint.set(0, -item.half.y, item.half.z).applyMatrix4(item.root.matrixWorld);
      this.host.dataset[`topNear${i}`] = String(this.topPoint.distanceToSquared(this.camera.position) < this.bottomPoint.distanceToSquared(this.camera.position));
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        this.projected.copy(item.center).addScaledVector(this.topPoint.set(x * item.half.x, y * item.half.y, z * item.half.z), 1).applyMatrix4(item.handling.matrixWorld).project(this.camera);
        const px = (this.projected.x + 1) * this.host.clientWidth / 2, py = (1 - this.projected.y) * this.host.clientHeight / 2;
        itemBottom = Math.max(itemBottom, py);
        itemLeft = Math.min(itemLeft, px); itemRight = Math.max(itemRight, px); itemTop = Math.min(itemTop, py);
        frameBounds.left = Math.min(frameBounds.left, px); frameBounds.right = Math.max(frameBounds.right, px);
        frameBounds.top = Math.min(frameBounds.top, py); frameBounds.bottom = Math.max(frameBounds.bottom, py);
      }
      this.host.dataset[`frame${i}`] = JSON.stringify({ left: itemLeft, top: itemTop, right: itemRight, bottom: itemBottom });
      // Reveal as soon as the fixed text area clears, while the stack is still moving.
      // Neighbors may sweep through this space during interrupted selections.
      if (itemRight > captionLeft && itemLeft < captionRight && itemBottom > this.captionY - 2 && itemTop < this.captionY + this.captionHeight + 6) captionClear = false;
      // The exposed top edge is the click target for a closed stack member.
      this.projected.set(0, item.id !== this.selected ? item.half.y - .02 : 0, item.half.z).applyMatrix4(item.root.matrixWorld).project(this.camera);
      const point = { x: (this.projected.x + 1) * this.host.clientWidth / 2, y: (1 - this.projected.y) * this.host.clientHeight / 2 };
      this.host.dataset[`hit${i}`] = JSON.stringify(point);
      const browsePoints=[];
      for(const x of [-.65,0,.65]){
        this.projected.set(x*item.half.x,item.half.y,0).applyMatrix4(item.hitbox.matrixWorld).project(this.camera);
        browsePoints.push({x:(this.projected.x+1)*this.host.clientWidth/2,y:(1-this.projected.y)*this.host.clientHeight/2});
      }
      this.host.dataset[`browse${i}`]=JSON.stringify(browsePoints);
      const swipeStrip=[];
      for(const z of [-.55,.55]){
        this.projected.set(0,item.half.y,z*item.half.z).applyMatrix4(item.hitbox.matrixWorld).project(this.camera);
        swipeStrip.push({x:(this.projected.x+1)*this.host.clientWidth/2,y:(1-this.projected.y)*this.host.clientHeight/2});
      }
      this.host.dataset[`swipeStrip${i}`]=JSON.stringify(swipeStrip.sort((a,b)=>a.y-b.y));
      this.host.style.setProperty(`--hit-${i}-x`, `${THREE.MathUtils.clamp(point.x, 22, this.host.clientWidth - 22)}px`);
      this.host.style.setProperty(`--hit-${i}-y`, `${THREE.MathUtils.clamp(point.y, 22, this.host.clientHeight - 22)}px`);
      if (item.id === this.selected) {
        this.host.dataset.selectedFrame = JSON.stringify({ left: itemLeft, top: itemTop, right: itemRight, bottom: itemBottom });
      }
    }
    const captionReady = captionClear;
    if (this.host.dataset.captionReady !== String(captionReady)) this.host.dataset.captionReady = String(captionReady);
    if (!this.selected) delete this.host.dataset.selectedFrame;
    this.host.dataset.frameBounds = JSON.stringify(frameBounds);
    this.host.dataset.entrance = this.entering ? "entering" : "complete";
    this.host.dataset.settled = !unsettled && !this.entering ? "true" : "false";
    if (unsettled || this.entering || this.drag || (this.selected && !reduced && this.inView)) this.raf = requestAnimationFrame(this.frame);
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
    window.removeEventListener("scroll", this.viewport);
    document.removeEventListener("visibilitychange", this.visibility); this.motion.removeEventListener("change", this.preference);
    this.disposeObject(this.scene); for (const t of this.cleanup) t.dispose();
    this.key.shadow.dispose(); this.environment.dispose(); this.pmrem.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
