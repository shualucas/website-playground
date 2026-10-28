/** Full-page, slowly flowing contour bands made from actual monospace glyphs. */
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
      t = frame / 12,
      ramp = ".:-=+*#";
    ctx.clearRect(0, 0, 768, 1056);
    ctx.font = 'bold 15px "Courier New",monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let row = 0; row < 66; row++)
      for (let col = 0; col < 48; col++) {
        const x = (col + 0.5) / 24 - 1,
          y = (row + 0.5) / 33 - 1,
          field =
            0.7 * Math.sin(x * 2.7 + 0.8 * Math.sin(y * 2.3 + t * 0.16)) +
            0.45 * Math.cos(y * 3.4 - x * 1.1 - t * 0.13) +
            0.14 * Math.sin((x + y) * 6 + t * 0.12),
          contour = Math.pow((Math.cos(field * 12) + 1) / 2, 7),
          soft = 0.5 + 0.5 * Math.sin(field * 4 + y * 2),
          density = 0.1 + contour * 0.85;
        const glyph =
            ramp[Math.min(ramp.length - 1, Math.floor(density * ramp.length))],
          index =
            Math.floor(
              ((field + 1.6) / 3.2) * this.colors.length +
                this.colors.length * 4,
            ) % this.colors.length,
          alpha = Math.round((0.09 + contour * 0.55 + soft * 0.04) * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fillStyle = this.colors[index] + alpha;
        ctx.fillText(glyph, (col + 0.5) * 16, (row + 0.5) * 16);
      }
    return true;
  }
}
