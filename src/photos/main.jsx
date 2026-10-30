import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '../cartridge/style.css';
import '../after-hours/style.css';
import './style.css';
import {useContentReveal} from '../useContentReveal';
import {FilmCamera} from '../cartridge/FilmCamera';
import {filmPhotos} from '../content/film-photos';

const placeholders=Array.from({length:6},(_,index)=>({id:`placeholder-${index}`,alt:'Film photograph placeholder',placeholder:true}));
const frames=filmPhotos.length?filmPhotos:placeholders;
const angles=[-7,4,-3,5,-5,6];
function Photos(){
  const page=useRef(null),spread=useRef(null),camera=useRef(null),timers=useRef([]),flights=useRef([]);
  const entry=useRef(window.__cameraEntry||null),started=useRef(false);
  const [dark,setDark]=useState(()=>document.documentElement.dataset.colorMode==='dark');
  const [ready,setReady]=useState(!entry.current),[cameraReady,setCameraReady]=useState(false),[cameraVisible,setCameraVisible]=useState(Boolean(entry.current));
  useContentReveal(page,ready,ready);
  useEffect(()=>{
    document.documentElement.dataset.colorMode=dark?'dark':'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#1b1c1b':'#f0f0f0');
    try{localStorage.setItem('cartridge-color-mode',dark?'dark':'light')}catch{}
  },[dark]);
  useEffect(()=>{
    // WebGL is optional; never leave the photos hidden behind a white flash.
    if(entry.current)timers.current.push(setTimeout(()=>setCameraReady(true),1800));
    return ()=>{timers.current.forEach(clearTimeout);flights.current.forEach(animation=>animation.cancel());delete window.__cameraEntry};
  },[]);
  useLayoutEffect(()=>{
    if(!entry.current||!cameraReady||started.current)return;
    started.current=true;setReady(true);document.documentElement.dataset.pageReady='true';
    const cards=[...spread.current.querySelectorAll('.polaroid')],cameraRect=camera.current?.getBoundingClientRect();
    const source={x:cameraRect?cameraRect.left+cameraRect.width/2:innerWidth*.3,y:cameraRect?cameraRect.top+cameraRect.height*.4:innerHeight*.7};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let active=true;
    const finish=()=>{if(!active)return;page.current?.setAttribute('data-arrived','true');setCameraVisible(false)};
    if(reduced.matches){finish();return;}
    cards.forEach((card,index)=>{
      const rect=card.getBoundingClientRect(),dx=source.x-rect.left-rect.width/2,dy=source.y-rect.top-rect.height/2,angle=angles[index%angles.length];
      const animation=card.animate([
        {opacity:0,transform:`translate(${dx}px,${dy}px) rotate(${angle-18}deg) scale(.12)`,filter:'blur(3px)'},
        {offset:.18,opacity:1,transform:`translate(${dx*.82}px,${dy*.82-45}px) rotate(${angle-12}deg) scale(.45)`,filter:'blur(0)'},
        {offset:.8,opacity:1,transform:`translate(0,-8px) rotate(${angle+1}deg) scale(1.015)`,filter:'blur(0)'},
        {opacity:1,transform:`rotate(${angle}deg)`,filter:'blur(0)'},
      ],{duration:800,delay:260+index*80,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'});
      flights.current.push(animation);
    });
    if(camera.current)flights.current.push(camera.current.animate([{opacity:1},{opacity:0,transform:'translateY(12px) scale(.96)'}],{duration:220,delay:260+Math.max(0,cards.length-1)*80+720,fill:'forwards'}));
    Promise.all(flights.current.map(animation=>animation.finished)).then(finish).catch(()=>{});
    const settle=()=>{flights.current.forEach(animation=>animation.finish());finish()};
    const motionChange=()=>{if(reduced.matches)settle()};
    reduced.addEventListener('change',motionChange);window.addEventListener('resize',settle,{once:true});
    return ()=>{active=false;reduced.removeEventListener('change',motionChange);window.removeEventListener('resize',settle)};
  },[cameraReady]);
  return <main ref={page} className="photos-page" data-reveal-flow="page" data-ready={ready} data-camera-entry={Boolean(entry.current)} data-arrived={!entry.current?'true':undefined}>
    <header className="zine-header-shell"><nav data-reveal data-reveal-at="0" className="zine-header" aria-label="Main navigation">
      <a className="after-hours-back" href="/" aria-label="Back to Josh Lucas"><span className="link-copy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>Josh Lucas</span></a>
      <button className="tool-button" type="button" onClick={()=>setDark(value=>!value)} aria-label={dark?'Switch to light mode':'Switch to dark mode'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">{dark?<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>:<path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a.5.5 0 0 0-.6-.6A9.5 9.5 0 1 0 21.5 13.7a.5.5 0 0 0-.6-.6Z"/>}</svg></button>
    </nav></header>
    <h1 className="sr-only">Film photographs</h1>
    <div ref={spread} className="photo-spread" aria-label="Film photograph collection">{frames.map((photo,index)=><div key={photo.id||photo.src} className="photo-slot" {...(!entry.current?{'data-reveal':true,'data-reveal-at':180+index*65}:{})}><figure className="polaroid" style={{'--photo-angle':`${angles[index%angles.length]}deg`}}>
      {photo.placeholder?<div className={`polaroid-image photo-placeholder photo-placeholder-${index%3}`} role="img" aria-label={photo.alt}><span>photo coming soon</span></div>:<img className="polaroid-image" src={photo.src} alt={photo.alt} loading={index>5?'lazy':'eager'} />}
      <figcaption>{photo.caption||(!photo.placeholder?photo.film:'')||<span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>}</figcaption>
    </figure></div>)}</div>
    {cameraVisible&&<div ref={camera} className="photo-entry-camera" style={{'--camera-x':`${Math.max(15,Math.min(85,(entry.current?.camera?.x||.3)*100))}%`,'--camera-y':`${Math.max(35,Math.min(85,(entry.current?.camera?.y||.75)*100))}svh`}} aria-hidden="true"><FilmCamera dark={dark} controller={null} initialPose={entry.current?.pose} entranceMotion={false} onReady={()=>setCameraReady(true)}/></div>}
  </main>;
}
createRoot(document.getElementById('root')).render(<Photos/>);
