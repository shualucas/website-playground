import * as THREE from "three";
import { titleFontFamily } from "../content/typography";

export const PAGE_WIDTH = 3.35,
  PAGE_HEIGHT = 4.7,
  STACK = 0.035,
  SURFACE = 0.06;
export interface Project {
  id: string;
  kind: "about" | "project" | "after-hours";
  label: string;
  theme: string;
  title: string;
  subtitle: string;
  description: string;
  role: string;
  team: string;
  year: string;
  disciplines: string[];
  note: string;
  previewImage?: string;
  previewVideo?: string;
  previewGif?: string;
  previewPoster?: string;
}
const fonts = {
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
        ? `rgba(255,255,255,${dark ? 0.07 : 0.07})`
        : `rgba(35,35,35,${dark ? 0.1 : 0.02})`;
    ctx.fillRect(
      random() * w,
      random() * h,
      random() * 2 + 0.5,
      random() * 2 + 0.5,
    );
  }
}
let printGrain: HTMLCanvasElement | undefined;
/** A static ink-and-fiber veil is shared by every printed surface. */
export function applyRisoPrint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  if (!printGrain) {
    const { element, ctx: grainContext } = canvas(450, 630);
    let seed = 307;
    for (let i = 0; i < 24000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const x = (seed / 4294967296) * 450;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const y = (seed / 4294967296) * 630;
      grainContext.fillStyle = i % 3 ? "#ffffff64" : "#534e3c35";
      grainContext.fillRect(x, y, i % 4 ? 0.65 : 1.3, 0.7);
    }
    printGrain = element;
  }
  ctx.save();
  ctx.drawImage(printGrain, 0, 0, width, height);
  ctx.restore();
}
/** An original monochrome editorial cover: sculptural contour artwork and small type. */
export function coverTexture(back = false, dark = false) {
  const inverse = back !== dark;
  const { element, ctx } = canvas();
  ctx.fillStyle = inverse ? "#191919" : "#fafaf8";
  ctx.fillRect(0, 0, 900, 1260);
  ctx.save();
  ctx.translate(back ? 560 : 450, back ? 540 : 610);
  ctx.rotate(-0.27);
  ctx.strokeStyle = inverse ? "#e7e7e2" : "#202020";
  ctx.lineWidth = 1.9;
  for (let ring = 0; ring < 60; ring++) {
    ctx.beginPath();
    for (let step = 0; step <= 160; step++) {
      const a = (step / 160) * Math.PI * 2,
        radius = 32 + ring * 4.9;
      const swell =
        radius + Math.sin(a * 3 + ring * 0.025) * (18 + ring * 0.28);
      const x = Math.cos(a) * swell * 0.91,
        y = Math.sin(a) * swell * 1.14 + Math.sin(a * 2) * 26;
      if (step) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
  applyRisoPrint(ctx, 900, 1260);
  return texture(element);
}
export function paperTexture() {
  const { element, ctx } = canvas();
  ctx.drawImage(paperTextureCanvas(), 0, 0);
  const g = ctx.createLinearGradient(0, 0, 900, 0);
  g.addColorStop(0, "#4e4b581c");
  g.addColorStop(0.08, "#f5f3ed00");
  g.addColorStop(0.9, "#f5f3ed00");
  g.addColorStop(1, "#b4b1bd0d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 900, 1260);
  return texture(element);
}
export function edgeTexture() {
  const { element, ctx } = canvas(512, 1024);
  ctx.fillStyle = "#e5e5e2";
  ctx.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 8; i++) {
    const y = (i * 1024) / 8;
    ctx.fillStyle = i % 4 ? "#85839040" : "#ffffff9c";
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
  captured?: HTMLCanvasElement,
  dark = false,
) {
  const { element, ctx } = canvas(1200, 1694);
  if (dark) {
    ctx.fillStyle = "#202124";
    ctx.fillRect(0, 0, 1200, 1694);
  } else ctx.drawImage(paperTextureCanvas(), 0, 0, 1200, 1694);
  if (captured) {
    ctx.filter = dark ? "invert(1)" : "none";
    ctx.drawImage(captured, 0, 0, 1200, 1694);
    ctx.filter = "none";
    return texture(element);
  }
  ctx.scale(1200 / 900, 1694 / 1260);
  ctx.fillStyle = dark ? "#eeeeeb" : "#111111";
  ctx.font = `500 17px ${fonts.sans}`;
  ctx.fillStyle = dark ? "#cfcfc9" : "#333333";
  ctx.font = `500 16px ${fonts.sans}`;
  ctx.fillText(
    project.kind === "about"
      ? "ABOUT"
      : `PROJECT ${String(index).padStart(2, "0")}`,
    76,
    184,
  );
  ctx.fillStyle = dark ? "#eeeeeb" : "#111111";
  ctx.font = `italic 400 89px ${titleFontFamily}`;
  let y = 282;
  for (const part of project.title.split("\n")) {
    ctx.fillText(part, 76, y);
    y += 89;
  }
  ctx.fillStyle = dark ? "#eeeeeb" : "#111111";
  if (project.kind === "about") {
    ctx.font = `500 31px ${fonts.sans}`;
    y = wrapped(ctx, project.subtitle, 76, y + 20, 710, 43);
  }
  ctx.font = `400 25px ${fonts.sans}`;
  y = wrapped(ctx, project.description, 76, y + 30, 710, 40);
  line(ctx, y + 14);
  ctx.fillStyle = dark ? "#cfcfc9" : "#333333";
  ctx.font = `500 16px ${fonts.sans}`;
  if (project.kind === "project") {
    ctx.fillText("ROLE & TEAM", 76, y + 63);
    ctx.fillText("YEAR", 650, y + 63);
    ctx.fillStyle = dark ? "#eeeeeb" : "#111111";
    ctx.font = `400 23px ${fonts.sans}`;
    wrapped(ctx, `${project.role} · ${project.team}`, 76, y + 104, 520, 30);
    ctx.fillText(project.year, 650, y + 104);
    ctx.font = `400 20px ${fonts.sans}`;
    wrapped(ctx, project.disciplines.join(" · "), 76, y + 160, 720, 32);
  }
  applyRisoPrint(ctx, 900, 1260);
  return texture(element);
}
let paperCanvas: HTMLCanvasElement | undefined;
function paperTextureCanvas() {
  if (!paperCanvas) {
    const { element, ctx } = canvas();
    ctx.fillStyle = "#fafaf8";
    ctx.fillRect(0, 0, 900, 1260);
    grain(ctx, 900, 1260);
    let seed = 17;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 18000; i++) {
      const x = random() * 900,
        y = random() * 1260,
        angle = random() * Math.PI * 2,
        length = 2 + random() * 15;
      ctx.strokeStyle = i % 3 ? "rgba(98,95,105,.035)" : "rgba(255,255,255,.3)";
      ctx.lineWidth = 0.4 + random() * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
    const clouds = document.createElement("canvas");
    clouds.width = 45;
    clouds.height = 63;
    const c = clouds.getContext("2d")!,
      pixels = c.createImageData(45, 63);
    for (let i = 0; i < 45 * 63; i++) {
      const v = 85 + Math.round(random() * 145);
      pixels.data.set([v, v, v, 40], i * 4);
    }
    c.putImageData(pixels, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.filter = "blur(13px)";
    ctx.drawImage(clouds, 0, 0, 900, 1260);
    ctx.restore();
    paperCanvas = element;
  }
  return paperCanvas;
}
export function blankPageCanvas(dark = false) {
  const result = canvas();
  if (dark) {
    result.ctx.fillStyle = "#202124";
    result.ctx.fillRect(0, 0, 900, 1260);
  } else result.ctx.drawImage(paperTextureCanvas(), 0, 0);
  return result.element;
}
