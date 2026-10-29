import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "../cartridge/style.css";
import "./style.css";
import { useContentReveal } from "../useContentReveal";
import { flyers, flyerPage, flyerSpreads, prepareFlyerPages } from "./flyers";

function AfterHours() {
  const content = useRef(null);
  const host = useRef(null), engine = useRef(null);
  const [fallback, setFallback] = useState(false), [spread, setSpread] = useState(-1);
  useContentReveal(content, fallback);
  useEffect(() => {
    let alive = true, book, texture;
    Promise.all([import("../book/BookScene"), import("three"), prepareFlyerPages()]).then(([{ BookScene }, THREE, pageArtwork]) => {
      if (!alive) return;
      const dark = document.documentElement.dataset.colorMode === "dark";
      try {
        texture = new THREE.CanvasTexture(document.createElement("canvas"));
        book = new BookScene(host.current, { projects: flyerSpreads, blankInterior: true, pageArtwork, pageWidth: 4.7 * flyerPage.width / flyerPage.height,
          google: { parts: [], blizzard: [], texture },
          onPhase: phase => { host.current.dataset.phase = phase; }, onIndex: () => {}, onSpread: () => {}, onOpen: () => {}, onView: setSpread,
          onPresented: () => {}, onRequest: () => {},
        });
        engine.current = book; book.setDarkMode(dark); book.appear();
      } catch {
        texture?.dispose();
        setFallback(true);
      }
      document.documentElement.dataset.pageReady = "true";
    }).catch(() => { if (alive) { setFallback(true); document.documentElement.dataset.pageReady = "true"; } });
    return () => { alive = false; book?.dispose(); engine.current = null; };
  }, []);
  return <main ref={content} className={`after-hours${fallback ? " is-fallback" : ""}`}>
    <a data-reveal className="after-hours-back" href="/" aria-label="Back to work"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12H4m6-6-6 6 6 6" /></svg></a>
    <h1 className="sr-only">Rave Flyer Zine</h1>
    <p id="zine-help" className="sr-only">Five original flyers, one per page. Drag to rotate. Click the pages to turn them. Use the left and right arrows to turn pages, or R to restart.</p>
    <p className="sr-only" role="status">{spread >= 0 && spread < 3 ? `Spread ${spread + 1} of 3: ${flyers.slice(spread * 2, spread * 2 + 2).map(flyer => flyer.title).join(" and ")}` : "Zine cover"}</p>
    <ol className="sr-only" aria-label="Flyers in page order">{flyers.map(flyer => <li key={flyer.id}>{flyer.title}</li>)}</ol>
    <div className="after-hours-book" ref={host} hidden={fallback} data-flyer-count={flyers.length} tabIndex={0} role="region" aria-label="Interactive flyer zine" aria-describedby="zine-help" onKeyDown={event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); engine.current?.stepPage(event.key === "ArrowRight" ? 1 : -1); }
      if (event.key.toLowerCase() === "r") engine.current?.replay();
    }} />
    {fallback && <div className="flyer-gallery" aria-label="Flyer pages">{flyers.map(flyer => <figure data-reveal key={flyer.id} style={{ "--flyer-background": flyer.background }}><img src={flyer.src} alt={flyer.alt} width="1110" height="1280" /><figcaption>{flyer.title}</figcaption></figure>)}</div>}
  </main>;
}
createRoot(document.getElementById("root")).render(<AfterHours />);
