import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../favicon";
import { flushSync } from "react-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "../site.css";
import "./style.css";
import { usePageExit } from "../usePageExit";
import { useContentReveal } from "../useContentReveal";
import { ThemeToggle } from "../ThemeToggle";
import { FloatingPaper } from "./FloatingPaper";
import { AmbientGradient } from "./AmbientGradient";
import { DownloadMotion } from "./DownloadMotion";
import { resume } from "./profile";
import { paper, paperContacts } from "./paper";
import { ResumeTransition } from "./ResumeTransition";

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

  </article>;
}

function Resume() {
  const content = useRef(null), sheet = useRef(null), controller = useRef(null), explicitView = useRef(false);
  const openRead = useRef(null), readSheet=useRef(null), displayedReading=useRef(false), previewWaiters=useRef([]);
  const pageExit=usePageExit(content);
  const wash = useRef(null), downloadButton = useRef(null), downloadMotion = useRef(null), viewTransition = useRef(null);
  const [view, setView] = useState(() => matchMedia("(max-width: 700px)").matches ? "read" : "page");
  const requestedView = useRef(view);
  const [selectedView,setSelectedView]=useState(view),[previewRequested,setPreviewRequested]=useState(view === "page"),[transitioning,setTransitioning]=useState(false);
  const [paperReady,setPaperReady]=useState(false),[gradientReady,setGradientReady]=useState(false);
  const gradientMotion=useRef(null);
  const [artReady, setArtReady] = useState(false), [artFailed, setArtFailed] = useState(false);
  const reading = view === "read" || artFailed;
  const navigationReading = selectedView === "read" || artFailed;
  displayedReading.current=reading;
  useLayoutEffect(() => {
    document.documentElement.dataset.resumeView = reading ? "read" : "page";
    return () => { delete document.documentElement.dataset.resumeView; };
  }, [reading]);
  useContentReveal(content, "resume-paper");
  useEffect(() => {
    const motion = new DownloadMotion(()=>displayedReading.current?readSheet.current:sheet.current, downloadButton.current); downloadMotion.current = motion;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const stopTransition = () => {
      if(!preference.matches)return;
      viewTransition.current?.dispose();viewTransition.current=null;
      setView(requestedView.current);setTransitioning(false);
    };
    const settleResize=()=>{if(viewTransition.current){viewTransition.current.dispose();viewTransition.current=null;setView(requestedView.current);setTransitioning(false)}};
    window.addEventListener('resize',settleResize);
    preference.addEventListener("change", stopTransition);
    return () => { window.removeEventListener("resize",settleResize);preference.removeEventListener("change", stopTransition); motion.dispose(); downloadMotion.current = null; viewTransition.current?.dispose(); viewTransition.current=null; };
  }, []);
  useEffect(() => {
    const gradient = new AmbientGradient(wash.current,false);gradientMotion.current=gradient;return () => {gradient.dispose();gradientMotion.current=null};
  }, []);
  useEffect(()=>{gradientMotion.current?.setActive(gradientReady)},[gradientReady]);
  useEffect(()=>{
    if(gradientReady||(!reading&&!paperReady))return;
    let cancelled=false,timer;
    (async()=>{
      await document.fonts.ready;
      const stage=reading?readSheet.current:sheet.current?.parentElement;
      await Promise.allSettled((stage?.getAnimations({subtree:true})??[]).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished));
      if(!cancelled)timer=setTimeout(()=>setGradientReady(true),180);
    })();
    return()=>{cancelled=true;clearTimeout(timer)};
  },[gradientReady,reading,paperReady]);
  useEffect(() => {
    controller.current?.setActive(!reading && !transitioning && !pageExit.exiting);
  },[reading,transitioning,pageExit.exiting]);
  useEffect(() => {
    const mobile = matchMedia("(max-width: 700px)");
    const update = () => { if (!explicitView.current) { const next=mobile.matches ? "read" : "page"; requestedView.current=next;setSelectedView(next);if(next==="page")setPreviewRequested(true);setView(next); } };
    mobile.addEventListener("change", update); return () => mobile.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!artReady || artFailed) return;
    const scene=new FloatingPaper(sheet.current,()=>openRead.current?.());controller.current=scene;
    scene.setActive(!displayedReading.current);
    let mounted=true;scene.ready.then(()=>{if(!mounted)return;setPaperReady(true);previewWaiters.current.splice(0).forEach(resolve=>resolve(true))});
    const reset=event=>{if(!displayedReading.current&&!viewTransition.current&&!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.target?.closest?.('input,textarea,select')&&event.key.toLowerCase()==='r')scene.reset()};
    window.addEventListener('keydown',reset);
    return ()=>{mounted=false;window.removeEventListener('keydown',reset);scene.dispose();controller.current=null;previewWaiters.current.splice(0).forEach(resolve=>resolve(false))};
  },[artReady,artFailed]);
  useEffect(()=>{if(artFailed){previewWaiters.current.splice(0).forEach(resolve=>resolve(false));setSelectedView('read')}},[artFailed]);
  const chooseView=async next=>{
    explicitView.current=true;requestedView.current=next;setSelectedView(next);
    if(viewTransition.current){viewTransition.current.select(next);return;}
    if(next===view||artFailed)return;
    if(next==='page'){
      setPreviewRequested(true);
      const available=controller.current?await controller.current.ready:await new Promise(resolve=>previewWaiters.current.push(resolve));
      if(!available||requestedView.current!==next)return;
    }
    if(viewTransition.current){viewTransition.current.select(next);return;}
    controller.current?.setActive(false);
    const commit=target=>{
      viewTransition.current?.dispose();viewTransition.current=null;
      flushSync(()=>{setView(target);setTransitioning(false);setSelectedView(target)});window.scrollTo(0,0);
      controller.current?.setActive(target==='page');
    };
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){commit(next);return;}
    const snapshot=controller.current?.capture();
    if(!snapshot){commit(next);return;}
    const motion=new ResumeTransition(view,next,readSheet.current,snapshot,commit);
    viewTransition.current=motion;flushSync(()=>setTransitioning(true));
  };
  openRead.current = () => chooseView("read");
  return <main ref={content} onClick={pageExit.onLinkClick} data-exiting={pageExit.exiting} inert={pageExit.exiting} className="collection resume-page" data-reveal-flow="page" data-view={reading ? "read" : "page"} data-transitioning={transitioning}>
    <div className="resume-gradient" ref={wash} data-active={gradientReady} aria-hidden="true"><div className="resume-wash-pink" /><div className="resume-wash-warm" /></div>
    <div className="resume-header-shell"><header className="collection-header resume-nav" data-reveal data-reveal-at="0">
      <div className="resume-back-nav" data-reading={navigationReading}>
        <a className="resume-home-link" href="/" aria-label="Home" aria-hidden={navigationReading} inert={navigationReading} tabIndex={navigationReading ? -1 : undefined}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg><span>Home</span></a>
        <button type="button" className="resume-page-back" aria-label="Back to page view" aria-hidden={!navigationReading} inert={!navigationReading} tabIndex={navigationReading ? undefined : -1} disabled={artFailed} onClick={()=>chooseView("page")}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg></button>
      </div><ThemeToggle />
    </header></div>
    <div className="resume-toolbar" data-reveal data-reveal-at="90">
      <div className="resume-view-switch" role="group" aria-label="Résumé view"><button type="button" aria-pressed={selectedView === "page"} onClick={() => chooseView("page")} disabled={artFailed}>Page</button><button type="button" aria-pressed={selectedView === "read"} onClick={() => chooseView("read")}>Read</button></div>
      <a className="resume-download" ref={downloadButton} href={resume.links.pdf} download="Josh-Lucas-Resume.pdf" onPointerEnter={() => downloadMotion.current?.preload()} onFocus={() => downloadMotion.current?.preload()} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) downloadMotion.current?.play(); }}>Download PDF<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3" /></svg></a>
    </div>
    <p className="sr-only" role="status">{reading ? "Reading view. Text is selectable and arranged for your screen." : "Floating page view. Click the paper to read, or drag to tilt."}</p>
    <div className="resume-floating-frame" aria-hidden={reading} inert={reading || transitioning}><div className="resume-paper-stage" data-reveal data-reveal-at="180">
      <div className="resume-sheet" ref={sheet} data-art-ready={artReady} data-mode="page">
        {previewRequested && <div className="resume-artwork" style={{ aspectRatio: `${paper.width} / ${paper.height}` }}>
          <button className="resume-read-target" type="button" aria-label="Open résumé in reading view" disabled={!artReady} onClick={() => chooseView("read")} />
          <picture><source media="(min-width: 701px)" srcSet="/resume/resume-art-2400.png" /><img src="/resume/resume-art-1200.png" alt="" aria-hidden="true" width={paper.width} height={paper.height} draggable="false" fetchPriority="high" decoding="async" onLoad={() => setArtReady(true)} onError={() => setArtFailed(true)} /></picture>
          {!artReady && <p className="resume-art-loading" role="status">Loading your résumé…</p>}
          {artReady && paperContacts.map(contact => <a className="paper-contact" key={contact.label} href={contact.href} aria-label={contact.label} target={contact.href.startsWith("https:") ? "_blank" : undefined} rel={contact.href.startsWith("https:") ? "noopener noreferrer" : undefined} style={{ left:`${contact.x / paper.width * 100}%`, top:`${(contact.y + contact.height / 2) / paper.height * 100}%`, width:`${contact.width / paper.width * 100}%`, height:`${contact.height / paper.height * 100}%` }} />)}
        </div>}
      </div>
    </div></div>
    <div className="resume-read-stage" aria-hidden={!reading} inert={!reading || transitioning}><div className="resume-read-sheet" ref={readSheet}><ResumeDocument /></div></div>
  </main>;
}
createRoot(document.getElementById("root")).render(<Resume />);
