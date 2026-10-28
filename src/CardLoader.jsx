import React, { useEffect, useRef, useState } from "react";

const suits = ["♠", "♥", "♣", "♦"];
const layouts = [
  [],
  [[50, 50]],
  [
    [50, 22],
    [50, 78],
  ],
  [
    [50, 22],
    [50, 50],
    [50, 78],
  ],
  [
    [25, 22],
    [75, 22],
    [25, 78],
    [75, 78],
  ],
  [
    [25, 22],
    [75, 22],
    [50, 50],
    [25, 78],
    [75, 78],
  ],
  [
    [25, 22],
    [75, 22],
    [25, 50],
    [75, 50],
    [25, 78],
    [75, 78],
  ],
  [
    [25, 22],
    [75, 22],
    [50, 36],
    [25, 50],
    [75, 50],
    [25, 78],
    [75, 78],
  ],
  [
    [25, 22],
    [75, 22],
    [50, 36],
    [25, 50],
    [75, 50],
    [50, 64],
    [25, 78],
    [75, 78],
  ],
  [
    [25, 18],
    [75, 18],
    [25, 39],
    [75, 39],
    [50, 50],
    [25, 61],
    [75, 61],
    [25, 82],
    [75, 82],
  ],
  [
    [25, 18],
    [75, 18],
    [25, 39],
    [75, 39],
    [50, 28],
    [50, 72],
    [25, 61],
    [75, 61],
    [25, 82],
    [75, 82],
  ],
];
function Face({ rank, leaving = false }) {
  const suit = suits[(rank - 1) % 4];
  return (
    <div
      className={`card-face${leaving ? " card-dealt" : ""}`}
      key={`${rank}-${leaving}`}
      aria-hidden="true"
    >
      <span className="card-corner">
        <b>{rank}</b>
        <span>{suit}</span>
      </span>
      <div className="card-pips">
        {layouts[rank].map(([x, y], i) => (
          <span
            key={i}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%,-50%)${y > 50 ? " rotate(180deg)" : ""}`,
            }}
          >
            {suit}
          </span>
        ))}
      </div>
      <span className="card-corner card-corner-bottom">
        <b>{rank}</b>
        <span>{suit}</span>
      </span>
    </div>
  );
}
/** Real preparation progress, presented as a small monochrome deck. */
export function CardLoader({ progress, onComplete, active }) {
  const [rank, setRank] = useState(1),
    completion = useRef(false);
  const target = Math.max(1, Math.min(10, Math.floor(progress * 10)));
  useEffect(() => {
    if (rank >= target || !active) return;
    const timer = setTimeout(
      () => setRank((n) => Math.min(target, n + 1)),
      110,
    );
    return () => clearTimeout(timer);
  }, [rank, target, active]);
  useEffect(() => {
    if (rank !== 10 || progress < 1 || completion.current) return;
    const timer = setTimeout(() => {
      completion.current = true;
      onComplete();
    }, 180);
    return () => clearTimeout(timer);
  }, [rank, progress, onComplete]);
  return (
    <div className="loader-content">
      <div
        className="card-stack"
        role="progressbar"
        aria-label="Preparing your zine"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rank * 10}
        data-rank={rank}
      >
        <i className="deck-card deck-card-back" aria-hidden="true" />
        <i className="deck-card deck-card-middle" aria-hidden="true" />
        <div className="loading-card">
          <Face rank={rank} />
          {rank > 1 && <Face rank={rank - 1} leaving />}
        </div>
      </div>
      <span aria-hidden="true">{rank * 10}%</span>
    </div>
  );
}
