import React, { useEffect, useRef } from "react";

// A small vector model is rasterized into a low-resolution color field. Each
// sample becomes a screen-aligned character tile, rather than a rotated image.
function drawDragon(ctx, time, copper) {
  const opacity = ctx.globalAlpha;
  const flap = 0.78 + Math.sin(time * 1.7) * 0.2;
  const bend = Math.sin(time * 0.9) * 0.07;
  // Wing membranes: scalloped trailing edges and long, articulated fingers.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(1, side * flap);
    const membrane = ctx.createLinearGradient(0.25, 0, -0.45, -1.12);
    membrane.addColorStop(0, copper ? "#bd8b58" : "#a4b29e");
    membrane.addColorStop(0.42, copper ? "#866145" : "#6c7a6e");
    membrane.addColorStop(1, "#333c33");
    ctx.fillStyle = membrane;
    ctx.beginPath();
    ctx.moveTo(0.28, -0.09);
    ctx.quadraticCurveTo(0.47, -0.47, 0.27, -0.77);
    ctx.lineTo(-0.84, -1.3);
    ctx.quadraticCurveTo(-0.64, -0.95, -0.92, -0.65);
    ctx.quadraticCurveTo(-0.5, -0.83, -0.55, -0.37);
    ctx.quadraticCurveTo(-0.22, -0.57, -0.26, -0.13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = copper ? "#b59264" : "#9dada0";
    ctx.lineWidth = 0.022;
    ctx.globalAlpha = opacity * 0.65;
    ctx.beginPath();
    ctx.moveTo(0.22, -0.08);
    ctx.lineTo(0.27, -0.77);
    ctx.lineTo(-0.84, -1.3);
    ctx.moveTo(0.27, -0.77);
    ctx.lineTo(-0.92, -0.65);
    ctx.moveTo(0.27, -0.77);
    ctx.lineTo(-0.55, -0.37);
    ctx.moveTo(0.27, -0.77);
    ctx.lineTo(-0.26, -0.13);
    ctx.stroke();
    ctx.restore();
  }
  // Long serpentine tail, softly bending independently of the wings.
  ctx.strokeStyle = "#969786";
  ctx.lineWidth = 0.09;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-0.48, 0);
  ctx.bezierCurveTo(-0.91, 0.03, -1.05, -0.18 + bend, -1.44, -0.08 + bend);
  ctx.stroke();
  ctx.strokeStyle = copper ? "#b27a44" : "#6f826e";
  ctx.lineWidth = 0.045;
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.strokeStyle = "#a09e87";
    ctx.lineWidth = 0.065;
    ctx.beginPath();
    ctx.moveTo(-0.22, side * 0.1);
    ctx.lineTo(-0.36, side * 0.26);
    ctx.lineTo(-0.18, side * 0.4);
    ctx.stroke();
    ctx.lineWidth = 0.017;
    ctx.strokeStyle = "#d2c9aa";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-0.18, side * 0.4);
      ctx.lineTo(-0.08 + i * 0.045, side * (0.43 - i * 0.035));
      ctx.stroke();
    }
  }
  // Torso and raised neck.
  const skin = ctx.createLinearGradient(0, -0.2, 0, 0.2);
  skin.addColorStop(0, "#b0b39d");
  skin.addColorStop(0.35, "#ebe5ce");
  skin.addColorStop(0.65, copper ? "#d79b55" : "#b7c1a0");
  skin.addColorStop(1, "#66705d");
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-0.67, 0);
  ctx.bezierCurveTo(-0.42, -0.23, 0.03, -0.22, 0.35, -0.12);
  ctx.quadraticCurveTo(0.56, -0.24, 0.7, -0.14);
  ctx.lineTo(0.97, -0.1);
  ctx.lineTo(1.06, -0.015);
  ctx.lineTo(0.99, 0.095);
  ctx.lineTo(0.69, 0.13);
  ctx.quadraticCurveTo(0.48, 0.24, 0.36, 0.12);
  ctx.bezierCurveTo(0.04, 0.25, -0.39, 0.23, -0.67, 0);
  ctx.fill();
  // Angular crown and two swept horns make the silhouette distinctly draconic.
  ctx.fillStyle = "#c9cab3";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0.61, side * 0.09);
    ctx.lineTo(0.39, side * 0.36);
    ctx.lineTo(0.72, side * 0.16);
    ctx.closePath();
    ctx.fill();
  }
  // Overlapping copper armor plates down the spine.
  for (let i = 0; i < 8; i++) {
    const x = -0.48 + i * 0.12;
    ctx.fillStyle = i % 3 === 0 ? "#e4c58b" : copper ? "#b96f32" : "#758b65";
    ctx.beginPath();
    ctx.ellipse(
      x,
      Math.sin(i * 2.4) * 0.022,
      0.068,
      0.07 - i * 0.003,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = "#f0ddac";
  ctx.globalAlpha = opacity * 0.7;
  ctx.lineWidth = 0.015;
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.06);
  ctx.quadraticCurveTo(-0.1, -0.18, 0.34, -0.07);
  ctx.stroke();
  ctx.globalAlpha = opacity;
  // Eyes, nostrils, and an open mouth.
  ctx.fillStyle = "#faf1c8";
  ctx.fillRect(0.79, -0.135, 0.055, 0.045);
  ctx.fillRect(0.79, 0.08, 0.055, 0.045);
  ctx.fillStyle = "#252b22";
  ctx.fillRect(0.81, -0.13, 0.02, 0.035);
  ctx.fillRect(0.81, 0.085, 0.02, 0.035);
  ctx.strokeStyle = "#4b4433";
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(1.03, 0.02);
  ctx.lineTo(0.9, 0.025);
  ctx.stroke();
}

export default function Realm({ paused, light = false, onRipple }) {
  const ref = useRef(null),
    controls = useRef({ paused, light });
  controls.current = { paused, light };
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas.getContext("2d", { alpha: false });
    const model = document.createElement("canvas"),
      field = model.getContext("2d", { willReadFrequently: true });
    let width = 1,
      height = 1,
      cols = 1,
      rows = 1,
      cell = 8,
      time = 0,
      last = 0,
      previousPaint = 0,
      frame,
      pointer = null,
      bursts = [];
    const dragons = [
      {
        x: 0.16,
        y: 0.2,
        size: 132,
        angle: 0.7,
        speed: 0.008,
        phase: 0.2,
        depth: 0.78,
        copper: true,
      },
      {
        x: 0.52,
        y: 0.29,
        size: 160,
        angle: -0.61,
        speed: 0.005,
        phase: 2.7,
        depth: 1,
        copper: true,
      },
      {
        x: 0.85,
        y: 0.27,
        size: 124,
        angle: 2.17,
        speed: 0.007,
        phase: 4.2,
        depth: 0.72,
        copper: false,
      },
      {
        x: 0.73,
        y: 0.78,
        size: 140,
        angle: -0.47,
        speed: 0.006,
        phase: 6.1,
        depth: 0.37,
        copper: true,
      },
      {
        x: 0.11,
        y: 0.85,
        size: 98,
        angle: 2.5,
        speed: 0.006,
        phase: 8.3,
        depth: 0.29,
        copper: false,
      },
      {
        x: 1.02,
        y: 0.72,
        size: 130,
        angle: -1.7,
        speed: 0.008,
        phase: 10.2,
        depth: 0.83,
        copper: true,
      },
    ];
    function resize() {
      const r = canvas.getBoundingClientRect();
      width = r.width;
      height = r.height;
      cell = width < 600 ? 6 : 8;
      cols = Math.ceil(width / cell);
      rows = Math.ceil(height / cell);
      model.width = cols;
      model.height = rows;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function draw() {
      const light = controls.current.light;
      ctx.fillStyle = light ? "#eeeee5" : "#151814";
      ctx.fillRect(0, 0, width, height);
      field.clearRect(0, 0, cols, rows);
      field.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0);
      const mobile = width < 600;
      dragons.forEach((d, i) => {
        // Slow orbits keep the flight contained and continuous at all sizes.
        let x = (d.x + Math.sin(time * d.speed * 3 + d.phase) * 0.1) * width;
        let y = (d.y + Math.sin(time * d.speed * 5 + d.phase) * 0.075) * height;
        if (mobile) {
          x =
            (i % 2 === 0 ? 0.18 : 0.79) * width +
            Math.sin(time * 0.04 + d.phase) * 25;
          y =
            [0.2, 0.39, 0.13, 0.85, 0.7, 0.57][i] * height +
            Math.sin(time * 0.06 + d.phase) * 16;
        }
        const size = d.size * (mobile ? 0.56 : Math.min(width / 1400, 1.22));
        field.save();
        field.translate(x, y);
        field.rotate(d.angle + Math.sin(time * 0.08 + d.phase) * 0.22);
        field.scale(size, size);
        field.globalAlpha = d.depth;
        drawDragon(field, time + d.phase, d.copper);
        field.restore();
      });
      field.setTransform(1, 0, 0, 1, 0, 0);
      const pixels = field.getImageData(0, 0, cols, rows).data;
      const glyphs = ".,:;+*ox%#@";
      ctx.font = `${cell - 1}px "Courier New",monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const index = (y * cols + x) * 4,
            a = pixels[index + 3] / 255;
          if (a < 0.025) continue;
          const r = pixels[index],
            g = pixels[index + 1],
            b = pixels[index + 2];
          const brightness = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
          const grain = ((x * 73 + y * 37) % 17) / 17;
          const ink = light
            ? Math.max(0.18, brightness * 0.8)
            : Math.min(1, brightness * 1.1);
          const char =
            glyphs[
              Math.min(
                glyphs.length - 1,
                Math.floor(
                  (brightness * 0.76 + grain * 0.24) * (glyphs.length - 1),
                ),
              )
            ];
          // The biography sits in a quiet pocket of the scene.
          const nx = x / cols,
            ny = y / rows;
          const behindText = mobile
            ? ny > 0.59 && ny < 0.87
            : nx > 0.14 && nx < 0.62 && ny > 0.59 && ny < 0.87;
          const fade = behindText ? 0.18 : 1;
          ctx.globalAlpha = a * fade * (light ? 0.2 : 0.64);
          ctx.fillStyle = light
            ? `rgb(${Math.floor(r * 0.65)},${Math.floor(g * 0.65)},${Math.floor(b * 0.65)})`
            : `rgb(${r},${g},${b})`;
          ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
          ctx.globalAlpha = a * fade * (light ? 0.83 : Math.max(0.22, ink));
          ctx.fillText(char, x * cell + cell / 2, y * cell + cell / 2 + 0.5);
        }
      ctx.globalAlpha = 1;
      // Sparse stars and quiet constellations give depth without a background image.
      ctx.font = '9px "Courier New",monospace';
      for (let i = 0; i < 72; i++) {
        const x = ((((Math.sin(i * 127.1) * 43758.5) % 1) + 1) % 1) * width,
          y = ((((Math.sin(i * 311.7) * 31317.2) % 1) + 1) % 1) * height;
        const alpha = 0.045 + (Math.sin(time * 0.6 + i) + 1) * 0.025;
        ctx.fillStyle = light
          ? `rgba(60,72,46,${alpha * 2})`
          : `rgba(183,191,152,${alpha})`;
        ctx.fillText(i % 11 === 0 ? "+" : ".", x, y);
      }
      ctx.strokeStyle = light ? "#68745f" : "#879478";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const x = (0.18 + i * 0.19 + Math.sin(i * 2) * 0.1) * width,
          y = (0.16 + (i % 3) * 0.3) * height;
        ctx.globalAlpha = 0.09;
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          19 + Math.sin(time * 0.5 + i) * 3,
          28,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }
      bursts = bursts.filter((b) => time - b.time < 2.8);
      for (const b of bursts) {
        const age = time - b.time;
        ctx.globalAlpha = (1 - age / 2.8) * 0.35;
        ctx.fillStyle = light ? "#7d5131" : "#c29a61";
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          ctx.fillText(
            i % 3 ? "." : "+",
            b.x + Math.cos(angle) * age * 38,
            b.y + Math.sin(angle) * age * 38,
          );
        }
      }
      if (pointer) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = light ? "#655e47" : "#b4b99c";
        ctx.fillText("+", pointer.x, pointer.y);
      }
      ctx.globalAlpha = 1;
    }
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      if (!controls.current.paused) {
        time += dt;
        if (now - previousPaint >= 32) {
          draw();
          previousPaint = now;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frame = requestAnimationFrame(tick);
    const point = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const move = (e) => {
      pointer = point(e);
      if (controls.current.paused) draw();
    };
    const leave = () => {
      pointer = null;
      draw();
    };
    const tap = (e) => {
      const p = point(e);
      bursts.push({ ...p, time });
      onRipple?.();
      draw();
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerdown", tap);
    // Theme changes must render even while paused.
    const themeObserver = new MutationObserver(draw);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", tap);
    };
  }, [onRipple]);
  return (
    <canvas
      ref={ref}
      className="realm-canvas"
      role="img"
      aria-label="A full-screen fantasy sky with six flying dragons rendered in shaded ASCII character tiles"
    />
  );
}
