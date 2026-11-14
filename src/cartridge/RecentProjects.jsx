import React,{useEffect,useLayoutEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {recentProjects} from "./projects";
import {entrance} from "./entrance";
import {ZinePreview} from "./ZinePreview";
import {DitherPreviewReveal} from "./DitherPreviewReveal";
import {CameraLink} from "./CameraLink";
import {LoopVideo} from "../LoopVideo";

const previews={
  "ai-mode-nudges":{team:"Search",accent:"#6988d8",kind:"ai",video:"/videos/nudges/nudges-hero-1280.mp4",poster:"/videos/nudges/nudges-hero-poster.jpg",width:1280,height:800},
  "search-labs":{team:"Search",accent:"#b759ba",kind:"search",placeholder:true},
  "stadia-store-redesign":{team:"Stadia",accent:"#e5633d",kind:"stadia",video:"/videos/stadia/lilycove-hero-1280.mp4",poster:"/videos/stadia/lilycove-hero-poster.jpg",label:"Stadia Store Redesign motion study",width:1280,height:800},
  "rave-flyer-zine":{team:"Fun",accent:"#e48dae",kind:"zine"},
  film:{team:"Fun",accent:"#b69272",kind:"film"},
};
const film={id:"film",label:"Say cheese!",description:"Film photographs",href:"/photos/"};
const projects=[...recentProjects.map(project=>project.id==="stadia-store-redesign"?{...project,label:"Store Redesign"}:project),film];
const projectAccent=(color,dark)=>dark?color:'#'+color.match(/[a-f\d]{2}/gi).map(value=>Math.round(parseInt(value,16)*.86+255*.14).toString(16).padStart(2,'0')).join('');
function useMedia(query){
  const [matches,setMatches]=useState(()=>matchMedia(query).matches);
  useEffect(()=>{const media=matchMedia(query),update=()=>setMatches(media.matches);media.addEventListener("change",update);update();return()=>media.removeEventListener("change",update)},[query]);
  return matches;
}
function PreviewArt({project,showing,seen,dark,setCameraTarget,retainZine=true}){
  const preview=previews[project?.id];
  const aspect=1.6;
  return <div className="recent-preview-content" data-kind={preview?.kind} style={{"--preview-aspect":aspect}}>
    <div className="recent-preview-art" data-motion={showing} style={{aspectRatio:aspect}}>
      <div className="recent-preview-source">
      <div ref={setCameraTarget} className="recent-special-preview" data-visible={showing&&preview?.kind==="film"}/>
      <div className="recent-special-preview" data-visible={showing&&preview?.kind==="zine"}>{seen.zine&&(retainZine||preview?.kind==="zine")&&<ZinePreview active={showing&&preview?.kind==="zine"} dark={dark}/>}</div>
      {project&&!["film","zine"].includes(preview.kind)&&<div key={`visual-${project.id}`} className="recent-solid-visual" data-visual={preview.kind} data-placeholder={preview.placeholder}>
        {preview.video&&<LoopVideo src={preview.video} poster={preview.poster} label={preview.label||"Tapping a follow-up nudge in AI Mode"} active={showing}/>}
        {preview.image&&<picture>{preview.poster&&<source media="(prefers-reduced-motion: reduce)" srcSet={preview.poster}/>}<img className="recent-preview-image" src={preview.image} width={preview.width} height={preview.height} alt="Stadia store navigation and game browsing" decoding="async"/></picture>}
      </div>}
      </div>
      {project&&<DitherPreviewReveal key={project.id} active={showing} kind={preview.kind} dark={dark}/>}
    </div>
  </div>;
}
export function RecentProjects({onOpen,dark,ready,hidden,exiting,onPreviewChange}){
  const canHover=useMedia("(min-width:761px) and (hover:hover) and (pointer:fine)");
  const [{active,visible},setPreview]=useState({active:null,visible:false});
  const [cameraTarget,setCameraTarget]=useState(null),[seen,setSeen]=useState({film:false,zine:false});
  const navigation=useRef(null),browser=useRef(null),pointer=useRef(null),focus=useRef(null),cameraAction=useRef(null);
  const select=(id,index)=>{
    setPreview(current=>current.active===id&&current.visible?current:{active:id,visible:true});const kind=previews[id]?.kind;
    if(kind==="film"||kind==="zine")setSeen(old=>old[kind]?old:{...old,[kind]:true});
    const height=browser.current?.clientHeight??0;
    navigation.current?.style.setProperty("--preview-offset",`${((index+.5)/projects.length-.5)*height*.45}px`);
  };
  const dismiss=()=>setPreview(current=>current.visible?{...current,visible:false}:current);
  const release=()=>{if(!canHover)return;const id=focus.current??pointer.current;if(id)select(id,projects.findIndex(p=>p.id===id));else dismiss()};
  const toggle=(id,index)=>{if(active===id&&visible)dismiss();else select(id,index)};
  const track=event=>{
    if(!canHover||(!pointer.current&&!focus.current)||event.pointerType==="touch"||!browser.current)return;
    const bounds=browser.current.getBoundingClientRect();
    const height=browser.current.querySelector(".recent-preview-art")?.getBoundingClientRect().height??0;
    const center=Math.max(16+height/2,Math.min(innerHeight-16-height/2,event.clientY));
    navigation.current?.style.setProperty("--preview-offset",`${center-bounds.top-bounds.height/2}px`);
  };
  const browse=(event,id,index)=>{if(!canHover||event.pointerType==="touch")return;pointer.current=id;select(id,index);track(event)};
  const focused=(event,id,index)=>{if(canHover&&event.target.matches(":focus-visible")){focus.current=id;select(id,index);const rect=event.target.getBoundingClientRect();track({clientX:rect.right-60,clientY:rect.top+rect.height/2,pointerType:"keyboard"})}};
  const project=projects.find(p=>p.id===active),preview=previews[active],showing=visible&&!hidden;
  const previewAspect=1.6;
  const accent=projectAccent(preview?.accent??"#6988d8",dark);
  const surface=showing?`color-mix(in srgb,color-mix(in srgb,${accent} ${dark?70:82}%,${dark?'#000':'#fff'}) 20%,var(--scene-bg))`:"var(--scene-bg)";
  useLayoutEffect(()=>{
    const root=navigation.current?.closest(".collection");if(!root)return;
    root.style.setProperty("--project-surface",surface);
    return()=>root.style.removeProperty("--project-surface");
  },[surface]);
  useEffect(()=>{onPreviewChange?.(showing?active:null)},[showing,active,onPreviewChange]);
  useEffect(()=>{pointer.current=focus.current=null;dismiss()},[canHover]);
  useEffect(()=>{
    if(canHover||!showing)return;const outside=event=>{if(!navigation.current?.contains(event.target))dismiss()};
    document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);
  },[canHover,showing]);
  const open=(event,item)=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
    if(item.id==="film"){cameraAction.current?.(event);return;}
    event.preventDefault();onOpen(item.id);
  };
  return <>
    {createPortal(<div className="project-hue-wash" aria-hidden="true" data-active={showing} data-exiting={Boolean(exiting)} style={{"--project-surface":surface}}>{Object.entries(previews).map(([id,item])=><span key={id} data-active={showing&&active===id} style={{"--wash-color":projectAccent(item.accent,dark)}}/>)}</div>,document.body)}
    <nav ref={navigation} className="recent-projects" aria-labelledby="recent-projects-title" data-preview-mode={canHover?"hover":"inline"} data-preview-active={showing} data-active-project={showing?active:""} data-color-intro="disabled" style={{"--preview-accent":accent,"--preview-width-scale":previewAspect/1.8}}
      onPointerLeave={()=>{pointer.current=null;release()}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){focus.current=null;release()}}}
      onKeyDown={event=>{if(!canHover&&showing&&event.key==="Escape"){event.preventDefault();event.stopPropagation();dismiss();navigation.current?.querySelector(`[data-project="${active}"] .recent-project-link`)?.focus({preventScroll:true})}}}>
      <h2 id="recent-projects-title" data-reveal data-reveal-at={entrance.projectsStart}>Recent projects</h2>
      <div ref={browser} className="recent-project-browser"><ul className="recent-project-list" onPointerMove={track} onPointerLeave={()=>{pointer.current=null;release()}}>
        {projects.map((item,index)=><li key={item.id} className={item.id==="film"?"recent-camera-row":undefined} data-project={item.id} data-active={showing&&active===item.id}
          onPointerEnter={event=>browse(event,item.id,index)} onFocus={event=>focused(event,item.id,index)} data-reveal data-reveal-at={entrance.projectsStart+(index+1)*60}>
          {item.id==="film"?<CameraLink dark={dark} ready={ready} hidden={hidden} rowTitle="Say cheese!" rowIndex={index+1} rowTeam="Fun" entranceAt={0} previewMode previewTarget={cameraTarget} previewActive={showing&&active==="film"} previewSeen={seen.film} openAction={cameraAction} onPreviewTap={!canHover?()=>toggle(item.id,index):undefined} expanded={!canHover&&showing&&active===item.id}/>
            :<a className="recent-project-link" href={item.href||`/?project=${item.id}&view=case-study`} role={canHover?undefined:"button"} aria-expanded={canHover?undefined:showing&&active===item.id} aria-controls={canHover?undefined:`preview-${item.id}`}
              onKeyDown={event=>{if(!canHover&&event.key===" "){event.preventDefault();event.currentTarget.click()}}}
              onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;if(!canHover){event.preventDefault();toggle(item.id,index)}else open(event,item)}}>
              <span className="recent-project-index" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
              <span className="recent-project-copy"><span className="recent-project-name">{item.label}</span></span>
              <span className="recent-project-team">{previews[item.id].team}</span>
            </a>}
          {!canHover&&showing&&active===item.id&&<div className="recent-inline-preview" id={`preview-${item.id}`} role="region" aria-label={`${item.label} preview`}>
            <PreviewArt project={item} showing={showing} seen={seen} dark={dark} setCameraTarget={setCameraTarget} retainZine={false}/>
            <p>{item.description}</p><a className="recent-project-open" href={item.href||`/?project=${item.id}&view=case-study`} onClick={event=>open(event,item)}>Open project <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>}
        </li>)}
      </ul>
      {canHover&&<div className="recent-project-preview" aria-hidden="true" data-visible={showing}><div className="recent-preview-frame"><PreviewArt project={project} showing={showing} seen={seen} dark={dark} setCameraTarget={setCameraTarget}/></div></div>}
      </div>
    </nav>
  </>;
}
