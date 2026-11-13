import React, { useLayoutEffect, useRef } from "react";
import { CloveDither } from "./clove-dither";

/** A pointer-transparent pixel backdrop with its own visibility-aware clock. */
export function DitherSurface({ active, color, dark, padding=0 }) {
  const canvas=useRef(null),live=useRef(active),wake=useRef(()=>{});live.current=active;
  useLayoutEffect(() => {
    const surface=canvas.current,host=surface.parentElement;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const renderer=new CloveDither(surface,color,dark);
    if(!renderer.context||!host)return;
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
      renderer.resize(host.clientWidth+padding*2,host.clientHeight+padding*2);
      if(!motion.matches)renderer.draw(0,time,live.current);
    };
    const dimensions=new ResizeObserver(resize);dimensions.observe(host);resize();
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()});observer.observe(host);
    wake.current=sync;
    motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
    return()=>{
      cancelAnimationFrame(frame);dimensions.disconnect();observer.disconnect();
      motion.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);
      wake.current=()=>{};
    };
  },[color,dark,padding]);
  useLayoutEffect(()=>wake.current(),[active]);
  return <canvas ref={canvas} className="dither-surface thumbnail-dither" data-state="idle" aria-hidden="true" style={{left:-padding,top:-padding,width:`calc(100% + ${padding*2}px)`}} />;
}
