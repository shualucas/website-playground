import React, { useEffect, useRef } from "react";
/** A monochrome phosphor logo that resolves with real preparation progress. */
export function CRTLoader({ progress, onComplete, active }) {
  const completed = useRef(false),
    amount = Math.max(0, Math.min(1, progress));
  useEffect(() => {
    if (amount < 1 || !active || completed.current) return;
    const timer = setTimeout(() => {
      completed.current = true;
      onComplete();
    }, 500);
    return () => clearTimeout(timer);
  }, [amount, active, onComplete]);
  return (
    <div
      className={`crt-loader${active ? " is-active" : ""}`}
      role="progressbar"
      aria-label="Preparing your zine"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(amount * 100)}
      style={{ "--load": amount }}
    >
      <span className="sr-only">Joshua Lucas</span>
      <div className="crt-screen" aria-hidden="true">
        <div className="crt-logo crt-ghost">
          <span>JOSHUA</span>
          <span>LUCAS</span>
        </div>
        <div className="crt-logo">
          <span>JOSHUA</span>
          <span>LUCAS</span>
        </div>
        <i className="crt-sweep" />
      </div>
    </div>
  );
}
