import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/caveat/latin-400.css";
import "../site.css";
import "./style.css";
import { usePageExit } from "../usePageExit";
import { useContentReveal } from "../useContentReveal";
import { flyers, flyerPage, flyerSpreads, prepareFlyerPages } from "./flyers";
import { prepareFlyerCovers } from "./covers";
import { zineNotes } from "../content/zine-notes";
import { NoteDialog } from "./NoteDialog";
import { loadPaperPhysics } from "../book/paper-physics";
import { PhysicsPanel } from "./PhysicsPanel";
import { ThemeToggle } from "../ThemeToggle";
import { useDitherHovers } from "../useDitherHovers";

function AfterHours() {
  useDitherHovers();
  const content = useRef(null);
  const pageExit=usePageExit(content);
  const host = useRef(null), engine = useRef(null);
  const entranceTimer = useRef(null);
  const noteOpen = useRef(false);
  const [activeNote, setActiveNote] = useState(null);
  const finishEntrance = () => { clearTimeout(entranceTimer.current); engine.current?.setOverlayOpen(noteOpen.current); };
  const openNote = id => { noteOpen.current = true; finishEntrance(); setActiveNote(id); };
  const closeNote = () => { engine.current?.setNoteDetached(activeNote,false); noteOpen.current = false; setActiveNote(null); engine.current?.setOverlayOpen(false); };
  const [fallback, setFallback] = useState(false), [spread, setSpread] = useState(-1), [ready, setReady] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.colorMode === "dark");
  const [tuning]=useState(()=>new URLSearchParams(location.search).get("tune")==="1");
  useEffect(()=>{engine.current?.setOverlayOpen(pageExit.exiting||noteOpen.current)},[pageExit.exiting]);
  useContentReveal(content, `${ready}:${fallback}`, ready);
  useEffect(() => {
    engine.current?.setDarkMode(dark);
  }, [dark]);
  useEffect(() => {
    const onKey = event => {
      if (host.current?.dataset.revealReady !== "true" || noteOpen.current || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
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
    const handwriting = document.fonts.load('400 26px "Caveat"').catch(() => []);
    Promise.all([import("../book/BookScene"), import("three"), prepareFlyerPages(), prepareFlyerCovers(), handwriting]).then(([{ BookScene }, THREE, pageArtwork, coverArtwork]) => {
      if (!alive) return;
      const dark = document.documentElement.dataset.colorMode === "dark";
      try {
        texture = new THREE.CanvasTexture(document.createElement("canvas"));
        book = new BookScene(host.current, { physics:loadPaperPhysics(), projects: flyerSpreads, blankInterior: true, paperInserts: true, arrivalMotion: false, stageInsets: { top: 0, bottom: 0 }, pageArtwork, coverArtwork, pageWidth: 4.7 * flyerPage.width / flyerPage.height,
          google: { parts: [], blizzard: [], texture },
          onPhase: phase => { host.current.dataset.phase = phase; }, onIndex: () => {}, onSpread: () => {}, onOpen: () => {}, onView: setSpread,
          onNoteOpen: openNote,
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
  return <main ref={content} onClick={pageExit.onLinkClick} data-exiting={pageExit.exiting} inert={pageExit.exiting} data-reveal-flow="page" data-ready={ready} className={`after-hours${fallback ? " is-fallback" : ""}`}>
    <header className="zine-header-shell"><nav data-reveal data-reveal-at="0" className="zine-header" aria-label="Main navigation">
      <a className="after-hours-back" href="/" aria-label="Home"><span className="link-copy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>Home</span></a>
      <ThemeToggle dark={dark} onToggle={setDark} />
    </nav></header>
    <h1 className="sr-only">Extracurriculars</h1>
    <p id="zine-help" className="sr-only">Five original flyers, one per page. Drag to rotate. Click the pages to turn them, or tap a sticky note to read it. Use the left and right arrows to turn pages, or R to restart.</p>
    <p className="sr-only" role="status">{spread >= 0 && spread < 3 ? `Spread ${spread + 1} of 3: ${flyers.slice(spread * 2, spread * 2 + 2).map(flyer => flyer.title).join(" and ")}` : spread < 0 ? "Front cover" : "Back cover"}</p>
    <ol className="sr-only" aria-label="Flyers in page order">{flyers.map(flyer => <li key={flyer.id}>{flyer.title}</li>)}</ol>
    <div data-reveal data-reveal-at="180" className="after-hours-book" ref={host} hidden={fallback} data-flyer-count={flyers.length} tabIndex={0} role="region" aria-label="Interactive zine of extracurriculars" aria-describedby="zine-help" onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === "content-reveal") finishEntrance(); }} />
    {!fallback && ready && <div className="zine-note-shortcuts" role="group" aria-label="Print notes">{flyers.map(flyer => <button key={flyer.id} type="button" aria-haspopup="dialog" aria-controls="zine-note-dialog" onClick={() => openNote(flyer.id)}>Read note for {flyer.title}</button>)}</div>}
    {fallback && <div className="flyer-gallery" aria-label="Flyer pages">{flyers.map(flyer => <figure data-reveal key={flyer.id} style={{ "--flyer-background": flyer.background }}><img src={flyer.src} alt={flyer.alt} width="1110" height="1280" /><figcaption>{flyer.title}<button type="button" className="fallback-note-link" aria-label={`Read note for ${flyer.title}`} aria-haspopup="dialog" onClick={() => openNote(flyer.id)}>Read note</button></figcaption></figure>)}</div>}
    {activeNote && <NoteDialog flyer={flyers.find(flyer => flyer.id === activeNote)} note={zineNotes.find(note => note.id === activeNote)} getPose={() => engine.current?.getNotePose(activeNote)} setDetached={value => engine.current?.setNoteDetached(activeNote,value)} onClose={closeNote} />}
    {tuning&&!fallback&&<PhysicsPanel engine={engine} ready={ready} />}
  </main>;
}
createRoot(document.getElementById("root")).render(<AfterHours />);
