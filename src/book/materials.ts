import * as THREE from "three";
import { projectTheme } from "./themes";

export const PAGE_WIDTH = 3.35,
  PAGE_HEIGHT = 4.7,
  STACK = 0.035,
  SURFACE = 0.06;
export interface Project {
  id: string;
  kind: "about" | "project";
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
export const RISO = { blue: "#2357a5", pink: "#f0518c", paper: "#f1eddc" };
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
function halftoneDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let yy = -radius; yy <= radius; yy += 11)
    for (let xx = -radius; xx <= radius; xx += 11) {
      if (xx * xx + yy * yy > radius * radius) continue;
      const r = 1.7 + (2.6 * (1 + Math.sin((xx + yy) / 120))) / 2;
      ctx.moveTo(x + xx + r, y + yy);
      ctx.arc(x + xx, y + yy, r, 0, Math.PI * 2);
    }
  ctx.fill();
}
/** Original two-ink cover art; slight registration offsets are intentional. */
export function risoCoverTexture(back = false) {
  const { element, ctx } = canvas();
  ctx.drawImage(paperTextureCanvas(), 0, 0);
  ctx.fillStyle = RISO.blue;
  ctx.font = `700 22px ${fonts.sans}`;
  ctx.fillText("JOSH LUCAS", 64, 76);
  ctx.textAlign = "right";
  ctx.fillText(back ? "COLOPHON / 016" : "SELECTED WORK / 001", 836, 76);
  ctx.textAlign = "left";
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  if (back) {
    halftoneDisc(ctx, 445, 520, 320, RISO.blue);
    halftoneDisc(ctx, 550, 640, 295, RISO.pink);
    ctx.fillStyle = RISO.blue;
    ctx.font = `700 88px ${fonts.sans}`;
    ctx.fillText("MADE WITH", 64, 1030);
    ctx.fillText("CURIOSITY.", 64, 1115);
  } else {
    ctx.fillStyle = RISO.pink;
    ctx.font = `700 180px ${fonts.sans}`;
    ctx.fillText("FIELD", 61, 291);
    ctx.fillText("NOTES", 61, 453);
    ctx.fillStyle = RISO.blue;
    ctx.fillText("FIELD", 66, 288);
    ctx.fillText("NOTES", 66, 450);
    halftoneDisc(ctx, 465, 824, 318, RISO.pink);
    ctx.save();
    ctx.translate(440, 804);
    ctx.rotate(-0.42);
    ctx.fillStyle = RISO.blue;
    ctx.fillRect(-390, -105, 780, 210);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = RISO.paper;
    ctx.font = `700 120px ${fonts.sans}`;
    ctx.fillText("01—03", 190, 855);
  }
  ctx.restore();
  ctx.fillStyle = RISO.blue;
  ctx.font = `500 18px ${fonts.sans}`;
  ctx.fillText("PRODUCT DESIGN · SAN FRANCISCO", 64, 1201);
  ctx.textAlign = "right";
  ctx.fillText("TWO INKS. MANY IDEAS.", 836, 1201);
  // Two small registration crosses make the printing process visible.
  ctx.strokeStyle = RISO.pink;
  ctx.lineWidth = 2;
  for (const [x, y] of [
    [38, 1165],
    [864, 1165],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y);
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x, y + 9);
    ctx.stroke();
  }
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
  ctx.fillStyle = "#e9e2ca";
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
) {
  const { element, ctx } = canvas();
  ctx.drawImage(paperTextureCanvas(), 0, 0);
  if (captured) {
    ctx.drawImage(captured, 0, 0, 900, 1260);
    applyRisoPrint(ctx, 900, 1260);
    return texture(element);
  }
  const palette = projectTheme(project.theme);
  ctx.fillStyle = palette.ink;
  ctx.font = `500 17px ${fonts.sans}`;
  ctx.fillText("FIELD NOTES / RISO EDITION", 76, 81);
  line(ctx, 112);
  ctx.fillStyle = palette.accent;
  ctx.font = `500 16px ${fonts.sans}`;
  ctx.fillText(
    project.kind === "about"
      ? "ABOUT"
      : `PROJECT ${String(index).padStart(2, "0")}`,
    76,
    184,
  );
  ctx.fillStyle = palette.ink;
  ctx.font = `700 89px ${fonts.sans}`;
  const gradient = ctx.createLinearGradient(76, 0, 760, 0);
  palette.colors.forEach((color, i) =>
    gradient.addColorStop(i / (palette.colors.length - 1), color),
  );
  if (project.kind !== "about") ctx.fillStyle = gradient;
  let y = 282;
  for (const part of project.title.split("\n")) {
    ctx.fillText(part, 76, y);
    y += 89;
  }
  ctx.fillStyle = palette.ink;
  ctx.font = `500 31px ${fonts.sans}`;
  y = wrapped(ctx, project.subtitle, 76, y + 24, 710, 43);
  ctx.font = `400 25px ${fonts.sans}`;
  y = wrapped(ctx, project.description, 76, y + 30, 710, 40);
  line(ctx, y + 14);
  ctx.fillStyle = palette.accent;
  ctx.font = `500 16px ${fonts.sans}`;
  if (project.kind === "about") {
    ctx.fillText("BASED IN", 76, y + 63);
    ctx.fillStyle = palette.ink;
    ctx.font = `500 25px ${fonts.sans}`;
    ctx.fillText("San Francisco, California", 76, y + 102);
  } else {
    ctx.fillText("ROLE & TEAM", 76, y + 63);
    ctx.fillText("YEAR", 650, y + 63);
    ctx.fillStyle = palette.ink;
    ctx.font = `400 23px ${fonts.sans}`;
    wrapped(ctx, `${project.role} · ${project.team}`, 76, y + 104, 520, 30);
    ctx.fillText(project.year, 650, y + 104);
    ctx.font = `400 20px ${fonts.sans}`;
    wrapped(ctx, project.disciplines.join(" · "), 76, y + 160, 720, 32);
  }
  ctx.fillStyle = palette.ink;
  ctx.font = `500 23px ${fonts.sans}`;
  ctx.fillText(
    project.kind === "about" ? "A little about me →" : "Read the case study →",
    76,
    Math.min(1080, y + 230),
  );
  line(ctx, 1160);
  ctx.font = `400 16px ${fonts.sans}`;
  ctx.fillText(project.label.toUpperCase(), 76, 1204);
  ctx.fillText(
    String(index * 2 + (side === "left" ? 1 : 2)).padStart(2, "0"),
    800,
    1204,
  );
  applyRisoPrint(ctx, 900, 1260);
  return texture(element);
}
let paperCanvas: HTMLCanvasElement | undefined;
function paperTextureCanvas() {
  if (!paperCanvas) {
    const { element, ctx } = canvas();
    ctx.fillStyle = "#f1eddc";
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
      pixels.data.set(
        [v, Math.round(v * 0.85), Math.round(v * 0.62), 60],
        i * 4,
      );
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
export function blankPageCanvas() {
  const result = canvas();
  result.ctx.drawImage(paperTextureCanvas(), 0, 0);
  return result.element;
}
