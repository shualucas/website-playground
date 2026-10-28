import React, { useEffect, useRef, useState } from "react";

/** Progress is supplied by completed preparation stages, never a fake timer. */
export function CardLoader({ progress, dark, onComplete, active }) {
  const [rank, setRank] = useState(1),
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
        <span className="card-mark" aria-hidden="true">
          ♦
        </span>
        <span className="card-corner card-corner-bottom" aria-hidden="true">
          <b>{rank}</b>
          <span>♦</span>
        </span>
      </div>
      <span aria-hidden="true">{rank * 10}%</span>
    </div>
  );
}
