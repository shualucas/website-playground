import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import { cartridges } from "./config";
import { projects } from "../book/projects";
import { prepareTitleFont } from "../content/typography";
import { CaseStudy } from "../CaseStudy";
import { FilmGallery } from "../FilmGallery";
import "./style.css";
import "./reader.css";

const readRoute = () => {
  const url = new URL(location.href);
  const id = url.searchParams.get("project");
  return cartridges.some((c) => c.id === id) && url.searchParams.get("view") === "case-study" ? id : null;
};
function Icon({ type }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "sun" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : type === "moon" ? <path d="M20.6 13.4A8.8 8.8 0 0 1 10.6 3.3a9 9 0 1 0 10 10.1Z" /> : type === "reset" ? <><path d="M4 9a8 8 0 1 1 .7 8M4 4v5h5" /></> : <path d="M5 12h14m-5-5 5 5-5 5" />}
  </svg>;
}
function ProjectMedia({ project, controls }) {
  if (project.previewVideo) return <video src={project.previewVideo} poster={project.previewPoster || undefined} controls={controls} playsInline muted preload="metadata" />;
  if (project.previewGif || project.previewPoster || project.previewImage) return <img src={project.previewGif || project.previewPoster || project.previewImage} alt={project.imageAlt} />;
  return <div className="collection-media-placeholder"><span>Project preview</span><p>Motion and imagery to come.</p></div>;
}
function PersonalReader({ project, onBack, onPhotos }) {
  const title = useRef(null);
  useEffect(() => { title.current?.focus(); const previous = document.title; document.title = `${project.label} — Josh Lucas`; return () => { document.title = previous; }; }, [project.id]);
  return <section className="case-study personal-reader" aria-label={`${project.label} collection`}>
    <header className="case-study-nav"><button className="back-to-zine" onClick={onBack}>← Back to collection</button><span>JOSH LUCAS</span></header>
    <article className="case-study-content">
      <p className="eyebrow">{project.kind === "about" ? "THE PERSON BEHIND THE PIXELS" : "OFF THE CLOCK"}</p>
      <h1 ref={title} tabIndex={-1}>{project.title.replace("\n", " ")}</h1>
      {project.kind === "about" ? <><p className="personal-role">{project.subtitle}</p><p className="personal-bio">{project.description}</p><div className="career-strip"><span>Google</span><span>Blizzard Entertainment</span><span>San Francisco, CA</span></div></> : <><p className="personal-bio">{project.description}</p><button className="photos-entry" onClick={onPhotos}><span>01 / FILM PHOTOGRAPHY</span><strong>A different kind of frame.</strong><span>Open photographs <span aria-hidden="true">↗</span></span></button><p className="personal-note">More things made for the fun of it, coming soon.</p></>}
    </article>
  </section>;
}

function App() {
  const host = useRef(null), engine = useRef(null), alive = useRef(true), readingRef = useRef(null), galleryRef = useRef(false);
  const [selected, setSelected] = useState(() => new URL(location.href).searchParams.get("project") || "about");
  const [hovered, setHovered] = useState(null), [status, setStatus] = useState("loading");
  const [reading, setReading] = useState(readRoute), [gallery, setGallery] = useState(false);
  const previousReading = useRef(reading);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("cartridge-color-mode") === "dark"; } catch { return false; } });
  const openRef = useRef(null), buttons = useRef({});
  readingRef.current = reading; galleryRef.current = gallery;
  const active = cartridges.find((c) => c.id === (hovered || selected)) || cartridges[0];
  const project = projects.find((p) => p.id === reading);
  const open = (id) => {
    if (readingRef.current || galleryRef.current) return;
    setHovered(null); setSelected(id);
    const url = new URL(location.href); url.searchParams.set("project", id); url.searchParams.set("view", "case-study");
    history.pushState({ cartridgeReader: true }, "", url); setReading(id);
  };
  openRef.current = open;
  const close = () => {
    if (history.state?.cartridgeReader) history.back();
    else { const url = new URL(location.href); url.searchParams.delete("view"); history.replaceState(null, "", url); setReading(null); }
  };
  useEffect(() => {
    alive.current = true;
    let scene;
    Promise.all([import("./CartridgeScene"), prepareTitleFont(), document.fonts.ready]).then(([{ CartridgeScene }]) => {
      if (!alive.current) return;
      try {
        scene = new CartridgeScene(host.current, {
          onHover: setHovered,
          onOpen: (id) => openRef.current(id),
          onReady: () => { if (alive.current) setStatus("ready"); },
          onError: () => { if (alive.current) { setStatus("fallback"); engine.current?.setPaused(true); } },
        });
        engine.current = scene;
        scene.setTheme(document.documentElement.dataset.colorMode === "dark");
        scene.setSelected(cartridges.some((c) => c.id === selected) ? selected : "about");
        scene.setPaused(Boolean(readingRef.current));
      } catch { setStatus("fallback"); }
    }).catch(() => { if (alive.current) setStatus("fallback"); });
    return () => { alive.current = false; scene?.dispose(); engine.current = null; };
  }, []);
  useEffect(() => {
    const value = dark ? "dark" : "light";
    document.documentElement.dataset.colorMode = value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#1b1c1b" : "#f6f5f1");
    try { localStorage.setItem("cartridge-color-mode", value); } catch { /* Storage can be disabled. */ }
    engine.current?.setTheme(dark);
  }, [dark]);
  useEffect(() => { engine.current?.setSelected(hovered || selected); }, [hovered, selected]);
  useEffect(() => {
    engine.current?.setPaused(Boolean(reading || gallery));
    if (previousReading.current && !reading) requestAnimationFrame(() => buttons.current[selected]?.focus({ preventScroll: true }));
    previousReading.current = reading;
  }, [reading, gallery]);
  useEffect(() => {
    const pop = () => {
      const next = readRoute(); setReading(next); setGallery(false);
      const id = new URL(location.href).searchParams.get("project");
      if (cartridges.some((c) => c.id === id)) setSelected(id);
    };
    const keyboard = (event) => {
      if (galleryRef.current || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape" && readingRef.current) { event.preventDefault(); close(); }
      if (event.key.toLowerCase() === "r" && !readingRef.current) engine.current?.reset();
    };
    window.addEventListener("popstate", pop); window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("popstate", pop); window.removeEventListener("keydown", keyboard); };
  }, []);
  return <>
    <main className="collection" data-status={status} data-selected={active.id} inert={reading ? true : undefined}>
      <header className="collection-header">
        <a className="identity" href="/" aria-label="Josh Lucas home"><span className="identity-mark" aria-hidden="true">jl.</span><span>JOSH LUCAS<span className="identity-caption">PRODUCT DESIGNER</span></span></a>
        <div className="header-right"><span className="location"><i /> SAN FRANCISCO, CA</span><button className="tool-button theme-toggle" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} onClick={() => setDark(!dark)}><Icon type={dark ? "sun" : "moon"} /></button></div>
      </header>
      <div className="collection-main">
        <section className="collection-intro" aria-labelledby="collection-title">
          <p className="eyebrow">A PERSONAL COLLECTION / VOL. 01</p>
          <h1 id="collection-title">Work, with<br /><em>a little play.</em></h1>
          <p className="intro-bio">Senior Product Designer at <strong>Google.</strong><br />Previously, <strong>Blizzard Entertainment.</strong><br />Building thoughtful experiences at scale.</p>
          <nav className="cartridge-navigation" aria-label="Portfolio collection">
            {cartridges.map((item) => <button key={item.id} ref={(el) => { buttons.current[item.id] = el; }} aria-label={`Open ${item.name}`} className={active.id === item.id ? "is-selected" : ""} style={{ "--item-color": item.accent }} onPointerEnter={() => setHovered(item.id)} onPointerLeave={() => setHovered(null)} onFocus={() => setSelected(item.id)} onClick={() => open(item.id)}>
              <span className="nav-number">{item.number}</span><span>{item.id === "about" ? "About me" : item.name}</span><span className="nav-category">{item.id === "about" ? "THE INTRODUCTION" : item.id === "after-hours" ? "THE OTHER SIDE" : "SELECTED WORK"}</span><Icon type="arrow" />
            </button>)}
          </nav>
        </section>
        <section className="collection-display" aria-label="Interactive 3D cartridge collection">
          <div className="display-topline"><span>FOUR CARTRIDGES. A FEW GOOD STORIES.</span><button className="tool-button" aria-label="Reset cartridge rotation" onClick={() => engine.current?.reset()}><Icon type="reset" /></button></div>
          <div className={`cartridge-stage${status === "fallback" ? " is-fallback" : ""}`} ref={host} data-ready="false" />
          {status === "loading" && <div className="collection-loading" role="status"><span className="loading-cartridge" aria-hidden="true" /><span>Loading the collection</span></div>}
          {status === "fallback" && <div className="cartridge-fallback" aria-label="Cartridge collection">{cartridges.map((item) => <button key={item.id} onClick={() => open(item.id)} aria-label={`Open ${item.name} cartridge`} style={{ "--shell": item.shell }}><span className="fallback-stamp">JOSH LUCAS</span><img src={item.label} alt={`${item.name} cartridge label`} /></button>)}</div>}
          <div className="display-caption"><div><span className="caption-number">{active.number} / 04</span><span className="caption-name">{active.name}</span></div><span className="interaction-hint">DRAG TO INSPECT <span>·</span> CLICK TO EXPLORE</span></div>
        </section>
      </div>
      <footer className="collection-footer"><span>MADE WITH CURIOSITY. BUILT TO EXPLORE.</span><a href="/zine/">View the zine edition <span aria-hidden="true">↗</span></a><a className="archive-download" href="/versions/portfolio-zine-v1-source.zip" download>Download zine source <span aria-hidden="true">↓</span></a></footer>
    </main>
    {project && (project.kind === "project" ? <CaseStudy project={project} onBack={close} Media={ProjectMedia} backLabel="Back to collection" /> : <PersonalReader project={project} onBack={close} onPhotos={() => setGallery(true)} />)}
    {gallery && <FilmGallery onClose={() => { setGallery(false); requestAnimationFrame(() => document.querySelector(".photos-entry")?.focus({ preventScroll: true })); }} />}
  </>;
}

createRoot(document.getElementById("root")).render(<App />);
