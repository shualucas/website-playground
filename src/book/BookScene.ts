import * as THREE from "three";
import { surfaceDetail, studioEnvironment, roundedSlab } from "./surfaces";
import { contactShadow } from "./effects";
import { advancePaperFlex } from "./paper-flex";
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
  risoCoverTexture,
  applyRisoPrint,
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
  | "arriving"
  | "opening"
  | "flipping"
  | "settling"
  | "ready"
  | "rotating"
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
  pitch: number;
  yaw: number;
  moved: boolean;
};

/** A printed paper zine: click a leaf to turn it, drag to rotate around its fixed center. */
export class BookScene {
  leftPage = document.createElement("div");
  rightPage = document.createElement("div");
  private scene = new THREE.Scene();
  private printing = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(24, 1, 0.1, 160);
  private renderer: THREE.WebGLRenderer;
  private css = new CSS3DRenderer();
  private orbit = new THREE.Group();
  private printOrbit = new THREE.Group();
  private rotation = new THREE.Vector2();
  private rotationTarget = new THREE.Vector2();
  private hovered: "left" | "right" | "cover" | null = null;
  private coverMaterial!: THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
  private backMaterial!: THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
  private backLid = new THREE.Group();
  private coverMeshes: {
    mesh: THREE.Mesh<THREE.BoxGeometry>;
    base: Float32Array;
    front: boolean;
  }[] = [];
  private insideLeft!: THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
  private insideRight!: THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
  private paperFlex = 0;
  private flexVelocity = 0;
  private groundY = -4.4;
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
  private portal = new AsciiPortal();
  private portalTime = 0;
  private rightCanvas = blankPageCanvas();
  private rightTexture = new THREE.CanvasTexture(this.rightCanvas);
  private paperCanvas = blankPageCanvas();
  private sheets: Sheet[] = [];
  private turnSheet!: Sheet;
  private textures = new Set<THREE.Texture>();
  private pageCache = new Map<string, THREE.Texture>();
  private contact = contactShadow();
  private environment: THREE.WebGLRenderTarget | null = null;
  private envelope: THREE.Vector3[] = [];
  private scratch = new THREE.Vector3();
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private phase: Phase = "arriving";
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
    this.orbit.add(this.rig);
    this.printOrbit.add(this.printRig);
    this.scene.add(this.orbit, this.contact.mesh);
    this.keep(this.contact.texture);
    this.contact.mesh.position.y = this.groundY + 0.015;
    this.rightTexture.colorSpace = THREE.SRGBColorSpace;
    this.keep(this.rightTexture);
    this.updatePortal(0);
    this.printing.add(this.printOrbit);
    this.light();
    this.buildBook();
    this.buildPrinting();
    this.sampleEnvelope();
    // Compile hidden leaf materials once, with the same light count used by every pose.
    this.sheets.forEach((s) => (s.mesh.visible = true));
    this.turnSheet.mesh.visible = true;
    this.renderer.compile(this.scene, this.camera);
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
    host.addEventListener("pointerleave", this.onLeave);
    host.addEventListener("focusin", this.onFocus);
    host.addEventListener("focusout", this.onBlur);
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
    key.position.set(3.5, 12, 6.5);
    key.castShadow = true;
    key.shadow.mapSize.set(
      this.software ? 1024 : 2048,
      this.software ? 1024 : 2048,
    );
    Object.assign(key.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 1,
      far: 32,
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
      new THREE.ShadowMaterial({ opacity: 0.23, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = this.groundY;
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
  private insidePage(index: number) {
    const key = `${index}:inside-cover`;
    if (!this.pageCache.has(key)) {
      const map = this.getPage(index, "left").clone();
      const sx = (W + 0.035) / (W - 0.055),
        sy = (H + 0.035) / (H - 0.055);
      map.repeat.set(-sx, sy);
      map.offset.set((1 + sx) / 2, (1 - sy) / 2);
      this.pageCache.set(key, this.keep(map));
    }
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
      emissive: params.emissive,
      emissiveIntensity: params.emissiveIntensity,
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
    const paperDetail = surfaceDetail("paper");
    for (const map of Object.values(paperDetail)) this.keep(map);
    const front = this.keep(risoCoverTexture()),
      back = this.keep(risoCoverTexture(true)),
      paper = this.keep(paperTexture()),
      edges = this.keep(edgeTexture());
    // The underside faces the reader when the back cover closes over the left stack.
    back.repeat.x = -1;
    back.offset.x = 1;
    const pageMat = this.surface({
      map: paper,
      normalMap: paperDetail.normal,
      normalScale: new THREE.Vector2(0.17, 0.17),
      roughnessMap: paperDetail.roughness,
      roughness: 1,
    });
    const cover = this.surface({
      map: front,
      normalMap: paperDetail.normal,
      normalScale: new THREE.Vector2(0.17, 0.17),
      roughness: 1,
      emissive: new THREE.Color("#f36a9c"),
      emissiveIntensity: 0,
    });
    const backCover = this.surface({
      map: back,
      normalMap: paperDetail.normal,
      normalScale: new THREE.Vector2(0.17, 0.17),
      roughness: 1,
      emissive: new THREE.Color("#f36a9c"),
      emissiveIntensity: 0,
    });
    this.coverMaterial = cover;
    this.backMaterial = backCover;
    const edgeCover = this.surface({ color: "#e8dfc7", roughness: 1 });
    this.insideLeft = this.surface({
      map: this.insidePage(this.index),
      roughness: 1,
    });
    this.insideRight = this.surface({ map: this.rightTexture, roughness: 1 });
    const makeCover = (isFront: boolean) => {
      const width = W + 0.035,
        height = H + 0.035;
      const geometry = new THREE.BoxGeometry(width, 0.014, height, 32, 1, 8);
      const positions = geometry.attributes.position,
        normals = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      for (let i = 0; i < positions.count; i++)
        if (Math.abs(normals.getY(i)) > 0.9)
          uv.setXY(
            i,
            positions.getX(i) / width + 0.5,
            0.5 - positions.getZ(i) / height,
          );
      const mesh = new THREE.Mesh(geometry, [
        edgeCover,
        edgeCover,
        isFront ? cover : this.insideRight,
        isFront ? this.insideLeft : backCover,
        edgeCover,
        edgeCover,
      ]);
      mesh.position.set(W / 2, isFront ? 0 : -0.005, 0);
      mesh.castShadow = mesh.receiveShadow = true;
      this.coverMeshes.push({
        mesh,
        base: new Float32Array(positions.array),
        front: isFront,
      });
      return mesh;
    };
    this.backLid.add(makeCover(false));
    this.rig.add(this.backLid);
    this.lid.add(makeCover(true));
    this.rig.add(this.lid);
    this.binding = createBinding(
      edgeCover,
      pageMat,
      this.surface({ color: "#7f858b", metalness: 0.6, roughness: 0.55 }),
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
      group.position.y = 0.025;
      const block = new THREE.Mesh(
        shapeInnerEdge(
          roundedSlab(W - 0.035, H - 0.025, STACK, 0.014, 0.004),
          (sign * W) / 2,
          STACK,
        ),
        [pageMat, pageMat, edgeMat],
      );
      block.position.set((sign * W) / 2, STACK / 2, 0);
      block.castShadow = block.receiveShadow = true;
      group.add(block);
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
      roughness: 1,
      emissive: new THREE.Color("#f36a9c"),
      emissiveIntensity: 0,
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
    baseY = SURFACE + 0.008,
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
          y +
            gutterDip(x) +
            0.19 * Math.sin(u * Math.PI) * (1 - arc) +
            this.paperFlex * 0.6 * Math.sin(u * Math.PI) * (1 - arc) +
            0.035 * arc * Math.sin(u * Math.PI * 2.4 - p * Math.PI * 3) * u +
            0.025 * Math.sin(v * Math.PI) * Math.sin(u * Math.PI),
          (v - 0.5) * (H - 0.055) + Math.sin(u * Math.PI) * arc * twist * 0.14,
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
      obj.position.set(((i === 0 ? -1 : 1) * W) / 2, SURFACE + 0.016, 0);
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
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.lid.rotation.z = Math.PI;
    this.lid.position.y = -0.005;
    this.backLid.rotation.z = 0;
    this.backLid.position.y = 0;
    this.rightStack.visible = true;
    this.rightStack.scale.y = 1;
    this.leftStack.scale.y = 1;
    this.leftStack.visible = true;
    this.binding.update(SURFACE, SURFACE, 1);
    this.refreshSurfaces();
    this.flexCovers();
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
    this.setPhase(
      t < 0.4
        ? "arriving"
        : t < OPENING.riffleStart
          ? "opening"
          : t < LAST_LEAF_START
            ? "flipping"
            : "settling",
    );
    if (t >= END) this.skip();
  }
  private poseIntro(t: number) {
    const cover = ease((t - 0.4) / 0.95),
      transfer = ease(
        (t - OPENING.riffleStart) / (TRANSFER_END - OPENING.riffleStart),
      );
    // Light paper arrives gently; it has no hard-cover impact or bounce.
    this.rig.position.set(
      (-W / 2) * (1 - cover),
      0.45 * (1 - ease(t / 0.9)),
      0,
    );
    this.rig.rotation.set(0, 0, -0.035 * (1 - cover));
    this.backLid.rotation.z = 0;
    this.backLid.position.y = 0;
    this.lid.rotation.z = Math.PI * cover;
    this.lid.position.y = (STACK * 2 + 0.06) * (1 - cover) - 0.005 * cover;
    this.rightStack.scale.y = 2 - transfer;
    this.leftStack.visible = cover > 0.97 && transfer > 0.001;
    this.leftStack.scale.y = Math.max(0.001, transfer);
    this.binding.update(
      0.025 + STACK * transfer,
      0.025 + STACK * (2 - transfer),
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
            0.025 + STACK * (2 - transfer),
            0.025 + STACK * transfer,
            ease(p),
          ) + 0.018,
        );
    }
    this.leftSurface.mesh.visible = t > PRINT_REVEAL;
    this.rightSurface.mesh.visible = true;
    this.updatePortal(this.portalTime, t > PORTAL_REVEAL);
    this.flexCovers(cover);
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
    this.turnSheet.mesh.visible = false;
    for (const sheet of this.sheets) sheet.mesh.visible = false;
    this.setOpen();
    this.setPrint(true, true);
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
    this.rotation.set(0, 0);
    this.rotationTarget.set(0, 0);
    this.paperFlex = this.flexVelocity = 0;
    this.applyOrientation();
    this.setHover(null);
    this.elapsed = 0;
    this.portalTime = 0;
    this.updatePortal(0);
    this.last = 0;
    this.setPrint(false, false);
    if (this.motion.matches) {
      this.skip();
      return;
    }
    this.updateIntro();
    this.setPhase("arriving");
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
      twist: direction * 0.3,
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
    this.setHover(null);
    this.setPhase("turning");
    this.schedule();
    return true;
  }
  /** Relative inputs advance the requested destination, including while a leaf is moving. */
  stepPage(direction: number) {
    if (this.grip?.moved) return;
    const current =
      this.selectedPage ??
      (this.openAmount === 0
        ? this.coverBack
          ? this.callbacks.projects.length
          : -1
        : (this.turn?.destination ?? this.index));
    this.goTo(current + direction);
  }
  /** A single target keeps rapid navigation changes ordered without losing a page. */
  goTo(page: number) {
    if (this.grip?.moved) return;
    const target = clamp(page, -1, this.callbacks.projects.length);
    if (this.elapsed < END) this.skip();
    this.selectedPage = target;
    this.advanceSelection();
    if (this.motion.matches) {
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
    } else this.report();
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
    this.setHover(null);
    this.coverMotion = { from: this.openAmount, to, elapsed: 0 };
    this.setPhase(to ? "opening" : "closing");
    if (this.motion.matches) this.stepCover(2);
  }
  private poseCover(amount: number) {
    this.openAmount = amount;
    const closed = 1 - amount;
    this.rig.position.set((((this.coverBack ? 1 : -1) * W) / 2) * closed, 0, 0);
    this.lid.rotation.z = this.coverBack ? Math.PI : Math.PI * amount;
    this.lid.position.y = this.coverBack
      ? -0.005
      : (STACK * 2 + 0.06) * closed - 0.005 * amount;
    this.backLid.rotation.z = this.coverBack ? Math.PI * closed : 0;
    this.backLid.position.y = this.coverBack ? (STACK * 2 + 0.06) * closed : 0;
    this.rightStack.scale.y = this.coverBack
      ? Math.max(0.001, amount)
      : 2 - amount;
    this.leftStack.scale.y = this.coverBack
      ? 2 - amount
      : Math.max(0.001, amount);
    // Paper remains on its original side until the moving printed cover reveals the spread.
    this.leftStack.visible = this.coverBack || amount > 0.985;
    this.rightStack.visible = !this.coverBack || amount > 0.985;
    this.binding.update(
      0.025 + STACK * (this.coverBack ? 2 - amount : amount),
      0.025 + STACK * (this.coverBack ? amount : 2 - amount),
      amount,
    );
    const leftHeight =
      0.025 + STACK * (this.coverBack ? 2 - amount : amount) + 0.008;
    const rightHeight =
      0.025 + STACK * (this.coverBack ? amount : 2 - amount) + 0.008;
    this.bend(this.leftSurface, 1, 1, 0, leftHeight);
    this.bend(this.rightSurface, 0, 1, 0, rightHeight);
    this.leftSurface.mesh.visible = this.coverBack
      ? amount > 0.015
      : amount > 0.985;
    this.rightSurface.mesh.visible = this.coverBack
      ? amount > 0.985
      : amount > 0.015;
    this.setPrint(amount > 0.985, amount > 0.985);
    this.flexCovers(amount);
    this.syncRig();
  }
  private stepCover(dt: number) {
    const motion = this.coverMotion;
    if (!motion) return;
    const catchingUp =
      motion.to === 1 &&
      this.selectedPage !== null &&
      this.selectedPage !== this.index;
    motion.elapsed += dt * (catchingUp ? 1.6 : 1);
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
  private stepTurn(dt: number) {
    const turn = this.turn;
    if (!turn) return;
    const queued = Math.abs(
      (this.selectedPage ?? turn.destination) - turn.destination,
    );
    const speed = queued ? 1.6 + Math.min(queued, 3) * 0.2 : 1;
    const next = advancePageTurn(
      turn.progress,
      turn.velocity,
      turn.target,
      dt * speed,
    );
    turn.progress = next.progress;
    turn.velocity = next.velocity;
    const p = clamp(turn.progress, 0, 1);
    this.bend(this.turnSheet, p, turn.direction, turn.twist, SURFACE + 0.009);
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
  private bookHit(e: { clientX: number; clientY: number }) {
    const rect = this.host.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    this.orbit.updateMatrixWorld(true);
    const objects: THREE.Object3D[] = [];
    this.rig.traverseVisible((obj) => {
      if (obj instanceof THREE.Mesh) objects.push(obj);
    });
    return this.ray.intersectObjects(objects, false)[0] ?? null;
  }
  private pageAt(e: { clientX: number; clientY: number }) {
    const hit = this.bookHit(e);
    if (!hit) return null;
    if (this.openAmount === 0) return "cover" as const;
    if (hit.object === this.leftSurface.mesh) return "left" as const;
    if (hit.object === this.rightSurface.mesh) return "right" as const;
    if (
      this.coverMotion &&
      this.coverMeshes.some((item) => item.mesh === hit.object)
    )
      return this.rig.worldToLocal(hit.point.clone()).x > 0
        ? ("right" as const)
        : ("left" as const);
    if (hit.object === this.turnSheet.mesh)
      return this.rig.worldToLocal(hit.point.clone()).x > 0
        ? ("right" as const)
        : ("left" as const);
    return null;
  }
  private setHover(page: "left" | "right" | "cover" | null) {
    this.hovered = this.phase === "ready" && !this.grip?.moved ? page : null;
    this.host.style.cursor = this.grip?.moved
      ? "grabbing"
      : this.hovered
        ? "pointer"
        : "default";
    if (this.motion.matches && this.leftSurface) {
      this.updateHighlight(1);
      this.render();
    } else this.schedule();
  }
  private updateHighlight(dt: number) {
    const pairs = [
      [this.leftSurface.mesh.material, "left"],
      [this.rightSurface.mesh.material, "right"],
      [this.coverMaterial, this.coverBack ? null : "cover"],
      [this.backMaterial, this.coverBack ? "cover" : null],
    ] as const;
    for (const [material, page] of pairs) {
      const target = page && page === this.hovered ? 0.22 : 0;
      material.emissiveIntensity = this.motion.matches
        ? target
        : THREE.MathUtils.damp(material.emissiveIntensity, target, 12, dt);
    }
  }
  private onLeave = () => {
    if (!this.grip) this.setHover(null);
  };
  private onFocus = (e: FocusEvent) => {
    const page = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-turn-page]",
    )?.dataset.turnPage;
    if (page === "left" || page === "right") this.setHover(page);
  };
  private onBlur = () => this.setHover(null);
  private onDown = (e: PointerEvent) => {
    this.suppressClick = false;
    if (e.button !== 0 || this.phase !== "ready" || !this.bookHit(e)) return;
    this.grip = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      pitch: this.rotationTarget.x,
      yaw: this.rotationTarget.y,
      moved: false,
    };
  };
  private onMove = (e: PointerEvent) => {
    const grip = this.grip;
    if (!grip) {
      if (this.phase === "ready") this.setHover(this.pageAt(e));
      return;
    }
    if (grip.id !== e.pointerId) return;
    if (
      !grip.moved &&
      Math.hypot(e.clientX - grip.startX, e.clientY - grip.startY) > 6
    ) {
      grip.moved = true;
      this.host.setPointerCapture(e.pointerId);
      this.setHover(null);
      this.setPhase("rotating");
      this.last = 0;
    }
    if (grip.moved) {
      e.preventDefault();
      this.rotationTarget.set(
        grip.pitch +
          ((e.clientY - grip.startY) / Math.max(280, this.host.clientHeight)) *
            Math.PI *
            2,
        grip.yaw +
          ((e.clientX - grip.startX) / Math.max(280, this.host.clientWidth)) *
            Math.PI *
            2,
      );
      if (this.motion.matches) {
        this.rotation.copy(this.rotationTarget);
        this.applyOrientation();
        this.renderer.shadowMap.needsUpdate = true;
        this.render();
      }
      this.schedule();
    }
  };
  private onUp = (e: PointerEvent) => {
    if (this.grip?.id !== e.pointerId) return;
    const moved = this.grip.moved;
    this.suppressClick = moved;
    this.releaseCapture();
    if (moved) {
      this.setPhase("ready");
      this.setHover(null);
      this.render();
      this.schedule();
    }
  };
  private onCancel = (e: PointerEvent) => {
    if (this.grip?.id !== e.pointerId) return;
    this.suppressClick = !!this.grip.moved;
    this.releaseCapture();
    this.setPhase("ready");
    this.setHover(null);
    this.render();
    this.schedule();
  };
  private onLostCapture = (e: PointerEvent) => {
    if (e.target !== this.host || !this.grip) return;
    this.onCancel(e);
  };
  private releaseCapture() {
    const id = this.grip?.id;
    this.grip = null;
    if (id !== undefined && this.host.hasPointerCapture(id))
      this.host.releasePointerCapture(id);
    this.host.style.cursor = "default";
  }
  private applyOrientation() {
    this.orbit.rotation.set(this.rotation.x, this.rotation.y, 0, "YXZ");
    this.printOrbit.quaternion.copy(this.orbit.quaternion);
  }
  private rotateStep(dt: number) {
    if (this.motion.matches) this.rotation.copy(this.rotationTarget);
    else {
      this.rotation.x = THREE.MathUtils.damp(
        this.rotation.x,
        this.rotationTarget.x,
        15,
        dt,
      );
      this.rotation.y = THREE.MathUtils.damp(
        this.rotation.y,
        this.rotationTarget.y,
        15,
        dt,
      );
    }
    this.applyOrientation();
  }
  private clickPage(page: "left" | "right" | "cover") {
    if (this.phase === "rotating") return;
    this.setHover(null);
    this.stepPage(
      page === "cover" ? (this.coverBack ? -1 : 1) : page === "left" ? -1 : 1,
    );
  }
  private flexCovers(open = this.openAmount) {
    for (const item of this.coverMeshes) {
      const geometry = item.mesh.geometry,
        pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = item.base[i * 3],
          y = item.base[i * 3 + 1],
          z = item.base[i * 3 + 2];
        const u = clamp(x / (W + 0.035) + 0.5, 0, 1),
          v = z / H + 0.5;
        const bow =
          Math.sin(u * Math.PI) * (0.14 + this.paperFlex * 0.6) * open;
        const flop =
          Math.sin(open * Math.PI) *
          0.2 *
          u *
          u *
          (1 + 0.35 * Math.sin(v * Math.PI));
        pos.setY(i, y + (item.front ? -1 : 1) * (bow + flop));
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
    }
  }
  private flexPaper(dt: number) {
    const load = this.motion.matches
      ? 0
      : clamp(
          (this.rotationTarget.x - this.rotation.x) * 0.22 +
            (this.rotationTarget.y - this.rotation.y) * 0.06 +
            (this.turn
              ? Math.sin(this.turn.progress * Math.PI) *
                0.09 *
                this.turn.direction
              : 0),
          -0.22,
          0.22,
        );
    const next = advancePaperFlex(this.paperFlex, this.flexVelocity, load, dt);
    this.paperFlex = this.motion.matches ? 0 : next.value;
    this.flexVelocity = this.motion.matches ? 0 : next.velocity;
    if (this.elapsed >= END && !this.coverMotion && this.openAmount === 1) {
      this.bend(this.leftSurface, 1);
      this.bend(this.rightSurface, 0);
      this.flexCovers();
    }
  }
  private updatePortal(time: number, show = true) {
    const changed = this.portal.draw(time);
    if (!changed && this.rightCanvas.dataset.show === String(show)) return;
    this.rightCanvas.dataset.show = String(show);
    const ctx = this.rightCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, 900, 1260);
    ctx.drawImage(this.paperCanvas, 0, 0);
    if (show) {
      ctx.drawImage(this.portal.canvas, 36, 38, 828, 1178);
      applyRisoPrint(ctx, this.rightCanvas.width, this.rightCanvas.height);
    }
    this.rightTexture.needsUpdate = true;
  }
  private refreshSurfaces() {
    const left = this.getPage(this.index, "left");
    if (this.insideLeft) this.insideLeft.map = this.insidePage(this.index);
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
      return;
    }
    if ((e.target as HTMLElement).closest("button,a,[role=button]")) return;
    const page = this.pageAt(e);
    if (page) this.clickPage(page);
  };
  private corners(visit: (p: THREE.Vector3) => void) {
    this.orbit.updateMatrixWorld(true);
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
    // Bound both page turns and drag rotation before choosing one fixed framing.
    const unrotated = this.envelope.map((point) => point.clone());
    for (const pitch of [-0.32, 0.26])
      for (const yaw of [-0.75, 0.75]) {
        const matrix = new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(pitch, yaw, 0, "YXZ"),
        );
        for (const point of unrotated)
          this.envelope.push(point.clone().applyMatrix4(matrix));
      }
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
    const bounds = measure(high * 0.96),
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
    } else if (this.turn) {
      this.stepTurn(dt);
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.flexPaper(dt);
    this.rotateStep(dt);
    this.updateHighlight(dt);
    if (
      this.rotation.distanceToSquared(this.rotationTarget) > 0.000001 ||
      this.grip?.moved ||
      Math.abs(this.paperFlex) + Math.abs(this.flexVelocity) > 0.0001
    )
      this.renderer.shadowMap.needsUpdate = true;
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
    }
    this.contact.mesh.material.opacity = THREE.MathUtils.clamp(
      1 - this.rig.position.y * 0.3,
      0.15,
      1,
    );
    const open =
      this.elapsed < END
        ? clamp(this.lid.rotation.z / Math.PI, 0, 1)
        : this.openAmount;
    this.contact.mesh.position.x = 0;
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
    data.pageCount = "16";
    data.format = "riso-zine";
    data.rotation = JSON.stringify(this.rotation.toArray());
    data.anchorPosition = JSON.stringify(this.orbit.position.toArray());
    data.hoveredPage = this.hovered ?? "none";
    data.leftGlow = this.leftSurface.mesh.material.emissiveIntensity.toFixed(3);
    data.rightGlow =
      this.rightSurface.mesh.material.emissiveIntensity.toFixed(3);
    data.elapsed = this.elapsed.toFixed(4);
    data.bookBounds = JSON.stringify(this.visibleBounds());
    data.bindingThickness = String(STACK * 2 + 0.036);
    data.rigY = this.rig.position.y.toFixed(4);
    data.coverAngle = this.lid.rotation.z.toFixed(4);
    data.turnProgress = (this.turn?.progress ?? 0).toFixed(4);
    data.turnDirection = String(this.turn?.direction ?? 0);
    data.dragging = String(!!this.grip);
    data.leftHit = JSON.stringify(this.projected(-W * 0.55, -H * 0.15));
    data.rightHit = JSON.stringify(this.projected(W * 0.55, -H * 0.15));
    data.coverHit = JSON.stringify(
      this.projected(((this.coverBack ? -1 : 1) * W) / 2, 0),
    );
    data.rightGrab = JSON.stringify(this.projected(W * 0.92, H * 0.29));
    data.leftGrab = JSON.stringify(this.projected(-W * 0.92, H * 0.29));
    data.portalTime = this.portalTime.toFixed(3);
    data.bookPosition = JSON.stringify(this.rig.position.toArray());
    data.riffleCount = String(this.sheets.length);
    data.duration = String(END);
    data.requestedPage = String(
      this.selectedPage ??
        (this.openAmount === 0
          ? this.coverBack
            ? this.callbacks.projects.length
            : -1
          : this.index),
    );
    data.paperFlex = this.paperFlex.toFixed(5);
    data.coverOpen = String(this.openAmount);
    data.leftPrintedVisible = String(this.leftSurface.mesh.visible);
    data.leftStackVisible = String(this.leftStack.visible);
    data.coverPrintedArtwork = this.insideLeft.map?.uuid ?? "";
    data.groundY = String(this.groundY);
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
      !this.grip?.moved &&
      this.rotation.distanceToSquared(this.rotationTarget) < 0.000001 &&
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
    this.host.removeEventListener("pointerleave", this.onLeave);
    this.host.removeEventListener("focusin", this.onFocus);
    this.host.removeEventListener("focusout", this.onBlur);
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
    this.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.css.domElement.remove();
  }
}
