import React,{useEffect,useLayoutEffect,useRef,useState} from "react";
import {recentProjects} from "./projects";
import {entrance} from "./entrance";
import {ZinePreview} from "./ZinePreview";
import {AsciiPreviewReveal} from "./AsciiPreviewReveal";
import {CameraLink} from "./CameraLink";

const previews={
  "ai-mode-nudges":{team:"Search",accent:"#6988d8",kind:"ai"},
  "chat-bubbles":{team:"Search",accent:"#169b72",kind:"chat"},
  "search-labs":{team:"Search",accent:"#b759ba",kind:"search"},
  "stadia-store-redesign":{team:"Stadia",accent:"#e5633d",kind:"stadia",image:"/previews/stadia-store-redesign.gif",poster:"/previews/stadia-store-redesign-still.webp",width:640,height:429},
  "rave-flyer-zine":{team:"Fun",accent:"#e48dae",kind:"zine"},
  film:{team:"Fun",accent:"#b69272",kind:"film"},
};
const film={id:"film",label:"Say cheese!",description:"Film photographs",href:"/photos/"};
const projects=[...recentProjects,film];
function useMedia(query){
  const [matches,setMatches]=useState(()=>matchMedia(query).matches);
  useEffect(()=>{const media=matchMedia(query),update=()=>setMatches(media.matches);media.addEventListener("change",update);update();return()=>media.removeEventListener("change",update)},[query]);
  return matches;
}
function PreviewArt({project,showing,seen,dark,setCameraTarget,retainZine=true}){
  const preview=previews[project?.id];
  return <div className="recent-preview-content" data-kind={preview?.kind}>
    <div className="recent-preview-art" data-motion={showing}>
      <div className="recent-preview-source">
      <div ref={setCameraTarget} className="recent-special-preview" data-visible={showing&&preview?.kind==="film"}/>
      <div className="recent-special-preview" data-visible={showing&&preview?.kind==="zine"}>{seen.zine&&(retainZine||preview?.kind==="zine")&&<ZinePreview active={showing&&preview?.kind==="zine"} dark={dark}/>}</div>
      {project&&!["film","zine"].includes(preview.kind)&&<div key={`visual-${project.id}`} className="recent-solid-visual" data-visual={preview.kind}>{preview.image&&<picture>{preview.poster&&<source media="(prefers-reduced-motion: reduce)" srcSet={preview.poster}/>}<img className="recent-preview-image" src={preview.image} width={preview.width} height={preview.height} alt="Stadia store navigation and game browsing" decoding="async"/></picture>}</div>}
      </div>
      {project&&<AsciiPreviewReveal key={project.id} active={showing} kind={preview.kind}/>}
    </div>
  </div>;
}
export function RecentProjects({onOpen,dark,ready,hidden,onPreviewChange}){
  const canHover=useMedia("(hover:hover) and (pointer:fine)"),narrow=useMedia("(max-width:1099px), (max-height:700px)");
  const [active,setActive]=useState(null),[visible,setVisible]=useState(false);
  const [cameraTarget,setCameraTarget]=useState(null),[seen,setSeen]=useState({film:false,zine:false});
  const navigation=useRef(null),browser=useRef(null),pointer=useRef(null),focus=useRef(null),cameraAction=useRef(null);
  const select=(id,index)=>{
    setActive(id);setVisible(true);const kind=previews[id]?.kind;
    if(kind==="film"||kind==="zine")setSeen(old=>old[kind]?old:{...old,[kind]:true});
    const height=browser.current?.clientHeight??0;
    navigation.current?.style.setProperty("--preview-offset",`${((index+.5)/projects.length-.5)*height*.45}px`);
  };
  const release=()=>{if(!canHover)return;const id=focus.current??pointer.current;if(id)select(id,projects.findIndex(p=>p.id===id));else setVisible(false)};
  const toggle=(id,index)=>{if(active===id&&visible)setVisible(false);else select(id,index)};
  const track=event=>{
    if(!canHover||(!pointer.current&&!focus.current)||event.pointerType==="touch"||!browser.current)return;
    const bounds=browser.current.getBoundingClientRect(),y=Math.max(0,Math.min(bounds.height,event.clientY-bounds.top));
    navigation.current?.style.setProperty("--preview-offset",`${(y-bounds.height/2)*.45}px`);
    const width=Math.min(innerWidth>=1100?489:450,innerWidth-48,(innerHeight-32)*1.8),height=width/1.8;
    const top=event.clientY+height+20>innerHeight-16?event.clientY-height-18:event.clientY+18;
    navigation.current?.style.setProperty("--preview-client-y",`${Math.max(16,Math.min(innerHeight-height-16,top))}px`);
  };
  useLayoutEffect(()=>{
    const nav=navigation.current;if(!canHover||!nav)return;
    const align=()=>nav.style.setProperty("--preview-client-right",`${Math.max(16,innerWidth-nav.getBoundingClientRect().right)}px`);
    const observer=new ResizeObserver(align);observer.observe(nav);window.addEventListener("resize",align);align();
    return()=>{observer.disconnect();window.removeEventListener("resize",align)};
  },[canHover]);
  const browse=(event,id,index)=>{if(!canHover||event.pointerType==="touch")return;pointer.current=id;select(id,index);track(event)};
  const focused=(event,id,index)=>{if(canHover&&event.target.matches(":focus-visible")){focus.current=id;select(id,index);const rect=event.target.getBoundingClientRect();track({clientX:rect.right-60,clientY:rect.bottom,pointerType:"keyboard"})}};
  const project=projects.find(p=>p.id===active),preview=previews[active],showing=visible&&!hidden;
  useLayoutEffect(()=>{
    const root=navigation.current?.closest(".collection");if(!root)return;
    root.style.setProperty("--project-surface",showing?`color-mix(in srgb,${preview.accent} 16%,var(--scene-bg))`:"var(--scene-bg)");
    return()=>root.style.removeProperty("--project-surface");
  },[showing,preview?.accent]);
  useEffect(()=>{onPreviewChange?.(showing?active:null)},[showing,active,onPreviewChange]);
  useEffect(()=>{pointer.current=focus.current=null;setVisible(false)},[canHover]);
  useEffect(()=>{
    if(canHover||!showing)return;const outside=event=>{if(!navigation.current?.contains(event.target))setVisible(false)};
    document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);
  },[canHover,showing]);
  const open=(event,item)=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
    if(item.id==="film"){cameraAction.current?.(event);return;}
    event.preventDefault();onOpen(item.id);
  };
  return <>
    <div className="project-hue-wash" aria-hidden="true" data-active={showing}>{Object.entries(previews).map(([id,item])=><span key={id} data-active={showing&&active===id} style={{"--wash-color":item.accent}}/>)}</div>
    <nav ref={navigation} className="recent-projects" aria-labelledby="recent-projects-title" data-preview-mode={canHover?"hover":"inline"} data-preview-active={showing} data-active-project={showing?active:""} style={{"--preview-accent":preview?.accent??"#6988d8"}}
      onPointerLeave={()=>{pointer.current=null;release()}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){focus.current=null;release()}}}
      onKeyDown={event=>{if(!canHover&&showing&&event.key==="Escape"){event.preventDefault();event.stopPropagation();setVisible(false);navigation.current?.querySelector(`[data-project="${active}"] .recent-project-link`)?.focus({preventScroll:true})}}}>
      <h2 id="recent-projects-title" data-reveal data-reveal-at={entrance.projectsStart}>Recent projects</h2>
      <div ref={browser} className="recent-project-browser"><ul className="recent-project-list" onPointerMove={track} onPointerLeave={()=>{pointer.current=null;release()}}>
        {projects.map((item,index)=><li key={item.id} className={item.id==="film"?"recent-camera-row":undefined} data-project={item.id} data-active={showing&&active===item.id}
          onPointerEnter={event=>browse(event,item.id,index)} onFocus={event=>focused(event,item.id,index)} data-reveal data-reveal-at={entrance.projectsStart+(index+1)*60}>
          {item.id==="film"?<CameraLink dark={dark} ready={ready} hidden={hidden} rowTitle="Say cheese!" rowIndex={index+1} rowTeam="Fun" entranceAt={0} previewMode previewTarget={cameraTarget} previewActive={showing&&active==="film"} previewSeen={seen.film} openAction={cameraAction} onPreviewTap={!canHover?()=>toggle(item.id,index):undefined} expanded={!canHover&&showing&&active===item.id}/>
            :<a className="recent-project-link" href={item.href||`/?project=${item.id}&view=case-study`} role={canHover?undefined:"button"} aria-expanded={canHover?undefined:showing&&active===item.id} aria-controls={canHover?undefined:`preview-${item.id}`} aria-describedby={`recent-summary-${item.id}`}
              onKeyDown={event=>{if(!canHover&&event.key===" "){event.preventDefault();event.currentTarget.click()}}}
              onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;if(!canHover){event.preventDefault();toggle(item.id,index)}else open(event,item)}}>
              <span className="recent-project-index" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
              <span className="recent-project-copy"><span className="recent-project-name">{item.label}</span><span id={`recent-summary-${item.id}`} className={`recent-project-summary${previews[item.id].kind==="zine"?" sr-only":""}`} aria-hidden="true">{item.description}</span></span>
              <span className="recent-project-team">{previews[item.id].team}</span><svg className="recent-project-arrow" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>}
          {!canHover&&showing&&active===item.id&&<div className="recent-inline-preview" id={`preview-${item.id}`} role="region" aria-label={`${item.label} preview`}>
            <PreviewArt project={item} showing={showing} seen={seen} dark={dark} setCameraTarget={setCameraTarget} retainZine={false}/>
            <p>{item.description}</p><a className="recent-project-open" href={item.href||`/?project=${item.id}&view=case-study`} onClick={event=>open(event,item)}>Open project <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>}
        </li>)}
      </ul>
      {canHover&&<div className="recent-project-preview" aria-hidden="true" data-visible={showing} data-follow-cursor={narrow}><div className="recent-preview-frame"><PreviewArt project={project} showing={showing} seen={seen} dark={dark} setCameraTarget={setCameraTarget}/></div></div>}
      </div>
    </nav>
  </>;
}
