import { clamp, hash3 } from "./math";
export interface Balloon {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  palette: number;
  liftVelocity: number;
  flame: number;
  lifts: number;
}
export interface Puff {
  x: number;
  y: number;
  rx: number;
  ry: number;
  vx: number;
  vy: number;
}
export interface Cloud {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  puffs: Puff[];
  dispersing: boolean;
  age: number;
  opacity: number;
  splits: number;
}
export type Target = {
  type: "balloon" | "cloud";
  id: number;
  x: number;
  y: number;
};
export function balloonWidth(v: number) {
  return Math.max(
    v > 0.88 ? 0.13 : 0,
    Math.pow(Math.max(0, Math.sin(Math.PI * v)), 0.63) * (1.25 - 0.55 * v),
  );
}
export function balloonPose(b: Balloon, time: number) {
  return {
    x: b.x + Math.sin(time * 0.18 + b.phase) * 1.8,
    y: b.y + Math.sin(time * 0.37 + b.phase) * 2.8,
  };
}
export function cloudPose(c: Cloud, time: number) {
  return { x: c.x, y: c.y + Math.sin(time * 0.17 + c.phase) * 1.6 };
}
export function cloudContains(c: Cloud, x: number, y: number, time: number) {
  if (c.opacity < 0.08) return false;
  const p = cloudPose(c, time);
  return c.puffs.some(
    (puff) =>
      ((x - p.x - puff.x) / puff.rx) ** 2 +
        ((y - p.y - puff.y) / puff.ry) ** 2 <=
      1,
  );
}
export function balloonContains(
  b: Balloon,
  x: number,
  y: number,
  time: number,
) {
  const p = balloonPose(b, time),
    v = (y - p.y + b.radius * 1.08) / (b.radius * 2.08);
  if (v >= 0 && v <= 1 && Math.abs(x - p.x) <= balloonWidth(v) * b.radius)
    return true;
  // Include the basket and rigging as parts of the balloon's clickable silhouette.
  return (
    y >= p.y + b.radius &&
    y <= p.y + b.radius * 1.72 &&
    Math.abs(x - p.x) <= b.radius * 0.27
  );
}
const balloonLayout = [
  [0.22, 0.29, 1, 0],
  [0.69, 0.2, 0.76, 1],
  [0.49, 0.67, 0.88, 2],
  [0.85, 0.7, 0.64, 3],
];
const cloudLayout = [
  [0.13, 0.14, 1.12],
  [0.52, 0.11, 1.03],
  [0.39, 0.43, 1.2],
  [0.84, 0.43, 0.93],
  [0.14, 0.77, 1.05],
  [0.65, 0.86, 0.94],
];
export class World {
  width = 0;
  height = 0;
  time = 0;
  balloons: Balloon[] = [];
  clouds: Cloud[] = [];
  selected: Target | null = null;
  pointer = { x: 0, y: 0, active: false };
  private base = 1;
  resize(width: number, height: number) {
    const oldW = this.width,
      oldH = this.height,
      first = oldW === 0,
      oldBase = this.base;
    this.width = width;
    this.height = height;
    this.base = clamp(Math.min(width, height) * 0.095, 37, 88);
    if (first) {
      this.balloons = balloonLayout.map(([x, y, size, palette], i) => ({
        id: i + 1,
        x: x * width,
        y: y * height,
        radius: this.base * size,
        speed: 6.8 + i * 0.9,
        phase: i * 1.9,
        palette,
        liftVelocity: 0,
        flame: 0,
        lifts: 0,
      }));
      this.clouds = cloudLayout.map(([x, y, size], i) => {
        const c: Cloud = {
          id: i + 1,
          x: x * width,
          y: y * height,
          radius: this.base * size,
          speed: 1.1 + i * 0.19,
          phase: i * 2.3,
          puffs: [],
          dispersing: false,
          age: 0,
          opacity: 0.62 + ((i + 1) % 3) * 0.1,
          splits: 0,
        };
        this.populateCloud(c);
        return c;
      });
      return;
    }
    const sx = width / oldW,
      sy = height / oldH,
      scale = this.base / oldBase;
    for (const b of this.balloons) {
      b.x *= sx;
      b.y *= sy;
      b.radius *= scale;
      b.liftVelocity *= scale;
    }
    for (const c of this.clouds) {
      c.x *= sx;
      c.y *= sy;
      c.radius *= scale;
      for (const p of c.puffs) {
        p.x *= scale;
        p.y *= scale;
        p.rx *= scale;
        p.ry *= scale;
        p.vx *= scale;
        p.vy *= scale;
      }
    }
  }
  private populateCloud(c: Cloud) {
    const r = c.radius;
    c.puffs = [
      [-0.94, 0.12, 0.66, 0.38],
      [-0.45, -0.2, 0.7, 0.54],
      [0.15, -0.3, 0.77, 0.62],
      [0.8, -0.03, 0.7, 0.44],
      [1.22, 0.19, 0.47, 0.29],
      [0.13, 0.27, 1.17, 0.3],
    ].map(([x, y, rx, ry]) => ({
      x: x * r,
      y: y * r,
      rx: rx * r,
      ry: ry * r,
      vx: 0,
      vy: 0,
    }));
  }
  hit(x: number, y: number): Target | null {
    // Balloons draw in front of the clouds and receive clicks first.
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      if (balloonContains(b, x, y, this.time))
        return { type: "balloon", id: b.id, x, y };
    }
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      if (cloudContains(c, x, y, this.time))
        return { type: "cloud", id: c.id, x, y };
    }
    return null;
  }
  activate(x: number, y: number): Target | null {
    const target = this.hit(x, y);
    if (!target) return null;
    if (target.type === "balloon") {
      const b = this.balloons.find((b) => b.id === target.id)!;
      b.liftVelocity = Math.max(-100, b.liftVelocity - 43);
      b.flame = 1;
      b.lifts++;
    } else {
      const c = this.clouds.find((c) => c.id === target.id)!;
      c.dispersing = true;
      c.age = 0;
      c.splits++;
      const center = cloudPose(c, this.time);
      c.puffs.forEach((p, i) => {
        const dx = center.x + p.x - x,
          dy = center.y + p.y - y,
          d = Math.hypot(dx, dy) || 1,
          force = 12 + hash3(i, c.id, c.splits) * 14;
        p.vx += (dx / d) * force + (i % 2 ? 3 : -3);
        p.vy += (dy / d) * force * 0.65 - 2;
      });
    }
    return target;
  }
  step(dt: number) {
    this.time += dt;
    for (const b of this.balloons) {
      b.x += b.speed * dt;
      b.y += (b.liftVelocity - 0.12) * dt;
      b.liftVelocity *= Math.exp(-dt * 0.72);
      b.flame *= Math.exp(-dt * 1.6);
      if (b.x - b.radius > this.width) {
        b.x = -b.radius * 1.2;
      }
      if (b.y + b.radius * 1.8 < 0) {
        b.y = this.height + b.radius * 1.2;
        b.liftVelocity = 0;
      }
    }
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.dispersing) {
        c.age += dt;
        for (const p of c.puffs) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= Math.exp(-dt * 0.16);
          p.vy *= Math.exp(-dt * 0.16);
          p.rx += dt * 1.1;
          p.ry += dt * 0.55;
        }
        c.opacity =
          clamp(1 - (c.age - 0.35) / 4.6, 0, 1) * (0.62 + (c.id % 3) * 0.1);
        if (c.age > 6.5) {
          c.dispersing = false;
          c.age = 0;
          c.x = -c.radius * 2.1;
          c.opacity = 0.62 + (c.id % 3) * 0.1;
          this.populateCloud(c);
        }
      }
      if (c.x - c.radius * 2 > this.width) c.x = -c.radius * 2.1;
    }
  }
  targets(): Target[] {
    const result: Target[] = [];
    for (const b of this.balloons) {
      const p = balloonPose(b, this.time);
      if (p.x > 0 && p.x < this.width && p.y > 0 && p.y < this.height)
        result.push({ type: "balloon", id: b.id, x: p.x, y: p.y });
    }
    for (const c of this.clouds) {
      if (c.dispersing || c.opacity < 0.1) continue;
      const p = cloudPose(c, this.time);
      // Expose a genuinely clickable visible point, not a center hidden behind a balloon.
      for (const puff of c.puffs) {
        const x = p.x + puff.x,
          y = p.y + puff.y;
        if (x < 2 || x > this.width - 2 || y < 2 || y > this.height - 2)
          continue;
        const hit = this.hit(x, y);
        if (hit?.type === "cloud" && hit.id === c.id) {
          result.push({ type: "cloud", id: c.id, x, y });
          break;
        }
      }
    }
    return result;
  }
  select(direction: number) {
    const targets = this.targets();
    if (!targets.length) {
      this.selected = null;
      return;
    }
    const old = this.selected,
      index = old
        ? targets.findIndex((t) => t.id === old.id && t.type === old.type)
        : -1;
    this.selected =
      targets[(index + direction + targets.length) % targets.length];
  }
  activateSelected() {
    if (!this.selected) this.select(1);
    const selected = this.selected;
    if (!selected) return null;
    const current = this.targets().find(
      (t) => t.type === selected.type && t.id === selected.id,
    );
    if (!current) return null;
    const action = this.activate(current.x, current.y);
    if (action?.type === "cloud") this.selected = null;
    return action;
  }
}
