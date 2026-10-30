import * as THREE from "three";
import { PAGE_HEIGHT as H } from "./materials";
import type { SkinnedLeaf } from "./leaf";
type Surface = THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;

/** The outer wrap joins the actual cover hinges; the inner saddle sits below paper. */
export function createBinding(cover: Surface, paper: Surface, metal: Surface, leaves: readonly SkinnedLeaf[]) {
  const spineGeometry = new THREE.PlaneGeometry(1, H - 0.01, 20, 1);
  spineGeometry.rotateX(-Math.PI / 2);
  const spine = new THREE.Mesh(spineGeometry, cover);
  spine.name = "cover-hinge-wrap";
  const geometry = new THREE.PlaneGeometry(0.04, H - 0.025, 12, 1);
  geometry.rotateX(-Math.PI / 2);
  const fold = new THREE.Mesh(geometry, paper);
  fold.name = "recessed-inner-fold";
  fold.receiveShadow = true;
  // Thin folded cardstock can be seen from the front and the back during rotation.
  cover.side = paper.side = THREE.DoubleSide;
  const seams = new THREE.Group();
  for (const z of [-1.12, 1.12]) {
    const wire = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, z - 0.105),
      new THREE.Vector3(0.012, 0.008, z - 0.075),
      new THREE.Vector3(0.012, 0.008, z + 0.075),
      new THREE.Vector3(0, 0, z + 0.105),
    ]);
    seams.add(new THREE.Mesh(new THREE.TubeGeometry(wire, 16, 0.0035, 5, false), metal));
  }
  const front = leaves[0], back = leaves[leaves.length - 1];
  const a = new THREE.Vector2(), b = new THREE.Vector2();
  let previousFront = NaN, previousBack = NaN, previousBoundary = -1, previousMoving = true;
  function update() {
    // Root bone bend matters too: a turning cover does not share the fixed saddle's plane.
    const angleFront = front.hingeAngle + front.bones[0].rotation.z;
    const angleBack = back.hingeAngle + back.bones[0].rotation.z;
    let boundary = -1, moving = false;
    for (let i = 0; i < leaves.length; i++) {
      if (boundary === -1 && leaves[i].progress < 0.5) boundary = i;
      moving ||= leaves[i].turning;
    }
    fold.visible = seams.visible = !moving && boundary > 0 && boundary < leaves.length;
    if (Math.abs(angleFront - previousFront) < 0.00001 && Math.abs(angleBack - previousBack) < 0.00001 && boundary === previousBoundary && moving === previousMoving) return;
    previousFront = angleFront; previousBack = angleBack; previousBoundary = boundary; previousMoving = moving;
    const reach = 0.018, outside = 0.0065;
    a.set(front.group.position.x + Math.cos(angleFront) * reach - Math.sin(angleFront) * outside,
      front.group.position.y + Math.sin(angleFront) * reach + Math.cos(angleFront) * outside);
    b.set(back.group.position.x + Math.cos(angleBack) * reach + Math.sin(angleBack) * outside,
      back.group.position.y + Math.sin(angleBack) * reach - Math.cos(angleBack) * outside);
    const angle = (angleFront + angleBack) / 2;
    const radius = Math.max(0.012, a.distanceTo(b) * 0.55);
    const positions = spineGeometry.attributes.position, uv = spineGeometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const t = uv.getX(i), bulge = Math.sin(Math.PI * t) * radius;
      positions.setX(i, THREE.MathUtils.lerp(a.x, b.x, t) - Math.cos(angle) * bulge);
      positions.setY(i, THREE.MathUtils.lerp(a.y, b.y, t) - Math.sin(angle) * bulge);
    }
    positions.needsUpdate = true;
    spineGeometry.computeVertexNormals(); spineGeometry.computeBoundingBox(); spineGeometry.computeBoundingSphere();
    if (boundary > 0 && boundary < leaves.length) {
      const left = leaves[boundary - 1], right = leaves[boundary];
      // The old broad overlay rose through the opened cover. This narrow strip is
      // below even its underside, leaving the real printed leaf as the visible surface.
      const height = Math.min(left.group.position.y, right.group.position.y) - 0.008;
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, height - 0.004 * Math.exp(-((p.getX(i) / 0.014) ** 2)));
      p.needsUpdate = true;
      geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      seams.position.y = right.group.position.y + (right.cover ? 0.006 : 0.003) + 0.002;
    }
  }
  update();
  return { spine, fold, seams, update };
}
