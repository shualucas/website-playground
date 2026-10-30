import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "../cartridge/style.css";
import "./style.css";
import { useContentReveal } from "../useContentReveal";
import { ThemeToggle } from "../ThemeToggle";
import { FloatingPaper } from "./FloatingPaper";
import { AmbientGradient } from "./AmbientGradient";
import { DownloadMotion } from "./DownloadMotion";
import { resume } from "./profile";
import { paper, paperContacts } from "./paper";

function ResumeDocument({ hidden = false }) {
  return <article className={hidden ? "resume-document sr-only" : "resume-document"} aria-labelledby="resume-name">
    <header className="resume-print-heading"><h1 id="resume-name">{resume.name}</h1><p>// Senior product designer</p></header>
    <div className="resume-print-columns">
      <aside className="resume-print-sidebar" aria-label="Tools and skills">
        <section className="resume-tools" aria-labelledby="tools-title"><h2 id="tools-title">Tools</h2><ul>{resume.tools.map(tool => <li key={tool}>{tool}</li>)}</ul></section>
        <section className="resume-skills" aria-labelledby="skills-title"><h2 id="skills-title">Skills</h2><ul>{resume.skills.map(skill => <li key={skill}>{skill}</li>)}</ul></section>
      </aside>
      <section className="resume-experience" aria-labelledby="experience-title"><h2 id="experience-title">Experience</h2>
        {resume.experience.map((job, index) => <section className="resume-job" key={job.company} aria-labelledby={`job-${index}`}><h3 id={`job-${index}`}>{job.company}</h3><div className="resume-job-meta"><span>{job.role}</span><span>{job.period}</span></div><ul>{job.work.map(line => <li key={line}>{line}</li>)}</ul></section>)}
      </section>
    </div>
    {!hidden && <footer className="resume-print-contacts">
      <a href={resume.links.portfolio}>joshglucas.com</a><a href={`mailto:${resume.email}`}>{resume.email}</a><a href={resume.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">/joshglucas</a>
    </footer>}
  </article>;
}

function Resume() {
  const content = useRef(null), sheet = useRef(null), controller = useRef(null), explicitView = useRef(false);
  const wash = useRef(null), downloadButton = useRef(null), downloadMotion = useRef(null), viewTransition = useRef(null);
  const [view, setView] = useState(() => matchMedia("(max-width: 700px)").matches ? "read" : "page");
  const requestedView = useRef(view);
  const [artReady, setArtReady] = useState(false), [artFailed, setArtFailed] = useState(false);
  const reading = view === "read" || artFailed;
  useLayoutEffect(() => {
    document.documentElement.dataset.resumeView = reading ? "read" : "page";
    return () => { delete document.documentElement.dataset.resumeView; };
  }, [reading]);
  useContentReveal(content, "resume-paper");
  useEffect(() => {
    const motion = new DownloadMotion(sheet.current, downloadButton.current); downloadMotion.current = motion;
    return () => { motion.dispose(); downloadMotion.current = null; viewTransition.current?.skipTransition(); };
  }, []);
  useEffect(() => {
    if (!reading) return;
    const gradient = new AmbientGradient(wash.current); return () => gradient.dispose();
  }, [reading]);
  useEffect(() => {
    const mobile = matchMedia("(max-width: 700px)");
    const update = () => { if (!explicitView.current) setView(mobile.matches ? "read" : "page"); };
    mobile.addEventListener("change", update); return () => mobile.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reading || !artReady) return;
    const paperScene = new FloatingPaper(sheet.current); controller.current = paperScene;
    const reset = event => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.target?.isContentEditable || event.target?.closest?.("input,textarea,select")) return;
      if (event.key.toLowerCase() === "r") paperScene.reset();
    };
    window.addEventListener("keydown", reset);
    return () => { window.removeEventListener("keydown", reset); paperScene.dispose(); controller.current = null; };
  }, [reading, artReady]);
  const chooseView = next => {
    explicitView.current = true;
    if (next === requestedView.current && viewTransition.current) return;
    requestedView.current = next;
    viewTransition.current?.skipTransition();
    viewTransition.current = null;
    if (next === view) return;
    const commit = () => { if (requestedView.current !== next) return; flushSync(() => setView(next)); window.scrollTo(0, 0); };
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const transition = document.startViewTransition(commit); viewTransition.current = transition;
      transition.ready.catch(() => {});
      transition.finished.catch(() => {}).finally(() => { if (viewTransition.current === transition) viewTransition.current = null; });
    } else commit();
  };
  return <main ref={content} className="collection resume-page" data-reveal-flow="page" data-view={reading ? "read" : "page"}>
    <div className="resume-gradient" ref={wash} data-active={reading} aria-hidden="true"><div className="resume-wash-pink" /><div className="resume-wash-warm" /></div>
    <header className="collection-header resume-nav" data-reveal data-reveal-at="0">
      <a href="/" aria-label="Back to Josh Lucas"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>Josh Lucas</a><ThemeToggle />
    </header>
    <div className="resume-toolbar" data-reveal data-reveal-at="90">
      <div className="resume-view-switch" role="group" aria-label="Résumé view"><button type="button" aria-pressed={!reading} onClick={() => chooseView("page")} disabled={artFailed}>Page</button><button type="button" aria-pressed={reading} onClick={() => chooseView("read")}>Read</button></div>
      <a className="resume-download" ref={downloadButton} href={resume.links.pdf} download="Josh-Lucas-Resume.pdf" onPointerEnter={() => downloadMotion.current?.preload()} onFocus={() => downloadMotion.current?.preload()} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) downloadMotion.current?.play(); }}>Download PDF<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3" /></svg></a>
    </div>
    <p className="sr-only" role="status">{reading ? "Reading view. Text is selectable and arranged for your screen." : "Floating page view. Use Read for selectable text."}</p>
    <div className="resume-paper-stage" data-reveal data-reveal-at="180">
      <div className="resume-sheet" ref={sheet} data-art-ready={artReady} data-mode={reading ? "read" : "page"}>
        {!reading && <div className="resume-artwork" style={{ aspectRatio: `${paper.width} / ${paper.height}` }}>
          <picture><source media="(min-width: 701px)" srcSet="/resume/resume-art-2400.png" /><img src="/resume/resume-art-1200.png" alt="" aria-hidden="true" width={paper.width} height={paper.height} draggable="false" fetchPriority="high" decoding="async" onLoad={() => setArtReady(true)} onError={() => setArtFailed(true)} /></picture>
          {!artReady && <p className="resume-art-loading" role="status">Loading your résumé…</p>}
          {artReady && paperContacts.map(contact => <a className="paper-contact" key={contact.label} href={contact.href} aria-label={contact.label} target={contact.href.startsWith("https:") ? "_blank" : undefined} rel={contact.href.startsWith("https:") ? "noopener noreferrer" : undefined} style={{ left:`${contact.x / paper.width * 100}%`, top:`${(contact.y + contact.height / 2) / paper.height * 100}%`, width:`${contact.width / paper.width * 100}%`, height:`${contact.height / paper.height * 100}%` }} />)}
        </div>}
        <ResumeDocument hidden={!reading} />
      </div>
    </div>
  </main>;
}
createRoot(document.getElementById("root")).render(<Resume />);
