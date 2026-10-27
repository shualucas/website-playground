// A low-resolution, depth-sorted grass simulation. No image or video assets.
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mix = (a, b, t) => a + (b - a) * t;
const palette = [
  [38, 74, 35],
  [45, 85, 37],
  [51, 95, 40],
  [62, 104, 43],
  [72, 115, 44],
  [81, 123, 47],
  [92, 135, 51],
  [104, 145, 57],
  [119, 155, 66],
  [134, 165, 75],
  [151, 177, 85],
  [172, 187, 105],
  [190, 198, 126],
  [208, 210, 148],
];
const breezes = { gentle: 0.5, steady: 1, gusty: 1.7 };
export function createMeadow(canvas, options) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const layer = document.createElement("canvas"),
    paint = layer.getContext("2d", { alpha: false });
  const sky = document.createElement("canvas"),
    background = sky.getContext("2d");
  let width = 1,
    height = 1,
    horizon = 1,
    blades = [],
    flowers = [],
    time = 0,
    frame,
    last = 0,
    lastPaint = 0,
    accumulator = 0,
    disposed = false,
    resizeObserver;
  let pointer = { x: -1000, y: -1000, vx: 0, vy: 0, inside: false, last: 0 },
    renderedFrames = 0;
  const state = {
    paused: options.paused,
    breeze: options.breeze || "steady",
    interactions: 0,
  };
  function terrain(x) {
    return (
      horizon +
      Math.sin((x / width) * 5.8 + 0.7) * height * 0.012 +
      Math.sin((x / width) * 12) * height * 0.003
    );
  }
  function makeBackground() {
    sky.width = width;
    sky.height = height;
    const skyColor = background.createLinearGradient(0, 0, 0, height * 0.46);
    skyColor.addColorStop(0, "#b6cbbf");
    skyColor.addColorStop(0.56, "#d2d9ba");
    skyColor.addColorStop(1, "#cad1a0");
    background.fillStyle = skyColor;
    background.fillRect(0, 0, width, height);
    const sunX = width * 0.77,
      sunY = height * 0.12;
    const sun = background.createRadialGradient(
      sunX,
      sunY,
      0,
      sunX,
      sunY,
      width * 0.55,
    );
    sun.addColorStop(0, "#fff5d399");
    sun.addColorStop(0.16, "#fff3cf45");
    sun.addColorStop(1, "#fff2cc00");
    background.fillStyle = sun;
    background.fillRect(0, 0, width, height * 0.55);
    // Soft, low clouds and distant foothills blend into the atmospheric horizon.
    background.fillStyle = "#e7e4c53b";
    for (let i = 0; i < 8; i++) {
      const x = (i * 0.17 - 0.1) * width,
        y = height * (0.055 + (i % 3) * 0.035);
      background.beginPath();
      background.ellipse(x, y, width * 0.17, height * 0.023, 0, 0, Math.PI * 2);
      background.fill();
    }
    for (let ridge = 0; ridge < 3; ridge++) {
      background.beginPath();
      background.moveTo(0, height * 0.45);
      for (let x = 0; x <= width; x += 2) {
        const y =
          horizon -
          height * (0.09 - ridge * 0.028) +
          Math.sin((x / width) * (4.2 + ridge * 2) + ridge * 2) *
            height *
            (0.023 + ridge * 0.006) +
          Math.sin((x / width) * 14 + ridge) * height * 0.009;
        background.lineTo(x, y);
      }
      background.lineTo(width, height * 0.5);
      background.lineTo(0, height * 0.5);
      background.closePath();
      background.fillStyle = ["#a2b9a0", "#9eaf88", "#98ab72"][ridge];
      background.fill();
    }
    // A faraway copse gives the field a sense of scale. It never competes with the grass.
    const random = seeded(845);
    for (let i = 0; i < 43; i++) {
      const x = width * (0.6 + random() * 0.3),
        y = terrain(x) - height * 0.006,
        depth = random(),
        h = height * (0.014 + depth * 0.025);
      background.fillStyle = depth > 0.5 ? "#728b66" : "#83996d";
      background.fillRect(x, y - h * 0.3, 1, h * 0.4);
      background.beginPath();
      background.ellipse(
        x,
        y - h * 0.7,
        h * 0.35,
        h * 0.55,
        random() * 0.6,
        0,
        Math.PI * 2,
      );
      background.fill();
    }
    // Rolling meadow floor; individual grasses will build its texture.
    background.beginPath();
    background.moveTo(0, terrain(0));
    for (let x = 0; x <= width; x += 2) background.lineTo(x, terrain(x));
    background.lineTo(width, height);
    background.lineTo(0, height);
    background.closePath();
    const field = background.createLinearGradient(0, horizon, 0, height);
    field.addColorStop(0, "#a9b87a");
    field.addColorStop(0.25, "#8da65a");
    field.addColorStop(0.6, "#66843e");
    field.addColorStop(1, "#405e31");
    background.fillStyle = field;
    background.fill();
    // Low-frequency illumination makes patches feel like land, not a flat green fill.
    const patches = seeded(5481);
    for (let i = 0; i < 32; i++) {
      const x = patches() * width,
        y = horizon + patches() * (height - horizon),
        r = width * (0.07 + patches() * 0.17);
      const shade = background.createRadialGradient(x, y, 0, x, y, r);
      shade.addColorStop(0, i % 2 ? "#d5cf6722" : "#264b2d18");
      shade.addColorStop(1, "#264b2d00");
      background.fillStyle = shade;
      background.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  function populate() {
    const random = seeded(48307);
    blades = [];
    flowers = [];
    const count = Math.round(width * height * 0.075);
    for (let i = 0; i < count; i++) {
      const x = random() * (width + 50) - 25,
        depth = Math.pow(random(), 0.66),
        y = terrain(x) + depth * (height - terrain(x) + 34);
      const length =
        (1.5 + Math.pow(depth, 1.58) * 28) * (0.6 + random() * 0.7);
      const patch =
        Math.sin(x * 0.021 + y * 0.035) * 0.5 +
        Math.sin(x * 0.007 - y * 0.015) * 0.5;
      const color = clamp(Math.floor(5.8 + patch * 2 + random() * 3.5), 1, 11);
      const fog = Math.pow(1 - depth, 3) * 0.74;
      const colors = Array.from({ length: 5 }, (_, k) => {
        const rgb = palette[clamp(color + k - 2, 0, palette.length - 1)];
        return `rgb(${Math.round(mix(rgb[0], 163, fog))},${Math.round(mix(rgb[1], 179, fog))},${Math.round(mix(rgb[2], 117, fog))})`;
      });
      blades.push({
        x,
        y,
        depth,
        length,
        width: 0.45 + depth * 1.3,
        phase: random() * 6.28,
        lean: (random() - 0.5) * 0.26,
        colors,
        bend: 0,
        velocity: 0,
        flatten: 0,
        flattenVelocity: 0,
        seed: random(),
      });
    }
    blades.sort((a, b) => a.y - b.y);
    // Sparse seed heads and tiny wildflowers, not a uniform pattern.
    for (let i = 0; i < 64; i++) {
      const x = random() * width,
        d = 0.12 + random() * 0.84,
        y = terrain(x) + d * (height - terrain(x));
      flowers.push({
        x,
        y,
        d,
        height: 3 + d * 15,
        phase: random() * 6.28,
        type: i % 9 === 0 ? "flower" : "seed",
      });
    }
    flowers.sort((a, b) => a.y - b.y);
    canvas.dataset.blades = String(blades.length);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.round(clamp(rect.width / 2.6, 260, 720));
    height = Math.round((width * rect.height) / rect.width);
    // Very tall screens retain a fine pixel grid without making the simulation unbounded.
    if (height > 860) {
      width = Math.round((width * 860) / height);
      height = 860;
    }
    layer.width = width;
    layer.height = height;
    canvas.width = width;
    canvas.height = height;
    horizon = height * (rect.width < 600 ? 0.3 : 0.33);
    makeBackground();
    populate();
    draw(0);
    canvas.dataset.ready = "true";
  }
  function windAt(x, y, t) {
    const wave =
      Math.sin(x * 0.02 + y * 0.027 - t * 1.5) * 0.48 +
      Math.sin(x * 0.009 - y * 0.018 - t * 0.83) * 0.34;
    const gust = Math.pow(
      (Math.sin(x * 0.007 + y * 0.019 - t * 0.64) + 1) * 0.5,
      3,
    );
    return (0.32 + wave + gust * 0.7) * breezes[state.breeze];
  }
  function draw(dt) {
    paint.drawImage(sky, 0, 0);
    const t = time;
    const radius = width * 0.065 + 12;
    const speed = clamp(Math.hypot(pointer.vx, pointer.vy) / 320, 0, 1.4);
    // A soft ground shadow appears only where the visitor parts the blades.
    if (pointer.inside && pointer.y > horizon - 15) {
      const r = radius * 0.7;
      const shadow = paint.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        r,
      );
      shadow.addColorStop(0, "#203d292e");
      shadow.addColorStop(1, "#203d2900");
      paint.fillStyle = shadow;
      paint.fillRect(pointer.x - r, pointer.y - r, r * 2, r * 2);
    }
    let flowerIndex = 0,
      deflection = 0;
    for (const blade of blades) {
      const { x, y, length, depth } = blade;
      while (flowerIndex < flowers.length && flowers[flowerIndex].y < y) {
        drawFlower(flowers[flowerIndex++], t);
      }
      const wind = windAt(x, y, t),
        sway =
          wind * length * 0.36 +
          Math.sin(t * 2.1 + blade.phase) * length * 0.045;
      let target = 0,
        flatten = 0;
      if (pointer.inside && pointer.y > horizon - 10) {
        // The center of a blade is used for collision so tall blades react on contact.
        const dx = x - pointer.x,
          dy = (y - length * 0.42 - pointer.y) * 1.5;
        const distance = Math.hypot(dx, dy),
          influence = clamp(
            1 - distance / (radius * (0.6 + depth * 0.65)),
            0,
            1,
          );
        if (influence > 0) {
          const force = influence * influence;
          target =
            (dx / (Math.abs(dx) + 8)) * length * force * 1.15 +
            clamp(pointer.vx / 400, -1, 1) * length * force * 0.65;
          flatten = force * length * (0.45 + speed * 0.12);
        }
      }
      if (dt > 0) {
        // Damped springs retain a wake, then let each blade recover naturally.
        blade.velocity += (target - blade.bend) * 48 * dt;
        blade.velocity *= Math.exp(-7.6 * dt);
        blade.bend += blade.velocity * dt;
        blade.flattenVelocity += (flatten - blade.flatten) * 58 * dt;
        blade.flattenVelocity *= Math.exp(-9 * dt);
        blade.flatten += blade.flattenVelocity * dt;
      }
      deflection += Math.abs(blade.bend) + Math.abs(blade.flatten);
      const bend = length * blade.lean + sway + blade.bend;
      const tipX = x + bend,
        tipY = y - length + Math.abs(bend) * 0.17 + blade.flatten;
      const light = clamp(
        Math.floor(2 + wind * 0.9 + Math.sin(x * 0.014 - y * 0.027) * 0.45),
        0,
        4,
      );
      paint.fillStyle = blade.colors[light];
      paint.beginPath();
      paint.moveTo(x - blade.width * 0.5, y);
      paint.quadraticCurveTo(
        x + bend * 0.2,
        y - length * 0.53 + blade.flatten * 0.4,
        tipX,
        tipY,
      );
      paint.quadraticCurveTo(
        x + bend * 0.53,
        y - length * 0.32 + blade.flatten * 0.6,
        x + blade.width * 0.5,
        y,
      );
      paint.fill();
      // Sunlit edges on a few near blades add dimension without outlining every blade.
      if (depth > 0.48 && blade.seed > 0.76) {
        paint.strokeStyle = blade.colors[Math.min(4, light + 1)];
        paint.lineWidth = 0.5;
        paint.beginPath();
        paint.moveTo(x, y - 1);
        paint.quadraticCurveTo(
          x + bend * 0.3,
          y - length * 0.55 + blade.flatten * 0.45,
          tipX,
          tipY,
        );
        paint.stroke();
      }
    }
    while (flowerIndex < flowers.length) drawFlower(flowers[flowerIndex++], t);
    // Pollen drifts with the same prevailing wind. Its scale stays deliberately small.
    for (let i = 0; i < 16; i++) {
      const x = ((i * 79.73 + t * (2.2 + (i % 3))) % (width + 20)) - 10,
        y =
          horizon +
          ((((i * 37.81 - t * (0.8 + (i % 2))) % (height - horizon)) +
            height -
            horizon) %
            (height - horizon));
      const opacity = 0.18 + (Math.sin(t + i) * 0.5 + 0.5) * 0.25;
      paint.fillStyle = `rgba(246,236,173,${opacity})`;
      paint.fillRect(
        Math.floor(x),
        Math.floor(y),
        i % 5 === 0 ? 1.2 : 0.7,
        0.7,
      );
    }
    // Light across the upper meadow and a shallow foreground vignette.
    const haze = paint.createLinearGradient(
      0,
      horizon - height * 0.02,
      0,
      horizon + height * 0.15,
    );
    haze.addColorStop(0, "#e4e0ad19");
    haze.addColorStop(1, "#e4e0ad00");
    paint.fillStyle = haze;
    paint.fillRect(0, horizon - height * 0.02, width, height * 0.18);
    const foreground = paint.createLinearGradient(0, height * 0.78, 0, height);
    foreground.addColorStop(0, "#12352000");
    foreground.addColorStop(1, "#12352020");
    paint.fillStyle = foreground;
    paint.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layer, 0, 0);
    canvas.dataset.deflection = deflection.toFixed(3);
    renderedFrames++;
    canvas.dataset.frames = String(renderedFrames);
    canvas.dataset.time = time.toFixed(3);
    if (pointer.inside && pointer.y > horizon)
      canvas.dataset.interacting = "true";
    else canvas.dataset.interacting = "false";
  }
  function drawFlower(f, t) {
    const sway = windAt(f.x, f.y, t) * f.height * 0.42,
      x = f.x + sway,
      y = f.y - f.height;
    paint.strokeStyle = "#819253";
    paint.lineWidth = 0.55;
    paint.beginPath();
    paint.moveTo(f.x, f.y);
    paint.quadraticCurveTo(f.x + sway * 0.2, f.y - f.height * 0.5, x, y);
    paint.stroke();
    if (f.type === "flower") {
      paint.fillStyle = "#e5dfa7";
      paint.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
      paint.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
      paint.fillStyle = "#bdac56";
      paint.fillRect(Math.round(x), Math.round(y), 1, 1);
    } else {
      paint.strokeStyle = "#bcbb77";
      paint.beginPath();
      paint.moveTo(x, y + 3);
      paint.lineTo(x + sway * 0.07, y - 2);
      paint.stroke();
    }
  }
  function tick(now) {
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!state.paused && !document.hidden) {
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
      y = ((event.clientY - rect.top) / rect.height) * height;
    const elapsed = Math.max((now - pointer.last) / 1000, 0.012);
    pointer.vx = pointer.inside
      ? clamp((x - pointer.x) / elapsed, -1500, 1500)
      : 0;
    pointer.vy = pointer.inside
      ? clamp((y - pointer.y) / elapsed, -1500, 1500)
      : 0;
    pointer.x = x;
    pointer.y = y;
    pointer.inside = true;
    pointer.last = now;
    state.interactions++;
    canvas.dataset.interactions = String(state.interactions);
    if (state.paused) draw(0.033);
    options.onInteract?.();
  }
  function leave() {
    pointer.inside = false;
    pointer.vx = 0;
    pointer.vy = 0;
    if (state.paused) draw(0.033);
  }
  const down = (e) => {
    move(e);
    canvas.setPointerCapture?.(e.pointerId);
  };
  const up = (e) => {
    if (e.pointerType !== "mouse") leave();
    if (canvas.hasPointerCapture?.(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", leave);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  frame = requestAnimationFrame(tick);
  return {
    setPaused(value) {
      state.paused = value;
      accumulator = 0;
      last = performance.now();
      canvas.dataset.paused = String(value);
    },
    setBreeze(value) {
      if (breezes[value]) state.breeze = value;
      canvas.dataset.breeze = state.breeze;
      if (state.paused) draw(0);
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", leave);
    },
  };
}
