import React, { useLayoutEffect, useRef } from "react";
import { HandwrittenText } from "./HandwrittenText";
import { noteFrames } from "./note-motion";

export function NoteDialog({ flyer, note, getPose, setDetached, onClose }) {
  const dialog=useRef(null),paper=useRef(null),scrim=useRef(null),print=useRef(null),copy=useRef(null);
  const animations=useRef([]),closing=useRef(false),alive=useRef(false),closeRef=useRef(null);
  useLayoutEffect(()=>{
    alive.current=true;const element=dialog.current, sheet=paper.current;
    element.showModal();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),pose=getPose?.();
    if(pose?.image)print.current.src=pose.image;
    const enter=()=>{
      if(reduced.matches){sheet.style.transform='none';print.current.style.opacity='0';element.dataset.state='reading';return;}
      const options={duration:600,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'};
      animations.current=[
        sheet.animate(noteFrames(pose,sheet.getBoundingClientRect()),options),
        scrim.current.animate([{opacity:0},{opacity:1}],options),
        print.current.animate([{opacity:pose?.image?1:0,offset:0},{opacity:pose?.image?1:0,offset:.12},{opacity:0,offset:.35},{opacity:0}],options),
        copy.current.animate([{opacity:0,offset:0},{opacity:0,offset:.38},{opacity:1,offset:.72},{opacity:1}],options),
      ];
      animations.current[0].finished.then(()=>{if(alive.current&&!closing.current)element.dataset.state='reading'}).catch(()=>{});
    };
    element.dataset.state='peeling';enter();setDetached?.(true);
    let finished=false;
    const finish=()=>{if(!alive.current||finished)return;finished=true;setDetached?.(false);element.close();onClose();};
    closeRef.current=()=>{
      if(closing.current)return;closing.current=true;element.dataset.state='returning';
      if(reduced.matches||!animations.current.length){finish();return;}
      // Reversing an unfinished lift preserves its current position and velocity.
      if(animations.current[0].playState!=='finished'){
        animations.current.forEach(animation=>animation.reverse());
        animations.current[0].finished.then(finish).catch(()=>{});return;
      }
      // Resize may have moved the book; land on its current skinned corners.
      const updated=getPose?.(), rect=sheet.getBoundingClientRect();
      animations.current.forEach(animation=>animation.cancel());
      const options={duration:480,easing:'cubic-bezier(.4,0,.45,1)',fill:'both'};
      animations.current=[
        sheet.animate(noteFrames(updated,rect).reverse().map(frame=>{const {offset,...rest}=frame;return {...rest,...(offset===undefined?{}:{offset:1-offset})}}),options),
        scrim.current.animate([{opacity:1},{opacity:0}],options),
        print.current.animate([{opacity:0},{opacity:0,offset:.35},{opacity:updated?.image?1:0,offset:.7},{opacity:updated?.image?1:0}],options),
        copy.current.animate([{opacity:1},{opacity:0,offset:.3},{opacity:0}],options),
      ];
      animations.current[0].finished.then(finish).catch(()=>{});
    };
    const motionChange=()=>{if(reduced.matches){animations.current.forEach(animation=>animation.finish());if(closing.current)finish()}};
    reduced.addEventListener('change',motionChange);
    return ()=>{alive.current=false;reduced.removeEventListener('change',motionChange);animations.current.forEach(animation=>animation.cancel());setDetached?.(false);element.close()};
  },[]);
  const close=()=>closeRef.current?.();
  return <dialog id="zine-note-dialog" ref={dialog} className="zine-note-dialog" style={{'--note-stock':note.color}} aria-labelledby="zine-note-title" aria-describedby="zine-note-body"
    onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target===event.currentTarget||event.target===scrim.current)close()}}>
    <div ref={scrim} className="zine-note-scrim" aria-hidden="true" />
    <div ref={paper} className="zine-note-paper">
      <img ref={print} className="zine-note-print" alt="" aria-hidden="true" />
      <div ref={copy} className="zine-note-copy">
        <button type="button" className="zine-note-close" aria-label="Close note" onClick={close} autoFocus><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        <h2 id="zine-note-title" className="sr-only">{flyer.title}</h2><HandwrittenText text={note.text} noteId={note.id} expressive />
      </div>
    </div>
  </dialog>;
}
