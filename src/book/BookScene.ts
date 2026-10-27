import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  PAGE_WIDTH as W,
  PAGE_HEIGHT as H,
  STACK,
  SURFACE,
  leatherTexture,
  paperTexture,
  edgeTexture,
  pageTexture,
  makePortal,
  type Project,
} from "./materials";
const END = 5.35;
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
  | "dragging"
  | "turning";
type Callbacks = {
  onPhase: (phase: Phase) => void;
  onIndex: (index: number) => void;
  projects: Project[];
  onSpread: (left: number, right: number) => void;
  onOpen: () => void;
};
type Sheet = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
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
  worldX: number;
  worldZ: number;
  lastProgress: number;
  lastTime: number;
  speed: number;
  moved: boolean;
  portal: boolean;
};

/** Fixed-camera spellbook. Pointer motion bends a real segmented leaf; release uses a damped spring. */
export class BookScene {
  leftPage = document.createElement("div");
  rightPage = document.createElement("div");
  private scene = new THREE.Scene();
  private printing = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  private renderer: THREE.WebGLRenderer;
  private css = new CSS3DRenderer();
  private rig = new THREE.Group();
  private printRig = new THREE.Group();
  private lid = new THREE.Group();
  private rightStack = new THREE.Group();
  private leftStack = new THREE.Group();
  private spine!: THREE.Mesh;
  private sheets: Sheet[] = [];
  private turnSheet!: Sheet;
  private textures = new Set<THREE.Texture>();
  private pageCache = new Map<string, THREE.Texture>();
  private portal = makePortal();
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private phase: Phase = "dropping";
  private index = 0;
  private turn: Turn | null = null;
  private grip: Grip | null = null;
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
      Math.min(devicePixelRatio, this.software ? 1 : 1.5),
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
    this.scene.add(this.rig);
    this.printing.add(this.printRig);
    this.light();
    this.buildBook();
    this.buildPrinting();
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
    this.scene.add(new THREE.HemisphereLight("#fff9e9", "#a7a38e", 2.0));
    const key = new THREE.DirectionalLight("#fff4de", 3.0);
    key.position.set(-4, 10, 5);
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
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.00015;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#eef6ff", 1.2);
    fill.position.set(5, 6, -4);
    this.scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.ShadowMaterial({ opacity: 0.23 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.18;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }
  private keep(texture: THREE.Texture) {
    this.textures.add(texture);
    return texture;
  }
  private getPage(index: number, side: "left" | "right") {
    const key = `${index}:${side}`;
    if (!this.pageCache.has(key))
      this.pageCache.set(
        key,
        this.keep(pageTexture(this.callbacks.projects[index], index, side)),
      );
    return this.pageCache.get(key)!;
  }
  private buildBook() {
    const leather = this.keep(leatherTexture()),
      paper = this.keep(paperTexture()),
      edges = this.keep(edgeTexture());
    const brown = new THREE.MeshStandardMaterial({
      color: "#38261d",
      roughness: 0.83,
    });
    const cover = new THREE.MeshStandardMaterial({
      map: leather,
      bumpMap: leather,
      bumpScale: 0.024,
      roughness: 0.78,
    });
    const liner = new THREE.MeshStandardMaterial({
      color: "#695035",
      roughness: 1,
    });
    const materials = [brown, brown, cover, liner, brown, brown];
    const bottom = new THREE.Mesh(
      new RoundedBoxGeometry(W + 0.25, 0.23, H + 0.3, 4, 0.105),
      [brown, brown, liner, brown, brown, brown],
    );
    bottom.position.set(W / 2, -0.035, 0);
    bottom.castShadow = bottom.receiveShadow = true;
    this.rig.add(bottom);
    const top = new THREE.Mesh(
      new RoundedBoxGeometry(W + 0.25, 0.23, H + 0.3, 4, 0.105),
      materials,
    );
    top.position.x = W / 2;
    top.castShadow = top.receiveShadow = true;
    this.lid.add(top);
    this.rig.add(this.lid);
    this.spine = new THREE.Mesh(
      new RoundedBoxGeometry(0.42, 0.77, H + 0.26, 4, 0.17),
      brown,
    );
    this.spine.position.y = 0.26;
    this.spine.castShadow = true;
    this.rig.add(this.spine);
    const brass = new THREE.MeshStandardMaterial({
      color: "#9c7945",
      metalness: 0.64,
      roughness: 0.48,
    });
    for (const z of [-H * 0.36, H * 0.36]) {
      const band = new THREE.Mesh(
        new RoundedBoxGeometry(0.46, 0.8, 0.1, 3, 0.04),
        brass,
      );
      band.position.set(0, 0.26, z);
      this.rig.add(band);
    }
    // Raised corner fittings move with the lid, without any cover lettering.
    for (const x of [0.17, W - 0.17])
      for (const z of [-H / 2 + 0.12, H / 2 - 0.12]) {
        const fitting = new THREE.Mesh(
          new RoundedBoxGeometry(0.27, 0.06, 0.3, 3, 0.025),
          brass,
        );
        fitting.position.set(x, 0.13, z);
        fitting.castShadow = true;
        this.lid.add(fitting);
      }
    const pageMat = new THREE.MeshStandardMaterial({
      map: paper,
      roughness: 1,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      map: edges,
      color: "#eadabd",
      roughness: 1,
    });
    const stack = (sign: number) => {
      const group = new THREE.Group();
      group.position.y = 0.1;
      const block = new THREE.Mesh(
        new RoundedBoxGeometry(W - 0.035, STACK, H - 0.025, 4, 0.09),
        [edgeMat, edgeMat, pageMat, edgeMat, edgeMat, edgeMat],
      );
      block.position.set((sign * W) / 2, STACK / 2, 0);
      block.castShadow = block.receiveShadow = true;
      group.add(block);
      // Additional thin, uneven signatures make the fore-edge read as hundreds of leaves.
      const signatureMat = new THREE.MeshStandardMaterial({
        color: "#d8c5a0",
        roughness: 1,
      });
      for (let i = 0; i < 9; i++) {
        const signature = new THREE.Mesh(
          new RoundedBoxGeometry(W - 0.02, 0.012, H - 0.005, 2, 0.006),
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
    const ribbonShape = new THREE.Shape();
    ribbonShape.moveTo(-0.09, 0);
    ribbonShape.lineTo(0.09, 0);
    ribbonShape.lineTo(0.09, 0.63);
    ribbonShape.lineTo(0, 0.53);
    ribbonShape.lineTo(-0.09, 0.63);
    ribbonShape.closePath();
    const ribbon = new THREE.Mesh(
      new THREE.ShapeGeometry(ribbonShape),
      new THREE.MeshStandardMaterial({
        color: "#556b3b",
        side: THREE.DoubleSide,
        roughness: 0.8,
      }),
    );
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.set(0.35, 0.2, H / 2 - 0.03);
    ribbon.castShadow = true;
    this.rig.add(ribbon);
    for (let i = 0; i < 22; i++) {
      const sheet = this.makeSheet(
        this.getPage(i % this.callbacks.projects.length, "right"),
        this.getPage(i % this.callbacks.projects.length, "left"),
        36,
        8,
      );
      sheet.start = 2.05 + i * 0.071;
      sheet.duration = i === 21 ? 1.65 : 0.62;
      this.sheets.push(sheet);
    }
    this.turnSheet = this.makeSheet(
      this.getPage(this.index, "right"),
      this.getPage(this.index, "left"),
      48,
      16,
    );
    this.rig.add(this.portal.group);
    this.portal.group.visible = false;
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
    const material = new THREE.MeshStandardMaterial({
      map: front,
      roughness: 0.97,
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
    mesh.castShadow = mesh.receiveShadow = true;
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
      theta = Math.PI * (direction > 0 ? p : 1 - p),
      arc = Math.sin(Math.PI * p);
    const geometry = sheet.mesh.geometry,
      pos = geometry.attributes.position;
    const cols = geometry.parameters.widthSegments,
      rows = geometry.parameters.heightSegments,
      dx = (W - 0.055) / cols;
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      let x = 0.012,
        y = baseY;
      for (let col = 0; col <= cols; col++) {
        const u = col / cols;
        if (col > 0) {
          const s = (col - 0.5) / cols;
          const angle = clamp(
            theta +
              arc * (s - 0.5) * 4.1 +
              twist * (v - 0.5) * Math.pow(s, 1.6) * arc,
            0,
            Math.PI,
          );
          x += Math.cos(angle) * dx;
          y += Math.sin(angle) * dx;
        }
        const i = row * (cols + 1) + col;
        pos.setXYZ(
          i,
          x,
          y,
          (v - 0.5) * (H - 0.055) + Math.sin(u * Math.PI) * arc * twist * 0.06,
        );
      }
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    sheet.mesh.visible = true;
  }
  private buildPrinting() {
    for (const [i, element] of [this.leftPage, this.rightPage].entries()) {
      element.className = `printed-page ${i === 0 ? "page-verso" : "page-recto"}`;
      const obj = new CSS3DObject(element);
      obj.rotation.x = -Math.PI / 2;
      obj.scale.setScalar((W - 0.09) / 600);
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
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.lid.rotation.z = Math.PI;
    this.lid.position.y = -0.035;
    this.rightStack.scale.y = 1;
    this.leftStack.scale.y = 1;
    this.leftStack.visible = true;
    this.spine.scale.y = 1;
    this.spine.position.y = 0.26;
    this.syncRig();
  }
  private setPhase(phase: Phase) {
    if (this.phase === phase && this.host.dataset.phase) return;
    this.phase = phase;
    this.host.dataset.phase = phase;
    this.callbacks.onPhase(phase);
  }
  private updateIntro() {
    const t = this.elapsed,
      cover = ease((t - 1.02) / 1.48),
      transfer = ease((t - 2.05) / 2.65);
    const impact = t - 0.59;
    const height =
      t < 0.59
        ? 3.65 * (1 - (t / 0.59) ** 2)
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
    this.lid.position.y = 1.43 * (1 - cover) - 0.035 * cover;
    this.rightStack.scale.y = 2 - transfer;
    this.leftStack.visible = transfer > 0.001;
    this.leftStack.scale.y = Math.max(0.001, transfer);
    this.spine.scale.y = 1.65 - 0.65 * cover;
    this.spine.position.y = 0.26 + 0.3 * (1 - cover);
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
    this.syncRig();
    this.portal.group.visible = false;
    this.setPhase(
      t < 1.02
        ? "dropping"
        : t < 2.05
          ? "opening"
          : t < 3.7
            ? "flipping"
            : "settling",
    );
    if (t >= END) this.skip();
  }
  skip = () => {
    this.elapsed = END;
    this.callbacks.onSpread(this.index, this.index);
    this.leftPage.style.clipPath = "none";
    this.rightPage.style.clipPath = "none";
    this.turn = null;
    this.grip = null;
    this.turnSheet.mesh.visible = false;
    for (const sheet of this.sheets) sheet.mesh.visible = false;
    this.setOpen();
    this.setPrint(true, true);
    this.portal.group.visible = true;
    this.setPhase("ready");
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
    this.schedule();
  };
  replay = () => {
    this.releaseCapture();
    this.index = 0;
    this.callbacks.onIndex(0);
    this.turn = null;
    this.turnSheet.mesh.visible = false;
    this.elapsed = 0;
    this.portal.uniform.uTime.value = 0;
    this.last = 0;
    this.setPrint(false, false);
    this.portal.group.visible = false;
    if (this.motion.matches) {
      this.skip();
      return;
    }
    this.updateIntro();
    this.setPhase("dropping");
    this.schedule();
  };
  private beginTurn(direction: number, manual = false) {
    if (this.phase !== "ready") return false;
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
    this.callbacks.onSpread(
      direction > 0 ? this.index : destination,
      direction > 0 ? destination : this.index,
    );
    this.leftPage.style.clipPath = "none";
    this.rightPage.style.clipPath = "none";
    this.last = 0;
    this.setPhase(manual ? "dragging" : "turning");
    this.schedule();
    return true;
  }
  turnPage(direction: number) {
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
      this.report();
      this.render();
      return true;
    }
    return this.beginTurn(direction);
  }
  private stepTurn(dt: number) {
    const turn = this.turn;
    if (!turn) return;
    const count = Math.ceil(Math.min(dt, 0.1) * 120) || 1,
      step = Math.min(dt, 0.1) / count;
    for (let i = 0; i < count; i++) {
      const stiffness = turn.released ? 158 : 520,
        damping = turn.released ? 23 : 43;
      turn.velocity +=
        ((turn.target - turn.progress) * stiffness - turn.velocity * damping) *
        step;
      turn.progress += turn.velocity * step;
    }
    const p = clamp(turn.progress, 0, 1);
    this.bend(this.turnSheet, p, turn.direction, turn.twist);
    this.portal.group.visible = turn.direction > 0 ? p > 0.25 : p < 0.5;
    // Clip only the paper area covered by the curved leaf; the rest stays readable.
    const position = this.turnSheet.mesh.geometry.attributes.position;
    let minX = 0,
      maxX = 0;
    for (let i = 0; i < position.count; i++) {
      minX = Math.min(minX, position.getX(i));
      maxX = Math.max(maxX, position.getX(i));
    }
    this.setPrint(true, true);
    this.leftPage.style.clipPath = `inset(0 ${clamp(-minX / W, 0, 1) * 100}% 0 0)`;
    this.rightPage.style.clipPath = `inset(0 0 0 ${clamp(maxX / W, 0, 1) * 100}%)`;
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
      this.turn = null;
      this.turnSheet.mesh.visible = false;
      this.portal.group.visible = true;
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
  private onDown = (e: PointerEvent) => {
    this.suppressClick = false;
    if (e.button !== 0 || this.phase !== "ready") return;
    const el = e.target as Element;
    if (el.closest("button,a") && !el.closest("[data-portal]")) return;
    const point = this.point(e);
    if (
      !point ||
      Math.abs(point.x) < 0.17 ||
      Math.abs(point.x) > W + 0.12 ||
      Math.abs(point.z) > H / 2 + 0.1
    )
      return;
    const direction = point.x > 0 ? 1 : -1;
    if (!this.beginTurn(direction, true)) return;
    this.grip = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      worldX: point.x,
      worldZ: point.z,
      lastProgress: 0,
      lastTime: performance.now(),
      speed: 0,
      moved: false,
      portal: !!el.closest("[data-portal]"),
    };
    this.host.setPointerCapture(e.pointerId);
    this.host.style.cursor = "grabbing";
  };
  private progressForEdge(freeEdge: number) {
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 12; i++) {
      const p = (lo + hi) / 2,
        theta = Math.PI * p,
        arc = Math.sin(theta);
      let x = 0.012;
      for (let j = 0; j < 48; j++)
        x +=
          (Math.cos(
            clamp(theta + arc * ((j + 0.5) / 48 - 0.5) * 4.1, 0, Math.PI),
          ) *
            (W - 0.055)) /
          48;
      if (x > freeEdge) lo = p;
      else hi = p;
    }
    return (lo + hi) / 2;
  }
  private onMove = (e: PointerEvent) => {
    const grip = this.grip,
      turn = this.turn;
    if (!grip || !turn) {
      if (this.phase === "ready") {
        const point = this.point(e);
        const can =
          point &&
          Math.abs(point.x) > 0.17 &&
          Math.abs(point.x) < W &&
          Math.abs(point.z) < H / 2 &&
          (point.x > 0
            ? this.index < this.callbacks.projects.length - 1
            : this.index > 0);
        this.host.style.cursor = can ? "grab" : "default";
      }
      return;
    }
    if (grip.id !== e.pointerId) return;
    const point = this.point(e);
    if (!point) return;
    if (Math.hypot(e.clientX - grip.startX, e.clientY - grip.startY) > 5)
      grip.moved = true;
    const freeEdge = W + turn.direction * (point.x - grip.worldX),
      progress = this.progressForEdge(freeEdge),
      now = performance.now();
    const elapsed = (now - grip.lastTime) / 1000;
    if (elapsed > 0.008)
      grip.speed = clamp((progress - grip.lastProgress) / elapsed, -3, 3);
    grip.lastProgress = progress;
    grip.lastTime = now;
    turn.target = progress;
    turn.twist = clamp((point.z - grip.worldZ) * 0.8, -0.65, 0.65);
    if (grip.moved) e.preventDefault();
    this.schedule();
  };
  private onUp = (e: PointerEvent) => {
    if (this.grip?.id !== e.pointerId || !this.turn) return;
    const grip = this.grip,
      turn = this.turn;
    const speed = performance.now() - grip.lastTime < 130 ? grip.speed : 0;
    this.suppressClick = grip.moved;
    turn.target =
      grip.moved && (turn.target > 0.46 || (speed > 0.75 && turn.target > 0.13))
        ? 1
        : 0;
    turn.released = true;
    turn.velocity += clamp(speed, -1.8, 1.8) * 0.4;
    this.releaseCapture();
    this.setPhase("turning");
    if (this.motion.matches) {
      if (turn.target === 1) {
        this.index = turn.destination;
        this.callbacks.onIndex(this.index);
      }
      this.skip();
    } else this.schedule();
    if (!grip.moved && grip.portal) this.callbacks.onOpen();
  };
  private onCancel = (e: PointerEvent) => {
    if (this.grip?.id !== e.pointerId || !this.turn) return;
    this.turn.target = 0;
    this.turn.released = true;
    this.releaseCapture();
    this.setPhase("turning");
    this.schedule();
  };
  private onLostCapture = () => {
    if (this.grip && this.turn) {
      this.grip = null;
      this.turn.target = 0;
      this.turn.released = true;
      this.setPhase("turning");
      this.schedule();
    }
  };
  private releaseCapture() {
    const id = this.grip?.id;
    this.grip = null;
    if (id !== undefined && this.host.hasPointerCapture(id))
      this.host.releasePointerCapture(id);
    this.host.style.cursor = "default";
  }
  private onClick = (e: MouseEvent) => {
    if (this.suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      this.suppressClick = false;
    }
  };
  private resize = () => {
    const rect = this.host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.renderer.setSize(rect.width, rect.height);
    this.css.setSize(rect.width, rect.height);
    this.camera.aspect = rect.width / rect.height;
    const fov = THREE.MathUtils.degToRad(15),
      distance = Math.max(
        8.0 / (2 * Math.tan(fov) * this.camera.aspect),
        7.2 / (2 * Math.tan(fov)),
      );
    this.camera.position.set(0, distance * 0.935, distance * 0.355);
    this.camera.lookAt(0, 0.25, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.shadowMap.needsUpdate = true;
    this.render();
  };
  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.visible || document.hidden) return;
    const dt = this.last ? (now - this.last) / 1000 : 0;
    this.last = now;
    if (this.elapsed < END) {
      this.elapsed += dt;
      this.updateIntro();
      this.renderer.shadowMap.needsUpdate = true;
    } else if (this.turn) {
      this.stepTurn(dt);
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (!this.motion.matches)
      this.portal.uniform.uTime.value += Math.min(dt, 0.12);
    this.render();
    this.schedule();
  };
  private render() {
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.printing, this.camera);
    this.report();
  }
  private projected(x: number, z: number) {
    const rect = this.host.getBoundingClientRect(),
      p = new THREE.Vector3(x, SURFACE + 0.05, z).project(this.camera);
    return {
      x: rect.left + ((p.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - p.y) * rect.height) / 2,
    };
  }
  private report() {
    const data = this.host.dataset;
    data.phase = this.phase;
    data.project = String(this.index);
    data.zoom = String(this.camera.zoom);
    data.camera = JSON.stringify(this.camera.position.toArray());
    data.pageCount = "220";
    data.bindingThickness = String(STACK * 2 + 0.46);
    data.rigY = this.rig.position.y.toFixed(4);
    data.coverAngle = this.lid.rotation.z.toFixed(4);
    data.turnProgress = (this.turn?.progress ?? 0).toFixed(4);
    data.turnDirection = String(this.turn?.direction ?? 0);
    data.dragging = String(!!this.grip);
    data.rightGrab = JSON.stringify(this.projected(W * 0.92, H * 0.29));
    data.leftGrab = JSON.stringify(this.projected(-W * 0.92, H * 0.29));
    data.portalTime = this.portal.uniform.uTime.value.toFixed(3);
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
    if (this.motion.matches && !this.turn && this.elapsed >= END) return;
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
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.css.domElement.remove();
  }
}
