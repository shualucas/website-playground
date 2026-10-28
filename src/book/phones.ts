import * as THREE from "three";
import { parseGIF, decompressFrames } from "gifuct-js";
import { SkinnedLeaf, LEAF_SEGMENTS } from "./leaf";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
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
  meshes: THREE.Mesh[];
  root: THREE.Group;
  screenMesh: THREE.Mesh;
  glows: THREE.MeshBasicMaterial[];
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

/** A rigid, locally modeled Pro-style handset, anchored to the leaf's middle bone.
 * Original approximation, not a dimension-certified Apple product asset. */
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
        root = new THREE.Group(),
        meshes: THREE.Mesh[] = [],
        colors = projectTheme(project.theme).colors,
        joint = Math.floor(0.51 * LEAF_SEGMENTS);
      root.position.set(W * 0.51 - (joint * W) / LEAF_SEGMENTS, 0.026, 0);
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
      const screenMesh = add(plane(1.87, 3.55, 0.101), screen, "phone screen");
      const inkCanvas = document.createElement("canvas");
      inkCanvas.width = inkCanvas.height = 128;
      const ctx = inkCanvas.getContext("2d")!,
        gradient = ctx.createLinearGradient(0, 128, 128, 0);
      colors.forEach((color, i) =>
        gradient.addColorStop(i / (colors.length - 1), color),
      );
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      const ink = new THREE.CanvasTexture(inkCanvas);
      ink.colorSpace = THREE.SRGBColorSpace;
      this.textures.add(ink);
      const rim = new THREE.MeshBasicMaterial({ map: ink, toneMapped: false });
      // 0.012-world-unit outline is approximately one CSS pixel in the default view.
      rounded(rim, 1.894, 3.574, 0.172);
      add(plane(1.894, 3.574, 0.099), rim, "one-pixel rounded outline");
      const halo = new THREE.MeshBasicMaterial({
        map: ink,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      halo.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>\nvec2 q=abs(vMapUv-.5)*vec2(2.75,4.43)-vec2(.775,1.615);
          float d=length(max(q,vec2(0.)))+min(max(q.x,q.y),0.)-.16;
          if(d<0.)discard;diffuseColor.a*=exp(-d*d/0.035)*.68;`,
        );
      };
      halo.customProgramCacheKey = () => "rounded-phone-halo-v1";
      add(plane(2.75, 4.43, 0.093), halo, "rounded colored halo");
      // Continuous rounded perimeter with a vertical feathered veil, rather than four strips.
      const positions: number[] = [],
        uvs: number[] = [],
        rise: number[] = [],
        indices: number[] = [];
      const contour: THREE.Vector2[] = [];
      for (let corner = 0; corner < 4; corner++) {
        const angle = -Math.PI / 2 + (corner * Math.PI) / 2,
          cx = corner === 0 || corner === 1 ? 0.775 : -0.775,
          cz =
            corner < 2
              ? corner === 0
                ? -1.615
                : 1.615
              : corner === 2
                ? 1.615
                : -1.615;
        for (let j = 0; j <= 10; j++) {
          const theta = angle + ((j / 10) * Math.PI) / 2;
          contour.push(
            new THREE.Vector2(
              cx + Math.cos(theta) * 0.172,
              cz + Math.sin(theta) * 0.172,
            ),
          );
        }
      }
      for (let i = 0; i <= contour.length; i++) {
        const point = contour[i % contour.length];
        for (let k = 0; k <= 4; k++) {
          const h = k / 4,
            x = point.x * (1 + h * 0.08),
            z = point.y * (1 + h * 0.04);
          positions.push(x, 0.102 + h * 0.42, z);
          uvs.push(x / 1.894 + 0.5, 0.5 - z / 3.574);
          rise.push(h);
        }
        if (i < contour.length)
          for (let k = 0; k < 4; k++) {
            const a = i * 5 + k,
              b = a + 5;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
          }
      }
      const veilGeometry = new THREE.BufferGeometry();
      veilGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      veilGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      veilGeometry.setAttribute(
        "aRise",
        new THREE.Float32BufferAttribute(rise, 1),
      );
      veilGeometry.setIndex(indices);
      veilGeometry.computeVertexNormals();
      const glow = new THREE.MeshBasicMaterial({
        map: ink,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      glow.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "attribute float aRise; varying float vRise;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvRise=aRise;",
        );
        shader.fragmentShader =
          "varying float vRise;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <clipping_planes_fragment>",
          "#include <clipping_planes_fragment>\ndiffuseColor.a*=pow(1.-vRise,2.)*.8;",
        );
      };
      glow.customProgramCacheKey = () => "rounded-phone-spell-v1";
      add(veilGeometry, glow, "continuous rising phone glow");
      const metal = new THREE.MeshStandardMaterial({
        color: "#747779",
        metalness: 0.78,
        roughness: 0.26,
      });
      const glass = new THREE.MeshStandardMaterial({
        color: "#050608",
        metalness: 0.08,
        roughness: 0.18,
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
          bevelSize: 0.0025,
          bevelThickness: 0.0025,
          bevelSegments: 1,
          curveSegments: 8,
          steps: 1,
        });
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, y, 0);
        return geometry;
      };
      const body = add(
        roundedBody(1.91, 3.59, 0.18, 0.078, 0.019),
        metal,
        "titanium frame",
      );
      body.castShadow = true;
      add(roundedBody(1.89, 3.57, 0.17, 0.008, 0.013), glass, "back glass");
      for (const [x, z, length] of [
        [-0.977, -0.65, 0.28],
        [-0.977, -0.15, 0.28],
        [0.977, -0.4, 0.45],
      ]) {
        const key = add(
          new RoundedBoxGeometry(0.018, 0.035, length, 2, 0.008),
          metal,
          "side control",
        );
        key.position.set(x, 0.06, z);
      }
      // A restrained island leaves the actual media surface uninterrupted and black by default.
      const island = add(
        new RoundedBoxGeometry(0.42, 0.008, 0.105, 3, 0.004),
        glass,
        "dynamic island",
      );
      island.position.set(0, 0.107, -1.59);
      this.materials.push(screen, rim, halo, glow, metal, glass);
      const phone: Phone = {
        index,
        project,
        root,
        screenMesh,
        meshes,
        glow,
        glows: [halo, glow],
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
  /** Phone-facing camera pose derived from its current world transform. */
  focus(index: number, camera: THREE.PerspectiveCamera) {
    const phone = this.phones.find((p) => p.index === index);
    if (!phone) return null;
    phone.root.updateWorldMatrix(true, true);
    const center = phone.root.localToWorld(new THREE.Vector3(0, 0.104, 0)),
      rotation = phone.root.getWorldQuaternion(new THREE.Quaternion()),
      normal = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation),
      up = new THREE.Vector3(0, 0, -1).applyQuaternion(rotation),
      distance =
        (Math.min(1.87 / camera.aspect, 3.55) /
          (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) *
        0.78,
      position = center.clone().addScaledVector(normal, distance),
      target = new THREE.PerspectiveCamera();
    target.position.copy(position);
    target.up.copy(up);
    target.lookAt(center);
    return { position, quaternion: target.quaternion.clone() };
  }
  center(index: number) {
    const phone = this.phones.find((p) => p.index === index);
    return phone?.screenMesh.getWorldPosition(new THREE.Vector3());
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
      p.root.visible = active;
      const opacity = reduced
        ? active
          ? 0.96
          : 0
        : THREE.MathUtils.damp(p.glow.opacity, active ? 0.96 : 0, 14, dt);
      p.glows.forEach((material) => (material.opacity = opacity));
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
    return this.phones.flatMap((p) =>
      p.active
        ? p.meshes.filter(
            (m) => m.material !== p.glows[0] && m.material !== p.glows[1],
          )
        : [],
    );
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
