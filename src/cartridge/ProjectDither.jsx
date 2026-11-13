import React, { useLayoutEffect, useRef } from "react";

const ranks = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const clamp = value => Math.max(0,Math.min(1,value));
const smooth = value => {const t=clamp(value);return t*t*(3-2*t)};
const pitch = 5;

/** A fixed pixel lattice with a moving fill density and a dissolving edge. */
export function ProjectDither({ color, dark }) {
  const canvas = useRef(null);
  useLayoutEffect(() => {
    const surface = canvas.current, link = surface.parentElement.querySelector('.recent-project-link');
    const context = surface.getContext('2d'), motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!context || !link) return;
    let width=0, height=0, frame=0, previous=0, lastPaint=-Infinity, time=0, visible=true;
    let columns=[];
    const channels=color.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16));
    const palette=Array.from({length:16},(_,index)=>`rgb(${channels.map(value=>Math.round(value+(255-value)*index/15*(dark?.78:.9))).join(',')})`);
    const draw=()=>{
      context.clearRect(0,0,width,height);
      const reach=Math.min(width,480),entry=1-Math.pow(1-clamp(time/.48),3),front=(reach+70)*entry;
      for(const {x,index} of columns){
        const wave=(Math.sin(x*.025-time*1.6)*.13+Math.sin(x*.011+time*.85)*.08)*smooth(x/50);
        const density=clamp((1-x/reach+wave)*smooth((front-x)/70));
        if(!density)continue;
        // A pale, dense origin at the left gives way to a colored, sparse tail.
        context.fillStyle=palette[Math.round(smooth((density-.5)/.5)*15)];
        for(let row=0,y=1;y<height-1;row++,y+=pitch){
          const vertical=.86+.14*Math.sin(y/height*Math.PI);
          const rank=(ranks[(row%4)*4+index%4]+.5)/16;
          const coverage=smooth((density*vertical-rank)*3+.5);
          if(coverage<.025)continue;
          const size=3.2+coverage*.6;
          context.globalAlpha=(dark?.38:.48)*coverage;
          // Pixel positions never drift. They form and dissolve within their own cells.
          context.fillRect(x,y,size,size);
        }
      }
      context.globalAlpha=1;
    };
    const paint=now=>{
      frame=0;
      if(!visible||document.hidden||motion.matches){sync();return;}
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
      width=link.clientWidth;height=link.clientHeight;
      const ratio=Math.min(devicePixelRatio,2);
      surface.width=Math.round(width*ratio);surface.height=Math.round(height*ratio);
      surface.style.height=height+'px';context.setTransform(ratio,0,0,ratio,0,0);
      columns=Array.from({length:Math.ceil(Math.min(width,480)/pitch)},(_,index)=>({x:index*pitch,index}));
      if(!motion.matches)draw();
    };
    const dimensions=new ResizeObserver(resize);dimensions.observe(link);resize();
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()});observer.observe(link);
    motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
    return()=>{
      cancelAnimationFrame(frame);dimensions.disconnect();observer.disconnect();
      motion.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);
    };
  },[color,dark]);
  return <canvas ref={canvas} className="project-dither-surface" data-state="idle" aria-hidden="true" />;
}
