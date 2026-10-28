import * as THREE from "three";
import { parseGIF, decompressFrames } from "gifuct-js";
import { SkinnedLeaf, LEAF_SEGMENTS, LEAF_RADIUS } from "./leaf";
import { PAGE_WIDTH as W, PAGE_HEIGHT as H, type Project } from "./materials";
import { projectTheme } from "./themes";

type Frame = {
  patch: Uint8ClampedArray;
  dims: { left: number; top: number; width: number; height: number };
  delay: number;
  disposalType: number;
};
type Phone = {
  index: number;
  project: Project;
  meshes: THREE.SkinnedMesh[];
  glow: THREE.MeshBasicMaterial;
  screen: THREE.MeshBasicMaterial;
  poster: THREE.CanvasTexture;
  video?: HTMLVideoElement;
  media?: THREE.Texture;
  frames?: Frame[];
  canvas?: HTMLCanvasElement;
  previous?: ImageData;
  frame: number;
  clock: number;
  loading: boolean;
  active: boolean;
  failed: boolean;
};

/** Preview surfaces share the printed leaf's skeleton, so they never jump at settlement. */
export class PhonePreviews {
  private phones: Phone[] = [];
  private textures = new Set<THREE.Texture>();
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private disposed = false;
  private reduced = false;
  constructor(projects: Project[], leaves: SkinnedLeaf[]) {
    projects.forEach((project, index) => {
      if (project.kind !== "project") return;
      const leaf = leaves[index + 1],
        meshes: THREE.SkinnedMesh[] = [],
        colors = projectTheme(project.theme).colors;
      const add = (
        x: number,
        z: number,
        width: number,
        height: number,
        y: number,
        material: THREE.MeshBasicMaterial,
        rise = 0,
        edge: "x" | "z" = "x",
      ) => {
        const geometry = new THREE.PlaneGeometry(width, height, 20, 12);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(x, y, z);
        const p = geometry.attributes.position,
          skin: number[] = [],
          weights: number[] = [];
        for (let i = 0; i < p.count; i++) {
          if (rise) {
            const along = geometry.attributes.uv.getX(i) - 0.5;
            p.setXYZ(
              i,
              x + (edge === "x" ? along * width : 0),
              y + geometry.attributes.uv.getY(i) * rise,
              z + (edge === "z" ? along * width : 0),
            );
          }
          const u = THREE.MathUtils.clamp(p.getX(i) / W, 0, 1) * LEAF_SEGMENTS,
            j = Math.min(LEAF_SEGMENTS - 1, Math.floor(u));
          skin.push(j, j + 1, 0, 0);
          weights.push(1 - (u - j), u - j, 0, 0);
        }
        geometry.setAttribute(
          "skinIndex",
          new THREE.Uint16BufferAttribute(skin, 4),
        );
        geometry.setAttribute(
          "skinWeight",
          new THREE.Float32BufferAttribute(weights, 4),
        );
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.bind(leaf.mesh.skeleton, leaf.mesh.bindMatrix);
        mesh.boundingSphere = new THREE.Sphere(
          new THREE.Vector3(),
          LEAF_RADIUS + 0.7,
        );
        mesh.frustumCulled = false;
        mesh.userData.leaf = leaf.id;
        mesh.userData.phone = true;
        mesh.name = `${project.label} phone preview`;
        leaf.group.add(mesh);
        meshes.push(mesh);
        this.geometries.push(geometry);
        return mesh;
      };
      const poster = this.poster(project);
      this.textures.add(poster);
      const screen = new THREE.MeshBasicMaterial({
        map: poster,
        toneMapped: false,
      });
      const rimCanvas = document.createElement("canvas");
      rimCanvas.width = 128;
      rimCanvas.height = 128;
      const rimContext = rimCanvas.getContext("2d")!,
        ink = rimContext.createLinearGradient(0, 0, 128, 128);
      colors.forEach((c, i) => ink.addColorStop(i / (colors.length - 1), c));
      rimContext.fillStyle = ink;
      rimContext.fillRect(0, 0, 128, 128);
      const rimMap = new THREE.CanvasTexture(rimCanvas);
      rimMap.colorSpace = THREE.SRGBColorSpace;
      this.textures.add(rimMap);
      const rim = new THREE.MeshBasicMaterial({
        map: rimMap,
        toneMapped: false,
      });
      const gradient = document.createElement("canvas");
      gradient.width = 128;
      gradient.height = 128;
      const ctx = gradient.getContext("2d")!,
        g = ctx.createLinearGradient(0, 128, 0, 0);
      g.addColorStop(0, "#ffffffb0");
      g.addColorStop(0.2, "#ffffff38");
      g.addColorStop(1, "#ffffff00");
      ctx.drawImage(rimCanvas, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const glowMap = new THREE.CanvasTexture(gradient);
      glowMap.colorSpace = THREE.SRGBColorSpace;
      this.textures.add(glowMap);
      const glow = new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      for (const [material, width, height] of [
        [screen, 1.87, 3.55],
        [rim, 1.95, 3.63],
      ] as const) {
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <clipping_planes_fragment>",
            `#include <clipping_planes_fragment>\nvec2 roundedPhone=abs(vMapUv-.5)*vec2(${width},${height})-vec2(${width / 2 - 0.1},${height / 2 - 0.1});\nif(length(max(roundedPhone,vec2(0.)))+min(max(roundedPhone.x,roundedPhone.y),0.)-.1>0.)discard;`,
          );
        };
        material.customProgramCacheKey = () => `rounded-phone-${width}`;
      }
      this.materials.push(screen, rim, glow);
      // Portrait inset with an ink-colored rim; the emitted veil rises in page-local Y.
      add(W * 0.51, 0, 1.95, 3.63, 0.013, rim);
      add(W * 0.51, 0, 1.87, 3.55, 0.015, screen);
      for (const z of [-1.83, 1.83])
        add(W * 0.51, z, 1.99, 0.5, 0.018, glow, 0.5, "x");
      for (const x of [W * 0.51 - 0.995, W * 0.51 + 0.995])
        add(x, 0, 3.66, 0.5, 0.018, glow, 0.5, "z");
      const phone: Phone = {
        index,
        project,
        meshes,
        glow,
        screen,
        poster,
        frame: 0,
        clock: 0,
        loading: false,
        active: false,
        failed: false,
      };
      this.phones.push(phone);
      if (project.previewPoster) {
        const image = new Image();
        image.onload = () => {
          if (this.disposed) return;
          const c = poster.image as HTMLCanvasElement;
          this.cover(c.getContext("2d")!, image, c.width, c.height);
          poster.needsUpdate = true;
        };
        image.src = project.previewPoster;
      }
    });
  }
  private poster(project: Project) {
    const c = document.createElement("canvas");
    c.width = 540;
    c.height = 1024;
    const x = c.getContext("2d")!;
    const colors = projectTheme(project.theme).colors;
    x.fillStyle = "#111114";
    x.fillRect(0, 0, 540, 1024);
    const g = x.createLinearGradient(0, 0, 540, 1024);
    colors.forEach((color, i) =>
      g.addColorStop(i / (colors.length - 1), color),
    );
    x.globalAlpha = 0.8;
    x.fillStyle = g;
    x.fillRect(16, 16, 508, 992);
    x.globalAlpha = 1;
    x.fillStyle = "#ffffff";
    x.textAlign = "center";
    x.font = '500 48px "DM Sans",sans-serif';
    x.fillText(project.label, 270, 475);
    x.font = '400 22px "DM Sans",sans-serif';
    x.fillText("Preview coming soon", 270, 525);
    x.font = '400 16px "DM Sans",sans-serif';
    x.fillText("MP4 / GIF", 270, 560);
    x.fillStyle = "#111114";
    x.beginPath();
    x.roundRect(203, 25, 134, 28, 14);
    x.fill();
    x.fillStyle = "#ffffff90";
    x.beginPath();
    x.roundRect(207, 982, 126, 5, 3);
    x.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  private cover(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource,
    w: number,
    h: number,
  ) {
    const i = image as HTMLImageElement,
      s = Math.max(w / i.width, h / i.height);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(
      image,
      (w - i.width * s) / 2,
      (h - i.height * s) / 2,
      i.width * s,
      i.height * s,
    );
  }
  private async load(phone: Phone) {
    if (phone.loading || phone.media || phone.failed || this.disposed) return;
    phone.loading = true;
    try {
      if (phone.project.previewVideo) {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.preload = "auto";
        video.src = phone.project.previewVideo;
        phone.video = video;
        await new Promise<void>((resolve, reject) => {
          video.addEventListener("loadeddata", () => resolve(), { once: true });
          video.addEventListener(
            "error",
            () => reject(new Error("Video unavailable")),
            { once: true },
          );
        });
        if (this.disposed) return;
        phone.media = new THREE.VideoTexture(video);
        phone.media.colorSpace = THREE.SRGBColorSpace;
        this.textures.add(phone.media);
        phone.screen.map = phone.media;
        phone.screen.needsUpdate = true;
        if (phone.active && !this.reduced && !document.hidden)
          void video.play().catch(() => {});
      } else if (phone.project.previewGif) {
        const response = await fetch(phone.project.previewGif);
        if (!response.ok) throw new Error("GIF unavailable");
        const gif = parseGIF(await response.arrayBuffer()),
          frames = decompressFrames(gif, true) as Frame[];
        if (this.disposed) return;
        phone.frames = frames;
        phone.canvas = document.createElement("canvas");
        phone.canvas.width = gif.lsd.width;
        phone.canvas.height = gif.lsd.height;
        phone.media = new THREE.CanvasTexture(phone.canvas);
        phone.media.colorSpace = THREE.SRGBColorSpace;
        this.textures.add(phone.media);
        phone.screen.map = phone.media;
        phone.screen.needsUpdate = true;
        this.drawGif(phone);
      }
    } catch {
      phone.failed = true;
      phone.screen.map = phone.poster;
    } finally {
      phone.loading = false;
    }
  }
  private drawGif(phone: Phone) {
    const frames = phone.frames!,
      canvas = phone.canvas!,
      ctx = canvas.getContext("2d")!,
      frame = frames[phone.frame];
    if (!frame) return;
    const prior = frames[(phone.frame + frames.length - 1) % frames.length];
    if (phone.frame === 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
    else if (prior.disposalType === 2)
      ctx.clearRect(
        prior.dims.left,
        prior.dims.top,
        prior.dims.width,
        prior.dims.height,
      );
    else if (prior.disposalType === 3 && phone.previous)
      ctx.putImageData(phone.previous, 0, 0);
    if (frame.disposalType === 3)
      phone.previous = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const patch = document.createElement("canvas");
    patch.width = frame.dims.width;
    patch.height = frame.dims.height;
    patch
      .getContext("2d")!
      .putImageData(
        new ImageData(
          new Uint8ClampedArray(frame.patch),
          patch.width,
          patch.height,
        ),
        0,
        0,
      );
    ctx.drawImage(patch, frame.dims.left, frame.dims.top);
    phone.media!.needsUpdate = true;
  }
  step(dt: number, spread: number, reduced: boolean, visible = true) {
    this.reduced = reduced;
    this.phones.forEach((p) => {
      const active = spread === p.index && visible && !document.hidden;
      const changed = active !== p.active;
      p.active = active;
      p.glow.opacity = reduced
        ? active
          ? 0.55
          : 0
        : THREE.MathUtils.damp(p.glow.opacity, active ? 0.62 : 0, 14, dt);
      // Opaque media stays on its physical leaf; only the spell effect retracts for a turn.
      p.meshes.slice(2).forEach((mesh) => {
        mesh.visible = active && p.glow.opacity > 0.003;
      });
      if (active && !reduced) void this.load(p);
      if (p.video) {
        if (active && !reduced && changed) void p.video.play().catch(() => {});
        else if (!active || reduced) p.video.pause();
      }
      if (p.frames && active && !reduced) {
        p.clock += dt * 1000;
        const delay = Math.max(20, p.frames[p.frame].delay || 100);
        if (p.clock >= delay) {
          p.clock %= delay;
          p.frame = (p.frame + 1) % p.frames.length;
          this.drawGif(p);
        }
      }
    });
  }
  pause() {
    this.phones.forEach((p) => {
      p.video?.pause();
      p.active = false;
    });
  }
  get hitMeshes() {
    return this.phones.flatMap((p) => p.meshes.slice(0, 2));
  }
  get count() {
    return this.phones.length;
  }
  dispose() {
    this.disposed = true;
    this.phones.forEach((p) => {
      p.video?.pause();
      if (p.video) {
        p.video.removeAttribute("src");
        p.video.load();
      }
    });
    this.textures.forEach((t) => t.dispose());
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
