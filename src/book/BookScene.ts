import * as THREE from "three";
import { surfaceDetail, studioEnvironment, roundedSlab } from "./surfaces";
import { ImpactDust, contactShadow } from "./effects";
import { AsciiPortal } from "./ascii";
import {
  advancePageTurn,
  pageJoints,
  PAGE_JOINTS,
  OPENING,
  LAST_LEAF_START,
  PORTAL_REVEAL,
  PRINT_REVEAL,
  TRANSFER_END,
} from "./page-turn";
import { BookMotion } from "./motion";
import { createBinding, shapeInnerEdge, gutterDip } from "./binding";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import {
  PAGE_WIDTH as W,
  PAGE_HEIGHT as H,
  STACK,
  SURFACE,
  clothTexture,
  paperTexture,
  edgeTexture,
  pageTexture,
  blankPageCanvas,
  type Project,
} from "./materials";
const END = OPENING.end;
const ease = (x: number) => {
  const p = THREE.MathUtils.clamp(x, 0, 1);
  return p * p * p * (p * (p * 6 - 15) + 10);
};
const clamp = THREE.MathUtils.clamp;
type Phase =
  | "dropping"
  | "opening"
  | "flipping"
  | "settling"
  | "ready"
  | "carrying"
  | "falling"
  | "turning"
  | "closing";
type Callbacks = {
  onPhase: (phase: Phase) => void;
  onIndex: (index: number) => void;
  projects: Project[];
  onSpread: (left: number, right: number) => void;
  onOpen: () => void;
  onView?: (page: number) => void;
  printPages?: HTMLCanvasElement[];
};
type Sheet = {
  mesh: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshStandardMaterial | THREE.MeshPhongMaterial
  >;
  back: { value: THREE.Texture };
  start: number;
  duration: number;
};
type Turn = {
  direction: number;
  progress: number;
  target: number;
  velocity: number;
  twist: number;
  released: boolean;
  destination: number;
};
type Grip = {
  id: number;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  anchor: THREE.Vector3;
  moved: boolean;
};

/** Fixed-camera studio book with shared printed surfaces, articulated leaves, and whole-book pickup. */
export class BookScene {
  leftPage = document.createElement("div");
  rightPage = document.createElement("div");
  private scene = new THREE.Scene();
  private printing = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(24, 1, 0.1, 160);
  private renderer: THREE.WebGLRenderer;
  private css = new CSS3DRenderer();
  private rig = new THREE.Group();
  private printRig = new THREE.Group();
  private lid = new THREE.Group();
  private rightStack = new THREE.Group();
  private leftStack = new THREE.Group();
  private spine!: THREE.Mesh;
  private binding!: ReturnType<typeof createBinding>;
  private leftSurface!: Sheet;
  private rightSurface!: Sheet;
  private blank!: THREE.CanvasTexture;
  private mass = new BookMotion();
  private table = new THREE.Vector2();
  private dropAge = 10;
  private portal = new AsciiPortal();
  private portalTime = 0;
  private rightCanvas = blankPageCanvas();
  private rightTexture = new THREE.CanvasTexture(this.rightCanvas);
  private paperCanvas = blankPageCanvas();
  private sheets: Sheet[] = [];
  private turnSheet!: Sheet;
  private textures = new Set<THREE.Texture>();
  private pageCache = new Map<string, THREE.Texture>();
  private dust = new ImpactDust();
  private contact = contactShadow();
  private environment: THREE.WebGLRenderTarget | null = null;
  private envelope: THREE.Vector3[] = [];
  private scratch = new THREE.Vector3();
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private phase: Phase = "dropping";
  private index = 0;
  private turn: Turn | null = null;
  private grip: Grip | null = null;
  private openAmount = 1;
  private coverBack = false;
  private coverMotion: { from: number; to: number; elapsed: number } | null =
    null;
  private selectedPage: number | null = null;
  private software = false;
  private disposed = false;
  private visible = true;
  private suppressClick = false;
  private resizeObserver: ResizeObserver;
  private intersection: IntersectionObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -SURFACE);
  private hit = new THREE.Vector3();
  constructor(
    private host: HTMLElement,
    private callbacks: Callbacks,
    initial = 0,
  ) {
    this.index = initial;
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
      Math.min(devicePixelRatio, this.software ? 0.7 : 1.5),
    );
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.domElement.className = "book-webgl";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.css.domElement.className = "book-printing";
    this.host.append(this.renderer.domElement, this.css.domElement);
    this.environment = studioEnvironment(this.renderer, this.software);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.72;
    this.scene.add(this.rig, this.dust.mesh, this.contact.mesh);
    this.keep(this.contact.texture);
    this.contact.mesh.position.y = -1.45;
    this.rightTexture.colorSpace = THREE.SRGBColorSpace;
    this.keep(this.rightTexture);
    this.updatePortal(0);
    this.printing.add(this.printRig);
    this.light();
    this.buildBook();
    this.buildPrinting();
    this.sampleEnvelope();
    // Compile hidden leaf materials once, with the same light count used by every pose.
    this.sheets.forEach((s) => (s.mesh.visible = true));
    this.dust.mesh.visible = true;
    this.turnSheet.mesh.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this.dust.mesh.visible = false;
    this.sheets.forEach((s) => (s.mesh.visible = false));
    this.turnSheet.mesh.visible = false;
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
    host.addEventListener("click", this.onClick, true);
    if (this.motion.matches) {
      this.elapsed = END;
      this.setOpen();
    } else this.updateIntro();
    this.resize();
    if (this.motion.matches) this.skip();
    else this.schedule();
  }
  private light() {
    this.scene.add(new THREE.HemisphereLight("#f1eeff", "#4b435f", 1.1));
    const key = new THREE.DirectionalLight("#fffaff", 2.7);
    key.position.set(-3, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(
      this.software ? 512 : 1024,
      this.software ? 512 : 1024,
    );
    Object.assign(key.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 1,
      far: 22,
    });
    key.shadow.radius = 4;
    key.shadow.normalBias = 0.018;
    key.shadow.bias = -0.00015;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#dbeaff", 0.35);
    fill.position.set(5, 6, -4);
    this.scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.5;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }
  private keep(texture: THREE.Texture) {
    texture.anisotropy = this.software
      ? 1
      : Math.min(
          texture.anisotropy,
          this.renderer.capabilities.getMaxAnisotropy(),
        );
    this.textures.add(texture);
    return texture;
  }
  private getPage(index: number, side: "left" | "right") {
    if (side === "right") return this.rightTexture;
    const key = `${index}:${side}`;
    if (!this.pageCache.has(key))
      this.pageCache.set(
        key,
        this.keep(
          pageTexture(
            this.callbacks.projects[index],
            index,
            side,
            this.callbacks.printPages?.[index],
          ),
        ),
      );
    return this.pageCache.get(key)!;
  }
  private surface(
    params: THREE.MeshPhysicalMaterialParameters,
  ): THREE.MeshStandardMaterial | THREE.MeshPhongMaterial {
    if (!this.software) return new THREE.MeshPhysicalMaterial(params);
    const rough = params.roughness ?? 0.8,
      metal = params.metalness ?? 0;
    return new THREE.MeshPhongMaterial({
      color: params.color,
      map: params.map,
      normalMap: params.normalMap,
      normalScale: params.normalScale,
      side: params.side,
      shininess: metal > 0 ? 65 : Math.max(2, (1 - rough) * 65),
      specular: new THREE.Color(
        metal > 0 ? "#b9a77e" : rough > 0.9 ? "#15150f" : "#4c4030",
      ),
      envMap: rough < 0.9 ? this.environment!.texture : null,
      combine: THREE.MixOperation,
      reflectivity: metal > 0 ? 0.58 : 0.095,
    });
  }
  private buildBook() {
    const clothDetail = surfaceDetail("cloth"),
      paperDetail = surfaceDetail("paper");
    for (const detail of [clothDetail, paperDetail])
      for (const map of Object.values(detail)) this.keep(map);
    const cloth = this.keep(clothTexture()),
      paper = this.keep(paperTexture()),
      edges = this.keep(edgeTexture());
    const bindingCover = this.surface({
      color: "#292731",
      map: clothDetail.albedo,
      normalMap: clothDetail.normal,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughnessMap: clothDetail.roughness,
      roughness: 0.86,
      sheen: this.software ? 0 : 0.12,
      sheenColor: new THREE.Color("#77718c"),
    });
    const cover = this.surface({
      map: cloth,
      normalMap: clothDetail.normal,
      normalScale: new THREE.Vector2(0.24, 0.24),
      roughnessMap: clothDetail.roughness,
      roughness: 0.79,
      clearcoat: this.software ? 0 : 0.08,
      clearcoatRoughness: 0.65,
      sheen: this.software ? 0 : 0.16,
      sheenColor: new THREE.Color("#77718c"),
    });
    const liner = this.surface({
      color: "#302d3a",
      map: clothDetail.albedo,
      normalMap: clothDetail.normal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.93,
    });
    const materials = [cover, liner, bindingCover];
    const bottom = new THREE.Mesh(
      roundedSlab(W + 0.14, H + 0.16, 0.14, 0.09, 0.025),
      [liner, cover, bindingCover],
    );
    bottom.position.set(W / 2, -0.035, 0);
    bottom.castShadow = bottom.receiveShadow = true;
    this.rig.add(bottom);
    const top = new THREE.Mesh(
      roundedSlab(W + 0.14, H + 0.16, 0.14, 0.09, 0.025),
      materials,
    );
    top.position.x = W / 2;
    top.castShadow = top.receiveShadow = true;
    this.lid.add(top);
    this.rig.add(this.lid);
    const pageMat = this.surface({
      map: paper,
      normalMap: paperDetail.normal,
      normalScale: new THREE.Vector2(0.09, 0.09),
      roughnessMap: paperDetail.roughness,
      roughness: 0.6,
    });
    this.binding = createBinding(
      bindingCover,
      pageMat,
      this.surface({ color: "#aaa5b6", roughness: 1 }),
    );
    this.spine = this.binding.spine;
    this.rig.add(this.spine, this.binding.fold, this.binding.seams);
    const edgeMat = this.surface({
      map: edges,
      color: "#f5f4ef",
      roughness: 1,
    });
    const stack = (sign: number) => {
      const group = new THREE.Group();
      group.position.y = 0.1;
      const block = new THREE.Mesh(
        shapeInnerEdge(
          roundedSlab(W - 0.035, H - 0.025, STACK, 0.065, 0.018),
          (sign * W) / 2,
          STACK,
        ),
        [pageMat, pageMat, edgeMat],
      );
      block.position.set((sign * W) / 2, STACK / 2, 0);
      block.castShadow = block.receiveShadow = true;
      group.add(block);
      // Additional thin, uneven signatures make the fore-edge read as hundreds of leaves.
      const signatureMat = this.surface({
        color: "#d6d4db",
        roughness: 1,
      });
      for (let i = 0; i < 9; i++) {
        const signature = new THREE.Mesh(
          shapeInnerEdge(
            roundedSlab(W - 0.04, H - 0.025, 0.012, 0.065, 0.002),
            (sign * W) / 2,
            0.012,
            (i + 1) / 10,
          ),
          signatureMat,
        );
        signature.position.set(
          (sign * W) / 2,
          (STACK * (i + 1)) / 10,
          0.008 * Math.sin(i * 2),
        );
        signature.receiveShadow = true;
        group.add(signature);
      }
      return group;
    };
    this.rightStack = stack(1);
    this.leftStack = stack(-1);
    this.rig.add(this.rightStack, this.leftStack);
    this.blank = this.keep(
      new THREE.CanvasTexture(this.paperCanvas),
    ) as THREE.CanvasTexture;
    this.blank.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < OPENING.count; i++) {
      const sheet = this.makeSheet(
        this.blank,
        i === OPENING.count - 1 ? this.getPage(0, "left") : this.blank,
        28,
        6,
      );
      sheet.start = OPENING.riffleStart + i * OPENING.step;
      sheet.duration =
        i === OPENING.count - 1 ? OPENING.lastDuration : OPENING.leafDuration;
      this.sheets.push(sheet);
    }
    this.turnSheet = this.makeSheet(
      this.getPage(this.index, "right"),
      this.getPage(this.index, "left"),
      48,
      16,
    );
    this.leftSurface = this.makeSheet(
      this.getPage(this.index, "left"),
      this.getPage(this.index, "left"),
      48,
      16,
    );
    this.rightSurface = this.makeSheet(
      this.rightTexture,
      this.rightTexture,
      48,
      16,
    );
    // The resting verso faces upward too, so shadow bias uses the paper's visible normal.
    const leftGeometry = this.leftSurface.mesh.geometry,
      index = leftGeometry.index!,
      uv = leftGeometry.attributes.uv;
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    index.needsUpdate = true;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    uv.needsUpdate = true;
    this.leftSurface.mesh.castShadow =
      this.rightSurface.mesh.castShadow = false;

    this.refreshSurfaces();
  }

  private makeSheet(
    front: THREE.Texture,
    back: THREE.Texture,
    columns: number,
    rows: number,
  ): Sheet {
    const geometry = new THREE.PlaneGeometry(
      W - 0.055,
      H - 0.055,
      columns,
      rows,
    );
    const material = this.surface({
      map: front,
      roughness: 0.38,
      clearcoat: this.software ? 0 : 0.15,
      clearcoatRoughness: 0.35,
      side: THREE.DoubleSide,
    });
    const backUniform = { value: back };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.backMap = backUniform;
      shader.fragmentShader =
        "uniform sampler2D backMap;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor = texture2D(backMap,vec2(1.0-vMapUv.x,vMapUv.y));",
      );
    };
    material.customProgramCacheKey = () => "two-sided-printed-page";
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.visible = false;
    this.rig.add(mesh);
    return { mesh, back: backUniform, start: 0, duration: 1 };
  }
  private bend(
    sheet: Sheet,
    progress: number,
    direction = 1,
    twist = 0,
    baseY = SURFACE + 0.018,
  ) {
    const p = clamp(progress, 0, 1),
      arc = Math.sin(Math.PI * p);
    const geometry = sheet.mesh.geometry,
      pos = geometry.attributes.position;
    const cols = geometry.parameters.widthSegments,
      rows = geometry.parameters.heightSegments,
      dx = (W - 0.055) / cols;
    for (let row = 0; row <= rows; row++) {
      const v = row / rows,
        joints = pageJoints(p, direction, v, twist);
      let x = 0.012,
        y = baseY;
      for (let col = 0; col <= cols; col++) {
        const u = col / cols;
        if (col > 0) {
          const s = (col - 0.5) / cols;
          const joint = s * PAGE_JOINTS,
            index = Math.min(PAGE_JOINTS - 1, Math.floor(joint)),
            weight = joint - index;
          const angle = THREE.MathUtils.lerp(
            joints[index],
            joints[index + 1],
            weight,
          );
          x += Math.cos(angle) * dx;
          y += Math.sin(angle) * dx;
        }
        const i = row * (cols + 1) + col;
        pos.setXYZ(
          i,
          x,
          y + gutterDip(x) + 0.11 * Math.sin(u * Math.PI) * (1 - arc),
          (v - 0.5) * (H - 0.055) + Math.sin(u * Math.PI) * arc * twist * 0.06,
        );
      }
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    sheet.mesh.visible = true;
  }
  private buildPrinting() {
    for (const [i, element] of [this.leftPage, this.rightPage].entries()) {
      element.className = `printed-page print-overlay ${i === 0 ? "page-verso" : "page-recto"}`;
      const obj = new CSS3DObject(element);
      obj.rotation.x = -Math.PI / 2;
      obj.scale.setScalar((W - 0.055) / 600);
      obj.position.set(((i === 0 ? -1 : 1) * W) / 2, SURFACE + 0.028, 0);
      this.printRig.add(obj);
    }
    this.setPrint(false, false);
  }
  private setPrint(left: boolean, right: boolean) {
    for (const [element, show] of [
      [this.leftPage, left],
      [this.rightPage, right],
    ] as const) {
      element.style.opacity = show ? "1" : "0";
      element.inert = !show;
    }
  }
  private syncRig() {
    this.printRig.position.copy(this.rig.position);
    this.printRig.quaternion.copy(this.rig.quaternion);
  }
  private setOpen() {
    this.openAmount = 1;
    this.rig.position.set(this.table.x, 0, this.table.y);
    this.rig.rotation.set(0, 0, 0);
    this.lid.rotation.z = Math.PI;
    this.lid.position.y = -0.035;
    this.rightStack.scale.y = 1;
    this.leftStack.scale.y = 1;
    this.leftStack.visible = true;
    this.binding.update(SURFACE, SURFACE, 1);
    this.refreshSurfaces();
    this.syncRig();
  }
  private setPhase(phase: Phase) {
    if (this.phase === phase && this.host.dataset.phase) return;
    this.phase = phase;
    this.host.dataset.phase = phase;
    this.callbacks.onPhase(phase);
  }
  private updateIntro() {
    const t = this.elapsed;
    this.poseIntro(t);
    this.dust.update(t - 0.59, this.motion.matches);
    this.setPhase(
      t < 1.02
        ? "dropping"
        : t < 2.05
          ? "opening"
          : t < LAST_LEAF_START
            ? "flipping"
            : "settling",
    );
    if (t >= END) this.skip();
  }
  private poseIntro(t: number) {
    const cover = ease((t - 1.02) / 1.48),
      transfer = ease(
        (t - OPENING.riffleStart) / (TRANSFER_END - OPENING.riffleStart),
      );
    const impact = t - 0.59;
    const height =
      t < 0.59
        ? 1.65 * (1 - (t / 0.59) ** 2)
        : 0.31 * Math.exp(-4.8 * impact) * Math.abs(Math.sin(11 * impact));
    const wobble =
      t < 0.59
        ? -0.13 * (1 - t / 0.59)
        : 0.065 * Math.exp(-4.6 * impact) * Math.sin(14 * impact);
    this.rig.position.set((-W / 2) * (1 - cover), Math.max(0, height), 0);
    this.rig.rotation.set(wobble * 0.25, 0, wobble);
    const coverBounce =
      t > 2.5
        ? 0.07 * Math.exp(-(t - 2.5) * 5) * Math.abs(Math.sin((t - 2.5) * 12))
        : 0;
    this.lid.rotation.z = Math.PI * cover - coverBounce;
    this.lid.position.y = (STACK * 2 + 0.21) * (1 - cover) - 0.035 * cover;
    this.rightStack.scale.y = 2 - transfer;
    this.leftStack.visible = transfer > 0.001;
    this.leftStack.scale.y = Math.max(0.001, transfer);
    this.binding.update(
      0.12 + STACK * transfer,
      0.12 + STACK * (2 - transfer),
      cover,
    );
    for (const sheet of this.sheets) {
      const p = (t - sheet.start) / sheet.duration;
      sheet.mesh.visible = p > 0 && p < 1;
      if (sheet.mesh.visible)
        this.bend(
          sheet,
          ease(p),
          1,
          0.18 * Math.sin(sheet.start * 9),
          THREE.MathUtils.lerp(
            0.1 + STACK * (2 - transfer),
            0.1 + STACK * transfer,
            ease(p),
          ) + 0.018,
        );
    }
    this.leftSurface.mesh.visible = t > PRINT_REVEAL;
    this.rightSurface.mesh.visible = true;
    this.updatePortal(this.portalTime, t > PORTAL_REVEAL);
    this.syncRig();
  }
  skip = () => {
    this.elapsed = END;
    this.callbacks.onSpread(this.index, this.index);
    this.leftPage.style.clipPath = "none";
    this.rightPage.style.clipPath = "none";
    this.turn = null;
    this.coverMotion = null;
    this.selectedPage = null;
    this.releaseCapture();
    if (this.mass.state !== "rest") {
      this.table.set(this.mass.position.x, this.mass.position.z);
      this.mass.reset(this.table.x, this.table.y);
    }
    this.turnSheet.mesh.visible = false;
    for (const sheet of this.sheets) sheet.mesh.visible = false;
    this.setOpen();
    this.setPrint(true, true);
    this.dust.update(-1);
    this.callbacks.onView?.(this.index);
    this.setPhase("ready");
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
    this.schedule();
  };
  replay = () => {
    this.releaseCapture();
    this.index = 0;
    this.selectedPage = null;
    this.coverMotion = null;
    this.openAmount = 1;
    this.callbacks.onView?.(0);
    this.callbacks.onIndex(0);
    this.turn = null;
    this.turnSheet.mesh.visible = false;
    this.table.set(0, 0);
    this.mass.reset();
    this.elapsed = 0;
    this.dust.mesh.position.set(0, 0, 0);
    this.dust.mesh.scale.x = 1;
    this.dust.update(-1);
    this.portalTime = 0;
    this.updatePortal(0);
    this.last = 0;
    this.setPrint(false, false);
    if (this.motion.matches) {
      this.skip();
      return;
    }
    this.updateIntro();
    this.setPhase("dropping");
    this.schedule();
  };
  private beginTurn(direction: number, manual = false) {
    if (this.phase !== "ready" || this.openAmount < 1) return false;
    const destination = this.index + direction;
    if (destination < 0 || destination >= this.callbacks.projects.length)
      return false;
    this.turnSheet.mesh.material.map = this.getPage(
      direction > 0 ? this.index : destination,
      "right",
    );
    this.turnSheet.back.value = this.getPage(
      direction > 0 ? destination : this.index,
      "left",
    );
    this.turn = {
      direction,
      destination,
      progress: 0,
      target: manual ? 0 : 1,
      velocity: 0,
      twist: 0,
      released: !manual,
    };
    if (direction < 0) {
      this.leftSurface.back.value = this.getPage(destination, "left");
      this.leftSurface.mesh.material.map = this.getPage(destination, "left");
    }
    this.callbacks.onSpread(
      direction > 0 ? this.index : destination,
      direction > 0 ? destination : this.index,
    );
    this.leftPage.style.clipPath = "none";
    this.rightPage.style.clipPath = "none";
    this.last = 0;
    this.setPhase("turning");
    this.schedule();
    return true;
  }
  /** A single target keeps rapid navigation changes ordered without losing a page. */
  goTo(page: number) {
    if (this.grip || this.mass.state !== "rest") return;
    const target = clamp(page, -1, this.callbacks.projects.length);
    if (this.elapsed < END) this.skip();
    this.selectedPage = target;
    this.advanceSelection();
    if (this.motion.matches) {
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
    }
    this.schedule();
  }
  private advanceSelection() {
    const target = this.selectedPage;
    if (
      target === null ||
      this.turn ||
      this.coverMotion ||
      this.phase !== "ready"
    )
      return;
    const closed = target === -1 || target === this.callbacks.projects.length;
    if (this.openAmount === 0) {
      if (closed && this.coverBack === (target !== -1)) {
        this.selectedPage = null;
        return;
      }
      this.startCover(1);
      return;
    }
    const destination =
      target === -1 ? 0 : Math.min(target, this.callbacks.projects.length - 1);
    if (this.index !== destination) {
      if (this.motion.matches) {
        this.index = destination;
        this.callbacks.onIndex(destination);
        this.callbacks.onSpread(destination, destination);
        this.refreshSurfaces();
      } else {
        this.beginTurn(Math.sign(destination - this.index));
        return;
      }
    }
    if (closed) {
      this.coverBack = target !== -1;
      this.startCover(0);
    } else {
      this.selectedPage = null;
      this.callbacks.onView?.(this.index);
    }
  }
  private startCover(to: number) {
    this.coverMotion = { from: this.openAmount, to, elapsed: 0 };
    this.setPhase(to ? "opening" : "closing");
    if (this.motion.matches) this.stepCover(2);
  }
  private poseCover(amount: number) {
    this.openAmount = amount;
    this.rig.position.set(
      this.table.x - (W / 2) * (1 - amount),
      0,
      this.table.y,
    );
    this.lid.rotation.z = Math.PI * amount;
    this.lid.position.y = (STACK * 2 + 0.21) * (1 - amount) - 0.035 * amount;
    this.rightStack.scale.y = 2 - amount;
    this.leftStack.scale.y = Math.max(0.001, amount);
    this.leftStack.visible = amount > 0.001;
    this.binding.update(
      0.12 + STACK * amount,
      0.12 + STACK * (2 - amount),
      amount,
    );
    this.leftSurface.mesh.visible = this.rightSurface.mesh.visible =
      amount > 0.999;
    this.setPrint(amount > 0.999, amount > 0.999);
    this.syncRig();
  }
  private stepCover(dt: number) {
    const motion = this.coverMotion;
    if (!motion) return;
    motion.elapsed += dt;
    const p = Math.min(1, motion.elapsed / 1.65);
    this.poseCover(THREE.MathUtils.lerp(motion.from, motion.to, ease(p)));
    if (p === 1) {
      this.coverMotion = null;
      this.setPhase("ready");
      this.callbacks.onView?.(
        motion.to
          ? this.index
          : this.coverBack
            ? this.callbacks.projects.length
            : -1,
      );
      this.advanceSelection();
    }
  }
  turnPage(direction: number) {
    if (this.openAmount < 1) {
      this.goTo(this.coverBack ? this.callbacks.projects.length - 1 : 0);
      return true;
    }
    if (this.motion.matches) {
      const next = this.index + direction;
      if (
        this.phase !== "ready" ||
        next < 0 ||
        next >= this.callbacks.projects.length
      )
        return false;
      this.index = next;
      this.callbacks.onIndex(next);
      this.refreshSurfaces();
      this.report();
      this.render();
      return true;
    }
    return this.beginTurn(direction);
  }
  private stepTurn(dt: number) {
    const turn = this.turn;
    if (!turn) return;
    const next = advancePageTurn(turn.progress, turn.velocity, turn.target, dt);
    turn.progress = next.progress;
    turn.velocity = next.velocity;
    const p = clamp(turn.progress, 0, 1);
    this.bend(this.turnSheet, p, turn.direction, turn.twist, SURFACE + 0.021);
    // Real depth occlusion now handles both resting and turning printed faces.
    this.setPrint(true, true);
    if (
      turn.released &&
      Math.abs(turn.target - turn.progress) < 0.0018 &&
      Math.abs(turn.velocity) < 0.045
    ) {
      const complete = turn.target === 1;
      if (complete) {
        this.index = turn.destination;
        this.callbacks.onIndex(this.index);
      }
      this.callbacks.onSpread(this.index, this.index);
      this.leftPage.style.clipPath = "none";
      this.rightPage.style.clipPath = "none";
      this.refreshSurfaces();
      this.turn = null;
      this.turnSheet.mesh.visible = false;
      this.setPrint(true, true);
      this.setPhase("ready");
    }
  }
  private point(e: PointerEvent) {
    const rect = this.host.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    return this.ray.ray.intersectPlane(this.plane, this.hit);
  }
  private bookHit(e: PointerEvent) {
    this.point(e);
    const objects: THREE.Object3D[] = [];
    this.rig.traverseVisible((obj) => {
      if (obj instanceof THREE.Mesh) objects.push(obj);
    });
    return this.ray.intersectObjects(objects, false)[0] ?? null;
  }
  private onDown = (e: PointerEvent) => {
    this.suppressClick = false;
    if (e.button !== 0 || this.phase !== "ready" || this.openAmount < 1) return;
    const hit = this.bookHit(e);
    if (!hit) return;
    this.grip = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      anchor: this.rig.worldToLocal(hit.point.clone()),
      moved: false,
    };
  };
  private carryTarget() {
    const grip = this.grip;
    if (!grip) return;
    const rotated = grip.anchor.clone().applyQuaternion(this.rig.quaternion);
    this.plane.constant = -(rotated.y + this.mass.position.y);
    const pointer = {
        clientX: grip.clientX,
        clientY: grip.clientY,
      } as PointerEvent,
      point = this.point(pointer);
    if (!point) return;
    const desired = new THREE.Vector3(
      point.x - rotated.x,
      0.72,
      point.z - rotated.z,
    );
    this.constrainBook(desired);
    this.mass.target.copy(desired);
  }
  private constrainBook(target: THREE.Vector3) {
    const previous = this.rig.position.clone(),
      test = (scale: number) => {
        this.rig.position.set(target.x * scale, target.y, target.z * scale);
        const b = this.visibleBounds();
        return (
          Math.max(
            Math.abs(b.left),
            Math.abs(b.right),
            Math.abs(b.top),
            Math.abs(b.bottom),
          ) < 0.96
        );
      };
    if (!test(1)) {
      let lo = 0,
        hi = 1;
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        if (test(mid)) lo = mid;
        else hi = mid;
      }
      target.x *= lo;
      target.z *= lo;
    }
    this.rig.position.copy(previous);
    this.rig.updateMatrixWorld(true);
  }
  private onMove = (e: PointerEvent) => {
    const grip = this.grip;
    if (!grip) {
      if (this.phase === "ready")
        this.host.style.cursor = this.bookHit(e) ? "grab" : "default";
      return;
    }
    if (grip.id !== e.pointerId) return;
    grip.clientX = e.clientX;
    grip.clientY = e.clientY;
    if (
      !grip.moved &&
      Math.hypot(e.clientX - grip.startX, e.clientY - grip.startY) > 5
    ) {
      grip.moved = true;
      this.mass.grab(this.rig.position);
      this.host.setPointerCapture(e.pointerId);
      this.host.style.cursor = "grabbing";
      this.setPhase("carrying");
      this.last = 0;
      this.schedule();
    }
    if (grip.moved) {
      e.preventDefault();
      this.carryTarget();
    }
  };
  private onUp = (e: PointerEvent) => {
    if (this.grip?.id !== e.pointerId) return;
    const moved = this.grip.moved;
    this.suppressClick = moved;
    this.releaseCapture();
    if (moved) {
      this.mass.release();
      this.setPhase("falling");
      this.schedule();
    }
  };
  private onCancel = (e: PointerEvent) => {
    if (this.grip?.id !== e.pointerId) return;
    this.releaseCapture();
    this.mass.release();
    if (this.mass.state !== "rest") {
      this.setPhase("falling");
      this.schedule();
    }
  };
  private onLostCapture = (event: PointerEvent) => {
    if (event.target !== this.host) return;
    if (this.grip?.moved) {
      this.grip = null;
      this.mass.release();
      this.setPhase("falling");
      this.schedule();
    }
  };
  private releaseCapture() {
    const id = this.grip?.id;
    this.grip = null;
    if (id !== undefined && this.host.hasPointerCapture(id))
      this.host.releasePointerCapture(id);
    this.host.style.cursor = "default";
    this.plane.constant = -SURFACE;
  }
  private stepBook(dt: number) {
    if (this.grip?.moved) this.carryTarget();
    const impact = this.mass.step(dt);
    this.rig.position.copy(this.mass.position);
    this.rig.rotation.x = THREE.MathUtils.damp(
      this.rig.rotation.x,
      this.mass.state === "held"
        ? clamp(this.mass.velocity.z * 0.018, -0.05, 0.05)
        : 0,
      16,
      dt,
    );
    this.rig.rotation.z = THREE.MathUtils.damp(
      this.rig.rotation.z,
      this.mass.state === "held"
        ? clamp(-this.mass.velocity.x * 0.018, -0.05, 0.05)
        : 0,
      16,
      dt,
    );
    if (impact) {
      this.dropAge = 0;
      this.dust.mesh.position.set(
        this.mass.position.x,
        0,
        this.mass.position.z,
      );
      this.dust.mesh.scale.x = 1.9;
    }
    this.dropAge += dt;
    this.dust.update(this.dropAge, this.motion.matches);
    this.syncRig();
    if (this.mass.state === "rest") {
      this.table.set(this.mass.position.x, this.mass.position.z);
      this.rig.rotation.set(0, 0, 0);
      this.syncRig();
      this.setPhase("ready");
    }
  }
  private updatePortal(time: number, show = true) {
    const changed = this.portal.draw(time);
    if (!changed && this.rightCanvas.dataset.show === String(show)) return;
    this.rightCanvas.dataset.show = String(show);
    const ctx = this.rightCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, 900, 1260);
    ctx.drawImage(this.paperCanvas, 0, 0);
    if (show) ctx.drawImage(this.portal.canvas, 36, 38, 828, 1178);
    this.rightTexture.needsUpdate = true;
  }
  private refreshSurfaces() {
    const left = this.getPage(this.index, "left");
    this.leftSurface.mesh.material.map = left;
    this.leftSurface.back.value = left;
    this.bend(this.leftSurface, 1);
    this.bend(this.rightSurface, 0);
  }
  private onClick = (e: MouseEvent) => {
    if (this.suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      this.suppressClick = false;
    }
  };
  private corners(visit: (p: THREE.Vector3) => void) {
    this.rig.updateMatrixWorld(true);
    this.rig.traverseVisible((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const geometry = obj.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const b = geometry.boundingBox;
      if (!b) return;
      for (let i = 0; i < 8; i++) {
        this.scratch
          .set(
            i & 1 ? b.max.x : b.min.x,
            i & 2 ? b.max.y : b.min.y,
            i & 4 ? b.max.z : b.min.z,
          )
          .applyMatrix4(obj.matrixWorld);
        visit(this.scratch);
      }
    });
  }
  private sampleEnvelope() {
    for (let frame = 0; frame <= 108; frame++) {
      this.poseIntro((frame / 108) * END);
      this.corners((p) => this.envelope.push(p.clone()));
    }
    this.setOpen();
    for (const sheet of this.sheets) sheet.mesh.visible = false;
    for (const direction of [-1, 1])
      for (let step = 0; step <= 24; step++)
        for (const twist of [-0.65, 0.65]) {
          this.bend(this.turnSheet, step / 24, direction, twist);
          this.corners((p) => this.envelope.push(p.clone()));
        }
    this.turnSheet.mesh.visible = false;
    this.rig.position.y = 0.8;
    this.corners((p) => this.envelope.push(p.clone()));
    this.rig.position.y = 0;
    // Leave room for the impact dust around the closed book.
    for (const x of [-2.6, 2.6])
      for (const z of [-3.1, 3.1])
        this.envelope.push(new THREE.Vector3(x, 0.25, z));
  }
  private fitCamera() {
    const rect = this.host.getBoundingClientRect(),
      aim = new THREE.Vector3(0, 0.52, 0),
      direction = new THREE.Vector3(0.22, 0.75, 0.69).normalize();
    const measure = (distance: number) => {
      this.camera.clearViewOffset();
      this.camera.position.copy(direction).multiplyScalar(distance).add(aim);
      this.camera.up.set(0.04, 1, 0);
      this.camera.lookAt(aim);
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
      let minY = Infinity,
        maxY = -Infinity,
        maxX = 0;
      for (const point of this.envelope) {
        const p = this.scratch.copy(point).project(this.camera);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        maxX = Math.max(maxX, Math.abs(p.x));
      }
      return { minY, maxY, maxX };
    };
    let low = 7,
      high = 85;
    for (let trial = 0; trial < 18; trial++) {
      const distance = (low + high) / 2,
        b = measure(distance);
      if (b.maxX <= 0.87 && b.maxY - b.minY <= 1.7) high = distance;
      else low = distance;
    }
    const bounds = measure(high),
      center = (bounds.minY + bounds.maxY) / 2;
    // A static lens shift balances the motion envelope without any animated camera zoom.
    this.camera.setViewOffset(
      rect.width,
      rect.height,
      0,
      (-center * rect.height) / 2,
      rect.width,
      rect.height,
    );
  }
  private visibleBounds() {
    const bounds = { left: 1, right: -1, top: 1, bottom: -1 };
    this.corners((p) => {
      const projected = p.clone().project(this.camera);
      bounds.left = Math.min(bounds.left, projected.x);
      bounds.right = Math.max(bounds.right, projected.x);
      bounds.top = Math.min(bounds.top, projected.y);
      bounds.bottom = Math.max(bounds.bottom, projected.y);
    });
    return bounds;
  }
  private resize = () => {
    const rect = this.host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.renderer.setSize(rect.width, rect.height);
    this.css.setSize(rect.width, rect.height);
    this.camera.aspect = rect.width / rect.height;
    this.fitCamera();
    this.dust.resize(
      rect.height * this.renderer.getPixelRatio(),
      this.camera.fov,
    );
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
    const dt = this.last ? (now - this.last) / 1000 : 0;
    this.last = now;
    if (this.elapsed < END) {
      this.elapsed += Math.min(dt, 0.25);
      this.updateIntro();
      this.renderer.shadowMap.needsUpdate = true;
    } else if (this.coverMotion) {
      this.stepCover(dt);
      this.renderer.shadowMap.needsUpdate = true;
    } else if (this.mass.state !== "rest") {
      this.stepBook(dt);
      this.renderer.shadowMap.needsUpdate = true;
    } else if (this.turn) {
      this.stepTurn(dt);
      this.renderer.shadowMap.needsUpdate = true;
    } else if (this.dropAge < 2) {
      this.dropAge += dt;
      this.dust.update(this.dropAge, this.motion.matches);
    }
    if (this.phase === "ready") this.advanceSelection();
    if (!this.motion.matches) this.portalTime += Math.min(dt, 0.12);
    this.updatePortal(this.portalTime, this.elapsed >= PORTAL_REVEAL);
    this.render();
    this.schedule();
  };
  private render() {
    // Keep print resolution identical through a page turn and its resting pose.
    const density = this.software ? 0.85 : Math.min(devicePixelRatio, 1.5);
    if (this.renderer.getPixelRatio() !== density) {
      this.renderer.setPixelRatio(density);
      this.dust.resize(this.host.clientHeight * density, this.camera.fov);
    }
    this.contact.mesh.material.opacity = THREE.MathUtils.clamp(
      1 - this.rig.position.y * 0.3,
      0.15,
      1,
    );
    const open = clamp(this.lid.rotation.z / Math.PI, 0, 1);
    this.contact.mesh.position.x = this.rig.position.x + ((1 - open) * W) / 2;
    this.contact.mesh.position.z = this.rig.position.z;
    this.contact.mesh.scale.set(
      (0.52 + 0.48 * open) * (1 + this.rig.position.y * 0.06),
      1 + this.rig.position.y * 0.06,
      1,
    );
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.printing, this.camera);
    this.report();
  }
  private projected(x: number, z: number) {
    const rect = this.host.getBoundingClientRect(),
      p = this.rig
        .localToWorld(new THREE.Vector3(x, SURFACE + 0.05, z))
        .project(this.camera);
    return {
      x: rect.left + ((p.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - p.y) * rect.height) / 2,
    };
  }
  private report() {
    const data = this.host.dataset;
    data.phase = this.phase;
    data.project = String(this.index);
    data.view =
      this.openAmount === 0 ? (this.coverBack ? "back" : "cover") : "spread";
    data.openAmount = this.openAmount.toFixed(4);
    data.leftArtwork = this.leftSurface.mesh.material.map?.uuid ?? "";
    data.turnBackArtwork = this.turnSheet.back.value.uuid;
    data.rightArtwork = this.rightTexture.uuid;
    data.capturedPages = String(this.callbacks.printPages?.length ?? 0);
    data.zoom = String(this.camera.zoom);
    data.camera = JSON.stringify(this.camera.position.toArray());
    data.pageCount = "220";
    data.dust = String(this.dust.visibleCount);
    data.elapsed = this.elapsed.toFixed(4);
    data.bookBounds = JSON.stringify(this.visibleBounds());
    data.bindingThickness = String(STACK * 2 + 0.46);
    data.rigY = this.rig.position.y.toFixed(4);
    data.coverAngle = this.lid.rotation.z.toFixed(4);
    data.turnProgress = (this.turn?.progress ?? 0).toFixed(4);
    data.turnDirection = String(this.turn?.direction ?? 0);
    data.dragging = String(!!this.grip);
    data.rightGrab = JSON.stringify(this.projected(W * 0.92, H * 0.29));
    data.leftGrab = JSON.stringify(this.projected(-W * 0.92, H * 0.29));
    data.portalTime = this.portalTime.toFixed(3);
    data.bookPosition = JSON.stringify(this.rig.position.toArray());
    data.riffleCount = String(this.sheets.length);
    data.duration = String(END);
    data.bindingConnected = "true";
    data.introLeaves = JSON.stringify(
      this.sheets.flatMap((sheet, id) =>
        sheet.mesh.visible
          ? [
              {
                id,
                x: sheet.mesh.geometry.attributes.position.getX(
                  sheet.mesh.geometry.parameters.widthSegments,
                ),
              },
            ]
          : [],
      ),
    );
    const active = this.sheets.findIndex((s) => s.mesh.visible);
    data.introLeaf = String(active);
    if (active >= 0) {
      const s = this.sheets[active];
      data.introEdgeX = String(
        s.mesh.geometry.attributes.position.getX(
          s.mesh.geometry.parameters.widthSegments,
        ),
      );
    }
    if (this.turn) {
      const pos = this.turnSheet.mesh.geometry.attributes.position;
      data.freeEdgeY = String(
        pos.getY(this.turnSheet.mesh.geometry.parameters.widthSegments),
      );
    }
    if (this.turn) {
      const pos = this.turnSheet.mesh.geometry.attributes.position;
      data.freeEdgeX = String(
        pos.getX(this.turnSheet.mesh.geometry.parameters.widthSegments),
      );
    }
  }
  private schedule() {
    if (this.raf || this.disposed || !this.visible || document.hidden) return;
    if (
      this.motion.matches &&
      !this.turn &&
      !this.coverMotion &&
      this.selectedPage === null &&
      this.mass.state === "rest" &&
      this.elapsed >= END
    )
      return;
    this.raf = requestAnimationFrame(this.frame);
  }
  private onMotion = () => {
    if (this.motion.matches) this.skip();
    else {
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
    this.host.removeEventListener("click", this.onClick, true);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        geometries.add(obj.geometry);
        for (const mat of Array.isArray(obj.material)
          ? obj.material
          : [obj.material])
          materials.add(mat);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.dust.dispose();
    this.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.css.domElement.remove();
  }
}
