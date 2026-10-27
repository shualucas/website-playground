import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createMeadow } from "./meadow.js";
import "./style.css";
function GrassMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M12 25C12 16 18 12 17 3M12 25C12 19 6 15 4 14M14 25C15 18 22 16 24 8M9 25C10 18 7 11 9 7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
function App() {
  const canvas = useRef(null),
    engine = useRef(null),
    hintTimer = useRef(null);
  const [paused, setPaused] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [breeze, setBreeze] = useState("steady"),
    [touched, setTouched] = useState(false),
    [immersive, setImmersive] = useState(false);
  const onInteract = useCallback(() => {
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setTouched(true), 900);
  }, []);
  useEffect(() => {
    engine.current = createMeadow(canvas.current, {
      paused,
      breeze,
      onInteract,
    });
    return () => {
      engine.current?.destroy();
      clearTimeout(hintTimer.current);
    };
  }, []);
  useEffect(() => engine.current?.setPaused(paused), [paused]);
  useEffect(() => engine.current?.setBreeze(breeze), [breeze]);
  useEffect(() => {
    const onKey = (e) => {
      if (["BUTTON", "INPUT", "SELECT"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPaused((value) => !value);
      }
      if (e.key.toLowerCase() === "h") setImmersive((value) => !value);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  return (
    <main className={immersive ? "meadow immersive" : "meadow"}>
      <canvas
        ref={canvas}
        className="grass-canvas"
        role="img"
        aria-label="A living pixel meadow: ambient wind sweeps through thousands of grass blades. Move your cursor or drag a finger through the grass to bend it."
      />
      <header className="field-header">
        <div className="wordmark">
          <GrassMark />
          <span>
            meadow<span className="wordmark-dot">.</span>
          </span>
          <span className="edition">FIELD STUDY — 001</span>
        </div>
        <button
          className="quiet-button hide-ui"
          onClick={() => setImmersive(!immersive)}
          aria-pressed={immersive}
          aria-label="Hide interface"
        >
          {immersive ? "show interface" : "just the field"}{" "}
          <span aria-hidden="true">{immersive ? "+" : "−"}</span>
        </button>
      </header>
      <div className="field-intro">
        <div className="eyebrow">
          <span /> A SMALL MOMENT OUTSIDE
        </div>
        <h1>Follow the breeze.</h1>
        <p>Nothing to finish. Nowhere to be.</p>
      </div>
      <div className={`interaction-hint ${touched ? "hint-used" : ""}`}>
        <span className="hint-spark" aria-hidden="true">
          +
        </span>
        <span>
          move slowly through the grass.
          <br />
          <span>it remembers, then lets go.</span>
        </span>
      </div>
      <footer className="field-footer">
        <div className="field-status">
          <span className={paused ? "status-dot paused" : "status-dot"} />
          <span aria-live="polite">
            {paused ? "a moment, held still" : "the meadow is breathing"}
          </span>
        </div>
        <div className="field-controls">
          <fieldset className="breeze-controls">
            <legend>breeze</legend>
            {["gentle", "steady", "gusty"].map((value) => (
              <button
                key={value}
                onClick={() => setBreeze(value)}
                aria-pressed={breeze === value}
              >
                {value}
              </button>
            ))}
          </fieldset>
          <span className="control-divider" />
          <button
            className="pause-button"
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
            aria-label="Pause meadow animation"
          >
            <span
              className={paused ? "play-icon" : "pause-icon"}
              aria-hidden="true"
            />
            {paused ? "resume" : "pause"}
          </button>
        </div>
      </footer>
      {immersive && (
        <button
          className="restore-interface"
          onClick={() => setImmersive(false)}
          aria-label="Show interface"
        >
          show interface +
        </button>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
