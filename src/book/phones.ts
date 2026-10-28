import * as THREE from "three";
import { parseGIF, decompressFrames } from "gifuct-js";
import { SkinnedLeaf, LEAF_SEGMENTS } from "./leaf";
import { acquireClayGrain } from "./clay";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PAGE_WIDTH as W, PAGE_HEIGHT as H, type Project } from "./materials";

const PHONE_LIFT = 0.18,
  PHONE_THICKNESS = 0.14,
  PHONE_SCREEN_Y = 0.019 + PHONE_THICKNESS + 0.018;

type Frame = {
  patch: Uint8ClampedArray;
  dims: { left: number; top: number; width: number; height: number };
  delay: number;
  disposalType: number;
};
type Phone = {
  index: number;
  project: Project;
  meshes: THREE.Mesh[];
  root: THREE.Group;
  screenMesh: THREE.Mesh;
  amount: number;
  time: number;
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

/** A rigid, locally modeled Pro-style handset, anchored to the leaf's middle bone.
 * Original approximation, not a dimension-certified Apple product asset. */
export class PhonePreviews {
  private phones: Phone[] = [];
  private textures = new Set<THREE.Texture>();
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private disposed = false;
  private reduced = false;
  private grain = acquireClayGrain();
  constructor(projects: Project[], leaves: SkinnedLeaf[]) {
    projects.forEach((project, index) => {
      if (project.kind !== "project") return;
      const leaf = leaves[index + 1],
        root = new THREE.Group(),
        meshes: THREE.Mesh[] = [],
        joint = Math.floor(0.51 * LEAF_SEGMENTS);
      root.position.set(W * 0.51 - (joint * W) / LEAF_SEGMENTS, PHONE_LIFT, 0);
      root.name = `${project.label} rigid Pro handset`;
      leaf.bones[joint].add(root);
      const add = (
        geometry: THREE.BufferGeometry,
        material: THREE.Material,
        name: string,
      ) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.leaf = leaf.id;
        mesh.userData.phone = true;
        mesh.name = `${project.label} ${name}`;
        root.add(mesh);
        meshes.push(mesh);
        this.geometries.push(geometry);
        return mesh;
      };
      const plane = (w: number, h: number, y: number) => {
        const geometry = new THREE.PlaneGeometry(w, h);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, y, 0);
        return geometry;
      };
      const rounded = (
        material: THREE.MeshBasicMaterial,
        w: number,
        h: number,
        r: number,
      ) => {
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <clipping_planes_fragment>",
            `#include <clipping_planes_fragment>\nvec2 q=abs(vMapUv-.5)*vec2(${w},${h})-vec2(${w / 2 - r},${h / 2 - r});
             if(length(max(q,vec2(0.)))+min(max(q.x,q.y),0.)-${r}>0.)discard;`,
          );
        };
        material.customProgramCacheKey = () => `handset-rounded-${w}-${h}-${r}`;
      };
      const poster = this.poster(project);
      this.textures.add(poster);
      const screen = new THREE.MeshBasicMaterial({
        map: poster,
        toneMapped: false,
      });
      rounded(screen, 1.87, 3.55, 0.16);
      const screenMesh = add(
        plane(1.87, 3.55, PHONE_SCREEN_Y),
        screen,
        "phone screen",
      );
      const edgeMap = new THREE.DataTexture(
        new Uint8Array([255, 255, 255, 255]),
        1,
        1,
      );
      edgeMap.needsUpdate = true;
      this.textures.add(edgeMap);
      const rim = new THREE.MeshBasicMaterial({
        map: edgeMap,
        color: "#27292b",
        toneMapped: false,
      });
      rounded(rim, 1.894, 3.574, 0.172);
      add(
        plane(1.894, 3.574, PHONE_SCREEN_Y - 0.002),
        rim,
        "one-pixel rounded outline",
      );
      const frameClay = new THREE.MeshStandardMaterial({
        color: "#5e6265",
        metalness: 0,
        roughness: 0.9,
        normalMap: this.grain.normal,
        normalScale: new THREE.Vector2(0.14, 0.14),
        roughnessMap: this.grain.roughness,
      });
      const darkClay = new THREE.MeshStandardMaterial({
        color: "#050608",
        metalness: 0,
        roughness: 0.92,
        normalMap: this.grain.normal,
        normalScale: new THREE.Vector2(0.1, 0.1),
        roughnessMap: this.grain.roughness,
      });
      const roundedBody = (
        width: number,
        height: number,
        radius: number,
        depth: number,
        y: number,
      ) => {
        const shape = new THREE.Shape(),
          x = -width / 2,
          z = -height / 2;
        shape.moveTo(x + radius, z);
        shape.lineTo(x + width - radius, z);
        shape.quadraticCurveTo(x + width, z, x + width, z + radius);
        shape.lineTo(x + width, z + height - radius);
        shape.quadraticCurveTo(
          x + width,
          z + height,
          x + width - radius,
          z + height,
        );
        shape.lineTo(x + radius, z + height);
        shape.quadraticCurveTo(x, z + height, x, z + height - radius);
        shape.lineTo(x, z + radius);
        shape.quadraticCurveTo(x, z, x + radius, z);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSize: 0.018,
          bevelThickness: 0.012,
          bevelSegments: 3,
          curveSegments: 8,
          steps: 1,
        });
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, y, 0);
        return geometry;
      };
      const body = add(
        roundedBody(1.91, 3.59, 0.18, PHONE_THICKNESS, 0.019),
        frameClay,
        "clay frame",
      );
      body.castShadow = true;
      add(roundedBody(1.89, 3.57, 0.17, 0.008, 0.013), darkClay, "clay back");
      for (const [x, z, length] of [
        [-0.96, -0.65, 0.28],
        [-0.96, -0.15, 0.28],
        [0.96, -0.4, 0.45],
      ]) {
        const key = add(
          new RoundedBoxGeometry(0.018, 0.035, length, 2, 0.008),
          frameClay,
          "side control",
        );
        key.position.set(x, 0.019 + PHONE_THICKNESS / 2, z);
      }
      // A restrained island leaves the actual media surface uninterrupted and black by default.
      const island = add(
        new RoundedBoxGeometry(0.42, 0.008, 0.105, 3, 0.004),
        darkClay,
        "dynamic island",
      );
      island.position.set(0, PHONE_SCREEN_Y + 0.006, -1.59);
      this.materials.push(screen, rim, frameClay, darkClay);
      const phone: Phone = {
        index,
        project,
        root,
        screenMesh,
        meshes,
        amount: 0,
        time: 0,
        screen,
        poster,
        frame: 0,
        clock: 0,
        loading: false,
        active: false,
        failed: false,
      };
      root.visible = false;
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
  /** Approach the screen along the current camera-to-phone ray; never square up. */
  focus(index: number, camera: THREE.PerspectiveCamera) {
    const center = this.center(index);
    if (!center) return null;
    const approach = center.clone().sub(camera.position).normalize();
    // End just in front of the screen; the late fade hides the near-plane crossing.
    return { position: center.addScaledVector(approach, -0.24) };
  }
  center(index: number) {
    const phone = this.phones.find((p) => p.index === index);
    if (!phone) return undefined;
    phone.root.updateWorldMatrix(true, true);
    return phone.root.localToWorld(new THREE.Vector3(0, PHONE_SCREEN_Y, 0));
  }
  private poster(project: Project) {
    const c = document.createElement("canvas");
    c.width = 540;
    c.height = 1024;
    const x = c.getContext("2d")!;
    x.fillStyle = "#000000";
    x.fillRect(0, 0, 540, 1024);
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
      p.time = active ? p.time + dt : 0;
      if (reduced) p.amount = active ? 1 : 0;
      else if (!active) p.amount = Math.max(0, p.amount - dt / 0.18);
      else if (p.time > 0.08) p.amount = Math.min(1, p.amount + dt / 0.55);
      const q = p.amount - 1,
        bounce = 1 + 2.6 * q * q * q + 1.6 * q * q;
      p.root.visible = p.amount > 0;
      p.root.scale.setScalar(Math.max(0.001, 0.35 + 0.65 * bounce));
      p.root.position.y = PHONE_LIFT + 0.1 * Math.sin(Math.PI * p.amount);
      p.root.rotation.x = -0.22 * Math.pow(1 - p.amount, 3);
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
  get folded() {
    return this.phones.every((p) => p.amount === 0);
  }
  get hitMeshes() {
    return this.phones.flatMap((p) => (p.root.visible ? p.meshes : []));
  }
  get count() {
    return this.phones.length;
  }
  dispose() {
    this.grain.release();
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
