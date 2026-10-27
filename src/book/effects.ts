import * as THREE from "three";
const COUNT = 64;
/** A brief, quiet ring of dust at the book's footprint, not a persistent particle field. */
export class ImpactDust {
  readonly mesh: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private positions = new Float32Array(COUNT * 3);
  private opacity = new Float32Array(COUNT);
  private sizes = new Float32Array(COUNT);
  private origins = new Float32Array(COUNT * 3);
  private speeds = new Float32Array(COUNT * 3);
  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    geometry.setAttribute("alpha", new THREE.BufferAttribute(this.opacity, 1));
    geometry.setAttribute("diameter", new THREE.BufferAttribute(this.sizes, 1));
    let seed = 93;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < COUNT; i++) {
      const side = i % 4,
        along = random() * 2 - 1;
      const x = side < 2 ? (side === 0 ? -1.85 : 1.85) : along * 1.65,
        z = side < 2 ? along * 2.35 : side === 2 ? -2.56 : 2.56;
      this.origins.set([x, -0.12, z], i * 3);
      const length = Math.hypot(x, z);
      this.speeds.set(
        [
          (x / length) * (0.12 + random() * 0.28),
          0.22 + random() * 0.3,
          (z / length) * (0.12 + random() * 0.28),
        ],
        i * 3,
      );
      this.sizes[i] = i < 28 ? 0.2 + random() * 0.23 : 0.025 + random() * 0.035;
    }
    const material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1000 } },
      vertexShader:
        "attribute float alpha;attribute float diameter;uniform float uScale;varying float vAlpha;void main(){vAlpha=alpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(diameter*uScale/max(1.,-p.z),1.,96.);}",
      fragmentShader:
        "varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;float dust=exp(-r*r*5.)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(.55,.49,.38,dust*vAlpha);}",
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
    this.mesh = new THREE.Points(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }
  resize(height: number, fov: number) {
    this.mesh.material.uniforms.uScale.value =
      height / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  }
  update(age: number, reduced = false) {
    this.mesh.visible = !reduced && age > 0 && age < 1.85;
    if (!this.mesh.visible) return;
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      this.positions[k] = this.origins[k] + this.speeds[k] * age;
      this.positions[k + 1] = Math.max(
        -0.13,
        this.origins[k + 1] + this.speeds[k + 1] * age - 0.1 * age * age,
      );
      this.positions[k + 2] = this.origins[k + 2] + this.speeds[k + 2] * age;
      const fade = Math.min(1, age / 0.08) * Math.max(0, 1 - age / 1.85);
      this.opacity[i] = fade * fade * (i < 28 ? 0.25 : 0.38);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.alpha.needsUpdate = true;
  }
  get visibleCount() {
    return this.mesh.visible ? COUNT : 0;
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
export function contactShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!,
    g = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  g.addColorStop(0, "rgba(37,28,17,.25)");
  g.addColorStop(0.5, "rgba(37,28,17,.17)");
  g.addColorStop(1, "rgba(37,28,17,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas),
    material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 1,
    });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.8), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.175;
  mesh.renderOrder = 1;
  return { mesh, texture };
}
