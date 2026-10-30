import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import { studioEnvironment, surfaceDetail } from "./surfaces";
import { softenShadowEdges } from "./effects";
import { PhonePreviews } from "./phones";
import type { GoogleAsset } from "./career";
import { createBinding } from "./binding";
import { AsciiPortal } from "./ascii";
import { PagePopups } from "./popups";
import { projectTheme } from "./themes";
import { measureTurnEnvelope, fitTurnEnvelope } from "./framing";
import { advancePaperFlex } from "./paper-flex";
import { createPaperInserts, INSERT_SAMPLES } from "./paper-inserts";
import { preservePrintColors } from "./printed-paper";
import {
  createLeafGeometry,
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


const artworkTexture = (canvas: HTMLCanvasElement) => { const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture; };
const blankTexture = (dark = false) => artworkTexture(blankPageCanvas(dark));

const INTRO_DURATION = 0.85;
// Keep the overhead shadow within the scene and below every rotated leaf.
const SHADOW_DISTANCE = 1;
// Centering a partially opened cover adds a small offset to the leaf-local bounds.
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
  blankInterior?: boolean;
  arrivalMotion?: boolean;
  stageInsets?: { top: number; bottom: number };
  pageWidth?: number;
  paperInserts?: boolean;
  pageArtwork?: { left: HTMLCanvasElement; right: HTMLCanvasElement }[];
  coverArtwork?: {
    front: HTMLCanvasElement;
    back: HTMLCanvasElement;
    update?: (time: number, back: boolean, reducedMotion: boolean) => boolean;
  };
  onPhase: (phase: Phase) => void;
  onIndex: (index: number) => void;
  onSpread: (left: number, right: number) => void;
  onOpen: () => void;
  onMiniatureHover?: (
    item: { id: string; x: number; y: number } | null,
  ) => void;
  onMiniatureOpen?: (id: string, x: number, y: number) => void;
  onPresented: () => void;
  onRequest: (page: number) => void;
  onTurn?: (forward: boolean, cover: boolean) => void;
  onView?: (page: number) => void;
  printPages?: HTMLCanvasElement[];
  google: GoogleAsset;
};
type Dive = {
  book: THREE.PerspectiveCamera;
  position: THREE.Vector3;
  progress: number;
  direction: 1 | -1;
  index: number;
  resolve?: () => void;
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
  private cameraFocus = new THREE.Vector3(0, 0.65, 0);
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
  private paperInserts: THREE.SkinnedMesh[] = [];
  private scheduler!: TurnScheduler;
  private binding!: ReturnType<typeof createBinding>;
  private portals: AsciiPortal[] = [];
  private popups!: PagePopups;
  private portalTime = 0;
  private paperCanvas = blankPageCanvas();
  private rightCanvases: HTMLCanvasElement[] = [];
  private rightTextures: THREE.CanvasTexture[] = [];
  private textures = new Set<THREE.Texture>();
  private environment: THREE.WebGLRenderTarget;
  private dark = false;
  private phones!: PhonePreviews;
  private leftTextures: THREE.CanvasTexture[] = [];
  private coverTextures: THREE.CanvasTexture[] = [];
  private edgeMaterial!: PaperMaterial;
  private saddleMaterial!: PaperMaterial;
  private pageWidth = W;
  private sceneRadius = Math.hypot(W, H / 2) + 0.52;
  private groundY = (-this.sceneRadius - 0.2) * SHADOW_DISTANCE;
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
  private pendingPage: number | null = null;
  private desktopScale = 1;
  private dive: Dive | null = null;
  private overlayOpen = false;
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
    this.pageWidth = callbacks.pageWidth ?? W;
    this.sceneRadius = Math.hypot(this.pageWidth, H / 2) + 0.52;
    this.groundY = (-this.sceneRadius - 0.2) * SHADOW_DISTANCE;
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
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
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
    this.scene.add(this.floatRoot);
    this.printing.add(this.printFloatRoot);

    for (const [i, project] of callbacks.projects.entries()) {
      const canvas = callbacks.pageArtwork?.[i]?.right ?? blankPageCanvas(),
        texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.rightCanvases.push(canvas);
      this.rightTextures.push(this.keep(texture));
      if (!callbacks.blankInterior) this.portals.push(new AsciiPortal(projectTheme(project.theme).colors));
    }
    this.updateArtwork(0, true);
    this.light();
    this.buildLeaves();
    this.viewEnvelope = measureTurnEnvelope(
      this.leaves,
      this.samples,
      this.popups.restEnvelope(this.rig),
      this.paperInserts,
    );
    this.buildPrinting();
    this.scheduler = new TurnScheduler(this.leaves, (forward, cover) =>
      this.callbacks.onTurn?.(forward, cover),
    );
    this.scheduler.snap(0);
    this.updateRig();
    this.renderer.compile(this.scene, this.camera);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (!this.visible) this.phones.pause();
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
    key.position.set(-1.5, 15, -2);
    key.castShadow = true;
    key.shadow.mapSize.set(
      this.software ? 512 : 2048,
      this.software ? 512 : 2048,
    );
    Object.assign(key.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 1,
      far: 80,
    });
    key.shadow.radius = this.software ? 11 : 44;
    key.shadow.blurSamples = this.software ? 8 : 12;
    key.shadow.normalBias = 0.015;
    key.shadow.bias = -0.0001;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#ffffff", 0.18);
    fill.position.set(5, 6, -4);
    this.scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      (this.floorMaterial = new THREE.ShadowMaterial({
        opacity: 0.18,
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
      transparent: params.transparent,
      opacity: params.opacity,
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
    const front = this.keep(this.callbacks.coverArtwork ? artworkTexture(this.callbacks.coverArtwork.front) : coverTexture()),
      back = this.keep(this.callbacks.coverArtwork ? artworkTexture(this.callbacks.coverArtwork.back) : coverTexture(true)),
      detail = surfaceDetail("paper"),
      paper = this.keep(paperTexture());
    Object.values(detail).forEach((map) => this.keep(map));
    const edge = (this.edgeMaterial = this.surface({
        color: "#e6e6e2",
        roughness: 1,
      })),
      saddle = (this.saddleMaterial = this.surface({
        map: paper,
        roughness: 1,
        normalMap: detail.normal,
        normalScale: new THREE.Vector2(0.1, 0.1),
      }));
    const makeFace = (map: THREE.Texture, cover = false) => {
      const printedFlyer = Boolean(this.callbacks.pageArtwork && (map.image as HTMLCanvasElement).dataset?.flyerId);
      const printedCover = cover && Boolean(this.callbacks.coverArtwork);
      const face = this.surface({
        map,
        roughness: printedFlyer || printedCover ? 0.95 : cover ? 0.39 : 0.58,
        roughnessMap: detail.roughness,
        clearcoat: printedFlyer || printedCover ? 0 : cover ? 0.28 : 0.12,
        clearcoatRoughness: 0.38,
        normalMap: detail.normal,
        normalScale: new THREE.Vector2(0.035, 0.035),
        emissive: new THREE.Color("#ffc28a"),
        emissiveIntensity: 0,
      });
      return printedFlyer ? preservePrintColors(face) : face;
    };
    const inside = this.callbacks.projects.map((project, i) =>
      this.keep(
        this.callbacks.pageArtwork?.[i]?.left ? artworkTexture(this.callbacks.pageArtwork[i].left) : this.callbacks.blankInterior ? blankTexture(this.dark) : pageTexture(project, i, "left", this.callbacks.printPages?.[i]),
      ),
    );
    this.coverTextures = [front, back];
    this.leftTextures = inside;
    this.keep(this.callbacks.google.texture);
    const paperGeometry = createLeafGeometry(0.006, this.pageWidth),
      coverGeometry = createLeafGeometry(0.012, this.pageWidth),
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
        [
          edge,
          edge,
          makeFace(faceFront, cover),
          makeFace(faceBack, cover),
          edge,
          edge,
        ],
        this.pageWidth,
      );
      this.leaves.push(leaf);
      this.rig.add(leaf.group);
    }
    if(this.callbacks.paperInserts)this.paperInserts=createPaperInserts(this.leaves,params=>this.surface(params),texture=>this.keep(texture));
    this.popups = new PagePopups(
      this.callbacks.projects,
      this.leaves,
      (params) => this.surface(params),
      paper,
      this.callbacks.google,
      this.software,
    );
    this.phones = new PhonePreviews(this.callbacks.projects, this.leaves);
    this.binding = createBinding(
      saddle,
      saddle,
      this.surface({ color: "#7f858b", metalness: 0.6, roughness: 0.55 }),
      this.leaves,
    );
    this.rig.add(this.binding.spine, this.binding.fold, this.binding.seams);
    // Pose sampling is diagnostic only; rendering and shadows use GPU bone transforms.
    const p = paperGeometry.attributes.position,
      n = paperGeometry.attributes.normal;
    for (let i = 0; i < p.count; i++)
      if (n.getY(i) > 0.9 && Math.round((p.getX(i) / this.pageWidth) * 30) % 5 === 0)
        this.samples.push(i);
  }
  private buildPrinting() {
    for (const [i, element] of [this.leftPage, this.rightPage].entries()) {
      element.className = `printed-page print-overlay ${i ? "page-recto" : "page-verso"}`;
      const object = new CSS3DObject(element);
      object.rotation.x = -Math.PI / 2;
      object.scale.setScalar(this.pageWidth / 600);
      object.position.set(((i ? 1 : -1) * this.pageWidth) / 2, 0.055, 0);
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
    if (this.callbacks.blankInterior || this.callbacks.pageArtwork) return;
    this.portals.forEach((portal, i) => {
      if (
        !force &&
        (this.intro ||
          this.leaves[0].progress === 0 ||
          (i !== (this.scheduler?.committed ?? 1) - 1 &&
            !this.leaves[i].turning &&
            !this.leaves[i + 1].turning))
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
  private updateCoverArtwork() {
    const cover = this.callbacks.coverArtwork;
    if (!cover?.update) return;
    for (let i = 0; i < 2; i++) {
      const leaf = this.leaves[i === 0 ? 0 : this.leaves.length - 1];
      const exposed = i === 0 ? leaf.progress < 0.99 : leaf.progress > 0.01;
      if (exposed && cover.update(this.portalTime, i === 1, this.motion.matches)) {
        this.coverTextures[i].needsUpdate = true;
        if (i === 0) this.host.dataset.coverFrame = cover.front.dataset.frame ?? "static";
      }
    }
  }
  setDarkMode(dark: boolean) {
    this.dark = dark;
    this.host.dataset.colorMode = dark ? "dark" : "light";
    const replace = (
      target: THREE.CanvasTexture,
      source: THREE.CanvasTexture,
    ) => {
      const canvas = target.image as HTMLCanvasElement;
      canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
      canvas
        .getContext("2d")!
        .drawImage(source.image, 0, 0, canvas.width, canvas.height);
      target.needsUpdate = true;
      source.dispose();
    };
    if (!this.callbacks.coverArtwork) this.coverTextures.forEach((texture, i) =>
      replace(texture, coverTexture(i === 1, dark)),
    );
    if (!this.callbacks.pageArtwork) this.leftTextures.forEach((texture, i) =>
      replace(
        texture,
        this.callbacks.blankInterior ? blankTexture(dark) : pageTexture(
          this.callbacks.projects[i],
          i,
          "left",
          this.callbacks.printPages?.[i],
          dark,
        ),
      ),
    );
    if (this.callbacks.blankInterior && !this.callbacks.pageArtwork) this.rightTextures.forEach(texture => replace(texture, blankTexture(dark)));
    this.paperCanvas = blankPageCanvas(dark);
    this.portals.forEach((portal, i) => {
      const project = this.callbacks.projects[i];
      const colors = projectTheme(project.theme).colors;
      portal.setColors(
        dark
          ? colors.map(
              (c) =>
                "#" +
                new THREE.Color(c)
                  .lerp(new THREE.Color("#ffffff"), 0.26)
                  .getHexString(),
            )
          : colors,
      );
    });
    this.edgeMaterial.color.set(dark ? "#333438" : "#e6e6e2");
    this.saddleMaterial.color.set(dark ? "#333438" : "#ffffff");
    this.popups.setDark(dark);
    this.floorMaterial.opacity = dark ? 0.4 : 0.18;
    this.updateArtwork(this.portalTime, true);
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
  }
  appear = () => {
    this.host.dataset.firstRevealAt ??= performance.now().toFixed(1);
    this.entered = true;
    this.elapsed = 0;
    this.intro = !this.motion.matches && this.callbacks.arrivalMotion !== false;
    if (!this.intro) this.finishArrival();
    this.updateRig();
    this.updatePhase();
    this.updateCoverArtwork();
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
    this.rig.position.set((-this.pageWidth / 2) * (1 - first) + (this.pageWidth / 2) * last, 0, 0);
    this.printRig.position.copy(this.rig.position);
    const t = this.ambientTime * 0.5,
      strength = this.motion.matches ? 0 : this.ambientStrength;
    const arrival = this.intro
      ? 1 - Math.exp(-7 * this.elapsed) * Math.cos(10 * this.elapsed)
      : 1;
    this.presentationScale = this.intro ? 0.8 + 0.2 * arrival : 1;
    // Drag changes orientation only. Framing is computed once per viewport resize.
    this.rotationFit = 1;
    this.orbit.scale.setScalar(this.presentationScale);
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
    this.binding.update();
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
  setOverlayOpen(open: boolean) {
    this.overlayOpen = open;
    this.callbacks.onMiniatureHover?.(null);
    if (open) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.releaseCapture();
    }
    this.last = 0;
    if (!open) this.schedule();
  }
  enterProject(index: number): Promise<void> {
    if (this.dive) {
      // Browser Forward can reverse an in-flight return without losing the saved pose.
      this.dive.resolve?.();
      return new Promise((resolve) => {
        const d = this.dive!;
        d.direction = 1;
        d.resolve = resolve;
        this.last = 0;
        if (this.motion.matches || d.progress === 1) {
          d.progress = 1;
          this.applyDive();
          this.render();
          d.resolve = undefined;
          resolve();
        } else this.schedule();
      });
    }
    this.releaseCapture();
    this.setHover(null);
    this.updateRig();
    const focus = this.phones.focus(index, this.camera);
    if (!focus) return Promise.resolve();
    this.phones.pause();
    return new Promise((resolve) => {
      this.dive = {
        book: this.camera.clone(),
        ...focus,
        progress: 0,
        direction: 1,
        index,
        resolve,
      };
      this.host.style.pointerEvents = "none";
      this.last = 0;
      if (this.motion.matches) {
        this.dive.progress = 1;
        this.applyDive();
        this.render();
        resolve();
        this.dive.resolve = undefined;
      } else this.schedule();
    });
  }
  returnToBook(): Promise<void> {
    if (!this.dive) return Promise.resolve();
    return new Promise((resolve) => {
      this.dive!.resolve?.();
      this.dive!.resolve = resolve;
      this.dive!.direction = -1;
      this.last = 0;
      if (this.motion.matches) {
        this.dive!.progress = 0;
        this.applyDive();
        this.finishDive();
        this.render();
      } else this.schedule();
    });
  }
  private applyDive() {
    const d = this.dive!;
    const t = d.progress * d.progress * (3 - 2 * d.progress);
    this.camera.position.lerpVectors(d.book.position, d.position, t);
    // Preserve the user's perspective for the entire dolly, including lens and view offset.
    this.camera.quaternion.copy(d.book.quaternion);
    this.camera.zoom = d.book.zoom;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.host.style.opacity = String(
      1 - THREE.MathUtils.smoothstep(d.progress, 0.78, 1),
    );
    this.host.dataset.diveProgress = d.progress.toFixed(3);
  }
  private finishDive() {
    const d = this.dive;
    if (!d) return;
    this.camera.copy(d.book);
    this.camera.updateMatrixWorld(true);
    this.host.style.opacity = "1";
    this.host.style.pointerEvents = "";
    this.host.dataset.diveProgress = "0";
    this.dive = null;
    d.resolve?.();
    this.last = 0;
    this.updatePhones();
    this.updatePhase();
    this.report();
    this.schedule();
  }
  goTo(page: number) {
    this.callbacks.onMiniatureHover?.(null);
    if (this.dive) return;
    if (this.grip?.moved) {
      this.pendingPage = clamp(page, -1, this.callbacks.projects.length);
      this.callbacks.onRequest(this.pendingPage);
      this.report();
      return;
    }
    this.intro = false;
    this.elapsed = INTRO_DURATION;
    this.scheduler.request(clamp(page + 1, 0, this.leaves.length));
    this.callbacks.onRequest(this.scheduler.requested - 1);
    if (this.motion.matches) {
      this.scheduler.snap(this.scheduler.requested, true);
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
    this.updatePhones();
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
    this.goTo((this.pendingPage ?? this.scheduler.requested - 1) + direction);
  }
  skip = () => {
    if (this.intro) this.finishArrival();
    this.intro = false;
    this.elapsed = INTRO_DURATION;
    this.scheduler.snap(this.scheduler.requested, true);
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
    this.updatePhones();
    this.setPrinting(
      this.scheduler.committed > 0 &&
        this.scheduler.committed < this.leaves.length,
    );
    this.renderer.shadowMap.needsUpdate = true;
    this.updateCoverArtwork();
    this.render();
    this.schedule();
  };
  replay = () => {
    if (this.dive) {
      this.dive.progress = 0;
      this.applyDive();
      this.finishDive();
    }
    this.pendingPage = null;
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
    this.phones.step(0, -1, true, false);
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
        [
          ...this.leaves.map((leaf) => leaf.mesh),
          ...this.paperInserts,
          ...this.popups.hitMeshes,
          ...this.phones.hitMeshes,
        ],
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
      Math.abs(point.x) < this.pageWidth + 0.15 &&
      Math.abs(point.z) < H / 2 + 0.1
      ? point.x >= 0
        ? 1
        : -1
      : null;
  }
  private onMove = (event: PointerEvent) => {
    if (this.dive) return;
    const grip = this.grip;
    if (!grip) {
      const hit = this.bookHit(event);
      const id = hit?.object.userData.miniature;
      this.callbacks.onMiniatureHover?.(
        id && !this.scheduler.moving
          ? { id, x: event.clientX, y: event.clientY }
          : null,
      );
      this.setHover(id ? null : hit ? Number(hit.object.userData.leaf) : null);
      if (id) this.host.style.cursor = "pointer";
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
          3,
        dy =
          ((event.clientY - grip.lastY) /
            Math.max(280, this.host.clientHeight)) *
          Math.PI *
          3;
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
    this.callbacks.onMiniatureHover?.(null);
    this.suppressClick = false;
    if (
      this.dive ||
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
    if (this.pendingPage !== null) {
      const page = this.pendingPage;
      this.pendingPage = null;
      this.goTo(page);
    }
    this.updatePhase();
    this.setHover(null);
    this.report();
    this.schedule();
  };
  private onCancel = (event: PointerEvent) => {
    if (this.grip?.id !== event.pointerId) return;
    this.suppressClick = this.grip.moved;
    this.releaseCapture();
    if (this.pendingPage !== null) {
      const page = this.pendingPage;
      this.pendingPage = null;
      this.goTo(page);
    }
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
    this.callbacks.onMiniatureHover?.(null);
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
    if (this.dive) return;
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
    if (hit.object.userData.miniature && !this.scheduler.moving) {
      this.callbacks.onMiniatureOpen?.(
        hit.object.userData.miniature,
        event.clientX,
        event.clientY,
      );
      return;
    }
    if (
      hit.object.userData.phone &&
      id === boundary &&
      !this.scheduler.moving &&
      boundary > 0 &&
      boundary < this.leaves.length
    ) {
      this.callbacks.onOpen();
      return;
    }
    if (boundary === 0 && !this.scheduler.moving) this.stepPage(1);
    else if (boundary === this.leaves.length && !this.scheduler.moving)
      this.stepPage(-1);
    else
      this.stepPage(
        this.localReadingSide() ?? (this.leaves[id].progress > 0.5 ? -1 : 1),
      );
  };
  private resize = () => {
    const rect = this.host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.renderer.setSize(rect.width, rect.height);
    this.css.setSize(rect.width, rect.height);
    const desktop = matchMedia("(min-width: 761px)").matches;
    // Retain the original composition/scale, while drawing into the former UI margins.
    // This gives raised pages clearance without zooming the book during a turn.
    const top = this.callbacks.stageInsets?.top ?? (desktop ? 48 : 0),
      bottom = this.callbacks.stageInsets?.bottom ?? (desktop ? 90 : 0),
      viewHeight = Math.max(1, rect.height - top - bottom);
    if (this.dive) this.camera.copy(this.dive.book);
    this.camera.clearViewOffset();
    this.camera.aspect = rect.width / viewHeight;
    const half = Math.atan(
        Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
          Math.min(1, this.camera.aspect),
      ),
      legacyDistance = (this.sceneRadius / Math.sin(half)) * 1.02;
    const direction = new THREE.Vector3(0.18, 0.9, 0.67).normalize();
    this.camera.up.set(0.035, 1, 0);
    this.camera.position.copy(direction);
    this.camera.lookAt(0, 0, 0);
    const { distance: fittedDistance, focus } = fitTurnEnvelope(
      this.viewEnvelope,
      this.camera.quaternion,
      this.camera.fov,
      this.camera.aspect,
    );
    const distance = fittedDistance * 1.06;
    this.desktopScale = desktop ? 1.2 : 1;
    this.camera.zoom = this.desktopScale;
    // Shift the static composition up without changing focal length or drag scale.
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(
      this.camera.quaternion,
    );
    focus.addScaledVector(
      up,
      -distance *
        Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
        (desktop ? 0.13 : 0.19),
    );
    this.cameraFocus.copy(focus);
    this.displayScale = legacyDistance / distance;
    this.camera.position.copy(focus).addScaledVector(direction, distance);
    this.camera.lookAt(focus);
    this.camera.far = Math.max(100, distance + 80);
    if (desktop)
      this.camera.setViewOffset(
        rect.width,
        viewHeight,
        0,
        -top,
        rect.width,
        rect.height,
      );
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.updateRig();
    if (this.dive) {
      this.dive.book = this.camera.clone();
      const focus = this.phones.focus(this.dive.index, this.camera);
      if (focus) {
        this.dive.position.copy(focus.position);
      }
      this.applyDive();
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
  };
  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed || this.overlayOpen || !this.visible || document.hidden)
      return;
    if (this.software && this.last && now - this.last < 100) {
      this.schedule();
      return;
    }
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.25) : 0;
    this.last = now;
    if (this.dive) {
      this.dive.progress = clamp(
        this.dive.progress + (dt / 0.9) * this.dive.direction,
        0,
        1,
      );
      this.applyDive();
      if (this.dive.progress === 0 && this.dive.direction === -1)
        this.finishDive();
      else if (this.dive.progress === 1 && this.dive.direction === 1) {
        this.dive.resolve?.();
        this.dive.resolve = undefined;
      }
      this.render();
      this.schedule();
      return;
    }
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
      this.rotationImpulse,
    );
    const changed =
      (this.popups.folded && this.phones.folded) || !this.scheduler.moving
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
    this.updatePhones();
    this.setPrinting(
      !this.intro &&
        !this.scheduler.moving &&
        this.scheduler.committed > 0 &&
        this.scheduler.committed < this.leaves.length,
    );
    this.updateHighlight(dt);
    if (!this.motion.matches) this.portalTime += dt;
    this.updateArtwork(this.portalTime);
    // Printed cover animation shares the scene clock and sleeps inside the book.
    this.updateCoverArtwork();
    this.updatePhones(dt);
    this.render();
    this.schedule();
  };
  private updatePhones(dt = 0) {
    this.phones.step(
      dt,
      !this.intro &&
        !this.scheduler.moving &&
        this.scheduler.committed > 0 &&
        this.scheduler.committed < this.leaves.length
        ? this.scheduler.committed - 1
        : -1,
      this.motion.matches,
      this.visible,
    );
  }
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
          Math.abs(p.getX(i) - u * this.pageWidth) + Math.abs(p.getZ(i) - (0.5 - v) * H);
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
    for(const mesh of this.paperInserts)for(const i of INSERT_SAMPLES){
      mesh.getVertexPosition(i,this.scratch);this.scratch.applyMatrix4(mesh.matrixWorld).project(this.camera);
      b.left=Math.min(b.left,this.scratch.x);b.right=Math.max(b.right,this.scratch.x);b.top=Math.min(b.top,this.scratch.y);b.bottom=Math.max(b.bottom,this.scratch.y);
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
    data.requestedPage = String(
      this.pendingPage ?? this.scheduler.requested - 1,
    );
    data.settledBoundary = String(boundary);
    data.leftArtwork = this.leaves[this.index].faces[1].uuid;
    data.rightArtwork = this.rightTextures[this.index].uuid;
    if (this.callbacks.pageArtwork) {
      data.leftPrint = this.leftTextures[this.index].image.dataset.flyerId ?? "";
      data.rightPrint = this.rightTextures[this.index].image.dataset.flyerId ?? "";
    }
    data.turnBackArtwork = active?.faces[1].uuid ?? data.leftArtwork;
    data.turnProgress = (
      active ? (active.target ? active.progress : 1 - active.progress) : 0
    ).toFixed(4);
    data.turnDirection = active ? (active.target ? "1" : "-1") : "0";
    data.capturedPages = String(this.callbacks.printPages?.length ?? 0);
    data.pageCount = String(this.leaves.length * 2);
    data.paperInserts = String(this.paperInserts.length);
    if (this.callbacks.coverArtwork) data.coverFrame = this.callbacks.coverArtwork.front.dataset.frame ?? "static";
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
    data.framingRadius = String(this.sceneRadius);
    data.pageWidth = String(this.pageWidth);
    data.pageAspect = String(this.pageWidth / H);
    data.framingVertices = String(this.viewEnvelope.length);
    data.lightPosition = JSON.stringify(this.keyLight.position.toArray());
    data.printResolution = "1200x1694";
    data.portalCoverage = "full-page";
    data.phoneCount = String(this.phones.count);
    const phone = this.phones.center(this.index);
    if (phone) {
      const projected = phone.project(this.camera),
        rect = this.host.getBoundingClientRect();
      data.phoneHit = JSON.stringify({
        x: rect.left + ((projected.x + 1) * rect.width) / 2,
        y: rect.top + ((1 - projected.y) * rect.height) / 2,
      });
    } else data.phoneHit = "null";
    data.phoneModel = "rigid-pro-style";
    data.diveProgress = String(this.dive?.progress ?? 0);
    data.popupNames = JSON.stringify(this.popups.names());
    data.modelScale = String(this.orbit.scale.x);
    data.bookColorMode = this.dark ? "dark" : "light";
    data.displayScale = String(this.displayScale);
    data.desktopMagnification = String(this.desktopScale);
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
      this.overlayOpen ||
      this.raf ||
      this.disposed ||
      !this.visible ||
      document.hidden
    )
      return;
    if (this.dive?.progress === 1 && this.dive.direction === 1) return;
    if (
      !this.dive &&
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
    if (this.dive) {
      if (this.motion.matches) {
        this.dive.progress = this.dive.direction === 1 ? 1 : 0;
        this.applyDive();
        if (this.dive.direction === -1) this.finishDive();
        else {
          this.dive.resolve?.();
          this.dive.resolve = undefined;
        }
        this.render();
      } else this.schedule();
      return;
    }
    if (this.motion.matches) {
      this.scheduler.request(this.scheduler.requested);
      this.skip();
    } else {
      this.last = 0;
      this.schedule();
    }
  };
  private onVisibility = () => {
    this.phones.pause();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = 0;
    this.schedule();
  };
  dispose() {
    this.disposed = true;
    this.dive?.resolve?.();
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
    this.phones.dispose();
    this.popups.dispose();
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
