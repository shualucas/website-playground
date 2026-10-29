import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import { cartridges } from "./config";
import { careerProjects } from "./projects";
import { Intro } from "./Intro";
import { PortfolioFooter } from "./PortfolioFooter";
import { prepareTitleFont } from "../content/typography";
import { CaseStudy } from "../CaseStudy";
import "./style.css";
import "./reader.css";

const selectedRoute = () => {
  const requested = new URL(location.href).searchParams.get("project");
  const id = requested === "ai-mode" ? "search" : requested;
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
function App() {
  const host = useRef(null), engine = useRef(null), alive = useRef(true), readingRef = useRef(null), presentedRef = useRef(false);
  const [selected, setSelected] = useState(null), [hovered, setHovered] = useState(null), [status, setStatus] = useState("loading");
  const [reading, setReading] = useState(readRoute);
  const currentSelection = useRef(null); currentSelection.current = selected;
  const presented = true;
  presentedRef.current = presented;
  const previousReading = useRef(reading), restoreFocus = useRef(null), buttons = useRef({});
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("cartridge-color-mode") === "dark"; } catch { return false; } });
  const selectRef = useRef(null);
  readingRef.current = reading;
  const active = cartridges.find((c) => c.id === selected), project = careerProjects.find((p) => p.id === reading);
  const select = (id) => {
    if (readingRef.current) return;
    setSelected(id); setHovered(null);
    const url = new URL(location.href); if (id) url.searchParams.set("project", id); else url.searchParams.delete("project");
    url.searchParams.delete("view"); history.replaceState(null, "", url);
  };
  selectRef.current = select;
  const open = (id) => {
    if (readingRef.current) return;
    restoreFocus.current = document.activeElement;
    setSelected(id); setHovered(null);
    const url = new URL(location.href); url.searchParams.set("project", id); url.searchParams.set("view", "case-study");
    history.pushState({ cartridgeReader: true }, "", url); setReading(id);
  };
  const close = () => {
    if (history.state?.cartridgeReader) history.back();
    else { const url = new URL(location.href); url.searchParams.delete("view"); history.replaceState(null, "", url); setSelected(readingRef.current); setReading(null); }
  };
  useEffect(() => {
    alive.current = true; let scene;
    if (!readingRef.current) {
      const url = new URL(location.href); url.searchParams.delete("project");
      history.replaceState(history.state, "", url);
    }
    Promise.all([import("./CartridgeScene"), prepareTitleFont(), document.fonts.ready]).then(([{ CartridgeScene }]) => {
      if (!alive.current) return;
      try {
        scene = new CartridgeScene(host.current, {
          onHover: setHovered, onSelect: (id) => selectRef.current(id),
          onReady: () => { if (alive.current) setStatus("ready"); },
          onError: () => { if (alive.current) { setStatus("fallback"); engine.current?.setPaused(true); } },
        });
        engine.current = scene; scene.setTheme(document.documentElement.dataset.colorMode === "dark");
        scene.setSelected(currentSelection.current); scene.setPaused(Boolean(readingRef.current) || !presentedRef.current);
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
    // The DOM has committed and inert is removed. Restore keyboard focus now,
    // rather than making it wait behind the resumed scene's GPU frame.
    if (previousReading.current && !reading) {
      const target = restoreFocus.current?.isConnected && restoreFocus.current !== document.body ? restoreFocus.current : buttons.current[selected];
      target?.focus({ preventScroll: true });
    }
    engine.current?.setPaused(Boolean(reading) || !presented || status === "fallback");
    previousReading.current = reading;
  }, [reading, presented, status]);
  useEffect(() => {
    const pop = () => { setReading(readRoute()); setSelected(selectedRoute()); };
    const keyboard = (event) => {
      if (!presentedRef.current) return;
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
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
  return <>
    <main className="collection" data-status={status} data-presented={presented} data-selected={selected || ""} inert={reading || !presented ? true : undefined}>
      <header className="collection-header"><a className="zine-edition-link" href="/zine/">Zine edition <Icon type="arrow" /></a><button className="tool-button" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} onClick={() => setDark(!dark)}><Icon type={dark ? "sun" : "moon"} /></button></header>
      <section className="collection-hero" aria-label="Introduction and cartridge collection">
        <Intro active={presented} />
        <div className="collection-display" aria-label="Interactive 3D cartridge collection">
          <div className={`cartridge-stage${status === "fallback" ? " is-fallback" : ""}`} ref={host} data-ready="false">
            {status === "ready" && cartridges.map((item, i) => <button key={item.id} className="cartridge-keyboard" style={{ "--control-x": `var(--hit-${i}-x, 50%)`, "--control-y": `var(--hit-${i}-y, 50%)` }} ref={(el) => { buttons.current[item.id] = el; }} aria-label={`View ${item.name} cartridge`} aria-expanded={selected === item.id} onFocus={() => setHovered(item.id)} onBlur={() => setHovered(null)} onClick={() => select(selected === item.id ? null : item.id)} />)}
            {active && status === "ready" && <button className="cartridge-caption" aria-label={`Open ${active.name}${active.years ? ", " + active.years : ""}`} onClick={() => open(active.id)}><span>{active.name}</span>{active.years && <span className="cartridge-years">{active.years}</span>}</button>}
          </div>
          {status === "fallback" && <div className="cartridge-fallback" aria-label="Cartridge collection">{cartridges.map((item) => <button key={item.id} onClick={() => open(item.id)} aria-label={`Open ${item.name} cartridge`}><span className="fallback-shell" style={{ "--shell": item.shell }}><img src={item.label} alt="" /></span><span>{item.name}</span>{item.years && <span className="cartridge-years">{item.years}</span>}</button>)}</div>}
        </div>
      </section>
      {presented && <PortfolioFooter dark={dark} ready={status === "ready"} hidden={Boolean(reading)} />}
    </main>
    {project && presented && <CaseStudy project={project} onBack={close} Media={ProjectMedia} backLabel="Back to collection" identity="" />}
  </>;
}
createRoot(document.getElementById("root")).render(<App />);
