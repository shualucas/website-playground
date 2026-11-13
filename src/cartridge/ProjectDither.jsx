import React, { useLayoutEffect, useRef } from "react";

const ranks = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const random = index => ((Math.imul(index + 1, 1597334677) ^ Math.imul(index + 7, 3812015801)) >>> 0) / 4294967296;

/** A small moving cloud of ordered pixels; only the active row owns a clock. */
export function ProjectDither({ color, dark }) {
  const canvas = useRef(null);
  useLayoutEffect(() => {
    const surface = canvas.current, link = surface.parentElement.querySelector('.recent-project-link');
    const context = surface.getContext('2d'), motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!context || !link) return;
    let width=0, height=0, rowHeight=0, frame=0, previous=0, lastPaint=-Infinity, time=0, visible=true;
    const points=Array.from({length:220},(_,index)=>({
      column:index%55, row:Math.floor(index/55),
      phase:random(index)*2, life:1.25+random(index+230)*.9,
      lift:17+random(index+460)*16, drift:(random(index+690)-.5)*14,
      size:ranks[index%16]<4?2.25:1.5,
    }));
    const draw=()=>{
      context.clearRect(0,0,width,height);context.fillStyle=color;
      const span=Math.min(width-40,380), entry=Math.min(1,time/.18);
      for(const point of points){
        const age=(time+point.phase)%point.life, progress=age/point.life;
        const x=28+(point.column+.5)/55*span+point.drift*age;
        const y=28+rowHeight-5-point.row*3-age*point.lift;
        context.globalAlpha=Math.sin(progress*Math.PI)*entry*(dark?.9:.75);
        context.fillRect(Math.round(x*2)/2,Math.round(y*2)/2,point.size,point.size);
      }
      context.globalAlpha=1;
    };
    const paint=now=>{
      frame=0;
      if(!visible||document.hidden||motion.matches)return;
      time+=previous?Math.min((now-previous)/1000,.06):0;previous=now;
      if(now-lastPaint>=1000/30){draw();lastPaint=now;}
      frame=requestAnimationFrame(paint);
    };
    const sync=()=>{
      cancelAnimationFrame(frame);frame=0;previous=0;
      const running=visible&&!document.hidden&&!motion.matches;
      surface.dataset.state=motion.matches?'reduced':running?'playing':'paused';
      if(running)frame=requestAnimationFrame(paint);
      else if(motion.matches)context.clearRect(0,0,width,height);
    };
    const resize=()=>{
      width=link.clientWidth;rowHeight=link.clientHeight;height=rowHeight+28;
      const ratio=Math.min(devicePixelRatio,2);
      surface.width=Math.round(width*ratio);surface.height=Math.round(height*ratio);
      surface.style.height=height+'px';context.setTransform(ratio,0,0,ratio,0,0);
    };
    const dimensions=new ResizeObserver(resize);dimensions.observe(link);resize();
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()});observer.observe(link);
    motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
    return()=>{
      cancelAnimationFrame(frame);dimensions.disconnect();observer.disconnect();
      motion.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);
    };
  },[color,dark]);
  return <canvas ref={canvas} className="project-dither-particles" data-state="idle" aria-hidden="true" />;
}
