/**
 * Animation reference: pakagronglb/animated-book-slider-threejs, Book.jsx,
 * revision 3dd1a49855e7f74f4a2b86c705910d7284cc5c52 (Wawa Sensei tutorial).
 * Independent vertex-based articulation: 30 linked sections, a spine bend,
 * a trailing outer edge, and a separate shallow corner fold. Artwork stays local.
 */
export const PAGE_JOINTS = 30;
export const TURN_RATE = 4;
export const OPENING = {
  end: 3.4,
  riffleStart: 1.15,
  step: 0.11,
  count: 8,
  leafDuration: 0.62,
  lastDuration: 1.25,
};
export const LAST_LEAF_START =
  OPENING.riffleStart + (OPENING.count - 1) * OPENING.step;
export const PORTAL_REVEAL = LAST_LEAF_START + OPENING.lastDuration * 0.5;
export const PRINT_REVEAL = LAST_LEAF_START + OPENING.lastDuration * 0.92;
export const TRANSFER_END = LAST_LEAF_START + OPENING.lastDuration * 0.7;
const clamp = (v: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, v));

/** Frame-rate independent, non-overshooting damping, similar to a soft skeletal hinge. */
export function advancePageTurn(
  progress: number,
  velocity: number,
  target: number,
  delta: number,
) {
  const dt = clamp(delta, 0, 0.5),
    offset = progress - target,
    b = velocity + TURN_RATE * offset,
    e = Math.exp(-TURN_RATE * dt);
  return {
    progress: target + (offset + b * dt) * e,
    velocity: (velocity - TURN_RATE * b * dt) * e,
  };
}

/** Tangent angles of the articulated strip; adjacent joints are blended by each vertex. */
export function pageJoints(
  progress: number,
  direction: number,
  across: number,
  twist: number,
) {
  const p = clamp(progress),
    motion = Math.sin(Math.PI * p),
    angles = new Float64Array(PAGE_JOINTS + 1);
  for (let joint = 0; joint <= PAGE_JOINTS; joint++) {
    const u = joint / PAGE_JOINTS;
    // The hinge leads; the outside of the sheet catches up as it approaches its landing.
    const trailing = motion * 0.15 * u * u;
    const hinge = Math.PI * clamp(p - trailing);
    const inner = 0.7 * Math.sin((Math.min(u / 0.27, 1) * Math.PI) / 2);
    const outer = 0.45 * u * u;
    const fold =
      motion * Math.max(0, (u - 0.27) / 0.73) * (across - 0.5) * (0.18 + twist);
    const angle = clamp(hinge + motion * (inner - outer) + fold, 0, Math.PI);
    angles[joint] = direction > 0 ? angle : Math.PI - angle;
  }
  return angles;
}
