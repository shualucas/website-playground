import * as THREE from "three";

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
export function leatherTexture(detail?: THREE.DataTexture) {
  const { element, ctx } = canvas();
  ctx.fillStyle = "#38271e";
  ctx.fillRect(0, 0, 900, 1260);
  grain(ctx, 900, 1260, true);
  if (detail) {
    const source = document.createElement("canvas");
    source.width = source.height = 512;
    source
      .getContext("2d")!
      .putImageData(
        new ImageData(
          new Uint8ClampedArray(detail.image.data as Uint8Array),
          512,
          512,
        ),
        0,
        0,
      );
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.scale(900 / (512 * 2.3), 1260 / (512 * 3.2));
    ctx.fillStyle = ctx.createPattern(source, "repeat")!;
    ctx.fillRect(0, 0, 512 * 2.3, 512 * 3.2);
    ctx.restore();
  }

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
  ctx.drawImage(paperTextureCanvas(), 0, 0);
  const g = ctx.createLinearGradient(0, 0, 900, 0);
  g.addColorStop(0, "#6e542536");
  g.addColorStop(0.08, "#eadfc100");
  g.addColorStop(0.9, "#eadfc100");
  g.addColorStop(1, "#93723a20");
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
  captured?: HTMLCanvasElement,
) {
  const { element, ctx } = canvas();
  ctx.drawImage(paperTextureCanvas(), 0, 0);
  if (captured) {
    ctx.drawImage(captured, 0, 0, 900, 1260);
    return texture(element);
  }
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
      ctx.strokeStyle = i % 3 ? "rgba(107,86,49,.10)" : "rgba(255,250,230,.34)";
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
    ctx.globalAlpha = 0.15;
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
