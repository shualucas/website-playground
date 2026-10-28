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

const selectedRoute = () => {
  const id = new URL(location.href).searchParams.get("project");
  return cartridges.some((c) => c.id === id) ? id : null;
};
const readRoute = () => new URL(location.href).searchParams.get("view") === "case-study" ? selectedRoute() : null;
function Icon({ type }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "sun" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : type === "moon" ? <path d="M20.6 13.4A8.8 8.8 0 0 1 10.6 3.3a9 9 0 1 0 10 10.1Z" /> : type === "arrow" ? <path d="m6 18 12-12M6 6h12v12" /> : type === "download" ? <path d="M12 3v16m-6-6 6 6 6-6M4 21h16" /> : type === "back" ? <path d="M20 12H4m6-6-6 6 6 6" /> : type === "reset" ? <path d="M4 9a8 8 0 1 1 .7 8M4 4v5h5" /> : <path d="m6 6 12 12M6 18 18 6" />}
  </svg>;
}
function ProjectMedia({ project, controls }) {
  if (project.previewVideo) return <video src={project.previewVideo} poster={project.previewPoster || undefined} controls={controls} playsInline muted preload="metadata" />;
  if (project.previewGif || project.previewPoster || project.previewImage) return <img src={project.previewGif || project.previewPoster || project.previewImage} alt={project.imageAlt} />;
  return <div className="collection-media-placeholder">Project preview</div>;
}
function PersonalReader({ project, onBack, onPhotos }) {
  const title = useRef(null), label = project.kind === "about" ? "About" : "After-hours";
  useEffect(() => { title.current?.focus(); const previous = document.title; document.title = label; return () => { document.title = previous; }; }, [label]);
  return <section className="case-study personal-reader" aria-label={`${label} collection`}>
    <header className="case-study-nav"><button className="back-to-zine" onClick={onBack}><Icon type="back" /> Back to collection</button></header>
    <article className="case-study-content">
      <h1 ref={title} tabIndex={-1}>{label}</h1>
      {project.kind === "about" ? <><p className="personal-role">{project.subtitle}</p><p className="personal-bio">{project.description}</p><div className="career-strip"><span>Google</span><span>Blizzard Entertainment</span><span>San Francisco, CA</span></div></> : <><p className="personal-bio">Film photography, tennis, and games.</p><button className="photos-entry" onClick={onPhotos}><strong>Film photographs</strong><span>View photographs <Icon type="arrow" /></span></button></>}
    </article>
  </section>;
}
function App() {
  const host = useRef(null), engine = useRef(null), alive = useRef(true), readingRef = useRef(null), galleryRef = useRef(false);
  const [selected, setSelected] = useState(selectedRoute), [hovered, setHovered] = useState(null), [status, setStatus] = useState("loading");
  const [reading, setReading] = useState(readRoute), [gallery, setGallery] = useState(false);
  const previousReading = useRef(reading), restoreFocus = useRef(null), buttons = useRef({});
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("cartridge-color-mode") === "dark"; } catch { return false; } });
  const selectRef = useRef(null);
  readingRef.current = reading; galleryRef.current = gallery;
  const active = cartridges.find((c) => c.id === selected), project = projects.find((p) => p.id === reading);
  const select = (id) => {
    if (readingRef.current || galleryRef.current) return;
    setSelected(id); setHovered(null);
    const url = new URL(location.href); if (id) url.searchParams.set("project", id); else url.searchParams.delete("project");
    url.searchParams.delete("view"); history.replaceState(null, "", url);
  };
  selectRef.current = select;
  const open = (id) => {
    if (readingRef.current || galleryRef.current) return;
    restoreFocus.current = document.activeElement;
    setSelected(id); setHovered(null);
    const url = new URL(location.href); url.searchParams.set("project", id); url.searchParams.set("view", "case-study");
    history.pushState({ cartridgeReader: true }, "", url); setReading(id);
  };
  const close = () => {
    if (history.state?.cartridgeReader) history.back();
    else { const url = new URL(location.href); url.searchParams.delete("view"); history.replaceState(null, "", url); setReading(null); }
  };
  useEffect(() => {
    alive.current = true; let scene;
    Promise.all([import("./CartridgeScene"), prepareTitleFont(), document.fonts.ready]).then(([{ CartridgeScene }]) => {
      if (!alive.current) return;
      try {
        scene = new CartridgeScene(host.current, {
          onHover: setHovered, onSelect: (id) => selectRef.current(id),
          onReady: () => { if (alive.current) setStatus("ready"); },
          onError: () => { if (alive.current) { setStatus("fallback"); engine.current?.setPaused(true); } },
        });
        engine.current = scene; scene.setTheme(document.documentElement.dataset.colorMode === "dark");
        scene.setSelected(selectedRoute()); scene.setPaused(Boolean(readingRef.current));
      } catch { setStatus("fallback"); }
    }).catch(() => { if (alive.current) setStatus("fallback"); });
    return () => { alive.current = false; scene?.dispose(); engine.current = null; };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.colorMode = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#1b1c1b" : "#f0f0f0");
    try { localStorage.setItem("cartridge-color-mode", dark ? "dark" : "light"); } catch {}
    engine.current?.setTheme(dark);
  }, [dark]);
  useEffect(() => { engine.current?.setSelected(selected); }, [selected]);
  useEffect(() => { engine.current?.setHovered(hovered); }, [hovered]);
  useEffect(() => {
    engine.current?.setPaused(Boolean(reading || gallery));
    if (previousReading.current && !reading) requestAnimationFrame(() => {
      const target = restoreFocus.current?.isConnected && restoreFocus.current !== document.body ? restoreFocus.current : buttons.current[selected];
      target?.focus({ preventScroll: true });
    });
    previousReading.current = reading;
  }, [reading, gallery]);
  useEffect(() => {
    const pop = () => { setReading(readRoute()); setSelected(selectedRoute()); setGallery(false); };
    const keyboard = (event) => {
      if (galleryRef.current || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        if (readingRef.current) close();
        else selectRef.current(null);
        event.preventDefault();
      }
      if (event.key.toLowerCase() === "r" && !readingRef.current) engine.current?.reset();
    };
    window.addEventListener("popstate", pop); window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("popstate", pop); window.removeEventListener("keydown", keyboard); };
  }, []);
  const photos = () => { restoreFocus.current = document.activeElement; setGallery(true); };
  return <>
    <main className="collection" data-status={status} data-selected={selected || ""} inert={reading ? true : undefined}>
      <header className="collection-header"><button className="text-link" onClick={() => open("about")}>About</button><button className="tool-button" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} onClick={() => setDark(!dark)}><Icon type={dark ? "sun" : "moon"} /></button></header>
      <section className="collection-hero" aria-label="Introduction and cartridge collection">
        <div className="collection-intro"><h1>Senior Product Designer at <strong>Google.</strong> Previously, <strong>Blizzard Entertainment.</strong> Currently located in San Francisco, CA.</h1></div>
        <div className="collection-display" aria-label="Interactive 3D cartridge collection">
          <div className={`cartridge-stage${status === "fallback" ? " is-fallback" : ""}`} ref={host} data-ready="false">
            {status === "ready" && cartridges.map((item, i) => <button key={item.id} className="cartridge-keyboard" style={{ "--control-x": `var(--hit-${i}-x, 50%)`, "--control-y": `var(--hit-${i}-y, 50%)` }} ref={(el) => { buttons.current[item.id] = el; }} aria-label={`View ${item.name} cartridge`} aria-expanded={selected === item.id} onFocus={() => setHovered(item.id)} onBlur={() => setHovered(null)} onClick={() => select(selected === item.id ? null : item.id)} />)}
            {active && <div className="cartridge-caption"><span>{active.name}</span><div className="caption-actions"><button className="text-link cartridge-enter" onClick={() => open(active.id)}>{active.id === "about" ? "View about" : active.id === "after-hours" ? "View after-hours" : "View case study"} <Icon type="arrow" /></button><div className="caption-tools"><button className="tool-button" aria-label="Reset cartridge rotation" onClick={() => engine.current?.reset()}><Icon type="reset" /></button><button className="tool-button" aria-label="Close cartridge" onClick={() => select(null)}><Icon type="close" /></button></div></div></div>}
          </div>
          {status === "loading" && <div className="collection-loading" role="status">Loading</div>}
          {status === "fallback" && <div className="cartridge-fallback" aria-label="Cartridge collection">{cartridges.map((item) => <button key={item.id} onClick={() => open(item.id)} aria-label={`Open ${item.name} cartridge`} style={{ "--shell": item.shell }}><img src={item.label} alt={`${item.name} cartridge label`} /></button>)}</div>}
        </div>
      </section>
      <div className="collection-content">
        <section aria-labelledby="selected-work"><h2 id="selected-work">Selected work</h2><nav aria-label="Selected work">{cartridges.filter((c) => c.id === "stadia" || c.id === "ai-mode").map((item) => <button key={item.id} className="content-row" onClick={() => open(item.id)}><span>{item.name}</span><span>Google</span><Icon type="arrow" /></button>)}</nav></section>
        <section aria-labelledby="after-hours"><h2 id="after-hours"><button className="text-link" onClick={() => open("after-hours")}>After-hours</button></h2><button className="content-row" onClick={photos}><span>Film photography</span><Icon type="arrow" /></button><div className="content-row static-row">Tennis</div><div className="content-row static-row">Games</div></section>
      </div>
      <footer className="collection-footer"><a href="/zine/">Zine edition <Icon type="arrow" /></a><a href="/versions/portfolio-zine-v1-source.zip" download>Download zine source <Icon type="download" /></a></footer>
    </main>
    {project && (project.kind === "project" ? <CaseStudy project={{ ...project, subtitle: "" }} onBack={close} Media={ProjectMedia} backLabel="Back to collection" identity="" /> : <PersonalReader project={project} onBack={close} onPhotos={photos} />)}
    {gallery && <FilmGallery emptyCopy="No photographs added yet." onClose={() => { setGallery(false); requestAnimationFrame(() => restoreFocus.current?.isConnected && restoreFocus.current.focus({ preventScroll: true })); }} />}
  </>;
}
createRoot(document.getElementById("root")).render(<App />);
