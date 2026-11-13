import React, { useLayoutEffect, useRef } from "react";
import { CloveDither } from "./clove-dither";

/** One clock for the active row, including its short in-place dissolve on dismissal. */
export function ProjectDither({ active, color, dark }) {
  const canvas=useRef(null),live=useRef(active),wake=useRef(()=>{});live.current=active;
  useLayoutEffect(() => {
    const surface = canvas.current, link = surface.parentElement.querySelector('.recent-project-link');
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const renderer=new CloveDither(surface,color,dark);
    if(!renderer.context||!link)return;
    let frame=0,previous=0,lastPaint=-Infinity,lastDraw=0,time=0,visible=true;
    const paint=now=>{
      frame=0;
      if(!visible||document.hidden||motion.matches){sync();return;}
      time+=previous?Math.min((now-previous)/1000,.06):0;previous=now;
      if(now-lastPaint>=1000/30){
        const drawn=renderer.draw(Math.min(time-lastDraw,.1),time,live.current);lastDraw=time;lastPaint=now;
        const filled=String(renderer.extent===1);if(surface.dataset.filled!==filled)surface.dataset.filled=filled;
        if(!drawn&&!live.current){surface.dataset.state='idle';surface.hidden=true;return;}
      }
      frame=requestAnimationFrame(paint);
    };
    const sync=()=>{
      cancelAnimationFrame(frame);frame=0;previous=0;
      const busy=live.current||renderer.extent>0,running=busy&&visible&&!document.hidden&&!motion.matches;
      surface.dataset.state=motion.matches?'reduced':!busy?'idle':running?(live.current?'playing':'dissolving'):'paused';
      surface.hidden=motion.matches||!busy;
      if(running)frame=requestAnimationFrame(paint);
      else if(motion.matches)renderer.clear();
    };
    const resize=()=>{
      renderer.resize(link.clientWidth,link.clientHeight);
      if(!motion.matches)renderer.draw(0,time,live.current);
    };
    const dimensions=new ResizeObserver(resize);dimensions.observe(link);resize();
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()});observer.observe(link);
    wake.current=sync;
    motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
    return()=>{
      cancelAnimationFrame(frame);dimensions.disconnect();observer.disconnect();
      motion.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);
      wake.current=()=>{};
    };
  },[color,dark]);
  useLayoutEffect(()=>wake.current(),[active]);
  return <canvas ref={canvas} className="project-dither-surface" data-state="idle" aria-hidden="true" />;
}
