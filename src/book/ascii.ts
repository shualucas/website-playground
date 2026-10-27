/** A portal made of actual monospace glyphs, printed into the book's page texture. */
export class AsciiPortal {
  readonly canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private last = -1;
  constructor() {
    this.canvas.width = 768;
    this.canvas.height = 1056;
    this.ctx = this.canvas.getContext("2d")!;
    this.draw(0);
  }
  draw(time: number) {
    const frame = Math.floor(time * 12);
    if (frame === this.last) return false;
    this.last = frame;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 768, 1056);
    ctx.font = 'bold 17px "Courier New",monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cols = 48,
      rows = 66,
      cw = 16,
      ch = 16,
      t = frame / 12;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const x = (col + 0.5 - cols / 2) / (cols * 0.43),
          y = (rows * 0.51 - row - 0.5) / (rows * 0.47);
        // Tall arched threshold: the border and the vortex are both glyphs.
        const arch = y > 0.3 ? Math.hypot(x, y - 0.3) : Math.abs(x);
        const edge = Math.max(arch - 0.75, -y - 0.94);
        const stone = edge > -0.055 && edge < 0.1 && y > -0.99;
        const seed = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453,
          hash = seed - Math.floor(seed);
        if (stone) {
          ctx.fillStyle = "rgba(35,87,165,.13)";
          ctx.fillRect(col * cw + 1, row * ch + 1, cw - 2, ch - 2);
          const level = 0.46 + 0.24 * hash;
          ctx.fillStyle = `rgba(35,87,165,${level})`;
          ctx.fillText(
            "#%H+=:[]"[Math.floor(hash * 8)],
            (col + 0.5) * cw,
            (row + 0.5) * ch,
          );
          continue;
        }
        if (edge > -0.04 || y < -0.91) continue;
        ctx.fillStyle = "rgba(35,87,165,.18)";
        ctx.fillRect(col * cw + 1, row * ch + 1, cw - 2, ch - 2);
        const r = Math.hypot(x * 1.04, (y + 0.03) * 0.74),
          a = Math.atan2(y * 0.74, x),
          flow = Math.sin(
            a * 5 + r * 20 - t * 1.8 + Math.sin(a * 3 - r * 7 + t * 0.6) * 1.7,
          ),
          ring = Math.exp(-(((r - 0.52) * 3.3) ** 2)),
          core = Math.min(1, r * 2.3);
        const intensity = Math.max(
          0,
          (0.22 + Math.pow((flow + 1) / 2, 2) * 1.2) * ring * core,
        );
        if (intensity < 0.055) {
          if (hash > 0.38) continue;
          ctx.fillStyle = "rgba(35,87,165,.25)";
          ctx.fillText(".", (col + 0.5) * cw, (row + 0.5) * ch);
          continue;
        }
        const ramp = ".,:;+*xS#@",
          glyph =
            ramp[
              Math.min(ramp.length - 1, Math.floor(intensity * ramp.length))
            ];
        ctx.fillStyle =
          flow > 0.12
            ? `rgba(240,81,140,${Math.min(1, 0.4 + intensity * 0.5)})`
            : `rgba(35,87,165,${Math.min(1, 0.45 + intensity * 0.5)})`;
        ctx.fillText(glyph, (col + 0.5) * cw, (row + 0.5) * ch);
      }
    return true;
  }
}
