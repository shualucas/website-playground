import React, { useLayoutEffect, useRef } from "react";

const ranks = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const clamp = value => Math.max(0,Math.min(1,value));
const smooth = value => {const t=clamp(value);return t*t*(3-2*t)};
const pitch = 3;

/** A fixed pixel lattice with a moving fill density and a dissolving edge. */
export function ProjectDither({ color, dark }) {
  const canvas = useRef(null);
  useLayoutEffect(() => {
    const surface = canvas.current, link = surface.parentElement.querySelector('.recent-project-link');
    const context = surface.getContext('2d'), motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!context || !link) return;
    let width=0, height=0, frame=0, previous=0, lastPaint=-Infinity, time=0, visible=true;
    let columns=[];
    const draw=()=>{
      context.clearRect(0,0,width,height);context.fillStyle=color;
      const entry=1-Math.pow(1-clamp(time/.48),3), front=-24+(width+48)*entry;
      for(const {x,index,envelope} of columns){
        const reveal=smooth((front-x)/24);
        if(!reveal)continue;
        // The lattice stays still. Broad waves change its coverage, rather than scrolling a texture.
        const wave=Math.sin(x*.024-time*1.8)*.3+Math.sin(x*.009+time*.95)*.16;
        const edge=height*.16+Math.sin(x*.028-time*1.35)*3+Math.sin(x*.011+time*.8)*2;
        for(let row=0,y=1;y<height-1;row++,y+=pitch){
          const density=(.62+wave+Math.sin(y*.12+x*.014-time*1.15)*.09)*smooth((y-edge)/13)*envelope*reveal;
          const rank=(ranks[(row%4)*4+index%4]+.5)/16;
          const coverage=smooth((density-rank)*3+.5);
          if(coverage<.025)continue;
          const size=1.1+coverage*.85;
          context.globalAlpha=(dark?.48:.34)*coverage;
          context.fillRect(x+(2-size)/2,y+(2-size)/2,size,size);
        }
        // A few pixels lift directly from the moving boundary; the body remains a connected field.
        if(index%9===0){
          const progress=(time*.55+index*.071)%1;
          context.globalAlpha=(dark?.48:.34)*Math.sin(progress*Math.PI)*envelope*reveal;
          context.fillRect(x,edge+5-progress*11,1.4,1.4);
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
      columns=Array.from({length:Math.ceil(width/pitch)},(_,index)=>{
        const x=1+index*pitch;
        return {x,index,envelope:smooth(x/15)*smooth((width-x)/40)};
      });
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
