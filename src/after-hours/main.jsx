import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "../cartridge/style.css";
import "./style.css";
import { useContentReveal } from "../useContentReveal";
import { flyers, flyerPage, flyerSpreads, prepareFlyerPages } from "./flyers";
import { prepareFlyerCovers } from "./covers";

function ThemeIcon({ dark }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a.5.5 0 0 0-.6-.6A9.5 9.5 0 1 0 21.5 13.7a.5.5 0 0 0-.6-.6Z" />}</svg>;
}

function AfterHours() {
  const content = useRef(null);
  const host = useRef(null), engine = useRef(null);
  const entranceTimer = useRef(null);
  const finishEntrance = () => { clearTimeout(entranceTimer.current); engine.current?.setOverlayOpen(false); };
  const [fallback, setFallback] = useState(false), [spread, setSpread] = useState(-1), [ready, setReady] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.colorMode === "dark");
  useContentReveal(content, `${ready}:${fallback}`, ready);
  useEffect(() => {
    document.documentElement.dataset.colorMode = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#1b1c1b" : "#f0f0f0");
    try { localStorage.setItem("cartridge-color-mode", dark ? "dark" : "light"); } catch {}
    engine.current?.setDarkMode(dark);
  }, [dark]);
  useEffect(() => {
    const onKey = event => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input,textarea,select,[role="textbox"],[role="slider"]'))) return;
      const book = engine.current;
      if (!book) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault(); finishEntrance(); book.stepPage(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key.toLowerCase() === "r") { finishEntrance(); book.replay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    let alive = true, book, texture;
    Promise.all([import("../book/BookScene"), import("three"), prepareFlyerPages(), prepareFlyerCovers()]).then(([{ BookScene }, THREE, pageArtwork, coverArtwork]) => {
      if (!alive) return;
      const dark = document.documentElement.dataset.colorMode === "dark";
      try {
        texture = new THREE.CanvasTexture(document.createElement("canvas"));
        book = new BookScene(host.current, { projects: flyerSpreads, blankInterior: true, arrivalMotion: false, stageInsets: { top: 0, bottom: 0 }, pageArtwork, coverArtwork, pageWidth: 4.7 * flyerPage.width / flyerPage.height,
          google: { parts: [], blizzard: [], texture },
          onPhase: phase => { host.current.dataset.phase = phase; }, onIndex: () => {}, onSpread: () => {}, onOpen: () => {}, onView: setSpread,
          onPresented: () => {}, onRequest: () => {},
        });
        engine.current = book; book.setDarkMode(dark); book.appear();
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          // Reuse the scene's pause latch while CSS reveals its already-rendered pose.
          book.setOverlayOpen(true);
          entranceTimer.current = setTimeout(finishEntrance, 1200);
        }
      } catch {
        texture?.dispose();
        setFallback(true);
      }
      setReady(true); document.documentElement.dataset.pageReady = "true";
    }).catch(() => { if (alive) { setFallback(true); setReady(true); document.documentElement.dataset.pageReady = "true"; } });
    return () => { alive = false; clearTimeout(entranceTimer.current); book?.dispose(); engine.current = null; };
  }, []);
  return <main ref={content} data-reveal-flow="page" data-ready={ready} className={`after-hours${fallback ? " is-fallback" : ""}`}>
    <header className="zine-header-shell"><nav data-reveal data-reveal-at="0" className="zine-header" aria-label="Main navigation">
      <a className="after-hours-back" href="/" aria-label="Back to Josh Lucas"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>Josh Lucas</a>
      <button className="tool-button" type="button" onClick={() => setDark(value => !value)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}><ThemeIcon dark={dark} /></button>
    </nav></header>
    <div data-reveal data-reveal-at="90" className="zine-heading"><h1><span>Zine of</span> Extracurriculars</h1></div>
    <p id="zine-help" className="sr-only">Five original flyers, one per page. Drag to rotate. Click the pages to turn them. Use the left and right arrows to turn pages, or R to restart.</p>
    <p className="sr-only" role="status">{spread >= 0 && spread < 3 ? `Spread ${spread + 1} of 3: ${flyers.slice(spread * 2, spread * 2 + 2).map(flyer => flyer.title).join(" and ")}` : spread < 0 ? "Front cover" : "Back cover"}</p>
    <ol className="sr-only" aria-label="Flyers in page order">{flyers.map(flyer => <li key={flyer.id}>{flyer.title}</li>)}</ol>
    <div data-reveal data-reveal-at="180" className="after-hours-book" ref={host} hidden={fallback} data-flyer-count={flyers.length} tabIndex={0} role="region" aria-label="Interactive zine of extracurriculars" aria-describedby="zine-help" onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === "content-reveal") finishEntrance(); }} />
    {fallback && <div className="flyer-gallery" aria-label="Flyer pages">{flyers.map(flyer => <figure data-reveal key={flyer.id} style={{ "--flyer-background": flyer.background }}><img src={flyer.src} alt={flyer.alt} width="1110" height="1280" /><figcaption>{flyer.title}</figcaption></figure>)}</div>}
  </main>;
}
createRoot(document.getElementById("root")).render(<AfterHours />);
