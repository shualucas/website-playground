import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist-mono/latin-600.css";
import { PondEngine } from "./pond/engine";
import "./style.css";

function App() {
  const canvas = useRef(null);
  useEffect(() => {
    let engine = null,
      disposed = false;
    const start = () => {
      if (!disposed && canvas.current) engine = new PondEngine(canvas.current);
    };
    // The exact 600-weight face used by the reference is served locally.
    document.fonts
      .load('600 16px "Geist Mono"')
      .catch(() => [])
      .then(start);
    const keydown = (event) => {
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        engine?.togglePaused();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      disposed = true;
      engine?.destroy();
      window.removeEventListener("keydown", keydown);
    };
  }, []);
  return (
    <main className="pond">
      <canvas
        ref={canvas}
        className="ascii-pond"
        tabIndex={0}
        role="img"
        aria-label="An interactive ASCII pond with swimming tadpoles and floating lily pads. Move the pointer to disturb the water, tap or click to splash, and press Space to pause or resume."
      />
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
