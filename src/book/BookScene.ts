import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import { studioEnvironment, surfaceDetail } from "./surfaces";
import { contactShadow, softenShadowEdges } from "./effects";
import { createBinding } from "./binding";
import { AsciiPortal } from "./ascii";
import { PagePopups } from "./popups";
import { projectTheme } from "./themes";
import { measureTurnEnvelope, fitTurnEnvelope, FRAME_MARGIN } from "./framing";
import { advancePaperFlex } from "./paper-flex";
import {
  createLeafGeometry,
  LEAF_RADIUS,
  LEAF_GAP,
  SkinnedLeaf,
  type PaperMaterial,
} from "./leaf";
import { TurnScheduler } from "./turn-scheduler";
import {
  PAGE_WIDTH as W,
  PAGE_HEIGHT as H,
  coverTexture,
  pageTexture,
  blankPageCanvas,
  applyRisoPrint,
  paperTexture,
  type Project,
} from "./materials";

const INTRO_DURATION = 0.85;
// Keep the overhead shadow within the scene and below every rotated leaf.
const SHADOW_DISTANCE = 1;
// Centering a partially opened cover adds a small offset to the leaf-local bounds.
const SCENE_RADIUS = LEAF_RADIUS + 0.22;
const clamp = THREE.MathUtils.clamp;
type Phase =
  | "arriving"
  | "opening"
  | "flipping"
  | "settling"
  | "ready"
  | "rotating"
  | "turning"
  | "closing";
type Callbacks = {
  projects: Project[];
  onPhase: (phase: Phase) => void;
  onIndex: (index: number) => void;
  onSpread: (left: number, right: number) => void;
  onOpen: () => void;
  onPresented: () => void;
  onRequest: (page: number) => void;
  onView?: (page: number) => void;
  printPages?: HTMLCanvasElement[];
};
type Grip = {
  id: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  moved: boolean;
};

/** Imperative Three.js scene with persistent, GPU-skinned paper and one animation clock. */
export class BookScene {
  readonly leftPage = document.createElement("div");
  readonly rightPage = document.createElement("div");
  private scene = new THREE.Scene();
  private printing = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  private renderer: THREE.WebGLRenderer;
  private css = new CSS3DRenderer();
  private floatRoot = new THREE.Group();
  private printFloatRoot = new THREE.Group();
  private ambientTime = 0;
  private ambientStrength = 1;
  private entered = false;
  private presentationScale = 1;
  private displayScale = 1;
  private viewEnvelope: THREE.Vector3[] = [];
  private keyLight!: THREE.DirectionalLight;
  private floorMaterial!: THREE.ShadowMaterial;
  private rotationFit = 1;
  private fitOrientation = new THREE.Quaternion(0, 0, 0, 0);
  private cameraDistance = 0;
  private cameraFocus = new THREE.Vector3(0, 0.65, 0);
  private inverseCamera = new THREE.Quaternion();
  private focusInView = new THREE.Vector3();
  private orbit = new THREE.Group();
  private printOrbit = new THREE.Group();
  private rig = new THREE.Group();
  private printRig = new THREE.Group();
  private orientation = new THREE.Quaternion();
  private orientationTarget = new THREE.Quaternion();
  private yaw = new THREE.Quaternion();
  private pitch = new THREE.Quaternion();
  private cameraRight = new THREE.Vector3();
  private cameraUp = new THREE.Vector3();
  private rotation = new THREE.Vector2();
  private rotationImpulse = 0;
  private paperFlex = 0;
  private flexVelocity = 0;
  private leaves: SkinnedLeaf[] = [];
  private scheduler!: TurnScheduler;
  private binding!: ReturnType<typeof createBinding>;
  private bindingHeights = new THREE.Vector2(-1, -1);
  private portals: AsciiPortal[] = [];
  private popups!: PagePopups;
  private portalTime = 0;
  private paperCanvas = blankPageCanvas();
  private rightCanvases: HTMLCanvasElement[] = [];
  private rightTextures: THREE.CanvasTexture[] = [];
  private textures = new Set<THREE.Texture>();
  private environment: THREE.WebGLRenderTarget;
  private contact = contactShadow();
  private groundY = (-SCENE_RADIUS - 0.2) * SHADOW_DISTANCE;
  private phase: Phase = "arriving";
  private index = 0;
  private committedView = -100;
  private intro = true;
  private introTarget = 1;
  private elapsed = 0;
  private raf = 0;
  private last = 0;
  private grip: Grip | null = null;
  private suppressClick = false;
  private hovered: number | null = null;
  private software = false;
  private visible = true;
  private disposed = false;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private resizeObserver: ResizeObserver;
  private intersection: IntersectionObserver;
  private ray = new THREE.Raycaster();
  private localRay = new THREE.Ray();
  private inverseRig = new THREE.Matrix4();
  private readingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.04);
  private readingPoint = new THREE.Vector3();
  private scratch = new THREE.Vector3();
  private samples: number[] = [];
  private frameCpu = 0;
  private reportedAt = -1000;

  constructor(
    private host: HTMLElement,
    private callbacks: Callbacks,
    initial = -1,
  ) {
    this.index = clamp(initial, 0, callbacks.projects.length - 1);
    this.introTarget = initial + 1;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    const gl = this.renderer.getContext(),
      debug = gl.getExtension("WEBGL_debug_renderer_info");
    this.software =
      !!debug &&
      /swiftshader|llvmpipe/i.test(
        String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
      );
    this.renderer.setPixelRatio(
      this.software ? 0.85 : Math.min(devicePixelRatio, 1.5),
    );
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.className = "book-webgl";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.css.domElement.className = "book-printing";
    this.host.append(this.renderer.domElement, this.css.domElement);
    this.environment = studioEnvironment(this.renderer, this.software);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.72;
    this.floatRoot.add(this.orbit);
    this.printFloatRoot.add(this.printOrbit);
    this.orbit.add(this.rig);
    this.printOrbit.add(this.printRig);
    this.scene.add(this.floatRoot, this.contact.mesh);
    this.printing.add(this.printFloatRoot);
    this.contact.mesh.position.y = this.groundY + 0.015;
    this.keep(this.contact.texture);
    for (const project of callbacks.projects) {
      const canvas = blankPageCanvas(),
        texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.rightCanvases.push(canvas);
      this.rightTextures.push(this.keep(texture));
      this.portals.push(new AsciiPortal(projectTheme(project.theme).colors));
    }
    this.updateArtwork(0, true);
    this.light();
    this.buildLeaves();
    this.viewEnvelope = measureTurnEnvelope(
      this.leaves,
      this.samples,
      this.popups.restEnvelope(this.rig),
    );
    this.buildPrinting();
    this.scheduler = new TurnScheduler(this.leaves);
    this.scheduler.snap(0);
    this.updateRig();
    this.renderer.compile(this.scene, this.camera);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.last = 0;
      this.schedule();
    });
    this.intersection.observe(host);
    this.motion.addEventListener("change", this.onMotion);
    document.addEventListener("visibilitychange", this.onVisibility);
    host.addEventListener("pointerdown", this.onDown);
    host.addEventListener("pointermove", this.onMove);
    host.addEventListener("pointerup", this.onUp);
    host.addEventListener("pointercancel", this.onCancel);
    host.addEventListener("lostpointercapture", this.onLostCapture);
    host.addEventListener("pointerleave", this.onLeave);
    host.addEventListener("focusin", this.onFocus);
    host.addEventListener("focusout", this.onBlur);
    host.addEventListener("click", this.onClick, true);
    this.resize();
    if (!this.intro) this.commit();
    this.updatePhase();
    this.render();
    this.schedule();
  }
  private light() {
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#63635f", 1.05));
    const key = (this.keyLight = new THREE.DirectionalLight("#fffefa", 2.5));
    key.position.set(-2, 15, -1);
    key.castShadow = true;
    key.shadow.mapSize.set(
      this.software ? 1024 : 2048,
      this.software ? 1024 : 2048,
    );
    Object.assign(key.shadow.camera, {
      left: -22,
      right: 22,
      top: 22,
      bottom: -22,
      near: 1,
      far: 80,
    });
    key.shadow.radius = 4;
    key.shadow.normalBias = 0.009;
    key.shadow.bias = -0.0001;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#ffffff", 0.18);
    fill.position.set(5, 6, -4);
    this.scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      (this.floorMaterial = new THREE.ShadowMaterial({
        opacity: 0.22,
        depthWrite: false,
      })),
    );
    floor.rotation.x = -Math.PI / 2;
    softenShadowEdges(this.floorMaterial);
    floor.position.y = this.groundY;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }
  private keep<T extends THREE.Texture>(texture: T): T {
    texture.anisotropy = this.software
      ? 1
      : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.add(texture);
    return texture;
  }
  private surface(params: THREE.MeshPhysicalMaterialParameters): PaperMaterial {
    if (!this.software) return new THREE.MeshPhysicalMaterial(params);
    const material = new THREE.MeshPhongMaterial();
    const values = {
      color: params.color,
      map: params.map,
      emissive: params.emissive,
      emissiveIntensity: params.emissiveIntensity,
      normalMap: params.normalMap,
      normalScale: params.normalScale,
      side: params.side,
      shininess: Math.max(2, Math.pow(1 - (params.roughness ?? 1), 2) * 100),
      specular: new THREE.Color(params.metalness ? "#747474" : "#242424"),
    };
    material.setValues(
      Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== undefined),
      ),
    );
    return material;
  }
  private buildLeaves() {
    const front = this.keep(coverTexture()),
      back = this.keep(coverTexture(true)),
      detail = surfaceDetail("paper"),
      paper = this.keep(paperTexture());
    Object.values(detail).forEach((map) => this.keep(map));
    const edge = this.surface({ color: "#e6e6e2", roughness: 1 }),
      saddle = this.surface({
        map: paper,
        roughness: 1,
        normalMap: detail.normal,
        normalScale: new THREE.Vector2(0.1, 0.1),
      });
    const makeFace = (map: THREE.Texture) =>
      this.surface({
        map,
        roughness: 1,
        normalMap: detail.normal,
        normalScale: new THREE.Vector2(0.035, 0.035),
        emissive: new THREE.Color("#a8a8a2"),
        emissiveIntensity: 0,
      });
    const inside = this.callbacks.projects.map((project, i) =>
      this.keep(
        pageTexture(project, i, "left", this.callbacks.printPages?.[i]),
      ),
    );
    const paperGeometry = createLeafGeometry(),
      coverGeometry = createLeafGeometry(0.012),
      count = inside.length + 1;
    for (let i = 0; i < count; i++) {
      const faceFront = i === 0 ? front : this.rightTextures[i - 1],
        faceBack = i === count - 1 ? back : inside[i],
        cover = i === 0 || i === count - 1;
      const leaf = new SkinnedLeaf(
        i,
        cover,
        count,
        cover ? coverGeometry : paperGeometry,
        [edge, edge, makeFace(faceFront), makeFace(faceBack), edge, edge],
      );
      this.leaves.push(leaf);
      this.rig.add(leaf.group);
    }
    this.popups = new PagePopups(
      this.callbacks.projects,
      this.leaves,
      (params) => this.surface(params),
      paper,
    );
    this.binding = createBinding(
      saddle,
      saddle,
      this.surface({ color: "#7f858b", metalness: 0.6, roughness: 0.55 }),
    );
    this.rig.add(this.binding.spine, this.binding.fold, this.binding.seams);
    // Pose sampling is diagnostic only; rendering and shadows use GPU bone transforms.
    const p = paperGeometry.attributes.position,
      n = paperGeometry.attributes.normal;
    for (let i = 0; i < p.count; i++)
      if (n.getY(i) > 0.9 && Math.round((p.getX(i) / W) * 30) % 5 === 0)
        this.samples.push(i);
  }
  private buildPrinting() {
    for (const [i, element] of [this.leftPage, this.rightPage].entries()) {
      element.className = `printed-page print-overlay ${i ? "page-recto" : "page-verso"}`;
      const object = new CSS3DObject(element);
      object.rotation.x = -Math.PI / 2;
      object.scale.setScalar(W / 600);
      object.position.set(((i ? 1 : -1) * W) / 2, 0.055, 0);
      this.printRig.add(object);
    }
    this.setPrinting(false);
  }
  private setPrinting(show: boolean) {
    for (const element of [this.leftPage, this.rightPage]) {
      element.style.opacity = show ? "1" : "0";
      element.inert = !show;
    }
  }
  private updateArtwork(time: number, force = false) {
    this.portals.forEach((portal, i) => {
      if (
        !force &&
        (this.intro ||
          this.leaves[0].progress === 0 ||
          this.leaves[i + 1].progress === 1)
      )
        return;
      if (!portal.draw(time) && !force) return;
      const ctx = this.rightCanvases[i].getContext("2d")!;
      ctx.clearRect(0, 0, 900, 1260);
      ctx.drawImage(this.paperCanvas, 0, 0);
      ctx.drawImage(portal.canvas, 0, 0, 900, 1260);
      applyRisoPrint(ctx, 900, 1260);
      this.rightTextures[i].needsUpdate = true;
    });
  }
  setDarkMode(dark: boolean) {
    this.host.dataset.colorMode = dark ? "dark" : "light";
    this.floorMaterial.opacity = dark ? 0.45 : 0.22;
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
  }
  appear = () => {
    this.host.dataset.firstRevealAt ??= performance.now().toFixed(1);
    this.entered = true;
    this.elapsed = 0;
    this.intro = !this.motion.matches;
    if (!this.intro) this.finishArrival();
    this.updateRig();
    this.updatePhase();
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
    this.last = 0;
    this.schedule();
  };
  private finishArrival() {
    this.intro = false;
    this.elapsed = INTRO_DURATION;
    this.presentationScale = 1;
    this.callbacks.onPresented();
    // Only an explicit project URL requests an opening after the closed-cover reveal.
    if (this.introTarget > 0) this.goTo(this.introTarget - 1);
    else this.commit();
  }
  private setPhase(phase: Phase) {
    if (this.phase === phase && this.host.dataset.phase) return;
    this.phase = phase;
    this.host.dataset.phase = phase;
    this.callbacks.onPhase(phase);
  }
  private updatePhase() {
    if (this.grip?.moved) {
      this.setPhase("rotating");
      return;
    }
    if (this.intro) {
      this.setPhase("arriving");
    } else if (this.scheduler.moving) {
      const active = this.leaves.find((l) => !l.settled);
      this.setPhase(
        active?.cover
          ? active.target === 1
            ? active.id === 0
              ? "opening"
              : "closing"
            : active.id === 0
              ? "closing"
              : "opening"
          : "turning",
      );
    } else this.setPhase("ready");
  }
  private updateRig() {
    const first = this.leaves[0].progress,
      last = this.leaves.at(-1)!.progress;
    this.rig.position.set((-W / 2) * (1 - first) + (W / 2) * last, 0, 0);
    this.printRig.position.copy(this.rig.position);
    const t = this.ambientTime * 0.5,
      strength = this.motion.matches ? 0 : this.ambientStrength;
    const arrival = this.intro
      ? 1 - Math.exp(-7 * this.elapsed) * Math.cos(10 * this.elapsed)
      : 1;
    this.presentationScale = this.intro ? 0.8 + 0.2 * arrival : 1;
    if (this.cameraDistance && !this.fitOrientation.equals(this.orientation)) {
      this.fitOrientation.copy(this.orientation);
      const vertical =
          Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
          FRAME_MARGIN,
        horizontal = vertical * this.camera.aspect,
        c = this.focusInView;
      let fit = 1;
      for (const point of this.viewEnvelope) {
        const p = this.scratch
          .copy(point)
          .applyQuaternion(this.orientation)
          .applyQuaternion(this.inverseCamera);
        for (const sign of [-1, 1]) {
          const x = (sign * p.x) / horizontal + p.z,
            y = (sign * p.y) / vertical + p.z;
          if (x > 0)
            fit = Math.min(
              fit,
              (this.cameraDistance + c.z + (sign * c.x) / horizontal) / x,
            );
          if (y > 0)
            fit = Math.min(
              fit,
              (this.cameraDistance + c.z + (sign * c.y) / vertical) / y,
            );
        }
      }
      this.rotationFit = fit;
    }
    this.orbit.scale.setScalar(this.presentationScale * this.rotationFit);
    this.printOrbit.scale.copy(this.orbit.scale);
    this.floatRoot.position.y =
      Math.sin(t) * 0.1 * strength - (1 - arrival) * 0.3;
    this.floatRoot.rotation.set(
      Math.cos(t) * 0.07 * strength,
      Math.sin(t) * 0.07 * strength,
      Math.sin(t) * 0.035 * strength,
    );
    this.printFloatRoot.position.copy(this.floatRoot.position);
    this.printFloatRoot.quaternion.copy(this.floatRoot.quaternion);
    this.orbit.quaternion.copy(this.orientation);
    this.printOrbit.quaternion.copy(this.orientation);
    const boundary = this.scheduler?.committed ?? 1,
      leftY = 0.025 + Math.max(0, boundary - 1) * LEAF_GAP,
      rightY =
        0.025 + Math.max(0, this.leaves.length - 1 - boundary) * LEAF_GAP;
    if (
      Math.abs(leftY - this.bindingHeights.x) +
        Math.abs(rightY - this.bindingHeights.y) >
      0.0001
    ) {
      this.binding.update(leftY, rightY, 1);
      this.bindingHeights.set(leftY, rightY);
    }
    this.binding.fold.visible = this.binding.seams.visible =
      first > 0.85 && last < 0.15;
    this.floatRoot.updateMatrixWorld(true);
    this.leaves.forEach((leaf) => leaf.updateWorld());
  }
  private commit() {
    const boundary = this.scheduler.committed;
    if (this.scheduler.moving || this.intro || boundary === this.committedView)
      return;
    this.committedView = boundary;
    const index = clamp(boundary - 1, 0, this.callbacks.projects.length - 1);
    if (index !== this.index) {
      this.index = index;
      this.callbacks.onIndex(index);
    }
    this.callbacks.onSpread(index, index);
    this.callbacks.onView?.(boundary - 1);
    this.setPrinting(boundary > 0 && boundary < this.leaves.length);
    this.report();
  }
  goTo(page: number) {
    if (this.grip?.moved) return;
    this.intro = false;
    this.elapsed = INTRO_DURATION;
    this.scheduler.request(clamp(page + 1, 0, this.leaves.length));
    this.callbacks.onRequest(this.scheduler.requested - 1);
    if (this.motion.matches) {
      this.scheduler.snap(this.scheduler.requested);
      this.popups.step(
        0,
        page >= 0 && page < this.callbacks.projects.length ? page : -1,
        true,
      );
      this.updateRig();
      this.commit();
    }
    this.setHover(null);
    this.updatePhase();
    this.setPrinting(
      !this.scheduler.moving &&
        this.scheduler.committed > 0 &&
        this.scheduler.committed < this.leaves.length,
    );
    this.report();
    this.last = 0;
    if (this.motion.matches) {
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
    }
    this.schedule();
  }
  stepPage(direction: number) {
    this.goTo(this.scheduler.requested - 1 + direction);
  }
  skip = () => {
    if (this.intro) this.finishArrival();
    this.intro = false;
    this.elapsed = INTRO_DURATION;
    this.scheduler.snap(this.scheduler.requested);
    this.popups.step(
      0,
      this.scheduler.committed > 0 &&
        this.scheduler.committed < this.leaves.length
        ? this.scheduler.committed - 1
        : -1,
      true,
    );
    this.updateRig();
    this.commit();
    this.updatePhase();
    this.setPrinting(
      this.scheduler.committed > 0 &&
        this.scheduler.committed < this.leaves.length,
    );
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
    this.schedule();
  };
  replay = () => {
    this.releaseCapture();
    this.orientation.identity();
    this.orientationTarget.identity();
    this.rotation.set(0, 0);
    this.rotationImpulse = this.paperFlex = this.flexVelocity = 0;
    this.index = 0;
    this.callbacks.onIndex(0);
    this.committedView = -100;
    this.elapsed = 0;
    this.portalTime = 0;
    this.introTarget = 0;
    this.callbacks.onRequest(-1);
    this.ambientTime = 0;
    this.scheduler.snap(0);
    this.popups.reset();
    this.updateArtwork(0, true);
    this.setHover(null);
    this.setPrinting(false);
    this.appear();
  };
  private updateIntro(dt: number) {
    this.elapsed += dt;
    if (this.elapsed >= INTRO_DURATION) this.finishArrival();
  }
  private setHover(id: number | null) {
    this.hovered =
      this.grip?.moved || this.scheduler.moving || this.intro ? null : id;
    this.host.style.cursor = this.grip?.moved
      ? "grabbing"
      : id !== null
        ? "pointer"
        : "default";
    if (this.motion.matches) {
      this.updateHighlight(1);
      this.render();
      this.report();
    } else this.schedule();
  }
  private updateHighlight(dt: number) {
    for (const leaf of this.leaves)
      for (const material of [leaf.mesh.material[2], leaf.mesh.material[3]]) {
        const target = leaf.id === this.hovered ? 0.264 : 0;
        material.emissiveIntensity = this.motion.matches
          ? target
          : THREE.MathUtils.damp(material.emissiveIntensity, target, 12, dt);
      }
  }
  private bookHit(event: { clientX: number; clientY: number }) {
    const rect = this.host.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    this.floatRoot.updateMatrixWorld(true);
    this.leaves.forEach((leaf) => leaf.updateWorld());
    return (
      this.ray.intersectObjects(
        [...this.leaves.map((leaf) => leaf.mesh), ...this.popups.hitMeshes],
        false,
      )[0] ?? null
    );
  }
  private localReadingSide() {
    this.inverseRig.copy(this.rig.matrixWorld).invert();
    this.localRay.copy(this.ray.ray).applyMatrix4(this.inverseRig);
    const point = this.localRay.intersectPlane(
      this.readingPlane,
      this.readingPoint,
    );
    return point &&
      Math.abs(point.x) < W + 0.15 &&
      Math.abs(point.z) < H / 2 + 0.1
      ? point.x >= 0
        ? 1
        : -1
      : null;
  }
  private onMove = (event: PointerEvent) => {
    const grip = this.grip;
    if (!grip) {
      const hit = this.bookHit(event);
      this.setHover(hit ? Number(hit.object.userData.leaf) : null);
      return;
    }
    if (event.pointerId !== grip.id) return;
    if (
      !grip.moved &&
      Math.hypot(event.clientX - grip.x, event.clientY - grip.y) > 6
    ) {
      grip.moved = true;
      this.host.setPointerCapture(event.pointerId);
      this.setPhase("rotating");
      this.setHover(null);
      this.last = 0;
    }
    if (grip.moved) {
      event.preventDefault();
      const dx =
          ((event.clientX - grip.lastX) /
            Math.max(280, this.host.clientWidth)) *
          Math.PI *
          2,
        dy =
          ((event.clientY - grip.lastY) /
            Math.max(280, this.host.clientHeight)) *
          Math.PI *
          2;
      this.cameraRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
      this.cameraUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.yaw.setFromAxisAngle(this.cameraUp, dx);
      this.pitch.setFromAxisAngle(this.cameraRight, dy);
      this.orientationTarget
        .premultiply(this.yaw)
        .premultiply(this.pitch)
        .normalize();
      this.rotation.x += dy;
      this.rotation.y += dx;
      this.rotationImpulse = clamp((dx + dy) * 0.35, -0.2, 0.2);
      if (this.motion.matches) {
        this.orientation.copy(this.orientationTarget);
        this.updateRig();
        this.renderer.shadowMap.needsUpdate = true;
        this.render();
      }
      this.schedule();
    }
    grip.lastX = event.clientX;
    grip.lastY = event.clientY;
  };
  private onDown = (event: PointerEvent) => {
    this.suppressClick = false;
    if (
      event.button !== 0 ||
      this.scheduler.moving ||
      this.intro ||
      !this.bookHit(event)
    )
      return;
    this.grip = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
  };
  private onUp = (event: PointerEvent) => {
    if (this.grip?.id !== event.pointerId) return;
    this.suppressClick = this.grip.moved;
    this.releaseCapture();
    this.updatePhase();
    this.setHover(null);
    this.report();
    this.schedule();
  };
  private onCancel = (event: PointerEvent) => {
    if (this.grip?.id !== event.pointerId) return;
    this.suppressClick = this.grip.moved;
    this.releaseCapture();
    this.updatePhase();
    this.setHover(null);
    this.report();
    this.schedule();
  };
  private onLostCapture = (event: PointerEvent) => {
    if (event.target === this.host) this.onCancel(event);
  };
  private releaseCapture() {
    const id = this.grip?.id;
    this.grip = null;
    if (id !== undefined && this.host.hasPointerCapture(id))
      this.host.releasePointerCapture(id);
    this.host.style.cursor = "default";
  }
  private onLeave = () => {
    if (!this.grip) this.setHover(null);
  };
  private onFocus = (event: FocusEvent) => {
    if (event.target === this.host) {
      this.setHover(Math.min(this.scheduler.committed, this.leaves.length - 1));
      return;
    }
    const direction = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-turn-page]",
      )?.dataset.turnPage,
      boundary = this.scheduler.committed;
    if (direction === "left" && boundary > 0) this.setHover(boundary - 1);
    if (direction === "right" && boundary < this.leaves.length)
      this.setHover(boundary);
  };
  private onBlur = () => this.setHover(null);
  private onClick = (event: MouseEvent) => {
    if (this.suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressClick = false;
      return;
    }
    if (
      this.intro ||
      (event.target as HTMLElement).closest("button,a,[role=button]")
    )
      return;
    const hit = this.bookHit(event),
      boundary = this.scheduler.committed;
    if (!hit) return;
    const id = Number(hit.object.userData.leaf);
    if (
      !this.scheduler.moving &&
      !this.intro &&
      boundary > 0 &&
      boundary < this.leaves.length &&
      id === boundary - 1 &&
      hit.uv &&
      hit.face?.materialIndex === 3
    ) {
      const button = this.leftPage.querySelector<HTMLElement>(".read-project");
      if (button && this.hitPrintedControl(hit.uv, button)) {
        this.callbacks.onOpen();
        return;
      }
    }
    if (boundary === 0 && !this.scheduler.moving) this.stepPage(1);
    else if (boundary === this.leaves.length && !this.scheduler.moving)
      this.stepPage(-1);
    else
      this.stepPage(
        this.localReadingSide() ?? (this.leaves[id].progress > 0.5 ? -1 : 1),
      );
  };
  private hitPrintedControl(uv: THREE.Vector2, button: HTMLElement) {
    let x = 0,
      y = 0,
      node: HTMLElement | null = button;
    while (node && node !== this.leftPage) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    const px = uv.x * 600,
      py = (1 - uv.y) * 847;
    return (
      px >= x - 8 &&
      px <= x + button.offsetWidth + 8 &&
      py >= y - 8 &&
      py <= y + button.offsetHeight + 8
    );
  }
  private resize = () => {
    const rect = this.host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.renderer.setSize(rect.width, rect.height);
    this.css.setSize(rect.width, rect.height);
    this.camera.aspect = rect.width / rect.height;
    const half = Math.atan(
        Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
          Math.min(1, this.camera.aspect),
      ),
      legacyDistance = (SCENE_RADIUS / Math.sin(half)) * 1.02;
    const direction = new THREE.Vector3(0.18, 0.9, 0.67).normalize();
    this.camera.up.set(0.035, 1, 0);
    this.camera.position.copy(direction);
    this.camera.lookAt(0, 0, 0);
    const { distance, focus } = fitTurnEnvelope(
      this.viewEnvelope,
      this.camera.quaternion,
      this.camera.fov,
      this.camera.aspect,
    );
    this.cameraFocus.copy(focus);
    const inverse = this.camera.quaternion.clone().invert();
    this.displayScale = legacyDistance / distance;
    this.camera.position.copy(focus).addScaledVector(direction, distance);
    this.camera.lookAt(focus);
    this.camera.far = Math.max(100, distance + 80);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.cameraDistance = distance;
    this.inverseCamera.copy(inverse);
    this.focusInView.copy(focus).applyQuaternion(inverse);
    this.fitOrientation.set(0, 0, 0, 0);
    this.updateRig();
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
  };
  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.visible || document.hidden) return;
    if (this.software && this.last && now - this.last < 100) {
      this.schedule();
      return;
    }
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.25) : 0;
    this.last = now;
    const cpu = performance.now();
    if (this.intro) this.updateIntro(dt);
    const flex = advancePaperFlex(
      this.paperFlex,
      this.flexVelocity,
      this.motion.matches ? 0 : this.rotationImpulse,
      dt,
    );
    this.paperFlex = this.motion.matches ? 0 : flex.value;
    this.flexVelocity = this.motion.matches ? 0 : flex.velocity;
    this.rotationImpulse *= Math.exp(-12 * dt);
    const orientationChanged =
      this.orientation.angleTo(this.orientationTarget) > 0.00001;
    if (this.motion.matches) this.orientation.copy(this.orientationTarget);
    else this.orientation.slerp(this.orientationTarget, 1 - Math.exp(-15 * dt));
    const popupsChanged = this.popups.step(
      dt,
      this.intro ||
        this.scheduler.moving ||
        this.scheduler.committed === 0 ||
        this.scheduler.committed === this.leaves.length
        ? -1
        : this.scheduler.committed - 1,
      this.motion.matches,
    );
    const changed =
      this.popups.folded || !this.scheduler.moving
        ? this.scheduler.step(dt, this.paperFlex)
        : false;
    if (!this.motion.matches) {
      this.ambientTime += dt;
      this.ambientStrength = THREE.MathUtils.damp(
        this.ambientStrength,
        this.grip?.moved ? 0 : 1,
        8,
        dt,
      );
    }
    this.frameCpu = performance.now() - cpu;
    if (
      changed ||
      orientationChanged ||
      popupsChanged ||
      this.intro ||
      !this.motion.matches
    ) {
      this.updateRig();
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.commit();
    this.updatePhase();
    this.setPrinting(
      !this.intro &&
        !this.scheduler.moving &&
        this.scheduler.committed > 0 &&
        this.scheduler.committed < this.leaves.length,
    );
    this.updateHighlight(dt);
    if (!this.motion.matches) this.portalTime += dt;
    this.updateArtwork(this.portalTime);
    this.render();
    this.schedule();
  };
  private render() {
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.printing, this.camera);
    if (performance.now() - this.reportedAt > 80) this.report();
  }
  private pointOnLeaf(
    leaf: SkinnedLeaf,
    u: number,
    v: number,
    out = new THREE.Vector3(),
  ) {
    const p = leaf.mesh.geometry.attributes.position,
      n = leaf.mesh.geometry.attributes.normal;
    let best = Infinity,
      bestIndex = 0;
    for (let i = 0; i < p.count; i++)
      if (n.getY(i) > 0.9) {
        const d =
          Math.abs(p.getX(i) - u * W) + Math.abs(p.getZ(i) - (0.5 - v) * H);
        if (d < best) {
          best = d;
          bestIndex = i;
        }
      }
    leaf.mesh.getVertexPosition(bestIndex, out);
    out.applyMatrix4(leaf.mesh.matrixWorld);
    return out;
  }
  private screenPoint(leaf: SkinnedLeaf, u = 0.55, v = 0.5) {
    const rect = this.host.getBoundingClientRect(),
      p = this.pointOnLeaf(leaf, u, v, this.scratch).project(this.camera);
    return {
      x: rect.left + ((p.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - p.y) * rect.height) / 2,
    };
  }
  private visibleBounds() {
    const b = { left: 1, right: -1, top: 1, bottom: -1 };
    for (const leaf of this.leaves)
      for (const i of this.samples) {
        leaf.mesh.getVertexPosition(i, this.scratch);
        this.scratch.applyMatrix4(leaf.mesh.matrixWorld).project(this.camera);
        b.left = Math.min(b.left, this.scratch.x);
        b.right = Math.max(b.right, this.scratch.x);
        b.top = Math.min(b.top, this.scratch.y);
        b.bottom = Math.max(b.bottom, this.scratch.y);
      }
    this.popups.bounds(this.camera, (p) => {
      b.left = Math.min(b.left, p.x);
      b.right = Math.max(b.right, p.x);
      b.top = Math.min(b.top, p.y);
      b.bottom = Math.max(b.bottom, p.y);
    });
    return b;
  }
  private report() {
    if (!this.scheduler) return;
    this.reportedAt = performance.now();
    const data = this.host.dataset,
      boundary = this.scheduler.committed,
      closed =
        !this.scheduler.moving &&
        (boundary === 0 || boundary === this.leaves.length),
      active = this.leaves.find((leaf) => !leaf.settled),
      left = this.leaves[clamp(boundary - 1, 0, this.leaves.length - 1)],
      right = this.leaves[clamp(boundary, 0, this.leaves.length - 1)];
    data.phase = this.phase;
    data.project = String(this.index);
    data.format = "riso-zine";
    data.view = closed ? (boundary === 0 ? "cover" : "back") : "spread";
    data.requestedPage = String(this.scheduler.requested - 1);
    data.settledBoundary = String(boundary);
    data.leftArtwork = this.leaves[this.index].faces[1].uuid;
    data.rightArtwork = this.rightTextures[this.index].uuid;
    data.turnBackArtwork = active?.faces[1].uuid ?? data.leftArtwork;
    data.turnProgress = (
      active ? (active.target ? active.progress : 1 - active.progress) : 0
    ).toFixed(4);
    data.turnDirection = active ? (active.target ? "1" : "-1") : "0";
    data.capturedPages = String(this.callbacks.printPages?.length ?? 0);
    data.pageCount = String(this.leaves.length * 2);
    data.persistentLeaves = String(this.leaves.length);
    data.activeLeafCount = String(this.scheduler.active);
    data.maxConcurrent = String(this.scheduler.maxConcurrent);
    data.leafStates = JSON.stringify(
      this.leaves.map((leaf) => ({
        id: leaf.id,
        object: leaf.mesh.uuid,
        front: leaf.faces[0].uuid,
        back: leaf.faces[1].uuid,
        progress: leaf.progress,
        target: leaf.target,
        settled: leaf.settled,
        verticesVersion: (
          leaf.mesh.geometry.attributes.position as THREE.BufferAttribute
        ).version,
      })),
    );
    data.rotation = JSON.stringify(this.rotation.toArray());
    data.orientation = JSON.stringify(this.orientation.toArray());
    data.anchorPosition = JSON.stringify(this.orbit.position.toArray());
    data.bookPosition = data.anchorPosition;
    data.zoom = String(this.camera.zoom);
    data.camera = JSON.stringify(this.camera.position.toArray());
    data.bookBounds = JSON.stringify(this.visibleBounds());
    data.bindingThickness = String(this.leaves.length * LEAF_GAP);
    data.rigY = String(this.rig.position.y);
    data.coverOpen = String(this.leaves[0].progress);
    data.coverAngle = String(this.leaves[0].hingeAngle);
    data.dragging = String(!!this.grip);
    data.hoveredPage =
      this.hovered === null
        ? "none"
        : this.hovered === boundary - 1
          ? "left"
          : this.hovered === boundary
            ? "right"
            : "cover";
    data.leftGlow = left.mesh.material[3].emissiveIntensity.toFixed(3);
    data.rightGlow = right.mesh.material[2].emissiveIntensity.toFixed(3);
    data.leftHit = JSON.stringify(this.screenPoint(left));
    data.rightHit = JSON.stringify(this.screenPoint(right));
    data.leftGrab = JSON.stringify(this.screenPoint(left, 0.9, 0.5));
    data.rightGrab = JSON.stringify(this.screenPoint(right, 0.9, 0.5));
    data.coverHit = JSON.stringify(
      this.screenPoint(
        boundary === this.leaves.length ? this.leaves.at(-1)! : this.leaves[0],
        0.5,
        0.5,
      ),
    );
    data.portalTime = this.portalTime.toFixed(3);
    data.elapsed = this.elapsed.toFixed(3);
    data.duration = String(INTRO_DURATION);
    data.paperFlex = this.paperFlex.toFixed(5);
    data.riffleCount = String(this.leaves.length);
    data.groundY = String(this.groundY);
    data.frameCpuMs = this.frameCpu.toFixed(3);
    data.renderer = this.software ? "software" : "physical";
    data.geometryMode = "gpu-skinning";
    data.bindingConnected = "true";
    data.framingRadius = String(SCENE_RADIUS);
    data.framingVertices = String(this.viewEnvelope.length);
    data.lightPosition = JSON.stringify(this.keyLight.position.toArray());
    data.printResolution = "1200x1694";
    data.portalCoverage = "full-page";
    data.displayScale = String(this.displayScale);
    data.rotationFit = String(this.rotationFit);
    data.arrivalScale = this.presentationScale.toFixed(4);
    data.ambientPosition = JSON.stringify(this.floatRoot.position.toArray());
    data.ambientRotation = JSON.stringify(
      this.floatRoot.rotation.toArray().slice(0, 3),
    );
    data.shadowDistance = String(SHADOW_DISTANCE);
    data.theme = this.callbacks.projects[this.index].theme;
    data.previewArtworks = JSON.stringify(
      this.rightTextures.map((texture) => texture.uuid),
    );
    data.popupCount = String(this.popups.visibleCount);
    data.popupSpread = String(this.popups.shownSpread);
    data.popupsFolded = String(this.popups.folded);
  }
  private schedule() {
    if (
      !this.entered ||
      this.raf ||
      this.disposed ||
      !this.visible ||
      document.hidden
    )
      return;
    if (
      this.motion.matches &&
      !this.intro &&
      !this.scheduler.moving &&
      !this.grip?.moved &&
      this.orientation.angleTo(this.orientationTarget) < 0.00001
    )
      return;
    this.raf = requestAnimationFrame(this.frame);
  }
  private onMotion = () => {
    if (this.motion.matches) {
      this.scheduler.request(this.scheduler.requested);
      this.skip();
    } else {
      this.last = 0;
      this.schedule();
    }
  };
  private onVisibility = () => {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = 0;
    this.schedule();
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.releaseCapture();
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    this.motion.removeEventListener("change", this.onMotion);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.host.removeEventListener("pointerdown", this.onDown);
    this.host.removeEventListener("pointermove", this.onMove);
    this.host.removeEventListener("pointerup", this.onUp);
    this.host.removeEventListener("pointercancel", this.onCancel);
    this.host.removeEventListener("lostpointercapture", this.onLostCapture);
    this.host.removeEventListener("pointerleave", this.onLeave);
    this.host.removeEventListener("focusin", this.onFocus);
    this.host.removeEventListener("focusout", this.onBlur);
    this.host.removeEventListener("click", this.onClick, true);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((m) => materials.add(m));
      }
    });
    this.leaves.forEach((leaf) => leaf.dispose());
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.css.domElement.remove();
  }
}
