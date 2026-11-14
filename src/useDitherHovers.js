import { useEffect } from "react";
import { CloveDither } from "./cartridge/clove-dither";

// Explicit current-page controls; project rows and archived pages keep their own interactions.
const targets='.profile-links a,.case-study-nav a,.case-study-nav button:not(.theme-toggle),.zine-header a,.zine-header button:not(.theme-toggle),.resume-home-link,.resume-page-back';

/** Delegate decorative hover/focus backdrops without replacing native links, buttons or handlers. */
export function useDitherHovers() {
  useEffect(()=>{
    const reduce=matchMedia('(prefers-reduced-motion: reduce)'),pointer=matchMedia('(hover:hover) and (pointer:fine)');
    let hovered=null,focused=null,host=null,canvas=null,renderer=null,dimensions=null,frame=0,previous=0,time=0,lastDraw=0,active=false;
    const remove=()=>{
      cancelAnimationFrame(frame);frame=0;dimensions?.disconnect();dimensions=null;
      canvas?.remove();host?.classList.remove('dither-hover-target');host=canvas=renderer=null;previous=0;
    };
    const paint=now=>{
      frame=0;
      if(!host?.isConnected||reduce.matches||host.closest('[inert],[aria-hidden="true"]')){remove();return;}
      if(document.hidden){canvas.dataset.state='paused';previous=0;return;}
      time+=previous?Math.min((now-previous)/1000,.06):0;previous=now;
      if(time-lastDraw>=1/30){
        const drawn=renderer.draw(Math.min(time-lastDraw,.1),time,active);lastDraw=time;
        const filled=String(renderer.extent===1);if(canvas.dataset.filled!==filled)canvas.dataset.filled=filled;
        if(!drawn&&!active){remove();return;}
      }
      canvas.dataset.state=active?'playing':'dissolving';frame=requestAnimationFrame(paint);
    };
    const wake=()=>{if(host&&!frame&&!document.hidden)frame=requestAnimationFrame(paint)};
    const update=()=>{
      const next=hovered||focused;
      if(reduce.matches||!next?.isConnected||next.closest('[inert],[aria-hidden="true"]')){
        active=false;if(host)wake();return;
      }
      if(next!==host){
        remove();host=next;time=lastDraw=0;
        canvas=document.createElement('canvas');canvas.className='dither-surface control-dither';canvas.setAttribute('aria-hidden','true');
        host.classList.add('dither-hover-target');host.append(canvas);
        const dark=document.documentElement.dataset.colorMode==='dark';
        renderer=new CloveDither(canvas,host.dataset.ditherColor||(dark?'#b2a1d9':'#a18cc9'),dark);
        const resize=()=>{
          if(!renderer||!host)return;
          const height=Math.max(1,host.clientHeight*.5);
          renderer.resize(host.clientWidth,height);canvas.style.top=(host.clientHeight-height)/2+'px';
        };
        dimensions=new ResizeObserver(resize);dimensions.observe(host);resize();
      }
      active=true;wake();
    };
    const over=event=>{
      if(event.pointerType==='touch'||!pointer.matches)return;
      const next=event.target.closest(targets);if(!next||next===hovered)return;
      hovered=next;update();
    };
    const out=event=>{
      if(hovered?.contains(event.target)&&!hovered.contains(event.relatedTarget)){hovered=null;update();}
    };
    const focus=event=>{focused=event.target.closest(targets);if(!focused?.matches(':focus-visible'))focused=null;update()};
    const blur=event=>{if(focused?.contains(event.target)&&!focused.contains(event.relatedTarget)){focused=null;update()}};
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;previous=0;if(canvas)canvas.dataset.state='paused';}else wake()};
    const preference=()=>{if(!pointer.matches)hovered=null;if(reduce.matches)remove();else update()};
    const theme=new MutationObserver(()=>{if(host){remove();update()}});theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
    document.addEventListener('pointerover',over);document.addEventListener('pointerout',out);
    document.addEventListener('focusin',focus);document.addEventListener('focusout',blur);
    document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',preference);pointer.addEventListener('change',preference);
    return()=>{
      remove();theme.disconnect();
      document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);
      document.removeEventListener('focusin',focus);document.removeEventListener('focusout',blur);
      document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',preference);pointer.removeEventListener('change',preference);
    };
  },[]);
}
