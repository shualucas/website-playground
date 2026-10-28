import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PAGE_WIDTH as W, PAGE_HEIGHT as H, type Project } from "./materials";
import { SkinnedLeaf, LEAF_SEGMENTS, type PaperMaterial } from "./leaf";
import { projectTheme } from "./themes";

type Item = {
  anchor: THREE.Group;
  fold: THREE.Group;
  amount: number;
  delay: number;
};
type Spread = { items: Item[]; time: number };

/** Independent paper-like dioramas. Anchors inherit the printed leaf's actual bones. */
export class PagePopups {
  readonly spreads: Spread[] = [];
  readonly meshes: THREE.Mesh[] = [];
  private active = -1;
  private box = new THREE.Box3();
  private corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  constructor(
    projects: Project[],
    leaves: SkinnedLeaf[],
    surface: (params: THREE.MeshPhysicalMaterialParameters) => PaperMaterial,
    paper: THREE.Texture,
  ) {
    projects.forEach((project, index) => {
      const palette = projectTheme(project.theme),
        leaf = leaves[index + 1],
        materials = new Map<string, PaperMaterial>();
      const material = (color: string) => {
        if (!materials.has(color))
          materials.set(color, surface({ color, map: paper, roughness: 0.96 }));
        return materials.get(color)!;
      };
      const shape = (
        width: number,
        height: number,
        depth: number,
        color = "#fff9ee",
        radius = 0.035,
      ) => {
        const mesh = new THREE.Mesh(
          new RoundedBoxGeometry(
            width,
            height,
            depth,
            2,
            Math.min(radius, width / 3, height / 3, depth / 3),
          ),
          material(color),
        );
        mesh.geometry.computeBoundingBox();
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData.leaf = leaf.id;
        mesh.userData.popup = true;
        this.meshes.push(mesh);
        return mesh;
      };
      const add = (
        group: THREE.Group,
        mesh: THREE.Object3D,
        x: number,
        y: number,
        z: number,
      ) => {
        mesh.position.set(x, y, z);
        group.add(mesh);
        return mesh;
      };
      const colors = palette.colors,
        spread: Spread = { items: [], time: 0 };
      const item = (
        u: number,
        v: number,
        build: (g: THREE.Group) => void,
        yaw = 0,
      ) => {
        const anchor = new THREE.Group(),
          fold = new THREE.Group(),
          content = new THREE.Group();
        const boneIndex = Math.min(
          LEAF_SEGMENTS - 1,
          Math.floor(u * LEAF_SEGMENTS),
        );
        anchor.position.set(
          u * W - (boneIndex * W) / LEAF_SEGMENTS,
          0.018,
          (v - 0.5) * H,
        );
        leaf.bones[boneIndex].add(anchor);
        anchor.add(fold);
        fold.add(content);
        content.rotation.y = yaw;
        build(content);
        anchor.visible = false;
        spread.items.push({
          anchor,
          fold,
          amount: 0,
          delay: spread.items.length * 0.11,
        });
      };
      const lines = (
        g: THREE.Group,
        x: number,
        y: number,
        z: number,
        width: number,
        color: string,
        count = 3,
      ) => {
        for (let i = 0; i < count; i++)
          add(
            g,
            shape(width * (1 - i * 0.12), 0.018, 0.006, color, 0.002),
            x - i * width * 0.06,
            y - i * 0.075,
            z,
          );
      };
      if (project.kind === "about") {
        // A small folded RISO print with a two-ink moon, pencil and print swatches.
        item(
          0.54,
          0.49,
          (g) => {
            add(g, shape(1.15, 1.4, 0.045), 0, 0.72, 0);
            add(g, shape(0.86, 0.48, 0.012, colors[0]), 0, 1.08, 0.03);
            const disc = new THREE.Mesh(
              new THREE.CircleGeometry(0.2, 24),
              material(colors[1]),
            );
            disc.geometry.computeBoundingBox();
            disc.userData.leaf = leaf.id;
            disc.userData.popup = true;
            this.meshes.push(disc);
            add(g, disc, 0.16, 1.08, 0.039);
            lines(g, -0.02, 0.64, 0.031, 0.78, colors[0], 4);
          },
          -0.18,
        );
        item(0.27, 0.75, (g) => {
          const pencil = shape(0.11, 1.05, 0.1, colors[1]);
          pencil.rotation.z = -0.3;
          add(g, pencil, 0, 0.53, 0);
          add(g, shape(0.13, 0.16, 0.12, colors[0]), 0.15, 1.04, 0);
        });
        item(
          0.76,
          0.76,
          (g) => {
            for (let i = 0; i < 3; i++) {
              const card = shape(
                0.57,
                0.58,
                0.035,
                i === 1 ? colors[1] : "#fff9ee",
              );
              card.rotation.z = (i - 1) * 0.16;
              add(g, card, i * 0.1 - 0.1, 0.32 + i * 0.1, i * 0.04);
            }
          },
          -0.25,
        );
      } else if (project.theme === "stadia") {
        item(
          0.56,
          0.43,
          (g) => {
            add(g, shape(1.58, 0.97, 0.065), 0, 0.92, 0);
            add(g, shape(1.39, 0.76, 0.015, colors[1]), 0, 0.94, 0.043);
            add(g, shape(1.28, 0.13, 0.01, colors[0]), 0, 0.72, 0.055);
            add(g, shape(0.12, 0.4, 0.12, colors[0]), 0, 0.26, 0);
            add(g, shape(0.7, 0.05, 0.4), 0, 0.035, 0.02);
            lines(g, -0.18, 1.08, 0.057, 0.75, "#fff9ee", 2);
          },
          -0.14,
        );
        item(
          0.48,
          0.78,
          (g) => {
            const pad = shape(1.2, 0.53, 0.25, "#fff9ee", 0.13);
            add(g, pad, 0, 0.38, 0);
            for (const x of [-0.39, 0.39]) {
              const grip = shape(0.31, 0.47, 0.24, "#fff9ee", 0.09);
              grip.rotation.z = x < 0 ? -0.25 : 0.25;
              add(g, grip, x, 0.18, 0);
            }
            add(g, shape(0.25, 0.07, 0.04, colors[0]), -0.31, 0.4, 0.15);
            add(g, shape(0.07, 0.25, 0.04, colors[0]), -0.31, 0.4, 0.15);
            for (const [x, y] of [
              [0.27, 0.39],
              [0.39, 0.48],
              [0.39, 0.3],
            ])
              add(g, shape(0.07, 0.07, 0.035, colors[1]), x, y, 0.15);
          },
          0.2,
        );
        item(0.79, 0.23, (g) => {
          add(g, shape(0.64, 0.25, 0.1, colors[0], 0.08), 0, 0.65, 0);
          add(g, shape(0.3, 0.3, 0.1, colors[0], 0.09), -0.08, 0.79, 0);
          add(g, shape(0.26, 0.24, 0.1, colors[0], 0.08), 0.12, 0.74, 0);
          add(g, shape(0.025, 0.54, 0.025), 0, 0.28, 0);
        });
      } else {
        item(
          0.52,
          0.42,
          (g) => {
            add(g, shape(1.65, 0.39, 0.08), 0, 1.14, 0);
            for (let i = 0; i < 4; i++)
              add(
                g,
                shape(0.07, 0.07, 0.012, colors[i]),
                -0.65 + i * 0.1,
                1.14,
                0.05,
              );
            lines(g, 0.22, 1.15, 0.05, 0.67, palette.ink, 1);
            add(g, shape(1.32, 0.79, 0.055), 0.04, 0.54, -0.07);
            lines(g, 0, 0.75, -0.035, 0.96, palette.ink, 4);
            for (let i = 0; i < 4; i++)
              add(
                g,
                shape(0.21, 0.025, 0.012, colors[i]),
                -0.33 + i * 0.23,
                0.24,
                -0.032,
              );
          },
          -0.14,
        );
        item(
          0.65,
          0.76,
          (g) => {
            add(g, shape(0.87, 0.68, 0.055), 0, 0.39, 0);
            add(g, shape(0.66, 0.22, 0.012, colors[0]), 0, 0.54, 0.034);
            lines(g, -0.03, 0.32, 0.034, 0.55, palette.ink, 2);
          },
          -0.25,
        );
        item(0.25, 0.76, (g) => {
          for (let i = 0; i < 4; i++) {
            const petal = shape(0.28, 0.46, 0.08, colors[i], 0.08);
            petal.rotation.z = (i * Math.PI) / 2;
            add(
              g,
              petal,
              Math.sin((i * Math.PI) / 2) * 0.16,
              0.45 + Math.cos((i * Math.PI) / 2) * 0.16,
              i * 0.006,
            );
          }
        });
      }
      this.spreads.push(spread);
    });
  }
  get folded() {
    return this.spreads.every((s) => s.items.every((i) => i.amount === 0));
  }
  get visibleCount() {
    return this.spreads.reduce(
      (n, s) => n + s.items.filter((i) => i.anchor.visible).length,
      0,
    );
  }
  get shownSpread() {
    return this.active;
  }
  get hitMeshes() {
    return this.meshes.filter((mesh) => {
      let parent: THREE.Object3D | null = mesh;
      while (parent) {
        if (!parent.visible) return false;
        parent = parent.parent;
      }
      return true;
    });
  }
  step(dt: number, target: number, reduced: boolean) {
    this.active = target;
    let changed = false;
    this.spreads.forEach((spread, index) => {
      spread.time = target === index ? spread.time + dt : 0;
      spread.items.forEach((item) => {
        const before = item.amount;
        if (reduced) item.amount = target === index ? 1 : 0;
        else if (target !== index)
          item.amount = Math.max(0, item.amount - dt / 0.18);
        else if (spread.time > item.delay + 0.08)
          item.amount = Math.min(1, item.amount + dt / 0.55);
        const p = item.amount,
          q = p - 1,
          bounce = 1 + 2.6 * q * q * q + 1.6 * q * q;
        item.anchor.visible = p > 0;
        item.fold.scale.setScalar(Math.max(0.001, 0.35 + 0.65 * bounce));
        item.fold.rotation.x = (-Math.pow(1 - p, 3) * Math.PI) / 2;
        changed ||= before !== p;
      });
    });
    return changed;
  }
  reset() {
    this.step(0, -1, true);
  }
  bounds(camera: THREE.Camera, include: (point: THREE.Vector3) => void) {
    // Individual posed boxes include all raised props in the framing diagnostics.
    for (const mesh of this.hitMeshes) {
      this.box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
      const min = this.box.min,
        max = this.box.max;
      for (let i = 0; i < 8; i++)
        include(
          this.corners[i]
            .set(
              i & 1 ? max.x : min.x,
              i & 2 ? max.y : min.y,
              i & 4 ? max.z : min.z,
            )
            .project(camera),
        );
    }
  }
}
