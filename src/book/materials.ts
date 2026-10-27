import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const PAGE_WIDTH = 3.35,
  PAGE_HEIGHT = 4.7,
  STACK = 0.61,
  SURFACE = 0.73;
export interface Project {
  title: string;
  subtitle: string;
  description: string;
  role: string;
  team: string;
  year: string;
  disciplines: string[];
  note: string;
  previewImage?: string;
}
const fonts = {
  serif: '"Cormorant Garamond",Georgia,serif',
  sans: '"DM Sans",sans-serif',
};
function canvas(w = 900, h = 1260) {
  const element = document.createElement("canvas");
  element.width = w;
  element.height = h;
  return { element, ctx: element.getContext("2d")! };
}
function texture(element: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(element);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}
function grain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dark = false,
) {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 32000; i++) {
    ctx.fillStyle =
      random() > 0.5
        ? `rgba(255,235,195,${dark ? 0.07 : 0.09})`
        : `rgba(45,23,9,${dark ? 0.12 : 0.035})`;
    ctx.fillRect(
      random() * w,
      random() * h,
      random() * 2 + 0.5,
      random() * 2 + 0.5,
    );
  }
}
export function leatherTexture() {
  const { element, ctx } = canvas();
  ctx.fillStyle = "#38271e";
  ctx.fillRect(0, 0, 900, 1260);
  grain(ctx, 900, 1260, true);
  ctx.strokeStyle = "#98774a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(49, 49, 802, 1162, 46);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(62, 62, 776, 1136, 35);
  ctx.stroke();
  ctx.setLineDash([3, 7]);
  ctx.strokeStyle = "#6e5036";
  ctx.beginPath();
  ctx.roundRect(28, 28, 844, 1204, 57);
  ctx.stroke();
  ctx.setLineDash([]);
  // Only ornament on the cover: no lettering.
  ctx.save();
  ctx.translate(450, 630);
  ctx.strokeStyle = "#b18c4f";
  for (const r of [134, 146]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(0, -122);
    ctx.lineTo(13, -24);
    ctx.lineTo(0, 0);
    ctx.lineTo(-13, -24);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? "#73532e" : "#bc985a";
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  for (const [x, y] of [
    [95, 95],
    [805, 95],
    [95, 1165],
    [805, 1165],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "#af8a50";
    ctx.strokeRect(-20, -20, 40, 40);
    ctx.strokeRect(-12, -12, 24, 24);
    ctx.restore();
  }
  return texture(element);
}
export function paperTexture() {
  const { element, ctx } = canvas();
  ctx.fillStyle = "#eee2c5";
  ctx.fillRect(0, 0, 900, 1260);
  grain(ctx, 900, 1260);
  const g = ctx.createLinearGradient(0, 0, 900, 0);
  g.addColorStop(0, "#ae946c44");
  g.addColorStop(0.1, "#eadfc100");
  g.addColorStop(0.9, "#eadfc100");
  g.addColorStop(1, "#ae946c22");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 900, 1260);
  return texture(element);
}
export function edgeTexture() {
  const { element, ctx } = canvas(512, 1024);
  ctx.fillStyle = "#d5c39e";
  ctx.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 110; i++) {
    const y = (i * 1024) / 110;
    ctx.fillStyle = i % 4 ? "#89704e66" : "#fff2d78c";
    ctx.fillRect(0, y, 512, i % 4 ? 1 : 2);
  }
  grain(ctx, 512, 1024);
  const map = texture(element);
  map.wrapS = THREE.RepeatWrapping;
  return map;
}
function line(ctx: CanvasRenderingContext2D, y: number) {
  ctx.strokeStyle = "#bdb08e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(76, y);
  ctx.lineTo(824, y);
  ctx.stroke();
}
function wrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let row = "";
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > width && row) {
      ctx.fillText(row, x, y);
      y += lineHeight;
      row = word;
    } else row = next;
  }
  if (row) ctx.fillText(row, x, y);
  return y + lineHeight;
}
export function pageTexture(
  project: Project,
  index: number,
  side: "left" | "right",
) {
  const { element, ctx } = canvas();
  ctx.drawImage(paperTextureCanvas(), 0, 0);
  ctx.fillStyle = "#706144";
  ctx.font = `500 17px ${fonts.sans}`;
  ctx.fillText(
    side === "left" ? "THE FIELD JOURNAL" : "A WINDOW INTO THE WORK",
    76,
    81,
  );
  line(ctx, 112);
  if (side === "left") {
    ctx.font = `500 16px ${fonts.sans}`;
    ctx.fillText(`CHAPTER ${String(index + 1).padStart(2, "0")}`, 76, 188);
    ctx.fillStyle = "#34382c";
    ctx.font = `500 89px ${fonts.serif}`;
    let y = 263;
    for (const part of project.title.split("\n")) {
      ctx.fillText(part, 76, y);
      y += 87;
    }
    ctx.fillStyle = "#65644c";
    ctx.font = `italic 36px ${fonts.serif}`;
    y = wrapped(ctx, project.subtitle, 76, y + 16, 710, 45);
    ctx.font = `400 25px ${fonts.sans}`;
    y = wrapped(ctx, project.description, 76, y + 24, 710, 40);
    line(ctx, y + 8);
    ctx.fillStyle = "#776443";
    ctx.font = `400 14px ${fonts.sans}`;
    ctx.fillText("ROLE & TEAM", 76, y + 49);
    ctx.fillText("YEAR", 650, y + 49);
    ctx.font = `400 23px ${fonts.sans}`;
    ctx.fillStyle = "#444a37";
    ctx.fillText(`${project.role} · ${project.team}`, 76, y + 82);
    ctx.fillText(project.year, 650, y + 82);
    ctx.font = `400 14px ${fonts.sans}`;
    ctx.fillText("FOCUS", 76, y + 130);
    ctx.font = `400 22px ${fonts.sans}`;
    wrapped(ctx, project.disciplines.join(" · "), 76, y + 163, 720, 32);
    ctx.font = `500 23px ${fonts.sans}`;
    ctx.fillText("Open the case study", 76, 1035);
  } else {
    drawPortalPrint(ctx);
    ctx.font = `italic 25px ${fonts.serif}`;
    ctx.fillStyle = "#6d634b";
    ctx.fillText("A doorway into the thinking behind the work.", 86, 1120);
  }
  line(ctx, 1160);
  ctx.font = `400 16px ${fonts.sans}`;
  ctx.fillStyle = "#776c50";
  ctx.fillText("SELECTED WORK", 76, 1204);
  ctx.fillText(
    String(index * 2 + (side === "left" ? 1 : 2)).padStart(2, "0"),
    800,
    1204,
  );
  return texture(element);
}
let paperCanvas: HTMLCanvasElement | undefined;
function paperTextureCanvas() {
  if (!paperCanvas) {
    const { element, ctx } = canvas();
    ctx.fillStyle = "#eee2c5";
    ctx.fillRect(0, 0, 900, 1260);
    grain(ctx, 900, 1260);
    paperCanvas = element;
  }
  return paperCanvas;
}
function drawPortalPrint(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(204, 1030);
  ctx.lineTo(204, 461);
  ctx.arc(450, 461, 246, Math.PI, 0);
  ctx.lineTo(696, 1030);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#102717";
  ctx.fillRect(190, 200, 520, 840);
  const g = ctx.createRadialGradient(450, 620, 20, 450, 620, 430);
  g.addColorStop(0, "#07180c");
  g.addColorStop(0.37, "#144122");
  g.addColorStop(0.62, "#8dd94c");
  g.addColorStop(0.73, "#1c6a2d");
  g.addColorStop(1, "#0b1b11");
  ctx.fillStyle = g;
  ctx.fillRect(190, 200, 520, 840);
  ctx.translate(450, 620);
  ctx.scale(1, 1.55);
  for (let i = 0; i < 22; i++) {
    ctx.beginPath();
    for (let j = 0; j < 180; j++) {
      const a = j * 0.07 + i * 0.28,
        r = 12 + j * 1.35;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = i % 3 ? "#9ae45b42" : "#defe8b90";
    ctx.lineWidth = i % 3 ? 1 : 2;
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#464a3b";
  ctx.lineWidth = 52;
  ctx.beginPath();
  ctx.moveTo(178, 1040);
  ctx.lineTo(178, 460);
  ctx.arc(450, 460, 272, Math.PI, 0);
  ctx.lineTo(722, 1040);
  ctx.stroke();
  ctx.strokeStyle = "#81935f";
  ctx.lineWidth = 2;
  ctx.stroke();
}

export const portalFragment = `
precision highp float;
varying vec2 vUv;uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return n;}
void main(){vec2 physical=(vUv-.5)*vec2(2.43,3.38);float arch=max(abs(physical.x)-.86,-physical.y-1.55);if(physical.y>.40)arch=max(arch,length(vec2(physical.x,physical.y-.40))-.86);if(arch>.008)discard;
vec2 p=(vUv-.5)*2.;vec2 q=p*vec2(1.1,.72);float r=length(q),a=atan(q.y,q.x),t=uTime*.34;
float flow=fbm(vec2(cos(a+r*3.-t),sin(a+r*3.-t))*2.6+vec2(r*6.-t,r*3.));float ribbons=sin(a*5.+r*17.-t*4.+flow*8.);float wisps=pow(max(0.,ribbons),5.);
float ring=exp(-pow((r-.60-flow*.14)*5.3,2.));float core=smoothstep(.04,.60,r);float haze=fbm(p*5.+vec2(t,-t*.4));
vec3 color=vec3(.018,.035,.027)+vec3(.055,.20,.067)*haze+ring*vec3(.18,.52,.05)*(0.6+wisps*.8);
color+=vec3(.65,.95,.26)*wisps*ring*.8;color*=.28+.72*core;
float edge=exp(-abs(arch)*80.);color+=edge*vec3(.19,.49,.055);gl_FragColor=vec4(color,1.);
}`;
export function makePortal() {
  const group = new THREE.Group();
  group.position.set(PAGE_WIDTH / 2, SURFACE + 0.045, -0.22);
  const uniform = { uTime: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms: uniform,
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: portalFragment,
    side: THREE.DoubleSide,
  });
  const aperture = new THREE.Mesh(
    new THREE.PlaneGeometry(2.43, 3.38),
    material,
  );
  aperture.rotation.x = -Math.PI / 2;
  group.add(aperture);
  const stones: THREE.BufferGeometry[] = [];
  for (const sign of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const block = new RoundedBoxGeometry(0.32, 0.22, 0.32, 2, 0.035);
      block.translate(sign * 1.02, 0.09, 1.46 - i * 0.32);
      stones.push(block);
    }
  for (let i = 0; i < 11; i++) {
    const a = (i * Math.PI) / 10;
    const block = new RoundedBoxGeometry(0.3, 0.25, 0.34, 2, 0.035);
    block.rotateY(-a);
    block.translate(Math.cos(a) * 1.02, 0.1, -0.4 - Math.sin(a) * 1.02);
    stones.push(block);
  }
  for (const sign of [-1, 1]) {
    const base = new RoundedBoxGeometry(0.58, 0.26, 0.27, 2, 0.035);
    base.translate(sign * 1.02, 0.1, 1.64);
    stones.push(base);
    const crown = new THREE.ConeGeometry(0.21, 0.62, 4);
    crown.rotateX(-Math.PI / 2);
    crown.translate(sign * 1.02, 0.12, -0.73);
    stones.push(crown.toNonIndexed());
  }
  const threshold = new RoundedBoxGeometry(2.43, 0.19, 0.23, 2, 0.03);
  threshold.translate(0, 0.08, 1.64);
  stones.push(threshold);
  // All stone blocks are merged into one draw call.
  const normalized = stones.map((g) => (g.index ? g.toNonIndexed() : g));
  const geometry = mergeGeometries(normalized, false)!;
  for (const g of new Set([...stones, ...normalized])) g.dispose();
  const stone = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: "#454b3e", roughness: 0.94 }),
  );
  stone.castShadow = stone.receiveShadow = true;
  group.add(stone);
  const runeMaterial = new THREE.MeshStandardMaterial({
    color: "#b2df72",
    emissive: "#6edc32",
    emissiveIntensity: 0.65,
    roughness: 0.6,
  });
  for (const sign of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const glyph = new THREE.Mesh(
        new THREE.TorusGeometry(0.047, 0.009, 3, 4),
        runeMaterial,
      );
      glyph.rotation.x = -Math.PI / 2;
      glyph.rotation.z = i * 0.4;
      glyph.position.set(sign * 1.025, 0.225, 0.96 - i * 0.39);
      group.add(glyph);
    }
  const light = new THREE.PointLight("#8ede44", 0.85, 2.6, 2);
  light.position.set(0, 0.55, 0.05);
  group.add(light);
  return { group, uniform, material };
}
