import React, { useLayoutEffect, useRef, useState } from 'react';

export function PhotoLightbox({photos,initial,opener,onClose}) {
  const dialog=useRef(null),image=useRef(null),animations=useRef([]),closing=useRef(false);
  const [index,setIndex]=useState(initial),first=useRef(true);
  useLayoutEffect(()=>{
    const node=dialog.current,previous=document.body.style.overflow;document.body.style.overflow='hidden';node.showModal();
    const motion=matchMedia('(prefers-reduced-motion: reduce)'),settle=()=>{if(motion.matches)animations.current.forEach(a=>a.finish())};motion.addEventListener('change',settle);
    return()=>{motion.removeEventListener('change',settle);animations.current.forEach(a=>a.cancel());node.close();document.body.style.overflow=previous;opener?.isConnected&&opener.focus({preventScroll:true})};
  },[]);
  useLayoutEffect(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){first.current=false;return}
    const node=image.current,rect=node.getBoundingClientRect(),source=opener?.getBoundingClientRect();
    const frames=first.current&&source?[
      {opacity:.6,transform:`translate(${source.left+source.width/2-rect.left-rect.width/2}px,${source.top+source.height/2-rect.top-rect.height/2}px) scale(${source.width/rect.width})`},
      {opacity:1,transform:'none'},
    ]:[{opacity:.3},{opacity:1}];
    animations.current.push(node.animate(frames,{duration:first.current?340:160,easing:'cubic-bezier(.2,.8,.2,1)'}));first.current=false;
  },[index]);
  const close=async()=>{
    if(closing.current)return;closing.current=true;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const node=image.current,rect=node.getBoundingClientRect(),source=(document.querySelector(`.photo-slot[data-photo-index="${index}"] .photo-print`)||opener)?.getBoundingClientRect();
      dialog.current.dataset.closing='true';
      const target=source?`translate(${source.left+source.width/2-rect.left-rect.width/2}px,${source.top+source.height/2-rect.top-rect.height/2}px) scale(${source.width/rect.width})`:'scale(.96)';
      const zoom=node.animate([{opacity:1,transform:'none'},{opacity:0,transform:target}],{duration:240,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
      animations.current.push(zoom);await zoom.finished.catch(()=>{});
    }
    onClose();
  };
  const change=direction=>{if(!closing.current)setIndex(value=>(value+direction+photos.length)%photos.length)};
  const photo=photos[index];
  return <dialog ref={dialog} className="photo-lightbox" aria-label="Photograph viewer" onCancel={event=>{event.preventDefault();void close()}}
    onClick={event=>{if(event.target===event.currentTarget)void close()}}
    onKeyDown={event=>{
      if(event.key==='Tab'){
        const buttons=[...dialog.current.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
      }
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();change(event.key==='ArrowRight'?1:-1)}
    }}>
    <button type="button" className="photo-viewer-close" autoFocus aria-label="Close photograph" onClick={close}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    <button type="button" className="photo-viewer-previous" aria-label="Previous photograph" onClick={()=>change(-1)}>←</button>
    <img ref={image} src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} draggable={false}/>
    <button type="button" className="photo-viewer-next" aria-label="Next photograph" onClick={()=>change(1)}>→</button>
    <span className="sr-only" role="status">Photograph {index+1} of {photos.length}: {photo.alt}</span>
  </dialog>;
}
