/** Screen-aligned glyph tiles and supersampled silhouettes, adapted from ascii-sharks (MIT). */
import { clamp, hash3 } from "./math";
import {
  World,
  balloonWidth,
  balloonPose,
  cloudPose,
  type Balloon,
  type Cloud,
} from "./world";
const SKIN = ":;t%SX8#@",
  EDGE = ".,'`",
  CLOUD = ".:;t%SX8@";
const COLORS: [number[], number[]][] = [
  [
    [215, 108, 69],
    [233, 216, 176],
  ],
  [
    [88, 147, 153],
    [225, 217, 185],
  ],
  [
    [174, 105, 126],
    [229, 202, 177],
  ],
  [
    [204, 166, 91],
    [87, 117, 135],
  ],
];
export class AsciiRenderer {
  private ctx: CanvasRenderingContext2D;
  private bg = document.createElement("canvas");
  private width = 0;
  private height = 0;
  private dpr = 1;
  private cw = 12;
  private ch = 18;
  private family = '"Geist Mono",ui-monospace,monospace';
  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw Error("Canvas 2D is unavailable");
    this.ctx = ctx;
  }
  setFontFamily(family: string) {
    this.family = family;
  }
  get cellWidth() {
    return this.cw;
  }
  get cellHeight() {
    return this.ch;
  }
  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.cw = clamp(Math.round(width / 124), 8, 13);
    this.ch = Math.round(this.cw * 1.45);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    const ctx = this.bg.getContext("2d")!;
    ctx.fillStyle = "#070a10";
    ctx.fillRect(0, 0, this.bg.width, this.bg.height);
    ctx.strokeStyle = "rgba(179,195,211,.035)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Device-pixel-snapped grid retained from the reference's paintGrid.
    for (let col = 0; col <= Math.ceil(width / this.cw); col++) {
      const x = Math.round(col * this.cw * dpr) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.bg.height);
    }
    for (let row = 0; row <= Math.ceil(height / this.ch); row++) {
      const y = Math.round(row * this.ch * dpr) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(this.bg.width, y);
    }
    ctx.stroke();
  }
  render(world: World, _dt: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.font = `600 ${Math.round(this.ch * 0.74)}px ${this.family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const cloud of world.clouds) this.drawCloud(cloud, world.time);
    for (const balloon of world.balloons) this.drawBalloon(balloon, world.time);
    if (world.selected) {
      const selected = world.selected;
      if (selected.type === "balloon") {
        const b = world.balloons.find((b) => b.id === selected.id);
        if (b) {
          const p = balloonPose(b, world.time);
          this.focusFrame(
            p.x - b.radius * 1.1,
            p.y - b.radius * 1.18,
            b.radius * 2.2,
            b.radius * 3.05,
          );
        }
      } else {
        const c = world.clouds.find((c) => c.id === selected.id);
        if (c) {
          const p = cloudPose(c, world.time);
          this.focusFrame(
            p.x - c.radius * 1.7,
            p.y - c.radius,
            c.radius * 3.5,
            c.radius * 1.9,
          );
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  private bounds(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    draw: (x: number, y: number, col: number, row: number) => void,
  ) {
    const c0 = Math.max(0, Math.floor(x0 / this.cw)),
      c1 = Math.min(
        Math.ceil(this.width / this.cw) - 1,
        Math.ceil(x1 / this.cw),
      ),
      r0 = Math.max(0, Math.floor(y0 / this.ch)),
      r1 = Math.min(
        Math.ceil(this.height / this.ch) - 1,
        Math.ceil(y1 / this.ch),
      );
    for (let row = r0; row <= r1; row++)
      for (let col = c0; col <= c1; col++)
        draw(col * this.cw, row * this.ch, col, row);
  }
  private cloudSample(cloud: Cloud, x: number, y: number, time: number) {
    const center = cloudPose(cloud, time);
    let density = -1,
      light = 0.5;
    for (const puff of cloud.puffs) {
      const dx = (x - center.x - puff.x) / puff.rx,
        dy = (y - center.y - puff.y) / puff.ry,
        d = 1 - dx * dx - dy * dy;
      if (d > density) {
        density = d;
        light = clamp(
          0.58 + Math.sqrt(Math.max(0, d)) * 0.27 - dy * 0.16 - dx * 0.1,
          0.12,
          1,
        );
      }
    }
    return { inside: density >= 0, density, light };
  }
  private drawCloud(cloud: Cloud, time: number) {
    if (cloud.opacity < 0.025) return;
    const center = cloudPose(cloud, time),
      ctx = this.ctx;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const p of cloud.puffs) {
      x0 = Math.min(x0, center.x + p.x - p.rx);
      x1 = Math.max(x1, center.x + p.x + p.rx);
      y0 = Math.min(y0, center.y + p.y - p.ry);
      y1 = Math.max(y1, center.y + p.y + p.ry);
    }
    this.bounds(x0, y0, x1, y1, (x, y, col, row) => {
      const sample = this.cloudSample(
        cloud,
        x + this.cw * 0.5,
        y + this.ch * 0.5,
        time,
      );
      let covered = sample.inside ? 1 : 0;
      for (const [sx, sy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ])
        if (
          this.cloudSample(cloud, x + this.cw * sx, y + this.ch * sy, time)
            .inside
        )
          covered++;
      if (!covered) return;
      const key = hash3(col, row, cloud.id),
        edge = covered < 3,
        shade = sample.light;
      ctx.globalAlpha = cloud.opacity;
      if (!edge) {
        const level = Math.round(62 + shade * 142);
        ctx.fillStyle = `rgb(${level},${level + 3},${level + 7})`;
        ctx.fillRect(x + 1, y + 1, this.cw - 1, this.ch - 1);
        ctx.fillStyle =
          key > 0.91 ? "#e1e5df" : shade > 0.7 ? "#39414b" : "#222c36";
        ctx.fillText(
          CLOUD[Math.floor(key * CLOUD.length)],
          x + this.cw / 2,
          y + this.ch / 2 + 1,
        );
      } else {
        ctx.fillStyle = "#8d9ba5";
        ctx.globalAlpha = (cloud.opacity * covered) / 5;
        ctx.fillText(
          EDGE[Math.floor(key * EDGE.length)],
          x + this.cw / 2,
          y + this.ch / 2 + 1,
        );
      }
    });
    ctx.globalAlpha = 1;
  }
  private drawBalloon(balloon: Balloon, time: number) {
    const ctx = this.ctx,
      p = balloonPose(balloon, time),
      r = balloon.radius;
    this.bounds(
      p.x - r * 1.05,
      p.y - r * 1.1,
      p.x + r * 1.05,
      p.y + r * 1.03,
      (x, y, col, row) => {
        const v = (y + this.ch / 2 - p.y + r * 1.08) / (r * 2.08);
        if (v < 0 || v > 1) return;
        const half = balloonWidth(v),
          u = (x + this.cw / 2 - p.x) / r;
        if (Math.abs(u) > half) return;
        const key = hash3(col, row, balloon.id),
          across = u / Math.max(half, 0.01),
          theta = Math.asin(clamp(across, -1, 1)),
          gore = (theta / Math.PI + 0.5) * 8,
          index = Math.min(7, Math.floor(gore)),
          seam = gore - Math.floor(gore) < 0.11;
        let shade = clamp(
          0.31 +
            Math.sqrt(Math.max(0, 1 - across * across)) * 0.61 -
            across * 0.13 +
            (1 - v) * 0.1,
          0.2,
          1.08,
        );
        if (seam) shade *= 0.76;
        const base = COLORS[balloon.palette][index % 2];
        const rgb = base.map((c) => Math.round(c * shade));
        if (v > 0.94) {
          rgb[0] *= 0.65;
          rgb[1] *= 0.6;
          rgb[2] *= 0.58;
        }
        ctx.fillStyle = `rgb(${rgb.map(Math.round).join(",")})`;
        ctx.fillRect(x + 1, y + 1, this.cw - 1, this.ch - 1);
        ctx.fillStyle =
          key > 0.94 ? "#f2e6c7" : shade > 0.63 ? "#262328" : "#c2ae93";
        ctx.fillText(
          SKIN[Math.floor(key * SKIN.length)],
          x + this.cw / 2,
          y + this.ch / 2 + 1,
        );
      },
    );
    // Taut rigging and a small wicker basket complete the silhouette.
    this.line(
      p.x - r * 0.14,
      p.y + r * 0.98,
      p.x - r * 0.22,
      p.y + r * 1.42,
      "#a6a39b",
    );
    this.line(
      p.x + r * 0.14,
      p.y + r * 0.98,
      p.x + r * 0.22,
      p.y + r * 1.42,
      "#a6a39b",
    );
    this.bounds(
      p.x - r * 0.25,
      p.y + r * 1.42,
      p.x + r * 0.25,
      p.y + r * 1.72,
      (x, y, col, row) => {
        const nx = (x + this.cw / 2 - p.x) / r,
          ny = (y + this.ch / 2 - p.y) / r;
        if (Math.abs(nx) > 0.25 || ny < 1.42 || ny > 1.72) return;
        const light = clamp(1 - Math.abs(nx) * 1.8 - (ny - 1.42) * 0.6, 0.4, 1),
          key = hash3(col, row, balloon.id + 70);
        ctx.fillStyle = `rgb(${Math.round(157 * light)},${Math.round(115 * light)},${Math.round(73 * light)})`;
        ctx.fillRect(x + 1, y + 1, this.cw - 1, this.ch - 1);
        ctx.fillStyle = ny < 1.49 ? "#d6b184" : "#382a25";
        ctx.fillText(
          "%#x:"[Math.floor(key * 4)],
          x + this.cw / 2,
          y + this.ch / 2 + 1,
        );
      },
    );
    if (balloon.flame > 0.035) {
      ctx.globalAlpha = balloon.flame;
      ctx.fillStyle = "#f9bc62";
      ctx.fillText(
        "*",
        Math.round(p.x / this.cw) * this.cw + this.cw / 2,
        Math.round((p.y + r * 1.19) / this.ch) * this.ch + this.ch / 2,
      );
      ctx.globalAlpha = 1;
    }
  }
  private line(ax: number, ay: number, bx: number, by: number, color: string) {
    const dx = bx - ax,
      dy = by - ay,
      steps = Math.ceil(
        (Math.hypot(dx, dy) / Math.min(this.cw, this.ch)) * 1.5,
      ),
      seen = new Set<number>();
    this.ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps),
        col = Math.floor((ax + dx * t) / this.cw),
        row = Math.floor((ay + dy * t) / this.ch),
        key = row * 10000 + col;
      if (seen.has(key)) continue;
      seen.add(key);
      this.ctx.fillText(
        Math.abs(dy) > Math.abs(dx) * 2 ? "|" : dx * dy > 0 ? "\\" : "/",
        col * this.cw + this.cw / 2,
        row * this.ch + this.ch / 2 + 1,
      );
    }
  }
  private focusFrame(x: number, y: number, width: number, height: number) {
    this.ctx.globalAlpha = 0.8;
    this.ctx.fillStyle = "#e3d5bb";
    for (const [px, py, glyph] of [
      [x, y, "+"],
      [x + width, y, "+"],
      [x, y + height, "+"],
      [x + width, y + height, "+"],
    ] as const)
      this.ctx.fillText(glyph, px, py);
    this.ctx.globalAlpha = 1;
  }
}
