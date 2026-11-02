import React, { useEffect, useRef } from "react";

const glyphs = ".,:;+=x*#%@";
const hash = (x, y) => {
  let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/** A short, decorative character pass. No extra WebGL context or persistent loop. */
export function AsciiPreviewReveal({ active, kind }) {
  const canvas = useRef(null);
  useEffect(() => {
    const surface = canvas.current, art = surface.parentElement;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const context = surface.getContext("2d");
    let frame = 0, start = null, lastPaint = -Infinity, stopped = false;
    surface.dataset.state = active && !motion.matches ? "waiting" : "complete";
    surface.hidden = !active || motion.matches || !context;
    if (surface.hidden) return;
    const ready = () => {
      if (kind === "zine") return /ready|unavailable/.test(art.querySelector(".zine-preview-scene")?.dataset.status || "");
      if (kind === "film") return /ready|unavailable/.test(art.querySelector(".film-camera-dock")?.dataset.status || "") || art.closest(".collection")?.dataset.status === "fallback";
      return true;
    };
    const paint = now => {
      if (stopped) return;
      if (motion.matches) { surface.dataset.state = "complete"; surface.hidden = true; return; }
      if (now - lastPaint >= 1000 / 18) {
        lastPaint = now;
        if (start === null && ready()) { start = now; surface.dataset.state = "revealing"; }
        const progress = start === null ? 0 : Math.min(1, (now - start) / 680);
        const width = Math.max(1, Math.round(art.clientWidth)), height = Math.max(1, Math.round(art.clientHeight));
        if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; }
        const style = getComputedStyle(art);
        context.clearRect(0, 0, width, height);
        context.font = '10px "Courier New", monospace';
        context.textBaseline = "middle";
        const cols = Math.ceil(width / 9), rows = Math.ceil(height / 12), tick = Math.floor(now / 95);
        const ink = getComputedStyle(art.closest(".recent-projects")).getPropertyValue("--preview-accent").trim();
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const seed = hash(col, row), threshold = .12 + .58 * col / cols + .18 * row / rows + .12 * seed;
          if (progress >= threshold) continue;
          context.globalAlpha = 1;
          context.fillStyle = style.backgroundColor;
          context.fillRect(col * 9, row * 12, 9, 12);
          const x = (col + .5) / cols, y = (row + .5) / rows;
          // Give the object previews a simple character silhouette before resolving.
          const shape = kind === "film" ? x > .2 && x < .8 && y > .25 && y < .72
            : kind === "zine" ? Math.abs(x - .5 + (y - .5) * .2) < .19 && y > .13 && y < .87
            : Math.sin(x * 9 + y * 5) + Math.cos(y * 10 - x * 4) > .1;
          context.globalAlpha = (shape ? .65 : .15) * Math.min(1, (threshold - progress) * 9);
          context.fillStyle = ink || "#666";
          context.fillText(glyphs[Math.floor(hash(col + tick, row) * glyphs.length)], col * 9 + 1, row * 12 + 6);
        }
        context.globalAlpha = 1;
        if (progress === 1) { surface.dataset.state = "complete"; surface.hidden = true; return; }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [active, kind]);
  return <canvas ref={canvas} className="recent-preview-ascii" aria-hidden="true" hidden />;
}
