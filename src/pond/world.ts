/** Pond steering and follow-the-leader tails, adapted from ascii-sharks (MIT). */
import { angleDiff, clamp, current, rand, TAU } from "./math";
export const TADPOLE_NODES = 20;
export type TadpoleKind = "tadpole";
export interface Tadpole {
  id: number;
  kind: TadpoleKind;
  length: number;
  nodes: Float32Array;
  heading: number;
  speed: number;
  phase: number;
  turn: number;
  wander: number;
  depth: number;
}
export interface LilyPad {
  id: number;
  x: number;
  y: number;
  radius: number;
  angle: number;
  phase: number;
}
export interface WorldEvent {
  kind: "splash";
  x: number;
  y: number;
}
const pads = [
  [0.17, 0.22, 0.95, -0.6],
  [0.75, 0.19, 1.08, 1.9],
  [0.52, 0.51, 1.15, -1.1],
  [0.18, 0.77, 1.05, 0.7],
  [0.82, 0.75, 1.16, 2.8],
  [0.43, 0.12, 0.66, 0.5],
];
export class World {
  width = 0;
  height = 0;
  time = 0;
  tadpoles: Tadpole[] = [];
  pads: LilyPad[] = [];
  events: WorldEvent[] = [];
  pointer = { x: 0, y: 0, active: false };
  private impulse = { x: 0, y: 0, life: 0 };
  resize(width: number, height: number, _cellW: number, _cellH: number) {
    const previousWidth = this.width,
      previousHeight = this.height,
      first = previousWidth === 0;
    this.width = width;
    this.height = height;
    const side = Math.min(width, height),
      scale = clamp(side * 0.073, 32, 73);
    this.pads = pads.map(([x, y, radius, angle], i) => ({
      id: i + 1,
      x: x * width,
      y: y * height,
      radius: radius * scale,
      angle,
      phase: i * 1.9,
    }));
    if (first) {
      this.seed();
      return;
    }
    const sx = width / previousWidth,
      sy = height / previousHeight;
    const lengthScale =
      clamp(side * 0.22, 92, 195) /
      clamp(Math.min(previousWidth, previousHeight) * 0.22, 92, 195);
    for (const tadpole of this.tadpoles) {
      tadpole.length *= lengthScale;
      tadpole.heading = Math.atan2(
        Math.sin(tadpole.heading) * sy,
        Math.cos(tadpole.heading) * sx,
      );
      for (let n = 0; n < tadpole.nodes.length; n += 2) {
        tadpole.nodes[n] *= sx;
        tadpole.nodes[n + 1] *= sy;
      }
    }
  }
  private seed() {
    const side = Math.min(this.width, this.height),
      count = this.width < 600 ? 7 : 10,
      base = clamp(side * 0.22, 92, 195);
    this.tadpoles = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * TAU + rand(-0.3, 0.3),
        x = this.width * (0.16 + rand(0, 0.68)),
        y = this.height * (0.15 + rand(0, 0.7));
      const length = base * rand(0.65, 1.1),
        heading = angle + Math.PI / 2,
        nodes = new Float32Array(TADPOLE_NODES * 2),
        seg = length / (TADPOLE_NODES - 1);
      for (let n = 0; n < TADPOLE_NODES; n++) {
        nodes[n * 2] = x - Math.cos(heading) * seg * n;
        nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
      }
      return {
        id: i + 1,
        kind: "tadpole" as const,
        length,
        nodes,
        heading,
        speed: rand(13, 22),
        phase: rand(0, TAU),
        turn: 0,
        wander: 0,
        depth: rand(0.55, 1),
      };
    }).sort((a, b) => a.length - b.length);
  }
  splash(x: number, y: number) {
    this.events.push({ kind: "splash", x, y });
    this.impulse = { x, y, life: 1 };
  }
  step(dt: number) {
    this.time += dt;
    this.impulse.life = Math.max(0, this.impulse.life - dt * 0.65);
    for (const tadpole of this.tadpoles) {
      const nodes = tadpole.nodes,
        x = nodes[0],
        y = nodes[1],
        L = tadpole.length;
      tadpole.wander = clamp(
        tadpole.wander + (Math.random() - 0.5) * dt * 2.2,
        -1,
        1,
      );
      let dx =
          Math.cos(tadpole.heading) +
          Math.cos(tadpole.heading + tadpole.wander) * 0.65,
        dy =
          Math.sin(tadpole.heading) +
          Math.sin(tadpole.heading + tadpole.wander) * 0.65;
      const flow = { x: 0, y: 0 };
      current(x, y, this.time, flow);
      dx += flow.x * 0.1;
      dy += flow.y * 0.1;
      let alarm = 0;
      if (this.pointer.active) {
        const px = x - this.pointer.x,
          py = y - this.pointer.y,
          d = Math.hypot(px, py),
          radius = 125;
        if (d < radius && d > 0.01) {
          alarm = 1 - d / radius;
          dx += (px / d) * alarm * 4;
          dy += (py / d) * alarm * 4;
        }
      }
      if (this.impulse.life > 0) {
        const px = x - this.impulse.x,
          py = y - this.impulse.y,
          d = Math.hypot(px, py);
        if (d < 230 && d > 0.01) {
          const push = (1 - d / 230) * this.impulse.life;
          dx += (px / d) * push * 6;
          dy += (py / d) * push * 6;
          alarm = Math.max(alarm, push);
        }
      }
      // A small personal space keeps the heads distinct without a predator/prey system.
      for (const other of this.tadpoles) {
        if (other === tadpole) continue;
        const px = x - other.nodes[0],
          py = y - other.nodes[1],
          d = Math.hypot(px, py),
          r = (L + other.length) * 0.21;
        if (d < r && d > 0.01) {
          dx += (px / d) * (1 - d / r) * 1.8;
          dy += (py / d) * (1 - d / r) * 1.8;
        }
      }
      // Leaves are solid at the surface: heads steer around them; tails may pass underneath.
      for (const pad of this.pads) {
        const px = x - pad.x,
          py = (y - pad.y) / 0.86,
          d = Math.hypot(px, py),
          r = pad.radius + L * 0.16;
        if (d < r && d > 0.01) {
          dx += (px / d) * (1 - d / r) * 4.6;
          dy += (py / d) * (1 - d / r) * 4.6;
        }
      }
      const margin = L * 0.36;
      if (x < margin) dx += (1 - x / margin) * 3;
      if (x > this.width - margin) dx -= (1 - (this.width - x) / margin) * 3;
      if (y < margin) dy += (1 - y / margin) * 3;
      if (y > this.height - margin) dy -= (1 - (this.height - y) / margin) * 3;
      const desired = Math.atan2(dy, dx),
        maxTurn = (1.2 + alarm * 1.9) * dt,
        turned = clamp(angleDiff(tadpole.heading, desired), -maxTurn, maxTurn);
      tadpole.heading += turned;
      tadpole.turn += (turned / dt - tadpole.turn) * Math.min(1, dt * 3);
      const speed = (15 + L * 0.035) * (1 + alarm * 1.6);
      tadpole.speed += (speed - tadpole.speed) * Math.min(1, dt * 2);
      tadpole.phase += dt * (3.2 + tadpole.speed / 17);
      nodes[0] += Math.cos(tadpole.heading) * tadpole.speed * dt;
      nodes[1] += Math.sin(tadpole.heading) * tadpole.speed * dt;
      const seg = L / (TADPOLE_NODES - 1);
      let prev = tadpole.heading + Math.PI;
      for (let n = 1; n < TADPOLE_NODES; n++) {
        const px = nodes[(n - 1) * 2],
          py = nodes[(n - 1) * 2 + 1];
        let angle = Math.atan2(nodes[n * 2 + 1] - py, nodes[n * 2] - px);
        angle = prev + clamp(angleDiff(prev, angle), -0.21, 0.21);
        nodes[n * 2] = px + Math.cos(angle) * seg;
        nodes[n * 2 + 1] = py + Math.sin(angle) * seg;
        prev = angle;
      }
    }
  }
}
