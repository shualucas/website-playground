// Top-down grass physics, sampled into a screen-aligned ASCII color grid.
// All the visible marks are characters; there are no images, assets, or UI labels.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TAU = Math.PI * 2;
const characters = [
  ".",
  ",",
  ":",
  ";",
  "/",
  "\\",
  "|",
  "i",
  "v",
  "!",
  "*",
  "+",
  '"',
];
const characterIndex = Object.fromEntries(characters.map((c, i) => [c, i]));
const palette = [
  "#123620",
  "#194725",
  "#215b2a",
  "#296f2c",
  "#338331",
  "#409638",
  "#51aa3c",
  "#65bb44",
  "#7dcb4d",
  "#99d75d",
  "#b4df75",
  "#cbe795",
];
export function createMeadow(canvas, options = {}) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const field = document.createElement("canvas"),
    paint = field.getContext("2d", { alpha: false, willReadFrequently: true });
  const floor = document.createElement("canvas"),
    ground = floor.getContext("2d", { alpha: false });
  let cssWidth = 1,
    cssHeight = 1,
    width = 1,
    height = 1,
    cell = 9,
    cols = 1,
    rows = 1,
    blades = [],
    glyphs = [],
    time = 0,
    frame,
    last = 0,
    lastPaint = 0,
    accumulator = 0,
    disposed = false;
  const atlas = document.createElement("canvas"),
    tiles = atlas.getContext("2d");
  let atlasRatio = 1,
    output,
    outputPixels,
    cachedTiles = [];
  const paletteRGB = palette.map((hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  );
  const greenLookup = Array.from({ length: 256 }, (_, g) =>
    paletteRGB.reduce(
      (best, rgb, i) =>
        Math.abs(rgb[1] - g) < Math.abs(paletteRGB[best][1] - g) ? i : best,
      0,
    ),
  );
  function makeAtlas(ratio) {
    atlasRatio = ratio;
    atlas.width = characters.length * cell * ratio;
    atlas.height = palette.length * 3 * cell * ratio;
    tiles.setTransform(ratio, 0, 0, ratio, 0, 0);
    tiles.font = `${cell - 1}px "Courier New",monospace`;
    tiles.textAlign = "center";
    tiles.textBaseline = "middle";
    paletteRGB.forEach(([r, g, b], shade) => {
      for (let variant = 0; variant < 3; variant++)
        characters.forEach((character, index) => {
          const x = index * cell,
            y = (shade * 3 + variant) * cell;
          tiles.globalAlpha = 1;
          tiles.fillStyle = "#285e2d";
          tiles.fillRect(x, y, cell, cell);
          tiles.fillStyle = `rgb(${Math.round(r * 0.83)},${Math.round(g * 0.98)},${Math.round(b * 0.8)})`;
          tiles.fillRect(x, y, cell - 1, cell - 1);
          tiles.globalAlpha = 0.75 + variant * 0.125;
          tiles.fillStyle = `rgb(${clamp(Math.round(r * 1.15 + 8), 0, 230)},${clamp(Math.round(g * 1.18 + 16), 0, 246)},${clamp(Math.round(b * 0.95 + 7), 0, 181)})`;
          tiles.fillText(character, x + cell / 2, y + cell / 2 + 0.4);
        });
    });
    tiles.globalAlpha = 1;
    const image = tiles.getImageData(0, 0, atlas.width, atlas.height),
      packed = new Uint32Array(image.data.buffer);
    cachedTiles = [];
    for (let row = 0; row < palette.length * 3; row++)
      for (let col = 0; col < characters.length; col++) {
        const tile = new Uint32Array(cell * cell);
        for (let y = 0; y < cell; y++)
          for (let x = 0; x < cell; x++)
            tile[y * cell + x] =
              packed[(row * cell + y) * atlas.width + col * cell + x];
        cachedTiles[row * characters.length + col] = tile;
      }
  }
  let paused = Boolean(options.paused),
    frames = 0,
    interactions = 0;
  const pointer = { x: -1000, y: -1000, vx: 0, vy: 0, inside: false, last: 0 };
  function populate() {
    const random = seeded(48307);
    blades = [];
    glyphs = [];
    // Each tuft radiates around its root. There is no horizon or depth scaling.
    const spacing = 8.6;
    for (let y = -15; y < height + 15; y += spacing)
      for (let x = -15; x < width + 15; x += spacing) {
        const rootX = x + random() * spacing,
          rootY = y + random() * spacing;
        const density = 3 + Math.floor(random() * 3);
        for (let k = 0; k < density; k++) {
          const angle = (k / density) * TAU + random() * 0.8;
          blades.push({
            x: rootX + random() * 2 - 1,
            y: rootY + random() * 2 - 1,
            angle,
            length: 4 + random() * 8,
            width: 0.55 + random() * 0.85,
            phase: random() * TAU,
            color: 4 + Math.floor(random() * 6),
            restX: Math.cos(angle),
            restY: Math.sin(angle),
            bendX: 0,
            bendY: 0,
            velocityX: 0,
            velocityY: 0,
          });
        }
      }
    blades.sort((a, b) => a.y - b.y);
    for (let i = 0; i < cols * rows; i++) glyphs.push(random());
    canvas.dataset.blades = String(blades.length);
    canvas.dataset.view = "top-down";
    canvas.dataset.rendering = "ascii";
  }
  function makeGround() {
    floor.width = width;
    floor.height = height;
    ground.fillStyle = "#2d7935";
    ground.fillRect(0, 0, width, height);
    const random = seeded(1972);
    for (let i = 0; i < 38; i++) {
      const x = random() * width,
        y = random() * height,
        r = 35 + random() * width * 0.16;
      const patch = ground.createRadialGradient(x, y, 0, x, y, r);
      patch.addColorStop(0, i % 3 ? "#73c43d55" : "#102f2438");
      patch.addColorStop(1, "#183e2200");
      ground.fillStyle = patch;
      ground.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = rect.width;
    cssHeight = rect.height;
    // The physical grass buffer is independent of the final character grid.
    const scale = Math.max(3.4, cssWidth / 540, cssHeight / 540);
    width = Math.ceil(cssWidth / scale);
    height = Math.ceil(cssHeight / scale);
    cell = cssWidth < 600 ? 7 : 10;
    cols = Math.ceil(cssWidth / cell);
    rows = Math.ceil(cssHeight / cell);
    field.width = width;
    field.height = height;
    canvas.width = Math.ceil(cssWidth);
    canvas.height = Math.ceil(cssHeight);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    output = ctx.createImageData(canvas.width, canvas.height);
    outputPixels = new Uint32Array(output.data.buffer);
    makeAtlas(1);
    makeGround();
    populate();
    draw(0);
    canvas.dataset.ready = "true";
    canvas.dataset.paused = String(paused);
  }
  function breeze(x, y) {
    const wave =
      Math.sin(x * 0.026 + y * 0.019 - time * 1.65) * 0.52 +
      Math.sin(x * 0.011 - y * 0.024 - time * 0.76) * 0.32;
    const gust = Math.pow(
      (Math.sin(x * 0.009 + y * 0.012 - time * 0.64) + 1) * 0.5,
      3,
    );
    return 0.3 + wave + gust * 0.67;
  }
  function draw(dt) {
    paint.drawImage(floor, 0, 0);
    const radius = clamp(width * 0.09, 26, 48);
    const speed = clamp(Math.hypot(pointer.vx, pointer.vy) / 300, 0, 1.5);
    if (pointer.inside) {
      const shadow = paint.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        radius * 0.8,
      );
      shadow.addColorStop(0, "#0c30264a");
      shadow.addColorStop(1, "#0c302600");
      paint.fillStyle = shadow;
      paint.fillRect(
        pointer.x - radius,
        pointer.y - radius,
        radius * 2,
        radius * 2,
      );
    }
    let deflection = 0;
    const damping = Math.exp(-7.5 * dt);
    for (const blade of blades) {
      const wind = breeze(blade.x, blade.y),
        flutter = Math.sin(time * 2.2 + blade.phase) * 0.12;
      let forceX = 0,
        forceY = 0;
      if (pointer.inside) {
        const dx = blade.x - pointer.x,
          dy = blade.y - pointer.y,
          distance = Math.hypot(dx, dy);
        const influence = clamp(1 - distance / radius, 0, 1);
        if (influence > 0) {
          const pressure = influence * influence;
          forceX =
            ((dx / (distance + 3)) * 1.25 +
              clamp(pointer.vx / 500, -1, 1) * 0.55) *
            blade.length *
            pressure *
            (1 + speed * 0.2);
          forceY =
            ((dy / (distance + 3)) * 1.25 +
              clamp(pointer.vy / 500, -1, 1) * 0.55) *
            blade.length *
            pressure *
            (1 + speed * 0.2);
        }
      }
      if (dt) {
        blade.velocityX += (forceX - blade.bendX) * 50 * dt;
        blade.velocityY += (forceY - blade.bendY) * 50 * dt;
        blade.velocityX *= damping;
        blade.velocityY *= damping;
        blade.bendX += blade.velocityX * dt;
        blade.bendY += blade.velocityY * dt;
      }
      deflection += Math.abs(blade.bendX) + Math.abs(blade.bendY);
      const x = blade.x,
        y = blade.y,
        L = blade.length;
      // Project the blade from directly overhead: both X and Y respond to wind.
      const tx =
        x + blade.restX * L * 0.48 + (wind * 0.48 + flutter) * L + blade.bendX;
      const ty =
        y +
        blade.restY * L * 0.48 +
        (wind * 0.24 + flutter * 0.3) * L +
        blade.bendY;
      const brightness = clamp(
        Math.floor(
          blade.color + wind * 0.85 + Math.sin(x * 0.015 - y * 0.021) * 1.15,
        ),
        1,
        11,
      );
      paint.fillStyle = palette[Math.max(0, brightness - 2)];
      paint.beginPath();
      paint.moveTo(x - blade.width * 0.6, y);
      paint.quadraticCurveTo(x + (tx - x) * 0.38, y + (ty - y) * 0.22, tx, ty);
      paint.quadraticCurveTo(
        x + (tx - x) * 0.68,
        y + (ty - y) * 0.53,
        x + blade.width * 0.6,
        y,
      );
      paint.fill();
      paint.strokeStyle = palette[brightness];
      paint.lineWidth = blade.width * 0.62;
      paint.beginPath();
      paint.moveTo(x + (tx - x) * 0.32, y + (ty - y) * 0.32);
      paint.quadraticCurveTo(x + (tx - x) * 0.6, y + (ty - y) * 0.48, tx, ty);
      paint.stroke();
    }
    const data = paint.getImageData(0, 0, width, height).data;
    ctx.fillStyle = "#285e2d";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.font = `${cell - 1}px "Courier New",monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < cols; gx++) {
        const px = (gx + 0.5) * cell,
          py = (gy + 0.5) * cell;
        const sx = clamp(Math.floor((px / cssWidth) * width), 0, width - 1),
          sy = clamp(Math.floor((py / cssHeight) * height), 0, height - 1),
          index = (sy * width + sx) * 4;
        const r = data[index],
          g = data[index + 1],
          b = data[index + 2],
          luma = (r * 0.24 + g * 0.65 + b * 0.11) / 255;
        const seed = glyphs[gy * cols + gx],
          wind = breeze(sx, sy);
        let character;
        if (luma < 0.24) character = seed > 0.55 ? "." : ",";
        else if (luma < 0.33) character = seed > 0.5 ? ":" : ";";
        else if (luma < 0.46)
          character =
            wind > 0.55 ? "/" : wind < -0.15 ? "\\" : seed > 0.5 ? "|" : "i";
        else if (luma < 0.6)
          character = seed > 0.7 ? "v" : wind > 0.2 ? "/" : "!";
        else character = seed > 0.75 ? "*" : seed > 0.45 ? "+" : '"';
        // Blit a cached glyph tile; no per-frame font rasterization or CSS color parsing.
        const shade = greenLookup[g],
          variant = Math.min(2, Math.floor(seed * 3));
        const tile =
            cachedTiles[
              (shade * 3 + variant) * characters.length +
                characterIndex[character]
            ],
          startX = gx * cell,
          startY = gy * cell;
        const drawWidth = Math.min(cell, canvas.width - startX),
          drawHeight = Math.min(cell, canvas.height - startY);
        for (let y = 0; y < drawHeight; y++) {
          const dest = (startY + y) * canvas.width + startX,
            source = y * cell;
          for (let x = 0; x < drawWidth; x++)
            outputPixels[dest + x] = tile[source + x];
        }
      }
    ctx.putImageData(output, 0, 0);
    ctx.globalAlpha = 1;
    frames++;
    canvas.dataset.frames = String(frames);
    canvas.dataset.time = time.toFixed(3);
    canvas.dataset.deflection = deflection.toFixed(3);
    canvas.dataset.interacting = String(pointer.inside);
  }
  function tick(now) {
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!paused && !document.hidden) {
      accumulator += dt;
      if (now - lastPaint >= 1000 / 30) {
        const step = Math.min(accumulator, 0.06);
        time += step;
        draw(step);
        lastPaint = now;
        accumulator = 0;
        pointer.vx *= 0.86;
        pointer.vy *= 0.86;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function move(event) {
    const rect = canvas.getBoundingClientRect(),
      now = performance.now(),
      x = ((event.clientX - rect.left) / rect.width) * width,
      y = ((event.clientY - rect.top) / rect.height) * height,
      dt = Math.max((now - pointer.last) / 1000, 0.012);
    pointer.vx = pointer.inside ? clamp((x - pointer.x) / dt, -1500, 1500) : 0;
    pointer.vy = pointer.inside ? clamp((y - pointer.y) / dt, -1500, 1500) : 0;
    pointer.x = x;
    pointer.y = y;
    pointer.last = now;
    pointer.inside = true;
    interactions++;
    canvas.dataset.interactions = String(interactions);
    if (paused) draw(0.033);
  }
  function leave() {
    pointer.inside = false;
    pointer.vx = 0;
    pointer.vy = 0;
    if (paused) draw(0.033);
  }
  const down = (event) => {
    move(event);
    canvas.setPointerCapture?.(event.pointerId);
    if (!paused) draw(0.025);
  };
  const up = (event) => {
    if (event.pointerType !== "mouse") leave();
    if (canvas.hasPointerCapture?.(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", leave);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(tick);
  return {
    togglePaused() {
      paused = !paused;
      accumulator = 0;
      last = performance.now();
      canvas.dataset.paused = String(paused);
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", leave);
    },
  };
}
