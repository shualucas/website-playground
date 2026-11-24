import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-300.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import { portfolioProjects } from "./projects";
import { Intro } from "./Intro";
import { PortfolioFooter } from "./PortfolioFooter";
import { CaseStudy } from "../CaseStudy";
import { useContentReveal } from "../useContentReveal";
import { usePageExit } from "../usePageExit";
import { LocationMeta } from "./LocationMeta";
import { RecentProjects } from "./RecentProjects";
import { ThemeToggle } from "../ThemeToggle";
import { useDitherHovers } from "../useDitherHovers";
import "./style.css";
import "./reader.css";

const readRoute=()=>{
  const url=new URL(location.href),requested=url.searchParams.get("project"),id=requested==="ai-mode"?"search":requested;
  return url.searchParams.get("view")==="case-study"&&portfolioProjects.some(project=>project.id===id)?id:null;
};
function ProjectMedia({project,controls}) {
  if(project.previewVideo)return <video src={project.previewVideo} poster={project.previewPoster||undefined} controls={controls} playsInline muted preload="metadata"/>;
  if(project.previewGif||project.previewPoster||project.previewImage)return <img src={project.previewGif||project.previewPoster||project.previewImage} alt={project.imageAlt}/>;
  return <div className="collection-media-placeholder">Project preview</div>;
}
function App() {
  useDitherHovers();
  const content=useRef(null),restoreFocus=useRef(null);
  const pageExit=usePageExit(content);
  const [status,setStatus]=useState("loading"),[reading,setReading]=useState(readRoute),[previewingProject,setPreviewingProject]=useState(null);
  const readingRef=useRef(reading),previousReading=useRef(reading);readingRef.current=reading;
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem("cartridge-color-mode")!=="light"}catch{return true}});
  useContentReveal(content,status+":"+(reading||""));
  const project=portfolioProjects.find(project=>project.id===reading);
  const open=id=>{
    if(readingRef.current)return;
    const destination=portfolioProjects.find(project=>project.id===id);if(!destination)return;
    restoreFocus.current=document.activeElement;
    if(destination.href){pageExit.run(()=>location.assign(destination.href),{navigation:true});return}
    pageExit.run(()=>{
      const url=new URL(location.href);url.searchParams.set("project",id);url.searchParams.set("view","case-study");
      history.pushState({cartridgeReader:true},"",url);setReading(id);
    });
  };
  const close=()=>{
    if(history.state?.cartridgeReader)history.back();
    else{const url=new URL(location.href);url.searchParams.delete("view");url.searchParams.delete("project");history.replaceState(null,"",url);setReading(null)}
  };
  const closeRef=useRef(close);closeRef.current=close;
  useEffect(()=>{
    if(!readingRef.current){const url=new URL(location.href);url.searchParams.delete("project");history.replaceState(history.state,"",url)}
    const pop=()=>{pageExit.cancel();setReading(readRoute())};
    const keyboard=event=>{
      if(event.defaultPrevented||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.metaKey||event.ctrlKey||event.altKey)return;
      if(event.key==="Escape"){
        if(content.current?.dataset.exiting==="true")pageExit.cancel();
        else if(readingRef.current)closeRef.current();
        else return;
        event.preventDefault();
      }
    };
    window.addEventListener("popstate",pop);window.addEventListener("keydown",keyboard);
    return()=>{window.removeEventListener("popstate",pop);window.removeEventListener("keydown",keyboard)};
  },[]);
  useEffect(()=>{
    if(previousReading.current&&!reading){
      const target=restoreFocus.current?.isConnected&&restoreFocus.current!==document.body?restoreFocus.current:content.current?.querySelector(".recent-project-link");
      target?.focus({preventScroll:true});
    }
    previousReading.current=reading;
  },[reading]);
  return <>
    <main ref={content} onClick={pageExit.onLinkClick} className="collection" data-hero="inline" data-reveal-flow="page" data-status={status} data-presented="true" data-project-browsing={Boolean(previewingProject)} data-exiting={pageExit.exiting} inert={reading||pageExit.exiting?true:undefined}>
      <header className="collection-header"><LocationMeta/><ThemeToggle data-reveal dark={dark} onToggle={setDark}/></header>
      <section className="collection-hero" aria-label="Introduction and career cartridges">
        <Intro active={!reading&&!pageExit.exiting} previewColor={previewingProject?.color} onStatusChange={setStatus}/>
      </section>
      <RecentProjects onPreviewChange={setPreviewingProject} onOpen={open} dark={dark} ready={status==="ready"} hidden={Boolean(reading)} exiting={pageExit.exiting}/>
      {!reading&&<PortfolioFooter dismissHistory={Boolean(previewingProject)}/>}
    </main>
    {project&&<CaseStudy project={project} onBack={close} Media={ProjectMedia} backLabel="Home" identity="" dark={dark} onToggleTheme={setDark} footer={<PortfolioFooter/>}/>}
  </>;
}
createRoot(document.getElementById("root")).render(<App/>);
