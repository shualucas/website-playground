import * as THREE from "three";
import { PAGE_WIDTH as W, PAGE_HEIGHT as H, type Project } from "./materials";
import { SkinnedLeaf, LEAF_SEGMENTS, type PaperMaterial } from "./leaf";
import { aboutMiniatures } from "./miniatures";
import { careerMiniatures, type GoogleAsset } from "./career";
import { JellyCage } from "./jelly";

type Item = {
  anchor: THREE.Group;
  fold: THREE.Group;
  pose: THREE.Group;
  lift: number;
  amount: number;
  delay: number;
  jelly: JellyCage;
  name: string;
};
type Spread = { items: Item[]; time: number };

/** Only career/About and After-hours own miniatures. Project prefabs remain archived. */
export class PagePopups {
  readonly spreads: Spread[] = [];
  readonly meshes: THREE.Mesh[] = [];
  private active = -1;
  private box = new THREE.Box3();
  private corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  constructor(
    projects: Project[],
    leaves: SkinnedLeaf[],
    surface: (p: THREE.MeshPhysicalMaterialParameters) => PaperMaterial,
    _paper: THREE.Texture,
    google: GoogleAsset,
    software: boolean,
  ) {
    projects.forEach((project, index) => {
      const leaf = leaves[index + 1],
        spread: Spread = { items: [], time: 0 };
      const register = (mesh: THREE.Mesh) => {
        mesh.userData.leaf = leaf.id;
        mesh.userData.popup = true;
        this.meshes.push(mesh);
      };
      const item = (
        u: number,
        v: number,
        model: THREE.Group,
        color: string,
        yaw = 0,
        id = "",
      ) => {
        const anchor = new THREE.Group(),
          fold = new THREE.Group(),
          content = new THREE.Group();
        const bone = Math.min(LEAF_SEGMENTS - 1, Math.floor(u * LEAF_SEGMENTS));
        anchor.position.set(
          u * W - (bone * W) / LEAF_SEGMENTS,
          0.024,
          (v - 0.5) * H,
        );
        leaf.bones[bone].add(anchor);
        anchor.add(fold);
        fold.add(content);
        content.position.y = 0.11;
        content.rotation.y = yaw;
        // Model fronts start upright in XY. Lay them back toward the page.
        content.rotation.x = -Math.PI * 0.31;
        content.add(model);
        model.traverse((object) => {
          if (object instanceof THREE.Mesh)
            object.userData.miniature =
              project.kind === "after-hours" ? id : undefined;
        });
        model.scale.multiplyScalar(2 / 3);
        // Fit the tilted model above the paper once, leaving room for its ambient bob.
        content.updateWorldMatrix(true, true);
        const inverse = anchor.matrixWorld.clone().invert(),
          bounds = new THREE.Box3();
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.computeBoundingBox();
            bounds.union(
              object.geometry
                .boundingBox!.clone()
                .applyMatrix4(inverse.clone().multiply(object.matrixWorld)),
            );
          }
        });
        const lift = Math.max(0.11, 0.21 - bounds.min.y);
        content.position.y = lift;
        const jelly = new JellyCage(content, surface, color, software);
        anchor.visible = false;
        spread.items.push({
          anchor,
          fold,
          pose: content,
          lift,
          jelly,
          amount: 0,
          delay: spread.items.length * 0.11,
          name: model.name,
        });
      };
      if (project.kind === "about") {
        const models = careerMiniatures(google, surface, register);
        item(0.34, 0.37, models.google, "#779aef", -0.12, "google");
        item(0.78, 0.39, models.blizzard, "#149aff", 0.15, "blizzard");
        item(0.51, 0.78, models.bridge, "#df4a4a", -0.1, "bridge");
      } else if (project.kind === "after-hours") {
        const models = aboutMiniatures(surface, register);
        item(0.35, 0.37, models.camera, "#808080", -0.16, "camera");
        models.racket.rotation.z = -0.12;
        item(0.79, 0.4, models.racket, "#b6ec35", 0.12, "racket");
        models.controller.rotation.x = -0.14;
        item(0.49, 0.77, models.controller, "#ad86dc", 0.14, "controller");
      }
      this.spreads.push(spread);
    });
  }
  setDark(dark: boolean) {
    this.spreads.forEach((s) => s.items.forEach((i) => i.jelly.setDark(dark)));
  }
  names() {
    return this.spreads.map((s) => s.items.map((i) => i.name));
  }
  dispose() {
    this.spreads.forEach((s) => s.items.forEach((i) => i.jelly.dispose()));
  }
  restEnvelope(rig: THREE.Group) {
    rig.updateWorldMatrix(true, true);
    const inverse = rig.matrixWorld.clone().invert(),
      result: THREE.Vector3[] = [];
    for (const mesh of this.meshes) {
      const box = mesh.geometry.boundingBox!;
      for (let i = 0; i < 8; i++)
        result.push(
          new THREE.Vector3(
            i & 1 ? box.max.x : box.min.x,
            i & 2 ? box.max.y : box.min.y,
            i & 4 ? box.max.z : box.min.z,
          )
            .applyMatrix4(mesh.matrixWorld)
            .applyMatrix4(inverse),
        );
    }
    return result;
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
  step(dt: number, target: number, reduced: boolean, impulse = 0) {
    this.active = target;
    let changed = false;
    this.spreads.forEach((spread, index) => {
      spread.time = target === index ? spread.time + dt : 0;
      spread.items.forEach((item, itemIndex) => {
        const before = item.amount;
        if (reduced) item.amount = target === index ? 1 : 0;
        else if (target !== index)
          item.amount = Math.max(0, item.amount - dt / 0.18);
        else if (spread.time > item.delay + 0.08)
          item.amount = Math.min(1, item.amount + dt / 0.55);
        if (before === 0 && item.amount > 0) item.jelly.excite();
        if (item.amount > 0 && impulse) item.jelly.excite(impulse * 2);
        item.jelly.step(dt, reduced || item.amount === 0);
        const p = item.amount,
          q = p - 1,
          bounce = 1 + 2.6 * q * q * q + 1.6 * q * q;
        item.anchor.visible = p > 0;
        item.fold.scale.setScalar(Math.max(0.001, 0.35 + 0.65 * bounce));
        item.fold.rotation.x = (-Math.pow(1 - p, 3) * Math.PI) / 2;
        const phase = spread.time * 0.85 + itemIndex * 2.1;
        item.pose.position.y =
          p * (item.lift + (reduced ? 0 : Math.sin(phase) * 0.035));
        item.pose.rotation.x =
          -Math.PI * 0.31 + (reduced ? 0 : Math.sin(phase * 0.73) * 0.025);
        item.pose.rotation.z = reduced ? 0 : Math.cos(phase * 0.8) * 0.018;
        changed ||= before !== p || (!reduced && p > 0);
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
