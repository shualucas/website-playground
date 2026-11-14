import React, { useLayoutEffect, useRef } from "react";
import { bayer, clamp, hotPalette, lightLevel, smooth } from "./clove-dither";

const pitch = 4;

/** Sample the real preview into an ordered pixel silhouette, then resolve into the original. */
export function DitherPreviewReveal({ active, kind, dark=false }) {
  const canvas = useRef(null);
  useLayoutEffect(() => {
    const surface = canvas.current, art = surface.parentElement;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const context = surface.getContext("2d");
    const sample = document.createElement("canvas"), pixels = sample.getContext("2d", { willReadFrequently:true });
    const duration = ["film", "zine"].includes(kind) ? 1200 : 600;
    let frame = 0, start = null, source = null, lastSample = -Infinity, stopped = false, complete = false, progress = 0;
    let heat=new Float32Array(0),present=new Uint8Array(0),palette=[],paletteInk='';
    const releaseSource = () => {
      source?.removeEventListener("preview-capture-frame", capture);
      source?.removeAttribute("data-preview-capture");
      source = null;
    };
    const finish = () => {
      complete = true; surface.dataset.state = "complete"; surface.hidden = true;
      art.style.removeProperty("--preview-content-opacity");
      releaseSource();
    };
    surface.dataset.state = active && !motion.matches ? "waiting" : "complete";
    surface.dataset.source = "none";
    surface.hidden = !active || motion.matches || !context || !pixels;
    surface.style.opacity = "0";
    if (surface.hidden) return;
    art.style.setProperty("--preview-content-opacity", "0");
    const dimensions = () => {
      const width = Math.max(1, Math.round(art.clientWidth)), height = Math.max(1, Math.round(art.clientHeight));
      if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; }
      sample.width = Math.ceil(width / pitch); sample.height = Math.ceil(height / pitch);
      if(heat.length!==sample.width*sample.height){heat=new Float32Array(sample.width*sample.height);present=new Uint8Array(heat.length);}
      return { width, height };
    };
    function capture() {
      const now = performance.now();
      if (stopped || complete || now - lastSample < 1000 / 18) return;
      const cool=Math.exp(-(Number.isFinite(lastSample)?(now-lastSample)/1000:0)/.42);
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
      const ink = getComputedStyle(art.closest(".recent-projects")).getPropertyValue("--preview-accent").trim() || "#666";
      if(paletteInk!==ink){paletteInk=ink;palette=hotPalette(ink,dark);}
      const dissolve = smooth((progress-.35)/.55);
      for (let row = 0; row < sample.height; row++) for (let col = 0; col < sample.width; col++) {
        const i = (row * sample.width + col) * 4, alpha = data[i + 3] / 255;
        const cell=row*sample.width+col;
        if (alpha < .04) {present[cell]=0;continue;}
        heat[cell]=present[cell]?heat[cell]*cool:1;present[cell]=1;
        const shade = 1 - (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255;
        const rank=bayer[(row&3)*4+(col&3)];
        const level=lightLevel(col,row,progress*duration/1000,0,heat[cell],.5,0)*(.45+.55*shade);
        const lit=level>rank;
        // Each square dissolves in its own cell. Transparent gaps in the source stay empty.
        const resolve=1-smooth((dissolve-rank)/.35);
        if(resolve<.025)continue;
        const size=lit?3:1.5;
        context.fillStyle=lit?palette[Math.round(clamp(heat[cell]*.95+.05)*63)]:palette[0];
        context.globalAlpha=(flat?.12:lit?.88:.22)*alpha*resolve;
        context.fillRect(col*pitch,row*pitch,size,size);
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
          source.addEventListener("preview-capture-frame", capture);
          if (source instanceof HTMLCanvasElement) source.setAttribute("data-preview-capture", "");
        }
      }
      const liveCanvas = source instanceof HTMLCanvasElement && (source.classList.contains("book-webgl") || source.closest(".film-camera-dock"));
      const unavailable = kind === "film" && art.closest(".collection")?.dataset.status === "fallback" || kind === "zine" && art.querySelector('.zine-preview-scene[data-status="unavailable"]');
      if (!liveCanvas && (source || !["film", "zine"].includes(kind) || unavailable)) capture();
      if (complete) return;
      if (start !== null) {
        progress = Math.min(1, Math.max(0, (now - start) / duration));
        const reveal = smooth((progress - .28) / .72);
        surface.style.opacity = String(smooth(progress / .22) * (1 - reveal));
        art.style.setProperty("--preview-content-opacity", String(reveal));
        if (progress === 1) { finish(); return; }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => { stopped = true; cancelAnimationFrame(frame); releaseSource(); art.style.removeProperty("--preview-content-opacity"); };
  }, [active, kind,dark]);
  return <canvas ref={canvas} className="recent-preview-dither" data-dither="ordered" aria-hidden="true" hidden />;
}
