import React, { useLayoutEffect, useRef } from "react";

// Cell shading and glyph ramps adapted from stackedlol/ascii-sharks (MIT, drewdi).
// Full attribution: THIRD_PARTY_NOTICES.md and public/licenses/ascii-sharks-MIT.txt.
const skinRamp = ":;t%SX8#@";
const edgeHeavy = ":;", edgeLight = ".',`";
const bayer4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const cellKey = (col, row) => Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263);
const smooth = value => { const p = Math.max(0, Math.min(1, value)); return p * p * (3 - 2 * p); };

/** Sample the real preview, then crossfade its monochrome characters into the original. */
export function AsciiPreviewReveal({ active, kind, instant = false }) {
  const canvas = useRef(null);
  useLayoutEffect(() => {
    const surface = canvas.current, art = surface.parentElement;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const context = surface.getContext("2d");
    const sample = document.createElement("canvas"), pixels = sample.getContext("2d", { willReadFrequently:true });
    const duration = ["film", "zine"].includes(kind) ? 1200 : 600;
    let backingInk = "", backings = [];
    const prepareBackings = ink => {
      if (backingInk === ink) return;
      backingInk = ink;
      backings = [4,8,12,16].map(threshold => {
        const tile = document.createElement("canvas"); tile.width = tile.height = 8;
        const brush = tile.getContext("2d"); brush.fillStyle = ink;
        for (let row=0;row<4;row++) for (let col=0;col<4;col++) if (bayer4[row*4+col]<threshold) brush.fillRect(col*2,row*2,1,1);
        return context.createPattern(tile,"repeat");
      });
    };
    let frame = 0, start = null, source = null, lastSample = -Infinity, stopped = false, complete = false;
    const releaseSource = () => {
      source?.removeEventListener("ascii-preview-frame", capture);
      source?.removeAttribute("data-ascii-capture");
      source = null;
    };
    const finish = () => {
      complete = true; surface.dataset.state = "complete"; surface.hidden = true;
      art.style.removeProperty("--preview-content-opacity");
      releaseSource();
    };
    surface.dataset.state = active && !instant && !motion.matches ? "waiting" : "complete";
    surface.dataset.source = "none";
    surface.hidden = !active || instant || motion.matches || !context || !pixels;
    surface.style.opacity = "0";
    if (surface.hidden) return;
    art.style.setProperty("--preview-content-opacity", "0");
    const dimensions = () => {
      const width = Math.max(1, Math.round(art.clientWidth)), height = Math.max(1, Math.round(art.clientHeight));
      if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; }
      sample.width = Math.ceil(width / 8); sample.height = Math.ceil(height / 11);
      return { width, height };
    };
    function capture() {
      const now = performance.now();
      if (stopped || complete || now - lastSample < 1000 / 18) return;
      lastSample = now;
      const { width, height } = dimensions();
      const flat = !source;
      pixels.clearRect(0, 0, sample.width, sample.height);
      if (source) {
        if (source instanceof HTMLImageElement) {
          if (!source.complete) return;
          if (!source.naturalWidth) { finish(); return; }
        }
        if (source instanceof HTMLVideoElement && source.readyState < 2) return;
        const rect = source.getBoundingClientRect(), bounds = art.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pixels.drawImage(source, (rect.left - bounds.left) / width * sample.width, (rect.top - bounds.top) / height * sample.height, rect.width / width * sample.width, rect.height / height * sample.height);
      } else {
        pixels.fillStyle = getComputedStyle(art).backgroundColor;
        pixels.fillRect(0, 0, sample.width, sample.height);
      }
      let data;
      try { data = pixels.getImageData(0, 0, sample.width, sample.height).data; }
      catch { finish(); return; } // A future cross-origin image must not block the preview.
      context.clearRect(0, 0, width, height);
      context.font = '600 8px ui-monospace, Menlo, monospace'; context.textAlign = "center"; context.textBaseline = "middle";
      const ink = getComputedStyle(art.closest(".recent-projects")).getPropertyValue("--preview-accent").trim() || "#666";
      prepareBackings(ink);
      const progress = start === null ? 0 : Math.min(1,(performance.now()-start)/duration);
      const dissolve = smooth((progress-.35)/.55);
      for (let row = 0; row < sample.height; row++) for (let col = 0; col < sample.width; col++) {
        const i = (row * sample.width + col) * 4, alpha = data[i + 3] / 255;
        if (alpha < .04) continue;
        const shade = 1 - (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255;
        const key = cellKey(col, row), x = col * 8, y = row * 11;
        context.fillStyle = ink;
        if (!flat && alpha < .6) {
          // The reference leaves edge cells unfilled for a soft silhouette.
          const edge = alpha >= .5 ? edgeHeavy : edgeLight;
          context.globalAlpha = alpha * .75;
          context.fillText(edge[(key >>> 8) % edge.length], x + 4, y + 6.5);
          continue;
        }
        // Ordered dots retain the sampled volume as the ASCII cells dissolve.
        context.globalAlpha = flat ? .07 : alpha * (.24 + .26 * shade);
        context.fillStyle = backings[Math.min(3,Math.floor(shade*4))] || ink;
        context.fillRect(x, y, 8, 11);
        if (!flat && dissolve > (bayer4[(row&3)*4+(col&3)]+.5)/16) continue;
        context.fillStyle = ink;
        const jitter = flat ? 0 : ((key >>> 4) % 3) - 1;
        const index = Math.max(0, Math.min(skinRamp.length - 1, Math.floor(shade * 8.99) + jitter));
        context.globalAlpha = flat ? .17 : alpha * (.5 + .45 * shade);
        context.fillText(skinRamp[index], x + 4, y + 6.5);
      }
      context.globalAlpha = 1;
      surface.dataset.source = flat ? "fill" : "content";
      if (start === null) { start = performance.now(); surface.dataset.state = "revealing"; }
    }
    const paint = now => {
      if (stopped || complete) return;
      if (motion.matches) { finish(); return; }
      if (!source) {
        const found = [...art.querySelectorAll(".recent-preview-source canvas,.recent-preview-source img,.recent-preview-source video")]
          .find(node => !node.closest(".recent-special-preview") || node.closest(".recent-special-preview").dataset.visible === "true");
        if (found) {
          source = found;
          source.addEventListener("ascii-preview-frame", capture);
          if (source instanceof HTMLCanvasElement) source.setAttribute("data-ascii-capture", "");
        }
      }
      const liveCanvas = source instanceof HTMLCanvasElement && (source.classList.contains("book-webgl") || source.closest(".film-camera-dock"));
      const unavailable = kind === "film" && art.closest(".collection")?.dataset.status === "fallback" || kind === "zine" && art.querySelector('.zine-preview-scene[data-status="unavailable"]');
      if (!liveCanvas && (source || !["film", "zine"].includes(kind) || unavailable)) capture();
      if (complete) return;
      if (start !== null) {
        const progress = Math.min(1, Math.max(0, (now - start) / duration));
        const reveal = smooth((progress - .28) / .72);
        surface.style.opacity = String(smooth(progress / .22) * (1 - reveal));
        art.style.setProperty("--preview-content-opacity", String(reveal));
        if (progress === 1) { finish(); return; }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => { stopped = true; cancelAnimationFrame(frame); releaseSource(); art.style.removeProperty("--preview-content-opacity"); };
  }, [active, kind, instant]);
  return <canvas ref={canvas} className="recent-preview-ascii" data-dither="ordered" aria-hidden="true" hidden />;
}
