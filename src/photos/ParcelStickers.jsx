import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const parcelStickers=[
  {id:'film',label:'35 mm film',text:'35 mm',kind:'film',x:68,y:22,angle:9},
  {id:'sun',label:'California sunshine',text:'CA',kind:'sun',x:81,y:57,angle:-8},
  {id:'keep',label:'Keep the good ones',text:'KEEP THE\nGOOD ONES',kind:'keep',x:57,y:68,angle:-6},
  {id:'heart',label:'Made with love',text:'♡',kind:'heart',x:24,y:66,angle:8},
  {id:'slow',label:'Take it slow',text:'take it\nslow.',kind:'slow',x:39,y:37,angle:-9},
];

export function StickerArt({sticker}) {
  return <span className={`parcel-sticker-art sticker-${sticker.kind}`} aria-hidden="true">{sticker.text}</span>;
}

export function ParcelStickers({envelope,placed,onPlace,disabled}) {
  const [drag,setDrag]=useState(null),gesture=useRef(null),suppress=useRef(false);
  const release=event=>{
    const grip=gesture.current;if(!grip||grip.pointer!==event.pointerId)return;
    gesture.current=null;setDrag(null);
    if(grip.moved){
      suppress.current=true;
      const bounds=envelope.current?.getBoundingClientRect();
      if(bounds&&event.clientX>=bounds.left&&event.clientX<=bounds.right&&event.clientY>=bounds.top&&event.clientY<=bounds.bottom)
        onPlace(grip.sticker,{x:Math.max(9,Math.min(87,(event.clientX-bounds.left)/bounds.width*100)),y:Math.max(12,Math.min(85,(event.clientY-bounds.top)/bounds.height*100))});
    }
  };
  return <aside className="parcel-sticker-tray" aria-label="Decorate the photo mailer" hidden={disabled}>
    <p>Make it yours.</p>
    <div className="parcel-sticker-options">{parcelStickers.map(sticker=><button key={sticker.id} type="button" className="parcel-sticker-choice" aria-label={`Place ${sticker.label} sticker`} aria-pressed={Boolean(placed[sticker.id])}
      onPointerDown={event=>{if(event.button!==0||!event.isPrimary)return;suppress.current=false;gesture.current={pointer:event.pointerId,sticker,x:event.clientX,y:event.clientY,moved:false};event.currentTarget.setPointerCapture(event.pointerId)}}
      onPointerMove={event=>{const grip=gesture.current;if(!grip||grip.pointer!==event.pointerId)return;if(!grip.moved&&Math.hypot(event.clientX-grip.x,event.clientY-grip.y)<6)return;grip.moved=true;setDrag({sticker,x:event.clientX,y:event.clientY})}}
      onPointerUp={release} onPointerCancel={()=>{gesture.current=null;setDrag(null)}} onLostPointerCapture={()=>{gesture.current=null;setDrag(null)}}
      onClick={event=>{if(suppress.current&&event.detail){suppress.current=false;return}onPlace(sticker,{x:sticker.x,y:sticker.y})}}>
      <StickerArt sticker={sticker}/>
    </button>)}</div>
    <span className="parcel-sticker-hint">drag or tap a sticker<br/>{' '}click the mailer to open</span>
    {drag&&createPortal(<span className="parcel-sticker-ghost" style={{left:drag.x,top:drag.y}}><StickerArt sticker={drag.sticker}/></span>,document.body)}
  </aside>;
}
