import React, { useEffect, useRef, useState } from "react";

/** Progress is supplied by completed preparation stages, never a fake timer. */
export function CardLoader({ progress, dark, onComplete, active }) {
  const [rank, setRank] = useState(1),
    canvas = useRef(null),
    completion = useRef(false);
  const target = Math.max(1, Math.min(10, Math.floor(progress * 10)));
  useEffect(() => {
    if (rank >= target) return;
    const timer = setTimeout(
      () => setRank((n) => Math.min(target, n + 1)),
      110,
    );
    return () => clearTimeout(timer);
  }, [rank, target]);
  useEffect(() => {
    if (rank !== 10 || progress < 1 || completion.current) return;
    const timer = setTimeout(() => {
      completion.current = true;
      onComplete();
    }, 180);
    return () => clearTimeout(timer);
  }, [rank, progress, onComplete]);
  useEffect(() => {
    if (!active) return;
    const c = canvas.current,
      ctx = c.getContext("2d"),
      motion = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0,
      previous = -100;
    let seed = 7281;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const dots = Array.from({ length: 5200 }, () => ({
      x: random() * 300,
      y: random() * 380,
      a: 0.15 + random() * 0.65,
      r: random() * 0.55 + 0.35,
    }));
    const draw = (now) => {
      if (now - previous > 50) {
        previous = now;
        ctx.clearRect(0, 0, 300, 380);
        const t = motion.matches ? 0 : now * 0.00025,
          amount = 0.25 + rank * 0.065;
        for (const d of dots) {
          let x = d.x,
            y = d.y; // A bounded analytic nodal field condenses the grain into flowing contours.
          for (let i = 0; i < 3; i++) {
            const u = (x - 150) * 0.024,
              v = (y - 190) * 0.024,
              f =
                Math.sin(u * 1.8 + t) * Math.cos(v * 1.25 - t) +
                Math.sin(v * 1.65 + t * 0.8) * 0.63;
            const dx = 1.8 * Math.cos(u * 1.8 + t) * Math.cos(v * 1.25 - t),
              dy =
                -1.25 * Math.sin(u * 1.8 + t) * Math.sin(v * 1.25 - t) +
                1.04 * Math.cos(v * 1.65 + t * 0.8),
              norm = dx * dx + dy * dy + 0.2;
            x -= ((f * dx) / norm) * amount * 18;
            y -= ((f * dy) / norm) * amount * 18;
          }
          ctx.fillStyle = dark
            ? `rgba(255,255,255,${d.a})`
            : `rgba(15,15,15,${d.a})`;
          ctx.fillRect(x, y, d.r, d.r);
        }
      }
      if (!motion.matches) raf = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [rank, dark, active]);
  return (
    <div className="loader-content">
      <div
        className="loading-card"
        role="progressbar"
        aria-label="Preparing your zine"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rank * 10}
        data-rank={rank}
      >
        <span className="card-corner">
          <b>{rank}</b>
          <span>♦</span>
        </span>
        <canvas ref={canvas} width={300} height={380} aria-hidden="true" />
        <span className="card-corner card-corner-bottom" aria-hidden="true">
          <b>{rank}</b>
          <span>♦</span>
        </span>
      </div>
      <span aria-hidden="true">{rank * 10}%</span>
    </div>
  );
}
