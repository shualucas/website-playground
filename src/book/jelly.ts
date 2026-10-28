import * as THREE from "three";
import { acquireClayGrain } from "./clay";

const deformation = `
uniform float jellyActive;
uniform mat4 jellyToCage;
uniform mat4 jellyFromCage;
uniform vec2 jellyStretch;
uniform vec2 jellyBend;
uniform float jellyTwist;
uniform float jellyHeight;
vec3 jellyPoint(vec3 p) {
  if(jellyActive < .5) return p;
  vec3 q = (jellyToCage * vec4(p, 1.0)).xyz;
  q.x *= jellyStretch.x;
  q.z *= jellyStretch.y;
  q.y /= jellyStretch.x * jellyStretch.y;
  float h = max(q.y, 0.0) / max(jellyHeight, 0.1);
  float a = jellyTwist * h;
  q.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * q.xz;
  q.xz += jellyBend * h * h;
  return (jellyFromCage * vec4(q, 1.0)).xyz;
}
vec3 jellyNormal(vec3 p, vec3 n) {
  if(jellyActive < .5) return n;
  vec3 c = jellyPoint(p);
  mat3 J = mat3((jellyPoint(p + vec3(.001,0.,0.)) - c) * 1000.,
                (jellyPoint(p + vec3(0.,.001,0.)) - c) * 1000.,
                (jellyPoint(p + vec3(0.,0.,.001)) - c) * 1000.);
  return normalize(transpose(inverse(J)) * n);
}
`;

/** A bounded, volume-preserving scale/shear/twist cage. No free-body interaction. */
export class JellyCage {
  readonly active = { value: 0 };
  readonly stretch = { value: new THREE.Vector2(1, 1) };
  readonly bend = { value: new THREE.Vector2() };
  readonly twist = { value: 0 };
  private state = new Float64Array(10);
  private materials: THREE.Material[] = [];
  private outlines: THREE.ShaderMaterial[] = [];
  private outlineColor: THREE.Color;
  private grain = acquireClayGrain();
  constructor(
    readonly root: THREE.Group,
    surface: (p: THREE.MeshPhysicalMaterialParameters) => THREE.Material,
    color: string,
    software: boolean,
  ) {
    this.outlineColor = new THREE.Color(color);
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const localBounds = new THREE.Box3();
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.computeBoundingBox();
        localBounds.union(
          object.geometry
            .boundingBox!.clone()
            .applyMatrix4(inverse.clone().multiply(object.matrixWorld)),
        );
      }
    });
    const height = Math.max(0.4, localBounds.max.y - localBounds.min.y);
    const originals: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) originals.push(o);
    });
    originals.forEach((mesh) => {
      mesh.geometry.computeBoundingBox();
      const size = mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
      const original = mesh.material as THREE.MeshStandardMaterial;
      const tint = original.color?.clone() ?? new THREE.Color("#ffffff");
      const to = inverse.clone().multiply(mesh.matrixWorld),
        from = to.clone().invert();
      const uniforms = {
        jellyActive: this.active,
        jellyToCage: { value: to },
        jellyFromCage: { value: from },
        jellyStretch: this.stretch,
        jellyBend: this.bend,
        jellyTwist: this.twist,
        jellyHeight: { value: height },
      };
      const material = surface({
        color: tint.clone(),
        map: original.map ?? null,
        roughness: 0.88,
        metalness: 0,
        transmission: 0,
        clearcoat: 0,
        clearcoatRoughness: 1,
        specularIntensity: 0.15,
        normalMap: this.grain.normal,
        normalScale: new THREE.Vector2(0.14, 0.14),
        roughnessMap: this.grain.roughness,
        transparent: false,
        opacity: 1,
      });
      if (original.map) {
        material.toneMapped = false;
      }
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader =
          deformation +
          shader.vertexShader
            .replace(
              "#include <beginnormal_vertex>",
              "#include <beginnormal_vertex>\nobjectNormal = jellyNormal(position, objectNormal);",
            )
            .replace(
              "#include <begin_vertex>",
              "vec3 transformed = jellyPoint(position);",
            );
      };
      material.customProgramCacheKey = () => "jelly-cage-1";
      mesh.material = material;
      this.materials.push(original, material);
      const depth = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
      });
      depth.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader =
          deformation +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "vec3 transformed = jellyPoint(position);",
          );
      };
      depth.customProgramCacheKey = () => "jelly-cage-depth-1";
      mesh.customDepthMaterial = depth;
      this.materials.push(depth);
      if (
        Math.max(size.x, size.y, size.z) < 0.27 ||
        Math.min(size.x, size.y, size.z) < 0.024 ||
        mesh.geometry.type === "TubeGeometry"
      )
        return;
      const outline = new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          outlineColor: { value: new THREE.Color(color) },
        },
        vertexShader:
          deformation +
          `void main(){vec3 p=jellyPoint(position);vec3 n=jellyNormal(position,normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(p+n*.012,1.);}`,
        fragmentShader: `uniform vec3 outlineColor;void main(){gl_FragColor=vec4(outlineColor,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
        side: THREE.BackSide,
        depthWrite: false,
      });
      // A sibling shares the object's exact local transform and deformation frame.
      const shell = new THREE.Mesh(mesh.geometry, outline);
      shell.matrixAutoUpdate = false;
      shell.matrix.copy(mesh.matrix);
      shell.name = "colored clay silhouette";
      mesh.parent!.add(shell);
      this.outlines.push(outline);
      this.materials.push(outline);
    });
  }
  excite(amount = 1) {
    this.active.value = 1;
    this.state[1] += 0.045 * amount;
    this.state[3] -= 0.03 * amount;
    this.state[5] += 0.08 * amount;
    this.state[7] -= 0.06 * amount;
    this.state[9] += 0.05 * amount;
  }
  step(delta: number, reduced: boolean) {
    if (reduced) this.state.fill(0);
    const count = Math.min(8, Math.max(1, Math.ceil(delta * 60))),
      dt = Math.min(delta, 0.13) / count;
    for (let s = 0; s < count; s++)
      for (let i = 0; i < 10; i += 2) {
        const omega = i < 4 ? 13 : 10;
        this.state[i + 1] +=
          (-omega * omega * this.state[i] - 12 * this.state[i + 1]) * dt;
        this.state[i] += this.state[i + 1] * dt;
        this.state[i] = THREE.MathUtils.clamp(
          this.state[i],
          i < 4 ? -0.035 : -0.055,
          i < 4 ? 0.035 : 0.055,
        );
      }
    this.active.value = this.state.some(
      (v, i) => Math.abs(v) > (i % 2 ? 0.0001 : 0.00001),
    )
      ? 1
      : 0;
    if (!this.active.value) this.state.fill(0);
    this.stretch.value.set(1 + this.state[0], 1 + this.state[2]);
    this.bend.value.set(this.state[4], this.state[6]);
    this.twist.value = this.state[8];
  }
  setDark(dark: boolean) {
    for (const material of this.outlines)
      material.uniforms.outlineColor.value
        .copy(this.outlineColor)
        .offsetHSL(0, 0, dark ? 0.06 : 0);
  }
  dispose() {
    this.grain.release();
    new Set(this.materials).forEach((m) => m.dispose());
  }
}
