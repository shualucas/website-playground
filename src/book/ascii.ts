/** A moving border of actual printed monospace glyphs, with a clear content window. */
export class AsciiPortal {
  readonly canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private last = -1;
  constructor(private colors: readonly string[] = ["#171717", "#606060"]) {
    this.canvas.width = 768;
    this.canvas.height = 1056;
    this.ctx = this.canvas.getContext("2d")!;
    this.draw(0);
  }
  setColors(colors: readonly string[]) {
    this.colors = colors;
    this.last = -1;
  }
  draw(time: number) {
    const frame = Math.floor(time * 12);
    if (frame === this.last) return false;
    this.last = frame;
    const ctx = this.ctx,
      t = frame / 12;
    ctx.clearRect(0, 0, 768, 1056);
    ctx.font = 'bold 17px "Courier New",monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let row = 0; row < 66; row++)
      for (let col = 0; col < 48; col++) {
        if (row > 6 && row < 59 && col > 5 && col < 42) continue;
        const x = (col + 0.5 - 24) / 24,
          y = (row + 0.5 - 33) / 33;
        const r = Math.hypot(x, y * 1.04),
          a = Math.atan2(y, x);
        const wave = Math.sin(
          a * 5 - r * 18 + t * 1.5 + Math.sin(a * 3 + r * 8 - t * 0.5),
        );
        const intensity = 0.2 + 0.8 * Math.pow((wave + 1) / 2, 1.35);
        const ramp = ".,:;+*xS#@",
          glyph = ramp[Math.min(9, Math.floor(intensity * 10))];
        const index =
          this.colors.length > 2
            ? Math.floor(
                ((a + Math.PI) / (Math.PI * 2) + t * 0.025 + 2) *
                  this.colors.length,
              ) % this.colors.length
            : wave > 0.08
              ? 0
              : 1;
        ctx.fillStyle =
          this.colors[index] +
          Math.round((0.4 + intensity * 0.6) * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fillText(glyph, (col + 0.5) * 16, (row + 0.5) * 16);
      }
    return true;
  }
}
