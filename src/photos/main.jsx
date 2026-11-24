import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '../site.css';
import '../after-hours/style.css';
import './style.css';
import {useContentReveal} from '../useContentReveal';
import {usePageExit} from '../usePageExit';
import {ThemeToggle} from '../ThemeToggle';
import {useDitherHovers} from '../useDitherHovers';
import {filmPhotos} from '../content/film-photos';
import {PhotoLightbox} from './PhotoLightbox';

function FloatingGallery({active,onSelect,controllerRef}){
 const host=useRef(null),controller=useRef(null),enabled=useRef(active),[status,setStatus]=useState('loading');enabled.current=active;
 useEffect(()=>{
  let alive=true,scene;
  import('./FloatingPhotos').then(({FloatingPhotos})=>{
   if(!alive)return;scene=new FloatingPhotos(host.current,filmPhotos,status=>{if(alive){setStatus(status);document.documentElement.dataset.pageReady='true'}});controller.current=controllerRef.current=scene;scene.setActive(enabled.current);
  });
  return()=>{alive=false;scene?.dispose();controller.current=controllerRef.current=null};
 },[]);
 useEffect(()=>{controller.current?.setActive(active)},[active]);
 return <section ref={host} className="floating-photo-gallery" aria-label="Film photograph collection" aria-describedby="floating-photo-help" inert={!active} data-status={status} data-dither="bayer-4x4" data-grain-rate="24">
  {filmPhotos.map((photo,index)=><button key={photo.src} type="button" className="floating-photo-hit" data-photo-index={index} aria-label={`View photograph: ${photo.alt}`} aria-haspopup="dialog" onClick={event=>onSelect(index,event.currentTarget)} onDragStart={event=>event.preventDefault()}>
   <img className="floating-original" src={photo.src} alt="" width={photo.width} height={photo.height} draggable={false}/>
   <img className="floating-dither-fallback" alt="" aria-hidden="true" draggable={false}/>
  </button>)}
 </section>;
}
function Photos(){
 useDitherHovers();const page=useRef(null),gallery=useRef(null),busy=useRef(false),restore=useRef(null),[transitioning,setTransitioning]=useState(false),[selected,setSelected]=useState(null),exit=usePageExit(page);
 const select=async(index,opener)=>{
  if(busy.current||selected||transitioning)return;busy.current=true;setTransitioning(true);
  await gallery.current?.dissolve(index,false);setSelected({index,opener});setTransitioning(false);busy.current=false;
 };
 const close=async()=>{const {index,opener}=selected;busy.current=true;restore.current=opener;setSelected(null);setTransitioning(true);await gallery.current?.dissolve(index,true);setTransitioning(false);busy.current=false};
 useEffect(()=>{if(!transitioning&&!selected&&restore.current){restore.current.focus({preventScroll:true});restore.current=null}},[transitioning,selected]);
 useContentReveal(page,'floating-photos');
 return <main ref={page} className="photos-page" data-reveal-flow="page" data-ready="true" data-exiting={exit.exiting} inert={exit.exiting} onClick={exit.onLinkClick}>
  <header className="zine-header-shell"><nav data-reveal className="zine-header" aria-label="Main navigation">
   <a className="after-hours-back" href="/" aria-label="Home"><span className="link-copy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg>Home</span></a>
   <ThemeToggle/>
  </nav></header>
  <h1 className="sr-only">Film photographs</h1>
  <FloatingGallery controllerRef={gallery} active={!selected&&!transitioning&&!exit.exiting} onSelect={select}/>
  <p id="floating-photo-help" className="floating-photo-help">Move to reveal color. Drag to drift. Click to look closer.<span className="sr-only"> Focus a photograph and use arrow keys to move it, or Enter to open it.</span></p>
  {selected&&<PhotoLightbox photos={filmPhotos} initial={selected.index} opener={selected.opener} onClose={close}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Photos/>);
