import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";

const W = 3.35,
  H = 4.7,
  D = 0.22,
  END = 5.8;
const clamp = THREE.MathUtils.clamp;
const ease = (v: number) => {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};
type Phase =
  | "entering"
  | "opening"
  | "flipping"
  | "settling"
  | "ready"
  | "turning";
type Callbacks = {
  onPhase: (phase: Phase) => void;
  onTurn: () => void;
  onReady: () => void;
};
type Sheet = {
  pivot: THREE.Group;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  start: number;
  duration: number;
};

/** Real lit geometry for the binding/pages, with CSS3D printing for crisp, selectable content. */
export class BookScene {
  leftPage = document.createElement("div");
  rightPage = document.createElement("div");
  private scene = new THREE.Scene();
  private printing = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  private renderer: THREE.WebGLRenderer;
  private css = new CSS3DRenderer();
  private rig = new THREE.Group();
  private printRig = new THREE.Group();
  private lid = new THREE.Group();
  private leftStack = new THREE.Group();
  private sheets: Sheet[] = [];
  private turnSheet!: Sheet;
  private textures: THREE.Texture[] = [];
  private resizeObserver: ResizeObserver;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private phase: Phase = "entering";
  private disposed = false;
  private turn: {
    elapsed: number;
    direction: number;
    changed: boolean;
  } | null = null;
  private pointer = new THREE.Vector2();
  private tilt = new THREE.Vector2();
  private visible = true;
  private intersection: IntersectionObserver;

  constructor(
    private host: HTMLElement,
    private callbacks: Callbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
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
    host.addEventListener("pointermove", this.onPointer);
    host.addEventListener("pointerleave", this.onLeave);
    if (this.motion.matches) {
      this.elapsed = END;
      this.setOpen();
    } else this.updateIntro();
    this.resize();
    if (this.motion.matches) this.skip();
    else {
      this.setPhase("entering");
      this.schedule();
    }
  }

  private texture(kind: "leather" | "paper" | "sheet") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = kind === "leather" ? "#51382a" : "#f5efdf";
    ctx.fillRect(0, 0, 1024, 1440);
    // Seeded grain keeps the natural material stable between frames.
    let seed = 43;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 115000; i++) {
      ctx.fillStyle =
        random() > 0.48
          ? `rgba(255,239,211,${kind === "leather" ? 0.075 : 0.085})`
          : `rgba(52,30,14,${kind === "leather" ? 0.11 : 0.035})`;
      ctx.fillRect(
        random() * 1024,
        random() * 1440,
        random() * 2 + 0.4,
        random() * 2 + 0.4,
      );
    }
    if (kind === "leather") {
      ctx.strokeStyle = "#bfa36a";
      ctx.lineWidth = 2;
      ctx.strokeRect(53, 53, 918, 1334);
      ctx.strokeRect(66, 66, 892, 1308);
      ctx.setLineDash([3, 8]);
      ctx.strokeStyle = "#a38159";
      ctx.strokeRect(31, 31, 962, 1378);
      ctx.setLineDash([]);
      for (const [x, y] of [
        [91, 91],
        [933, 91],
        [91, 1349],
        [933, 1349],
      ]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = "#cbb583";
        ctx.strokeRect(-15, -15, 30, 30);
        ctx.restore();
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "#dac695";
      ctx.font = '500 26px "DM Sans"';
      ctx.fillText("THE COLLECTED WORK OF", 512, 264);
      ctx.font = '500 89px "Cormorant Garamond"';
      ctx.fillText("Josh Lucas", 512, 380);
      ctx.save();
      ctx.translate(512, 720);
      ctx.strokeStyle = "#baa16d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 144, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 157, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 4);
        ctx.beginPath();
        ctx.moveTo(0, -123);
        ctx.lineTo(12, -29);
        ctx.lineTo(0, -5);
        ctx.lineTo(-12, -29);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? "#907846" : "#d0b77d";
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.font = '500 48px "Cormorant Garamond"';
      ctx.fillText("A designer’s field journal", 512, 1080);
      ctx.font = '400 23px "DM Sans"';
      ctx.fillText("QUESTIONS  /  CRAFT  /  POSSIBILITY", 512, 1143);
      ctx.font = '500 22px "DM Sans"';
      ctx.fillText("VOLUME I", 512, 1285);
    } else if (kind === "sheet") {
      ctx.fillStyle = "#786e58";
      ctx.font = '500 24px "DM Sans"';
      ctx.fillText("JOSH LUCAS  /  SELECTED WORK", 80, 110);
      ctx.font = '500 69px "Cormorant Garamond"';
      ctx.fillText("Notes from the field.", 80, 280);
      ctx.fillStyle = "#d4d7c2";
      ctx.fillRect(80, 350, 864, 470);
      ctx.strokeStyle = "#8b9679";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(512, 585, 160, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(512, 585, 112, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 4 === 3 ? "#e5ddc9" : "#c2b9a5";
        ctx.fillRect(80, 910 + i * 26, 864 - (i % 3) * 76, 3);
      }
      ctx.fillStyle = "#8e856f";
      ctx.font = '400 22px "DM Sans"';
      ctx.fillText("EXPLORATION  /  OBSERVATION  /  RESOLUTION", 80, 1318);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      this.renderer.capabilities.getMaxAnisotropy(),
      8,
    );
    this.textures.push(texture);
    return texture;
  }

  private light() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc6b89e, 1.9));
    const light = new THREE.DirectionalLight(0xfff9ed, 3.2);
    light.position.set(-3, 9, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -7;
    light.shadow.camera.right = 7;
    light.shadow.camera.top = 7;
    light.shadow.camera.bottom = -7;
    light.shadow.normalBias = 0.025;
    light.shadow.bias = -0.0002;
    light.shadow.radius = 5;
    this.scene.add(light);
    const fill = new THREE.DirectionalLight(0xffffff, 1.3);
    fill.position.set(5, 4, -5);
    this.scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.23;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private buildBook() {
    const leather = this.texture("leather"),
      paper = this.texture("paper"),
      sheet = this.texture("sheet");
    const edge = new THREE.MeshStandardMaterial({
      color: "#4b3023",
      roughness: 0.82,
    });
    const face = new THREE.MeshStandardMaterial({
      map: leather,
      bumpMap: leather,
      bumpScale: 0.018,
      roughness: 0.76,
    });
    const inside = new THREE.MeshStandardMaterial({
      color: "#73523a",
      roughness: 0.95,
    });
    const coverMaterials = [edge, edge, face, inside, edge, edge];
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.12, 0.09, H + 0.16),
      [edge, edge, inside, edge, edge, edge],
    );
    back.position.set(W / 2, -0.16, 0);
    back.castShadow = back.receiveShadow = true;
    this.rig.add(back);
    const front = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.12, 0.09, H + 0.16),
      coverMaterials,
    );
    front.position.x = W / 2;
    front.castShadow = front.receiveShadow = true;
    this.lid.add(front);
    this.rig.add(this.lid);
    // Rounded bound spine, with two subtle raised bands.
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, H + 0.16, 20),
      edge,
    );
    spine.rotation.x = Math.PI / 2;
    spine.position.set(0, -0.03, 0);
    spine.castShadow = true;
    this.rig.add(spine);
    const bandMat = new THREE.MeshStandardMaterial({
      color: "#6d4b2f",
      roughness: 0.8,
    });
    for (const z of [-H * 0.35, H * 0.35]) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.145, 0.016, 6, 24),
        bandMat,
      );
      band.position.set(0, -0.03, z);
      this.rig.add(band);
    }
    const pageMat = new THREE.MeshStandardMaterial({
      map: paper,
      color: 0xffffff,
      roughness: 1,
    });
    const pageEdge = new THREE.MeshStandardMaterial({
      color: "#ded3bc",
      roughness: 1,
    });
    const stack = (sign: number) => {
      const group = new THREE.Group();
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(W - 0.045, D, H - 0.035),
        [pageEdge, pageEdge, pageMat, pageEdge, pageEdge, pageEdge],
      );
      block.position.set((sign * W) / 2, 0.025, 0);
      block.receiveShadow = block.castShadow = true;
      group.add(block);
      // Layered edges catch grazing light, rather than a single solid slab.
      const seamMat = new THREE.LineBasicMaterial({
        color: "#bcae92",
        transparent: true,
        opacity: 0.38,
      });
      const pts = [];
      for (let i = 0; i < 11; i++) {
        const y = -0.08 + i * 0.02;
        pts.push(
          new THREE.Vector3(sign * (W - 0.023), y, -H / 2),
          new THREE.Vector3(sign * (W - 0.023), y, H / 2),
          new THREE.Vector3(sign * 0.025, y, H / 2),
          new THREE.Vector3(sign * (W - 0.023), y, H / 2),
        );
      }
      group.add(
        new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(pts),
          seamMat,
        ),
      );
      return group;
    };
    this.rig.add(stack(1));
    this.leftStack = stack(-1);
    this.rig.add(this.leftStack);
    // Thin top pages have a subtly raised inner edge at the gutter.
    for (const sign of [-1, 1]) {
      const geometry = new THREE.PlaneGeometry(W - 0.07, H - 0.06, 24, 1);
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + (sign * W) / 2;
        pos.setX(i, x);
        pos.setY(i, 0.145 + 0.035 * Math.exp(-Math.abs(x) * 5));
      }
      geometry.computeVertexNormals();
      const surface = new THREE.Mesh(geometry, pageMat);
      surface.receiveShadow = true;
      if (sign < 0) this.leftStack.add(surface);
      else this.rig.add(surface);
    }
    // A satin ribbon peeks below the journal's lower edge.
    const ribbonShape = new THREE.Shape();
    ribbonShape.moveTo(-0.09, 0);
    ribbonShape.lineTo(0.09, 0);
    ribbonShape.lineTo(0.09, 0.67);
    ribbonShape.lineTo(0, 0.57);
    ribbonShape.lineTo(-0.09, 0.67);
    ribbonShape.closePath();
    const ribbon = new THREE.Mesh(
      new THREE.ShapeGeometry(ribbonShape),
      new THREE.MeshStandardMaterial({
        color: "#596b4b",
        side: THREE.DoubleSide,
        roughness: 0.85,
      }),
    );
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.set(0.37, -0.09, H / 2 - 0.05);
    ribbon.castShadow = true;
    this.rig.add(ribbon);
    for (let i = 0; i < 9; i++)
      this.sheets.push(
        this.makeSheet(sheet, 1.48 + i * 0.19, i === 8 ? 1.75 : 0.76),
      );
    this.turnSheet = this.makeSheet(sheet, 0, 1);
    this.turnSheet.pivot.visible = false;
  }

  private makeSheet(
    texture: THREE.Texture,
    start: number,
    duration: number,
  ): Sheet {
    const geometry = new THREE.PlaneGeometry(W - 0.055, H - 0.055, 28, 3);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (W - 0.055) / 2,
        z = -pos.getY(i);
      pos.setXYZ(i, x, 0, z);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: "#fff9eb",
      roughness: 1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const pivot = new THREE.Group();
    pivot.visible = false;
    pivot.position.y = 0.19;
    pivot.add(mesh);
    this.rig.add(pivot);
    return { pivot, mesh, start, duration };
  }

  private bend(sheet: Sheet, angle: number, amount: number) {
    sheet.pivot.rotation.z = angle;
    const pos = sheet.mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / (W - 0.055);
      pos.setY(
        i,
        Math.sin(u * Math.PI) * amount + Math.pow(u, 3) * amount * 0.22,
      );
    }
    pos.needsUpdate = true;
    sheet.mesh.geometry.computeVertexNormals();
  }

  private buildPrinting() {
    for (const [index, element] of [this.leftPage, this.rightPage].entries()) {
      element.className = `printed-page ${index === 0 ? "page-verso" : "page-recto"}`;
      const obj = new CSS3DObject(element);
      obj.rotation.x = -Math.PI / 2;
      obj.scale.setScalar((W - 0.09) / 600);
      obj.position.set(((index === 0 ? -1 : 1) * W) / 2, 0.184, 0);
      this.printRig.add(obj);
    }
    this.css.domElement.style.opacity = "0";
    this.css.domElement.inert = true;
  }

  private resize = () => {
    const { width, height } = this.host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const mobile = matchMedia("(max-width: 760px)").matches;
    this.css.domElement.setAttribute("aria-hidden", String(mobile));
    this.css.domElement.inert = mobile || this.phase !== "ready";
    this.renderer.setSize(width, height);
    this.css.setSize(width, height);
    this.camera.aspect = width / height;
    const halfFov = THREE.MathUtils.degToRad(17),
      aspect = width / height;
    const distance =
      Math.max(
        7.1 / (2 * Math.tan(halfFov) * aspect),
        4.6 / (2 * Math.tan(halfFov)),
      ) * 1.1;
    this.camera.position.set(0, distance * 0.88, distance * 0.475);
    this.camera.lookAt(0, 0.05, 0);
    this.camera.updateProjectionMatrix();
    this.render();
  };

  private setPhase(phase: Phase) {
    if (this.phase === phase && this.host.dataset.phase) return;
    this.phase = phase;
    this.host.dataset.phase = phase;
    this.callbacks.onPhase(phase);
  }
  private setOpen() {
    this.lid.rotation.z = Math.PI;
    this.lid.position.y = -0.16;
    this.leftStack.visible = true;
    this.leftStack.scale.y = 1;
    this.rig.position.set(0, 0, 0);
    this.rig.scale.setScalar(1);
    this.rig.rotation.set(0, 0, 0);
    this.printRig.position.copy(this.rig.position);
    this.printRig.rotation.copy(this.rig.rotation);
    this.printRig.scale.copy(this.rig.scale);
  }
  skip = () => {
    this.elapsed = END;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.turn = null;
    this.turnSheet.pivot.visible = false;
    for (const sheet of this.sheets) sheet.pivot.visible = false;
    this.setOpen();
    this.css.domElement.style.opacity = "1";
    this.css.domElement.inert = matchMedia("(max-width: 760px)").matches;
    this.setPhase("ready");
    this.callbacks.onReady();
    this.render();
    this.schedule();
  };
  replay = () => {
    if (this.motion.matches) return;
    this.elapsed = 0;
    this.last = 0;
    this.turn = null;
    this.css.domElement.style.opacity = "0";
    this.css.domElement.inert = true;
    this.setPhase("entering");
    this.schedule();
  };
  turnPage(direction: number) {
    if (this.phase !== "ready") return false;
    if (this.motion.matches) {
      this.callbacks.onTurn();
      this.render();
      return true;
    }
    this.last = 0;
    this.turn = { elapsed: 0, direction, changed: false };
    this.css.domElement.style.opacity = "0";
    this.css.domElement.inert = true;
    this.setPhase("turning");
    this.schedule();
    return true;
  }

  private updateIntro() {
    const t = this.elapsed,
      open = ease((t - 0.65) / 1.6),
      entry = ease(t / 1.25);
    this.rig.position.set((-W / 2) * (1 - open), -0.9 * (1 - entry), 0);
    this.rig.scale.setScalar(0.9 + 0.1 * entry);
    this.rig.rotation.set(0, -0.09 * (1 - entry), -0.05 * (1 - entry));
    this.lid.rotation.z = Math.PI * open;
    this.lid.position.y = 0.25 - 0.41 * open;
    this.leftStack.visible = open > 0.6;
    this.leftStack.scale.y = Math.max(0.001, ease((open - 0.6) / 0.4));
    for (const s of this.sheets) {
      const p = (t - s.start) / s.duration;
      s.pivot.visible = p > 0 && p < 1;
      if (s.pivot.visible)
        this.bend(s, Math.PI * (1 - ease(p)), Math.sin(Math.PI * p) * 0.29);
    }
    this.printRig.position.copy(this.rig.position);
    this.printRig.rotation.copy(this.rig.rotation);
    this.printRig.scale.copy(this.rig.scale);
    this.camera.zoom = 0.82 + 0.18 * ease((t - 4.3) / 1.5);
    this.camera.updateProjectionMatrix();
    this.setPhase(
      t < 0.65
        ? "entering"
        : t < 1.5
          ? "opening"
          : t < 3.3
            ? "flipping"
            : "settling",
    );
    this.host.dataset.progress = String(Math.round(Math.min(t / END, 1) * 100));
    if (t >= END) this.skip();
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.visible || document.hidden) return;
    const dt = this.last ? Math.max(0, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.elapsed < END) {
      this.elapsed += dt;
      this.updateIntro();
    } else if (this.turn) {
      const turn = this.turn;
      turn.elapsed += dt;
      const p = clamp(turn.elapsed / 1.08, 0, 1);
      this.camera.zoom = 1 - 0.16 * Math.sin(Math.PI * p);
      this.camera.updateProjectionMatrix();
      this.turnSheet.pivot.visible = true;
      this.bend(
        this.turnSheet,
        Math.PI * (turn.direction > 0 ? ease(p) : 1 - ease(p)),
        Math.sin(Math.PI * p) * 0.35,
      );
      if (p >= 0.5 && !turn.changed) {
        turn.changed = true;
        this.callbacks.onTurn();
      }
      if (p >= 1) {
        this.turn = null;
        this.turnSheet.pivot.visible = false;
        this.css.domElement.style.opacity = "1";
        this.css.domElement.inert = matchMedia("(max-width: 760px)").matches;
        this.setPhase("ready");
      }
    } else if (!this.motion.matches) {
      this.tilt.lerp(this.pointer, 0.045);
      this.rig.rotation.y = this.tilt.x * 0.025;
      this.rig.rotation.x = this.tilt.y * 0.014;
      this.printRig.rotation.copy(this.rig.rotation);
    }
    this.render();
    if (
      this.elapsed < END ||
      this.turn ||
      this.pointer.distanceTo(this.tilt) > 0.0003
    )
      this.schedule();
  };
  private render() {
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.printing, this.camera);
  }
  private schedule() {
    if (this.raf || this.disposed || document.hidden || !this.visible) return;
    if (this.motion.matches && this.phase === "ready") {
      this.render();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  }
  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = this.host.getBoundingClientRect();
    this.pointer.set(
      (e.clientX - r.left) / r.width - 0.5,
      (e.clientY - r.top) / r.height - 0.5,
    );
    if (!this.raf) {
      this.last = 0;
      this.schedule();
    }
  };
  private onLeave = () => {
    this.pointer.set(0, 0);
    if (!this.raf) {
      this.last = 0;
      this.schedule();
    }
  };
  private onMotion = () => {
    if (this.motion.matches) this.skip();
    else this.schedule();
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
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    this.motion.removeEventListener("change", this.onMotion);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.host.removeEventListener("pointermove", this.onPointer);
    this.host.removeEventListener("pointerleave", this.onLeave);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        geometries.add(obj.geometry);
        for (const m of Array.isArray(obj.material)
          ? obj.material
          : [obj.material])
          materials.add(m);
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
