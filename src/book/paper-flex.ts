/** An underdamped paper response: movement loads the sheet and release lets it recoil. */
export function advancePaperFlex(
  value: number,
  velocity: number,
  target: number,
  delta: number,
) {
  const dt = Math.min(Math.max(delta, 0), 0.15),
    damping = 7,
    omega = Math.sqrt(160 - damping * damping),
    offset = value - target,
    coefficient = (velocity + damping * offset) / omega,
    decay = Math.exp(-damping * dt),
    cosine = Math.cos(omega * dt),
    sine = Math.sin(omega * dt);
  return {
    value: target + decay * (offset * cosine + coefficient * sine),
    velocity:
      decay *
      (velocity * cosine -
        ((damping * velocity + 160 * offset) / omega) * sine),
  };
}
