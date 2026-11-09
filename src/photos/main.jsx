import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '../site.css';
import '../after-hours/style.css';
import './style.css';
import {useContentReveal} from '../useContentReveal';
import {usePageExit} from '../usePageExit';
import {ThemeToggle} from '../ThemeToggle';
import {filmPhotos} from '../content/film-photos';
import {FloatingEnvelope} from './FloatingEnvelope';

const placeholders=Array.from({length:6},(_,index)=>({id:`placeholder-${index}`,alt:'Film photograph placeholder',placeholder:true}));
const frames=filmPhotos.length?filmPhotos:placeholders;
const angles=[-7,4,-3,5,-5,6];
function Photos(){
  const page=useRef(null),spread=useRef(null),stage=useRef(null),envelope=useRef(null),motion=useRef(null);
  const entry=useRef(window.__cameraEntry||null);
  const [phase,setPhase]=useState('closed'),[captionVisible,setCaptionVisible]=useState(Boolean(entry.current));
  const exit=usePageExit(page);
  useContentReveal(page,'photos-envelope');
  useEffect(()=>{
    document.documentElement.dataset.pageReady='true';const timer=setTimeout(()=>setCaptionVisible(false),1300);
    return()=>{clearTimeout(timer);delete window.__cameraEntry};
  },[]);
  useEffect(()=>{
    if(phase==='open'||!envelope.current)return;
    const controller=new FloatingEnvelope(envelope.current);motion.current=controller;
    return()=>{controller.dispose();motion.current=null};
  },[phase==='open']);
  useEffect(()=>{
    if(phase!=='open')return;
    // Let the closed/inert layout paint out before transferring keyboard focus.
    let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>spread.current?.focus({preventScroll:true}))});
    return()=>cancelAnimationFrame(frame);
  },[phase]);
  useLayoutEffect(()=>{
    if(phase!=='opening')return;
    motion.current?.setActive(false);
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    if(preference.matches){setPhase('open');return;}
    const source=envelope.current.getBoundingClientRect(),x=source.left+source.width/2,y=source.top+source.height*.2;
    const animations=[...spread.current.querySelectorAll('.polaroid')].map((card,index)=>{
      const rect=card.getBoundingClientRect(),dx=x-rect.left-rect.width/2,dy=y-rect.top-rect.height/2,angle=angles[index%angles.length];
      return card.animate([
        {opacity:0,transform:`translate(${dx}px,${dy}px) rotate(${angle-12}deg) scale(.22)`,filter:'blur(2px)'},
        {offset:.2,opacity:1,transform:`translate(${dx*.94}px,${dy-95}px) rotate(${angle-8}deg) scale(.4)`,filter:'blur(0)'},
        {offset:.8,opacity:1,transform:`translate(${dx*.05}px,${dy*.03-12}px) rotate(${angle+2}deg) scale(1.015)`,filter:'blur(0)'},
        {opacity:1,transform:`rotate(${angle}deg)`,filter:'none'},
      ],{duration:1000,delay:300+Math.min(index,8)*75,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'});
    });
    animations.push(stage.current.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(35px) scale(.93)'}],{duration:420,delay:520+Math.min(frames.length-1,8)*75,easing:'ease-in',fill:'both'}));
    let active=true;
    const finish=()=>{if(active)setPhase('open')};
    Promise.all(animations.map(animation=>animation.finished)).then(finish).catch(()=>{});
    const settle=()=>{animations.forEach(animation=>animation.finish());finish()};
    const reduce=()=>{if(preference.matches)settle()};
    preference.addEventListener('change',reduce);window.addEventListener('resize',settle);
    return()=>{active=false;preference.removeEventListener('change',reduce);window.removeEventListener('resize',settle);animations.forEach(animation=>animation.cancel())};
  },[phase]);
  return <main ref={page} onClick={exit.onLinkClick} data-exiting={exit.exiting} inert={exit.exiting} className="photos-page" data-reveal-flow="page" data-ready="true" data-camera-entry={Boolean(entry.current)} data-arrived="true" data-envelope-state={phase}>
    <header className="zine-header-shell"><nav data-reveal data-reveal-at="0" className="zine-header" aria-label="Main navigation">
      <a className="after-hours-back" href="/" aria-label="Home"><span className="link-copy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>Home</span></a>
      <ThemeToggle />
    </nav></header>
    <h1 className="sr-only">Film photographs</h1>
    {phase!=='open'&&<div ref={stage} className="film-envelope-stage" data-reveal data-reveal-at="180">
      <div className="film-envelope-scene">
        <span className="film-envelope-shadow" aria-hidden="true"/>
        <button ref={envelope} type="button" className="film-envelope" aria-label={`Open ${frames.length} film photographs`} aria-expanded={phase!=='closed'} aria-controls="film-prints" disabled={phase==='opening'} onClick={()=>setPhase('opening')}>
          <span className="film-envelope-back" aria-hidden="true"/>
          <span className="film-envelope-print-stack" aria-hidden="true"/>
          <span className="film-envelope-front" aria-hidden="true"><span className="envelope-wordmark">JOSH LUCAS<span>FILM ARCHIVE</span></span><span className="envelope-stamp">{String(frames.length).padStart(2,'0')}<span>PRINTS</span></span><span className="envelope-serial">SCAN / KEEP / REPEAT <i/></span></span>
          <span className="film-envelope-flap" aria-hidden="true"/>
        </button>
      </div>
    </div>}
    <div ref={spread} id="film-prints" className="photo-spread" role="region" tabIndex={-1} aria-label="Film photograph collection" aria-hidden={phase!=='open'} inert={phase!=='open'}>{frames.map((photo,index)=><div key={photo.id||photo.src} className="photo-slot"><figure className="polaroid" style={{'--photo-angle':`${angles[index%angles.length]}deg`}}>
      {photo.placeholder?<div className={`polaroid-image photo-placeholder photo-placeholder-${index%3}`} role="img" aria-label={photo.alt}><span>photo coming soon</span></div>:<img className="polaroid-image" src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading={index<6?'eager':'lazy'} decoding="async"/>}
      <figcaption>{photo.caption||photo.film||<span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>}</figcaption>
    </figure></div>)}</div>
    <span className="sr-only" role="status">{phase==='open'?`${frames.length} film photographs are now displayed.`:phase==='opening'?'Opening the film envelope.':'Open the envelope to view the photographs.'}</span>
    {captionVisible&&<span className="photo-entry-caption" style={{left:`${(entry.current?.camera?.x??.3)*100}%`,top:`${(entry.current?.camera?.y??.75)*100}%`}} onAnimationEnd={()=>setCaptionVisible(false)} aria-hidden="true">say cheese</span>}
  </main>;
}
createRoot(document.getElementById('root')).render(<Photos/>);
