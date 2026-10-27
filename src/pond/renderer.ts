/**
 * Draws the World as a grid of ASCII cells:
 *   1. a pure black cell grid
 *   2. a wake field that diffuses where things swim, lighting the dots cyan
 *   3. fish as minimal ASCII dashes, one per cell, glinting on hard turns
 *   4. tadpoles rasterised cell-by-cell with supersampled edges: grey blocks
 *      shaded by the light, dense glyphs, and shimmering accent colours
 */
import { clamp, hash3, smoothstep } from "./math";
import {
  TADPOLE_NODES,
  type Tadpole,
  type TadpoleKind,
  type World,
} from "./world";

const ALPHA_LEVELS = 6;
const FISH_ALPHAS = [0.28, 0.42, 0.58, 0.74, 0.9];

// Dot colour classes: blue, green, red, pale; the last entry is the cyan wake.
const DOT_RGB: [number, number, number][] = [
  [48, 52, 235],
  [52, 205, 60],
  [228, 50, 44],
  [190, 212, 255],
  [110, 230, 255],
];
const DOT_BASE_ALPHA = [1, 1, 1, 1, 1];
const WAKE = DOT_RGB.length - 1;

const ACCENTS = ["#90b879", "#b2c6a0", "#5d967c", "#7fb8a6"];

// Sparse glyphs on bright skin, dense glyphs in shadow, so the texture
// reinforces the shading instead of fighting it.
const SKIN_RAMP = ":;t%SX8#@";
const FIN_GLYPHS = "%;tS:";
const RIDGE_GLYPHS = "@8%";
const EDGE_HEAVY = ":;";
const EDGE_LIGHT = ".',`";

const FLAG_BODY = 1;
const FLAG_EDGE = 2;
const FLAG_FIN = 3;
const FLAG_RIDGE = 4;
const FLAG_EYE = 5;
/** Dark skin markings: tiger bars, zebra-tadpole spots. */
const FLAG_MARK = 6;
const MARK_GLYPHS = "#%@";

// Sub-cell sample offsets for anti-aliased silhouettes.
const SUBSAMPLES = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];

/** Classic top-down half-width at s ∈ [0, 1] (snout → tail), as a fraction of length. */
function classicHalfWidth(s: number) {
  if (s < 0.13)
    return 0.09 * Math.pow(Math.sin(((s / 0.13) * Math.PI) / 2), 0.95);
  if (s < 0.3) return 0.09 + 0.016 * smoothstep(0.13, 0.3, s);
  if (s < 0.84) return 0.019 + 0.087 * Math.pow(1 - (s - 0.3) / 0.54, 1.25);
  const k = (s - 0.84) / 0.16;
  return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
}

/** Body outline and fin layout per species. All values are fractions of length. */
interface TadpoleShape {
  halfWidth: (s: number) => number;
  /** Pectoral fin: leading root, trailing root, tip position along the body, and reach. */
  pectoral: [number, number, number, number];
  /** Notched (falcate) trailing edge on the pectorals. */
  falcate: boolean;
  /** Pelvic fins: leading root, trailing root, tip, reach. */
  pelvic: [number, number, number, number];
  /** Forked caudal fin reach, or 0 when the tail is a ribbon (zebra tadpole). */
  caudal: number;
  dorsal: [number, number];
  secondDorsal: [number, number];
  /**
   * Hammerheads' cephalofoil: half-span, how far its tips sweep back, its depth, and the
   * notch in the middle of the front edge. All fractions of length; absent for other tadpoles.
   */
  head?: { span: number; sweep: number; depth: number; notch: number };
  /** null when the eyes sit somewhere else (hammerhead: on the cephalofoil tips). */
  eye: [number, number] | null;
  gills: [number, number];
  /** Skin colour multipliers (r, g, b). */
  tint: [number, number, number];
}

const SHAPES: Record<TadpoleKind, TadpoleShape> = {
  tadpole: {
    halfWidth: (s) => {
      if (s < 0.3)
        return 0.133 * Math.sqrt(Math.max(0, 1 - ((s - 0.14) / 0.16) ** 2));
      return 0.03 * Math.pow(Math.max(0, 1 - (s - 0.3) / 0.7), 0.95) + 0.002;
    },
    pectoral: [0, 0, 0, 0],
    falcate: false,
    pelvic: [0, 0, 0, 0],
    caudal: 0,
    dorsal: [0, 0],
    secondDorsal: [0, 0],
    eye: [0.07, 0.17],
    gills: [0, 0],
    tint: [0.85, 1, 0.84],
  },
};

const KINDS = Object.keys(SHAPES) as TadpoleKind[];

function inTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/** Visible dark-grey cell grid, snapped to device pixels. Shared with the sidebar backdrop. */
export function paintGrid(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  cw: number,
  ch: number,
  dpr: number,
) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = "rgba(175,205,182,0.035)";
  g.lineWidth = 1;
  g.beginPath();
  for (let c = 0; c <= Math.ceil(W / cw); c++) {
    const x = Math.round(c * cw * dpr) + 0.5;
    g.moveTo(x, 0);
    g.lineTo(x, H * dpr);
  }
  for (let r = 0; r <= Math.ceil(H / ch); r++) {
    const y = Math.round(r * ch * dpr) + 0.5;
    g.moveTo(0, y);
    g.lineTo(W * dpr, y);
  }
  g.stroke();
}

export class AsciiRenderer {
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private cw = 12;
  private ch = 18;
  private cols = 0;
  private rows = 0;
  private fontFamily = "ui-monospace, Menlo, monospace";

  private dotKind = new Uint8Array(0); // 0 none, 1 blue, 2 green, 3 red, 4 pale
  private dotPhase = new Float32Array(0);
  private dotFreq = new Float32Array(0);
  private energy = new Float32Array(0);
  private energyTmp = new Float32Array(0);
  private heat = new Float32Array(0);
  private bucketOf = new Uint8Array(0);
  private bucketOrder = new Int32Array(0);
  private bucketCounts = new Int32Array(DOT_RGB.length * ALPHA_LEVELS + 1);
  private dotStyles: string[] = [];

  private tadpoleFlag = new Uint8Array(0);
  private tadpoleShade = new Float32Array(0);
  private tadpoleKey = new Uint32Array(0);
  private tadpoleDepth = new Float32Array(0);
  private tadpoleKind = new Uint8Array(0);
  /** Cells darkened by a tadpole's shadow on the seabed. */
  private tadpoleShadow = new Uint8Array(0);
  private spine = new Float32Array(TADPOLE_NODES * 2);
  private arc = new Float32Array(TADPOLE_NODES);
  private arcTotal = 1;
  private shape = SHAPES.tadpole;
  private tadpoleId = 0;
  private finTipLeft = 0;
  private finTipRight = 0;
  // Scratch outputs of sampleTadpole(), to avoid allocating per sample.
  private hitFlag = 0;
  private hitShade = 0;
  private hitS = 0;
  private hitV = 0;
  private hitDist = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.bg = document.createElement("canvas");

    for (let c = 0; c < DOT_RGB.length; c++) {
      const [r, g, b] = DOT_RGB[c];
      for (let l = 0; l < ALPHA_LEVELS; l++) {
        const a = (DOT_BASE_ALPHA[c] * (l + 1)) / ALPHA_LEVELS;
        this.dotStyles.push(`rgba(${r},${g},${b},${a.toFixed(3)})`);
      }
    }
  }

  get cellWidth() {
    return this.cw;
  }

  get cellHeight() {
    return this.ch;
  }

  setFontFamily(family: string) {
    if (family) this.fontFamily = family;
  }

  resize(width: number, height: number, dpr: number) {
    const prevCols = this.cols;
    const prevRows = this.rows;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.cw = clamp(Math.round(width / 124), 8, 13);
    this.ch = Math.round(this.cw * 1.45);
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;

    const n = this.cols * this.rows;
    if (this.cols !== prevCols || this.rows !== prevRows) {
      this.dotKind = new Uint8Array(n);
      this.dotPhase = new Float32Array(n);
      this.dotFreq = new Float32Array(n);
      this.energy = new Float32Array(n);
      this.energyTmp = new Float32Array(n);
      this.heat = new Float32Array(n);
      this.bucketOf = new Uint8Array(n);
      this.bucketOrder = new Int32Array(n);
      this.tadpoleFlag = new Uint8Array(n);
      this.tadpoleShade = new Float32Array(n);
      this.tadpoleKey = new Uint32Array(n);
      this.tadpoleDepth = new Float32Array(n);
      this.tadpoleKind = new Uint8Array(n);
      this.tadpoleShadow = new Uint8Array(n);
    }

    for (let i = 0; i < n; i++) {
      const col = i % this.cols;
      const row = (i / this.cols) | 0;
      // No ambient dots: the grid stays black. Only the cyan wake lights cells.
      this.dotKind[i] = 0;
      this.dotPhase[i] = hash3(col, row, 23) * Math.PI * 2;
      this.dotFreq[i] = 0.3 + hash3(col, row, 37) * 1.1;
    }
    this.paintBackground();
  }

  private paintBackground() {
    const g = this.bg.getContext("2d");
    if (!g) return;
    const { width: W, height: H, dpr, cw, ch } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#050807";
    g.fillRect(0, 0, W, H);
    paintGrid(g, W, H, cw, ch, dpr);
  }

  render(world: World, dt: number) {
    const { ctx, dpr, cols, ch } = this;
    if (cols === 0) return;
    const t = world.time;

    this.consumeEvents(world);
    this.rasterizeTadpoles(world.tadpoles, t);
    this.depositWake(world);
    this.diffuse(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.drawDots(t);

    ctx.font = `600 ${Math.round(ch * 0.74)}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    this.drawHeat();

    this.drawTailStrokes(world);
    this.drawTadpoles(t);
    this.drawLilyPads(world);
  }

  private drawTailStrokes(world: World) {
    const { ctx, cw, ch } = this;
    for (const tadpole of world.tadpoles) {
      const seen = new Set<number>(),
        points: Array<[number, number]> = [];
      for (let n = 6; n < TADPOLE_NODES; n++) {
        const s = n / (TADPOLE_NODES - 1),
          a = Math.max(0, n - 1),
          b = Math.min(TADPOLE_NODES - 1, n + 1);
        const dx = tadpole.nodes[a * 2] - tadpole.nodes[b * 2],
          dy = tadpole.nodes[a * 2 + 1] - tadpole.nodes[b * 2 + 1],
          length = Math.hypot(dx, dy) || 1;
        const amplitude =
          tadpole.length *
          0.05 *
          (0.1 + 0.9 * Math.pow(s, 1.8)) *
          clamp(tadpole.speed / 60, 0.4, 1.4);
        const offset = amplitude * Math.sin(tadpole.phase - s * 5.2);
        points.push([
          tadpole.nodes[n * 2] - (dy / length) * offset,
          tadpole.nodes[n * 2 + 1] + (dx / length) * offset,
        ]);
      }
      for (let n = 1; n < points.length; n++) {
        const [ax, ay] = points[n - 1],
          [bx, by] = points[n],
          dx = bx - ax,
          dy = by - ay,
          steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (cw * 0.5)));
        for (let step = 0; step <= steps; step++) {
          const t = step / steps,
            col = Math.floor((ax + dx * t) / cw),
            row = Math.floor((ay + dy * t) / ch),
            key = row * this.cols + col;
          if (
            col < 0 ||
            row < 0 ||
            col >= this.cols ||
            row >= this.rows ||
            seen.has(key)
          )
            continue;
          seen.add(key);
          const glyph =
            Math.abs(dx) > Math.abs(dy) * 2
              ? "-"
              : Math.abs(dy) > Math.abs(dx) * 2
                ? "|"
                : dx * dy > 0
                  ? "\\"
                  : "/";
          ctx.globalAlpha =
            (0.48 + tadpole.depth * 0.35) * (1 - n / (points.length + 7));
          ctx.fillStyle = "#8baa92";
          ctx.fillText(glyph, col * cw + cw / 2, row * ch + ch / 2 + 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawLilyPads(world: World) {
    const { ctx, cw, ch, cols, rows } = this;
    for (const pad of world.pads) {
      const px = pad.x + Math.sin(world.time * 0.27 + pad.phase) * 2,
        py = pad.y + Math.cos(world.time * 0.32 + pad.phase) * 1.8;
      const angle = pad.angle + Math.sin(world.time * 0.22 + pad.phase) * 0.025;
      const c0 = Math.max(0, Math.floor((px - pad.radius * 1.1) / cw)),
        c1 = Math.min(cols - 1, Math.ceil((px + pad.radius * 1.1) / cw));
      const r0 = Math.max(0, Math.floor((py - pad.radius) / ch)),
        r1 = Math.min(rows - 1, Math.ceil((py + pad.radius) / ch));
      for (let row = r0; row <= r1; row++)
        for (let col = c0; col <= c1; col++) {
          const x = col * cw,
            y = row * ch,
            dx = (x + cw / 2 - px) / pad.radius,
            dy = (y + ch / 2 - py) / (pad.radius * 0.86),
            distance = Math.hypot(dx, dy),
            a = Math.atan2(dy, dx);
          if (distance > 1 + 0.02 * Math.sin(a * 7 + pad.phase)) continue;
          const delta = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
          if (Math.abs(delta) < 0.22 && distance > 0.07) continue;
          const key = hash3(col, row, pad.id),
            vein = Math.abs(Math.sin((a - angle) * 6)) < 0.1;
          const shade = clamp(
            0.35 +
              Math.sqrt(Math.max(0, 1 - distance * distance)) * 0.38 -
              dx * 0.14 -
              dy * 0.18 +
              (vein ? 0.12 : 0),
            0.18,
            1,
          );
          const edge = distance > 0.89;
          if (!edge) {
            ctx.fillStyle = `rgb(${Math.round(27 + shade * 43)},${Math.round(55 + shade * 90)},${Math.round(32 + shade * 30)})`;
            ctx.fillRect(x + 1, y + 1, cw - 1, ch - 1);
          }
          const ramp = edge ? ".,'" : vein ? "/|:" : ";t%SX8@";
          ctx.fillStyle = edge
            ? "#4f8d5d"
            : vein
              ? "#91bd75"
              : key > 0.91
                ? "#acd08a"
                : "#183d27";
          ctx.fillText(
            ramp[Math.floor(key * ramp.length) % ramp.length],
            x + cw / 2,
            y + ch / 2 + 1,
          );
        }
    }
  }

  // ── simulation → field ──────────────────────────────────────────────

  private cellIndex(x: number, y: number) {
    const c = Math.floor(x / this.cw);
    const r = Math.floor(y / this.ch);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  private stamp(
    field: Float32Array,
    x: number,
    y: number,
    radius: number,
    amount: number,
  ) {
    const c0 = Math.floor(x / this.cw);
    const r0 = Math.floor(y / this.ch);
    for (let r = r0 - radius; r <= r0 + radius; r++) {
      for (let c = c0 - radius; c <= c0 + radius; c++) {
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
        const d = Math.hypot(c - c0, (r - r0) * 1.4);
        if (d > radius + 0.5) continue;
        const i = r * this.cols + c;
        field[i] = Math.min(1.6, field[i] + amount * (1 - d / (radius + 1)));
      }
    }
  }

  private consumeEvents(world: World) {
    for (const event of world.events)
      this.stamp(this.energy, event.x, event.y, 6, 1.4);
    world.events.length = 0;
  }

  private depositWake(world: World) {
    const { energy } = this;
    for (const sh of world.tadpoles) {
      // The tail sweeps the most water.
      for (let k = TADPOLE_NODES - 6; k < TADPOLE_NODES; k++) {
        const i = this.cellIndex(sh.nodes[k * 2], sh.nodes[k * 2 + 1]);
        if (i >= 0)
          energy[i] = Math.min(1.6, energy[i] + 0.05 + sh.speed * 0.0012);
      }
    }
    if (world.pointer.active) {
      this.stamp(energy, world.pointer.x, world.pointer.y, 1, 0.08);
    }
  }

  /** Blur + decay so wakes spread out like ripples and fade. */
  private diffuse(dt: number) {
    const { cols, rows, energy, energyTmp: tmp, heat } = this;
    const decay = Math.exp(-dt * 1.5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const l = c > 0 ? energy[i - 1] : energy[i];
        const rt = c < cols - 1 ? energy[i + 1] : energy[i];
        const u = r > 0 ? energy[i - cols] : energy[i];
        const d = r < rows - 1 ? energy[i + cols] : energy[i];
        tmp[i] = (energy[i] * 4 + l + rt + u + d) * 0.125 * decay;
      }
    }
    this.energy = tmp;
    this.energyTmp = energy;
    const heatDecay = Math.exp(-dt * 2.2);
    for (let i = 0; i < heat.length; i++) heat[i] *= heatDecay;
  }

  // ── tadpoles ──────────────────────────────────────────────────────────

  /**
   * Classify one point against the current tadpole (spine/arc already built).
   * Body coordinates: s along the spine (0 snout → 1 tail), v across it.
   * Writes hit* fields and returns whether the point is on the tadpole.
   */
  private sampleTadpole(px: number, py: number, L: number) {
    const { spine, arc } = this;
    const N = TADPOLE_NODES;
    let best = Infinity;
    let bestS = 0;
    let bestSign = 1;
    let bestNx = 0;
    let bestNy = 0;
    for (let k = 0; k < N - 1; k++) {
      const ax = spine[k * 2];
      const ay = spine[k * 2 + 1];
      const sx = spine[(k + 1) * 2] - ax;
      const sy = spine[(k + 1) * 2 + 1] - ay;
      const len2 = sx * sx + sy * sy || 1;
      const u = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const qx = ax + sx * u;
      const qy = ay + sy * u;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        best = d2;
        const len = Math.sqrt(len2);
        bestS = (arc[k] + u * len) / this.arcTotal;
        bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        bestNx = (-sy / len) * bestSign;
        bestNy = (sx / len) * bestSign;
      }
    }

    const a = Math.sqrt(best);
    const s = bestS;
    const u = s * L;
    const shape = this.shape;
    const w = shape.halfWidth(s) * L;
    this.hitDist = a;
    this.hitS = s;
    this.hitV = a * bestSign;

    if (a <= w) {
      const across = a / (w || 1);
      // Rounded back lit from the top-left; flanks fall off into shadow.
      const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
      let shade = 0.58 - across * across * 0.42 + facing * 0.26;
      let flag = FLAG_BODY;
      if (shape.eye && s > shape.eye[0] && s < shape.eye[1] && across > 0.68) {
        flag = FLAG_EYE;
        shade = 0;
      } else if (s < 0.035) {
        shade = Math.max(shade, 0.65);
      }
      this.hitFlag = flag;
      this.hitShade = shade;
      return true;
    }

    return false;
  }

  /**
   * Build a smooth, undulating render spine from the sim spine, then
   * supersample every cell in the tadpole's bounding box against the shape.
   * Fully covered cells become solid skin; partial cells become edge glyphs.
   */
  private rasterizeTadpoles(tadpoles: Tadpole[], t: number) {
    const {
      tadpoleFlag,
      tadpoleShade,
      tadpoleKey,
      tadpoleDepth,
      tadpoleKind,
      tadpoleShadow,
      spine,
      arc,
      cw,
      ch,
      cols,
      rows,
    } = this;
    tadpoleFlag.fill(0);
    tadpoleShadow.fill(0);

    for (const sh of tadpoles) {
      const L = sh.length;
      const N = TADPOLE_NODES;
      const n = sh.nodes;
      const swim = clamp(sh.speed / 60, 0.4, 1.4);
      this.shape = SHAPES[sh.kind];
      this.tadpoleId = sh.id;
      const kindIndex = KINDS.indexOf(sh.kind);

      // Travelling body wave, growing toward the tail.
      for (let k = 0; k < N; k++) {
        const s = k / (N - 1);
        const a = Math.max(0, k - 1);
        const b = Math.min(N - 1, k + 1);
        let tx = n[a * 2] - n[b * 2];
        let ty = n[a * 2 + 1] - n[b * 2 + 1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const amp = L * 0.05 * (0.1 + 0.9 * Math.pow(s, 1.8)) * swim;
        const off = amp * Math.sin(sh.phase - s * 5.2);
        spine[k * 2] = n[k * 2] - ty * off;
        spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
      }
      arc[0] = 0;
      for (let k = 1; k < N; k++) {
        arc[k] =
          arc[k - 1] +
          Math.hypot(
            spine[k * 2] - spine[(k - 1) * 2],
            spine[k * 2 + 1] - spine[(k - 1) * 2 + 1],
          );
      }
      this.arcTotal = arc[N - 1] || 1;

      // Bank into turns: the inside fin foreshortens, the outside one spreads.
      const bank = clamp(sh.turn * 0.45, -0.35, 0.35);
      const flex = 1 + 0.06 * Math.sin(sh.phase * 0.5);
      const reachFin = this.shape.pectoral[3];
      this.finTipRight = L * reachFin * flex * (1 - bank);
      this.finTipLeft = L * reachFin * flex * (1 + bank);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let k = 0; k < N; k++) {
        minX = Math.min(minX, spine[k * 2]);
        maxX = Math.max(maxX, spine[k * 2]);
        minY = Math.min(minY, spine[k * 2 + 1]);
        maxY = Math.max(maxY, spine[k * 2 + 1]);
      }
      const reach = L * 0.18;
      const c0 = Math.max(0, Math.floor((minX - reach) / cw));
      const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw));
      const r0 = Math.max(0, Math.floor((minY - reach) / ch));
      const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
      if (c0 > c1 || r0 > r1) continue;

      const skipBeyond = reach + Math.hypot(cw, ch);
      const shadowDc = Math.round((L * 0.035) / cw) + 1;
      const shadowDr = Math.round((L * 0.02) / ch) + 1;

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * cw;
          const y = r * ch;
          const centerHit = this.sampleTadpole(x + cw / 2, y + ch / 2, L);
          if (!centerHit && this.hitDist > skipBeyond) continue;
          const flag = this.hitFlag;
          const shade = this.hitShade;
          const s = this.hitS;
          const v = this.hitV;

          let hits = centerHit ? 1 : 0;
          for (let k = 0; k < SUBSAMPLES.length; k += 2) {
            if (
              this.sampleTadpole(
                x + SUBSAMPLES[k] * cw,
                y + SUBSAMPLES[k + 1] * ch,
                L,
              )
            )
              hits++;
          }
          if (hits === 0) continue;
          const coverage = hits / 5;

          const i = r * cols + c;
          // Body-anchored key so each glyph rides along with the skin.
          const key =
            (hash3(Math.round(s * 52), Math.round(v / (cw * 0.9)), sh.id) *
              4294967295) >>>
            0;
          tadpoleKey[i] = key;
          tadpoleDepth[i] = sh.depth;
          tadpoleKind[i] = kindIndex;

          if (centerHit && coverage >= 0.6) {
            tadpoleFlag[i] = flag;
            const flicker = (hash3(c, r, Math.floor(t * 6)) - 0.5) * 0.06;
            tadpoleShade[i] = clamp(shade + flicker, 0, 1);
            const sc = c + shadowDc;
            const sr = r + shadowDr;
            if (sc < cols && sr < rows) tadpoleShadow[sr * cols + sc] = 1;
          } else {
            tadpoleFlag[i] = FLAG_EDGE;
            tadpoleShade[i] = coverage;
          }
        }
      }
    }
  }

  private drawTadpoles(t: number) {
    const {
      ctx,
      cols,
      rows,
      cw,
      ch,
      tadpoleFlag,
      tadpoleShade,
      tadpoleKey,
      tadpoleDepth,
      tadpoleKind,
    } = this;
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const flag = tadpoleFlag[i];
      if (!flag) continue;
      const col = i % cols;
      const row = (i / cols) | 0;
      const x = col * cw;
      const y = row * ch;
      const key = tadpoleKey[i];
      const shade = tadpoleShade[i];
      const dim = 0.7 + 0.3 * tadpoleDepth[i];
      const [tr, tg, tb] = SHAPES[KINDS[tadpoleKind[i]]].tint;

      // Colours re-roll on a staggered clock so the hide shimmers.
      const tick = Math.floor(t * 2.4 + (key % 997) / 97);
      const roll = hash3(key, tick, 7);

      if (flag === FLAG_EDGE) {
        // Soft, anti-aliased silhouette: no block, just a light glyph.
        const set = shade >= 0.5 ? EDGE_HEAVY : EDGE_LIGHT;
        const g = (70 + shade * 80) * dim;
        ctx.fillStyle =
          roll < 0.07
            ? ACCENTS[key % ACCENTS.length]
            : `rgb(${Math.round(g * tr)},${Math.round(g * tg)},${Math.min(255, Math.round(g * tb + 6))})`;
        ctx.fillText(set[(key >>> 8) % set.length], x + cw / 2, y + ch / 2 + 1);
        continue;
      }

      let level: number;
      let glyph: string;
      if (flag === FLAG_RIDGE) {
        level = 226;
        glyph = RIDGE_GLYPHS[(key >>> 8) % RIDGE_GLYPHS.length];
      } else if (flag === FLAG_EYE) {
        level = 12;
        glyph = "o";
      } else if (flag === FLAG_MARK) {
        level = 24 + shade * 22;
        glyph = MARK_GLYPHS[(key >>> 8) % MARK_GLYPHS.length];
      } else if (flag === FLAG_FIN) {
        level = 40 + shade * 120;
        glyph = FIN_GLYPHS[(key >>> 8) % FIN_GLYPHS.length];
      } else {
        level = 46 + shade * 160;
        const jitter = ((key >>> 4) % 3) - 1;
        glyph =
          SKIN_RAMP[
            clamp(
              Math.floor((1 - shade) * 8.99) + jitter,
              0,
              SKIN_RAMP.length - 1,
            )
          ];
      }
      level *= dim;
      // Tinted per species; the classic tint is a cool blue-grey, like a back seen through deep water.
      ctx.fillStyle = `rgb(${Math.min(255, Math.round(level * tr))},${Math.min(255, Math.round(level * tg))},${Math.min(255, Math.round(level * tb + 4))})`;
      ctx.fillRect(x + 1, y + 1, cw - 1, ch - 1);

      let color: string;
      if (flag === FLAG_EYE) color = "#9aa0ad";
      else if (flag === FLAG_MARK)
        color = `rgb(${Math.round(70 * tr)},${Math.round(70 * tg)},${Math.round(70 * tb)})`;
      else if (roll < 0.09) color = ACCENTS[key % ACCENTS.length];
      else if (roll < 0.13) color = "#ffffff";
      else color = shade > 0.55 ? "#0e0f13" : "#1b1d24";
      ctx.fillStyle = color;
      ctx.fillText(glyph, x + cw / 2, y + ch / 2 + 1);
    }
  }

  // ── fish, dots, heat ────────────────────────────────────────────────

  private drawHeat() {
    const { ctx, heat, cols, cw, ch } = this;
    for (let i = 0; i < heat.length; i++) {
      const h = heat[i];
      if (h < 0.08) continue;
      const col = i % cols;
      const row = (i / cols) | 0;
      ctx.fillStyle =
        h > 0.5
          ? `rgba(255,120,60,${h.toFixed(2)})`
          : `rgba(220,40,40,${(h * 1.6).toFixed(2)})`;
      ctx.fillText(
        h > 0.6 ? "*" : "·",
        col * cw + cw / 2,
        row * ch + ch / 2 + 1,
      );
    }
  }

  /**
   * Every cell's dot twinkles on its own clock, is modulated by slow
   * caustic light bands, and flares cyan where the wake field is strong.
   * Dots are bucketed by colour/alpha so each bucket is one fillStyle.
   */
  private drawDots(t: number) {
    const {
      ctx,
      cols,
      rows,
      cw,
      ch,
      dotKind,
      dotPhase,
      dotFreq,
      energy,
      tadpoleFlag,
      tadpoleShadow,
    } = this;
    const { bucketOf, bucketOrder, bucketCounts } = this;
    const n = cols * rows;
    const SKIP = bucketCounts.length - 1;
    bucketCounts.fill(0);

    for (let i = 0; i < n; i++) {
      const e = energy[i];
      const kind = dotKind[i];
      if (tadpoleFlag[i] || (kind === 0 && e < 0.45)) {
        bucketOf[i] = SKIP;
        continue;
      }
      let bucket: number;
      if (e > 0.45) {
        const level = clamp(Math.floor((e - 0.45) * 5), 0, ALPHA_LEVELS - 1);
        bucket = WAKE * ALPHA_LEVELS + level;
      } else {
        const col = i % cols;
        const row = (i / cols) | 0;
        // Dots stay bright and crisp; the twinkle is a gentle breathe, not a fade.
        const twinkle = 0.5 + 0.5 * Math.sin(t * dotFreq[i] + dotPhase[i]);
        const caustic =
          0.85 +
          0.15 *
            Math.sin(col * 0.11 + t * 0.35) *
            Math.sin(row * 0.17 - t * 0.27);
        let v = clamp((0.55 + 0.45 * twinkle) * caustic + e * 2, 0, 1);
        if (tadpoleShadow[i]) v *= 0.2;
        bucket =
          (kind - 1) * ALPHA_LEVELS +
          clamp(Math.floor(v * ALPHA_LEVELS), 0, ALPHA_LEVELS - 1);
      }
      bucketOf[i] = bucket;
      bucketCounts[bucket]++;
    }

    // Counting sort cells by bucket.
    const starts = new Int32Array(bucketCounts.length);
    for (let b = 1; b < bucketCounts.length; b++)
      starts[b] = starts[b - 1] + bucketCounts[b - 1];
    const cursor = starts.slice();
    for (let i = 0; i < n; i++) {
      const b = bucketOf[i];
      if (b !== SKIP) bucketOrder[cursor[b]++] = i;
    }

    const small = Math.max(2, Math.round(cw * 0.19));
    const large = small + 1;
    for (let b = 0; b < SKIP; b++) {
      const count = bucketCounts[b];
      if (!count) continue;
      ctx.fillStyle = this.dotStyles[b];
      const size = b >= WAKE * ALPHA_LEVELS ? large : small;
      const start = starts[b];
      for (let k = start; k < start + count; k++) {
        const i = bucketOrder[k];
        const col = i % cols;
        const row = (i / cols) | 0;
        // Sit the dot low-right in its cell, as in the reference.
        ctx.fillRect(
          Math.round(col * cw + cw * 0.66 - size / 2),
          Math.round(row * ch + ch * 0.64 - size / 2),
          size,
          size,
        );
      }
    }
  }
}
