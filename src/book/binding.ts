import * as THREE from "three";
import { PAGE_HEIGHT as H, SURFACE } from "./materials";
type Surface = THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
export const gutterDip = (x: number) => -0.018 * Math.exp(-((x / 0.11) ** 2));
/** A folded cardstock saddle and two metal staples, without a hard book spine. */
export function createBinding(cover: Surface, paper: Surface, metal: Surface) {
  const spineGeometry = new THREE.PlaneGeometry(0.06, H + 0.025, 8, 1);
  spineGeometry.rotateX(-Math.PI / 2);
  const spine = new THREE.Mesh(spineGeometry, cover);
  const geometry = new THREE.PlaneGeometry(0.24, H - 0.025, 24, 4);
  geometry.rotateX(-Math.PI / 2);
  const fold = new THREE.Mesh(geometry, paper);
  fold.receiveShadow = true;
  const seams = new THREE.Group();
  for (const z of [-1.12, 1.12]) {
    const wire = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, z - 0.105),
      new THREE.Vector3(0.012, 0.008, z - 0.075),
      new THREE.Vector3(0.012, 0.008, z + 0.075),
      new THREE.Vector3(0, 0, z + 0.105),
    ]);
    seams.add(
      new THREE.Mesh(new THREE.TubeGeometry(wire, 16, 0.0035, 5, false), metal),
    );
  }
  function update(left: number, right: number, open: number) {
    const height = (x: number) =>
      THREE.MathUtils.lerp(
        left,
        right,
        THREE.MathUtils.clamp(x / 0.24 + 0.5, 0, 1),
      ) +
      0.008 +
      gutterDip(x);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++)
      positions.setY(i, height(positions.getX(i)) - 0.003);
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const p = spineGeometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setY(i, -0.005 + 0.012 * Math.cos(((p.getX(i) / 0.03) * Math.PI) / 2));
    p.needsUpdate = true;
    spineGeometry.computeVertexNormals();
    spineGeometry.computeBoundingBox();
    seams.position.y = height(0) + 0.003;
    fold.visible = seams.visible = open > 0.96;
  }
  update(SURFACE, SURFACE, 1);
  return { spine, fold, seams, update };
}
/** Compress the inner paper edge into the same sewn gutter rather than ending in a square cut. */
export function shapeInnerEdge(
  geometry: THREE.BufferGeometry,
  centerX: number,
  depth: number,
  fraction = 1,
) {
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + centerX,
      weight =
        depth > 0.05
          ? THREE.MathUtils.clamp((p.getY(i) + depth / 2) / depth, 0, 1)
          : fraction;
    p.setY(i, p.getY(i) + gutterDip(x) * weight * 0.88);
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
