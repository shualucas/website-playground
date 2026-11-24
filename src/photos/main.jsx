import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import '../site.css';
import '../after-hours/style.css';
import './style.css';
import {useContentReveal} from '../useContentReveal';
import {usePageExit} from '../usePageExit';
import {ThemeToggle} from '../ThemeToggle';
import {useDitherHovers} from '../useDitherHovers';
import {filmPhotos} from '../content/film-photos';
import {FloatingEnvelope} from './FloatingEnvelope';
import {ParcelStickers,StickerArt,parcelStickers} from './ParcelStickers';
import {PhotoTable} from './PhotoTable';
import {PhotoLightbox} from './PhotoLightbox';

const frames=filmPhotos;
function Photos(){
  useDitherHovers();
  const page=useRef(null),spread=useRef(null),stage=useRef(null),envelope=useRef(null),motion=useRef(null);
  const entry=useRef(window.__cameraEntry||null);
  const [placed,setPlaced]=useState({}),[selected,setSelected]=useState(null);
  const placeSticker=(sticker,position)=>setPlaced(current=>({...current,[sticker.id]:position}));
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
    const source=envelope.current.getBoundingClientRect(),x=source.right-source.width*.08-65,y=source.top+source.height*.5-25;
    const animations=[...spread.current.querySelectorAll('.photo-print')].map((card,index)=>{
      const rect=card.getBoundingClientRect(),dx=x-rect.left-rect.width/2,dy=y-rect.top-rect.height/2;
      const angle=parseFloat(card.style.getPropertyValue('--photo-angle'));
      const animation=card.animate([
        {opacity:0,transform:`translate(${dx}px,${dy}px) rotate(${angle-18}deg) scale(.45)`,boxShadow:'0 18px 35px #0003'},
        {offset:.12,opacity:1,transform:`translate(${dx+45}px,${dy+32}px) rotate(${angle+14}deg) scale(.72)`,boxShadow:'0 22px 32px #0003'},
        {offset:.74,opacity:1,transform:`translate(${dx*.03}px,${dy*.025-12}px) rotate(${angle-3}deg) scale(1.03)`,boxShadow:'0 12px 18px #0002'},
        {offset:.9,opacity:1,transform:`translate(0,2px) rotate(${angle+1}deg) scale(.995)`,boxShadow:'0 1px 2px #0003'},
        {opacity:1,transform:`rotate(${angle}deg)`,boxShadow:'0 1px 2px #0003,0 5px 11px #0002'},
      ],{duration:1050+(index%3)*65,delay:250+Math.floor(index/4)*190+(index%4)*32,easing:'cubic-bezier(.25,.65,.3,1)',fill:'both'});
      animation.pause();return animation;
    });
    const scene=stage.current.querySelector('.film-envelope-scene');
    const shake=scene.animate([
      {transform:'none'},
      {offset:.16,transform:'translate(-65px,-70px) rotate(16deg)'},
      ...Array.from({length:8},(_,i)=>({offset:.22+i*.075,transform:`translate(${i%2?-55:-78}px,${i%2?-82:-58}px) rotate(${i%2?13:23}deg)`})),
      {transform:'translate(-65px,-70px) rotate(16deg)'},
    ],{duration:1600,easing:'ease-in-out',fill:'both'});shake.pause();animations.push(shake);
    const depart=stage.current.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translate(-80px,-55px) scale(.93)'}],{duration:420,delay:1500,easing:'ease-in',fill:'both'});depart.pause();animations.push(depart);
    let active=true;
    const finish=()=>{if(active)setPhase('open')};
    let preparationTimer;
    const decoded=Promise.all([...spread.current.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
    Promise.race([decoded,new Promise(resolve=>{preparationTimer=setTimeout(resolve,700)})]).then(()=>{if(active)animations.forEach(animation=>animation.play())});
    Promise.all(animations.map(animation=>animation.finished)).then(finish).catch(()=>{});
    const settle=()=>{animations.forEach(animation=>animation.finish());finish()};
    const reduce=()=>{if(preference.matches)settle()};
    preference.addEventListener('change',reduce);window.addEventListener('resize',settle);
    return()=>{active=false;clearTimeout(preparationTimer);preference.removeEventListener('change',reduce);window.removeEventListener('resize',settle);animations.forEach(animation=>animation.cancel())};
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
          <span className="film-envelope-front" aria-hidden="true">
            <span className="envelope-wordmark">say cheese!</span>
            <span className="envelope-postmark"><span>35 MM · FILM ARCHIVE</span><span>{frames.length} little moments, kept.</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 3v18M3 12h18M6 6l12 12M6 18 18 6"/></svg></span>
            {parcelStickers.filter(sticker=>placed[sticker.id]).map(sticker=><span key={sticker.id} className="parcel-sticker-placed" style={{left:placed[sticker.id].x+'%',top:placed[sticker.id].y+'%','--sticker-angle':sticker.angle+'deg'}}><StickerArt sticker={sticker}/></span>)}
          </span>
          <span className="film-envelope-flap" aria-hidden="true"/>
        </button>
      </div>
      <ParcelStickers envelope={envelope} placed={placed} onPlace={placeSticker} disabled={phase!=='closed'}/>
    </div>}
    <PhotoTable tableRef={spread} photos={frames} phase={phase} onSelect={(index,opener)=>setSelected({index,opener})}/>
    {selected&&<PhotoLightbox photos={frames} initial={selected.index} opener={selected.opener} onClose={()=>setSelected(null)}/>}
    <span className="sr-only" role="status">{phase==='open'?`${frames.length} film photographs are now displayed.`:phase==='opening'?'Shaking photographs out of the mailer.':'Open the envelope to view the photographs.'}</span>
    {captionVisible&&<span className="photo-entry-caption" style={{left:`${(entry.current?.camera?.x??.3)*100}%`,top:`${(entry.current?.camera?.y??.75)*100}%`}} onAnimationEnd={()=>setCaptionVisible(false)} aria-hidden="true">say cheese</span>}
  </main>;
}
createRoot(document.getElementById('root')).render(<Photos/>);
