import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const angles=[-8,5,-11,7,2,-6,9,-3,6,-9,4,11,-5,3,-7,8,-4,6,-10,4];

/** Deterministic, loosely overlapping prints, measured against the real surface. */
export function printLayout(photos,width) {
  const columns=width<620?2:width<900?3:4,margin=24,pitch=(width-margin*2)/columns;
  const shortEdge=Math.min(172,pitch*.72),rowPitch=shortEdge*1.2;
  const prints=photos.map((photo,index)=>{
    const ratio=(photo.width||848)/(photo.height||1280),w=ratio>1?shortEdge*Math.min(ratio,1.55):shortEdge;
    const h=w/ratio+10,angle=angles[index%angles.length],pad=Math.abs(Math.sin(angle*Math.PI/180))*h/2+4;
    const jitter=((index*37)%43-21)*.75;
    const x=Math.max(pad,Math.min(width-w-pad,margin+index%columns*pitch+(pitch-w)/2+jitter));
    const y=30+Math.floor(index/columns)*rowPitch+((index*19)%39);
    return {x,y,width:w,height:h,angle};
  });
  return {prints,height:Math.max(400,...prints.map(p=>p.y+p.height+40))};
}

export function PhotoTable({tableRef,photos,phase,onSelect}) {
  const [width,setWidth]=useState(()=>Math.min(1120,innerWidth-(innerWidth<880?48:120)));
  const offsets=useRef(new Map()),grip=useRef(null),highest=useRef(photos.length+1),suppress=useRef(false);
  const layout=printLayout(photos,width);
  useLayoutEffect(()=>{
    const node=tableRef.current,observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));
    observer.observe(node);return()=>observer.disconnect();
  },[tableRef]);
  const move=(slot,x,y)=>{
    const index=Number(slot.dataset.photoIndex),p=layout.prints[index];
    const pad=Math.abs(Math.sin(p.angle*Math.PI/180))*p.height/2+3;
    const position={x:Math.max(pad-p.x,Math.min(width-pad-p.x-p.width,x)),y:Math.max(8-p.y,Math.min(layout.height-p.y-p.height-8,y))};
    offsets.current.set(index,position);slot.style.transform=`translate3d(${position.x}px,${position.y}px,0)`;
  };
  const cancel=()=>{
    const current=grip.current;if(!current)return;
    grip.current=null;current.button.dataset.dragging='false';suppress.current=current.moved;
    move(current.slot,current.origin.x,current.origin.y);
    if(current.button.hasPointerCapture(current.id))current.button.releasePointerCapture(current.id);
  };
  useEffect(()=>{
    const blur=()=>cancel();window.addEventListener('blur',blur);
    return()=>window.removeEventListener('blur',blur);
  });
  useLayoutEffect(()=>{
    cancel();
    tableRef.current.querySelectorAll('.photo-slot').forEach(slot=>{
      const position=offsets.current.get(Number(slot.dataset.photoIndex));if(position)move(slot,position.x,position.y);
    });
  },[width]);
  return <div ref={tableRef} id="film-prints" className="photo-spread" role="region" tabIndex={-1} aria-label="Film photograph collection" aria-describedby="photo-table-help" aria-hidden={phase!=='open'} inert={phase!=='open'} style={{height:layout.height}}>
    <p className="sr-only" id="photo-table-help">Drag photographs to arrange them. Use arrow keys to move a focused print. Click or press Enter to view it larger.</p>
    {photos.map((photo,index)=>{
      const p=layout.prints[index];
      return <div key={photo.id||photo.src} className="photo-slot" data-photo-index={index} style={{left:p.x,top:p.y,width:p.width,zIndex:index+1}}>
        <button type="button" className="polaroid photo-print" style={{'--photo-angle':p.angle+'deg'}} aria-label={`View photograph: ${photo.alt}`} aria-haspopup="dialog" draggable={false}
          onDragStart={event=>event.preventDefault()}
          onPointerDown={event=>{
            if(phase!=='open'||event.button!==0||!event.isPrimary)return;
            const button=event.currentTarget,slot=button.parentElement;slot.style.zIndex=++highest.current;suppress.current=false;
            grip.current={id:event.pointerId,x:event.clientX,y:event.clientY,scroll:scrollY,origin:offsets.current.get(index)||{x:0,y:0},slot,button,moved:false};button.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event=>{
            const current=grip.current;if(!current||current.id!==event.pointerId)return;
            const dx=event.clientX-current.x,dy=event.clientY-current.y+scrollY-current.scroll;
            if(!current.moved&&Math.hypot(dx,dy)<6)return;
            current.moved=true;current.button.dataset.dragging='true';suppress.current=true;
            move(current.slot,current.origin.x+dx,current.origin.y+dy);
          }}
          onPointerUp={event=>{
            const current=grip.current;if(!current||current.id!==event.pointerId)return;
            grip.current=null;current.button.dataset.dragging='false';suppress.current=current.moved;
            if(current.button.hasPointerCapture(current.id))current.button.releasePointerCapture(current.id);
          }} onPointerCancel={cancel} onLostPointerCapture={cancel}
          onKeyDown={event=>{
            if(event.key==='Escape'){cancel();return}
            const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=directions[event.key];
            if(!direction)return;event.preventDefault();
            const slot=event.currentTarget.parentElement,position=offsets.current.get(index)||{x:0,y:0},distance=event.shiftKey?36:12;
            slot.style.zIndex=++highest.current;move(slot,position.x+direction[0]*distance,position.y+direction[1]*distance);
          }}
          onClick={event=>{if(suppress.current&&event.detail){suppress.current=false;return}onSelect(index,event.currentTarget)}}>
          <img className="polaroid-image" src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading={phase==='closed'&&index>=6?'lazy':'eager'} decoding="async" draggable={false}/>
        </button>
      </div>;
    })}
  </div>;
}
