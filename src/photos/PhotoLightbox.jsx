import React,{useLayoutEffect,useRef,useState} from 'react';
import {ditherAnimation} from './dither-transition';
import {photoPalette} from './photo-palette';

export function PhotoLightbox({photos,initial,opener,onClose,chosenPalette,onPalette}){
 const dialog=useRef(null),image=useRef(null),animation=useRef(null),closing=useRef(false),sequence=useRef(0),mounted=useRef(false);
 const [index,setIndex]=useState(initial),[palette,setPalette]=useState([]),[phase,setPhase]=useState('entering');
 useLayoutEffect(()=>{
  mounted.current=true;const node=dialog.current,previous=document.body.style.overflow;document.body.style.overflow='hidden';node.showModal();
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),settle=()=>{if(motion.matches)animation.current?.finish()};motion.addEventListener('change',settle);
  return()=>{mounted.current=false;sequence.current++;motion.removeEventListener('change',settle);animation.current?.cancel();node.close();document.body.style.overflow=previous;opener?.isConnected&&opener.focus({preventScroll:true})};
 },[]);
 useLayoutEffect(()=>{
  const node=image.current,request=++sequence.current;setPalette([]);setPhase('entering');animation.current?.cancel();
  // Hide during decode so a cached image never flashes ahead of its dither entrance.
  node.style.visibility='hidden';
  void(async()=>{
   await node.decode().catch(()=>{});if(!mounted.current||request!==sequence.current||closing.current)return;
   node.style.visibility='visible';const entrance=ditherAnimation(node,true,{duration:440});animation.current=entrance;
   void photoPalette(node).then(colors=>{if(mounted.current&&request===sequence.current)setPalette(colors)});
   await entrance.finished.catch(()=>{});if(mounted.current&&request===sequence.current&&!closing.current)setPhase('visible');
  })();
  return()=>{sequence.current++;animation.current?.cancel()};
 },[index]);
 const close=async()=>{
  if(closing.current)return;closing.current=true;sequence.current++;dialog.current.dataset.closing='true';setPhase('leaving');
  animation.current?.cancel();const exit=ditherAnimation(image.current,false,{duration:280});animation.current=exit;
  await exit.finished.catch(()=>{});if(mounted.current)onClose();
 };
 const change=async direction=>{
  if(closing.current)return;const request=++sequence.current;setPhase('leaving');animation.current?.cancel();
  const exit=ditherAnimation(image.current,false,{duration:180});animation.current=exit;await exit.finished.catch(()=>{});
  if(mounted.current&&!closing.current&&request===sequence.current)setIndex(value=>(value+direction+photos.length)%photos.length);
 };
 const photo=photos[index];
 return <dialog ref={dialog} className="photo-lightbox" data-phase={phase} aria-label="Photograph viewer"
  onCancel={event=>{event.preventDefault();void close()}} onClick={event=>{if(event.target===event.currentTarget)void close()}}
  onKeyDown={event=>{
   if(event.key==='Tab'){
    const buttons=[...dialog.current.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
   }
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();void change(event.key==='ArrowRight'?1:-1)}
  }}>
  <button type="button" className="photo-viewer-close" autoFocus aria-label="Close photograph" onClick={close}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
  <div className="photo-viewer-stage" style={{'--photo-aspect':photo.width/photo.height}}>
  <button type="button" className="photo-viewer-previous" aria-label="Previous photograph" onClick={()=>change(-1)}>←</button>
  <img ref={image} src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} draggable={false}/>
  <button type="button" className="photo-viewer-next" aria-label="Next photograph" onClick={()=>change(1)}>→</button>
  </div>
  <div className="photo-viewer-details">
   {palette.length>0&&<ul className="photo-palette" aria-label="Colors extracted from this photograph">{palette.map((color,i)=><li key={i} aria-label={color}><button type="button" style={{'--swatch':color}} aria-label={`Use ${color} as gallery accent`} title={`Use ${color} as gallery accent`} aria-pressed={chosenPalette?.colors.join(',')===palette.join(',')&&chosenPalette?.accent===color} onClick={()=>onPalette?.(palette,color)}><span style={{backgroundColor:color}}/></button></li>)}</ul>}
   {photo.caption&&<p className="photo-caption">{photo.caption}</p>}
  </div>
  <span className="sr-only" role="status">Photograph {index+1} of {photos.length}: {photo.alt}</span>
 </dialog>;
}
