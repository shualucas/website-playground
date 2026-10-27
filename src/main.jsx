import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist-mono/latin-600.css";
import { SkyEngine } from "./sky/engine";
import "./style.css";

function App() {
  const canvas = useRef(null);
  useEffect(() => {
    let engine = null,
      disposed = false;
    const start = () => {
      if (!disposed && canvas.current) engine = new SkyEngine(canvas.current);
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
      if (
        ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)
      ) {
        event.preventDefault();
        engine?.select(
          event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1,
        );
      }
      if (event.key === "Enter") {
        event.preventDefault();
        engine?.activateSelected();
      }
      if (event.key === "Escape") engine?.clearSelection();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      disposed = true;
      engine?.destroy();
      window.removeEventListener("keydown", keydown);
    };
  }, []);
  return (
    <main className="sky">
      <canvas
        ref={canvas}
        className="ascii-sky"
        tabIndex={0}
        role="img"
        aria-label="An ASCII sky with drifting hot-air balloons and slower clouds. Click a balloon to lift it or a cloud to disperse it. Arrow keys select an object, Enter activates it, and Space pauses or resumes."
      />
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
