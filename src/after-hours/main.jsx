import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "../cartridge/style.css";
import "./style.css";
import { useContentReveal } from "../useContentReveal";

const blankSpreads = Array.from({ length: 4 }, (_, i) => ({ id: `blank-${i}`, kind: "blank", label: "", theme: "about", title: "", subtitle: "", description: "", role: "", team: "", year: "", disciplines: [], note: "" }));
function AfterHours() {
  const content = useRef(null);
  const host = useRef(null), engine = useRef(null);
  const [fallback, setFallback] = useState("");
  useContentReveal(content, fallback);
  useEffect(() => {
    let alive = true, book, texture;
    Promise.all([import("../book/BookScene"), import("three"), import("../book/materials")]).then(([{ BookScene }, THREE, { coverTexture }]) => {
      if (!alive) return;
      const dark = document.documentElement.dataset.colorMode === "dark";
      try {
        texture = new THREE.CanvasTexture(document.createElement("canvas"));
        book = new BookScene(host.current, { projects: blankSpreads, blankInterior: true,
          google: { parts: [], blizzard: [], texture },
          onPhase: phase => { host.current.dataset.phase = phase; }, onIndex: () => {}, onSpread: () => {}, onOpen: () => {},
          onPresented: () => {}, onRequest: () => {},
        });
        engine.current = book; book.setDarkMode(dark); book.appear();
      } catch {
        texture?.dispose();
        const cover = coverTexture(false, dark); setFallback(cover.image.toDataURL()); cover.dispose();
      }
      document.documentElement.dataset.pageReady = "true";
    });
    return () => { alive = false; book?.dispose(); engine.current = null; };
  }, []);
  return <main ref={content} className="after-hours">
    <a data-reveal className="after-hours-back" href="/" aria-label="Back to work"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12H4m6-6-6 6 6 6" /></svg></a>
    <h1 className="sr-only">Interactive zine</h1>
    <p id="zine-help" className="sr-only">Drag to rotate. Click the pages to turn them. Use the left and right arrows to turn pages, or R to restart. The interior is blank.</p>
    <div className="after-hours-book" ref={host} tabIndex={0} role="region" aria-label="Interactive cover-only zine" aria-describedby="zine-help" onKeyDown={event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); engine.current?.stepPage(event.key === "ArrowRight" ? 1 : -1); }
      if (event.key.toLowerCase() === "r") engine.current?.replay();
    }} />
    {fallback && <img data-reveal className="after-hours-fallback-cover" src={fallback} alt="Zine cover" />}
  </main>;
}
createRoot(document.getElementById("root")).render(<AfterHours />);
