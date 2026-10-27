import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createMeadow } from "./meadow.js";
import "./style.css";

function App() {
  const canvas = useRef(null);
  useEffect(() => {
    const meadow = createMeadow(canvas.current, {
      paused: matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    const keydown = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        meadow.togglePaused();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      meadow.destroy();
      window.removeEventListener("keydown", keydown);
    };
  }, []);
  return (
    <main className="meadow">
      <canvas
        ref={canvas}
        className="grass-canvas"
        tabIndex={0}
        role="img"
        aria-label="A top-down, painterly grass field with soft grain, flowing sunlight, and shimmering dew. Wind blows continuously. Move your cursor or drag a finger to bend the blades. Press Space to pause or resume."
      />
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
