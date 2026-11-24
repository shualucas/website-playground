import React, { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { bayer, hash } from "./clove-dither";

// Small, fixed cells dissolve in place rather than sweeping across the page.
const masks = Array.from({length:17},(_,step)=>{
  const cells=bayer.map((rank,i)=>rank<step/16?`<rect x="${i%4*3}" y="${Math.floor(i/4)*3}" width="3" height="3"/>`:"").join("");
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12">${cells}</svg>`)}")`;
});

// Every cell gets one existing project color, independent of its dissolve rank.
const projectColors=['#6988d8','#cd29db','#e5633d','#e5b840','#429f68'];
const scatteredColors=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">${Array.from({length:256},(_,i)=>`<rect x="${i%16*3}" y="${Math.floor(i/16)*3}" width="3" height="3" fill="${projectColors[Math.floor(hash(i%16,Math.floor(i/16))*projectColors.length)]}"/>`).join('')}</svg>`)}")`;

export function AboutContent({about,children,onBack}) {
  const host=useRef(null),tint=useRef(null),current=useRef(about),started=useRef(false);
  const [displayed,setDisplayed]=useState(about),[busy,setBusy]=useState(false);
  useLayoutEffect(()=>{
    if(!started.current){started.current=true;return}
    const node=host.current,motion=matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled=false,animation,colorAnimation;
    const dissolve=async entering=>{
      if(motion.matches)return;
      const frames=(entering?masks:[...masks].reverse()).map(maskImage=>({maskImage,webkitMaskImage:maskImage,easing:'steps(1,end)'}));
      const previous=animation;
      animation=node.animate(frames,{duration:entering?640:480,easing:'linear',fill:'forwards'});
      previous?.cancel();
      colorAnimation?.cancel();
      colorAnimation=tint.current.animate([{opacity:0},{opacity:1,offset:.25},{opacity:1,offset:.75},{opacity:0}],{duration:entering?640:480,fill:'forwards'});
      await animation.finished.catch(()=>{});
    };
    const change=async()=>{
      setBusy(true);
      if(current.current!==about)await dissolve(false);
      if(cancelled)return;
      flushSync(()=>setDisplayed(about));current.current=about;
      await dissolve(true);
      if(cancelled)return;
      animation?.cancel();colorAnimation?.cancel();flushSync(()=>setBusy(false));
      node.querySelector(about?'.about-title':'.about-return-anchor')?.focus({preventScroll:true});
    };
    void change();
    return()=>{cancelled=true;animation?.cancel();colorAnimation?.cancel()};
  },[about]);
  return <div ref={host} className="collection-main" data-about={displayed} data-dissolving={busy} inert={busy?true:undefined}>
    <div className="home-content" hidden={displayed}>{children}</div>
    <section className="about-content" hidden={!displayed} aria-label="About Josh">
      <img className="about-photo" src="/about/joshua-film-portrait.jpg" alt="Joshua standing beneath a canopy of trees, photographed on film" width="848" height="1280"/>
      <div className="about-copy">
        <h1 className="about-title" tabIndex={-1}>A little about me.</h1>
        <p>I'm Joshua, a product designer who wants to build a future where technology enhances the texture of everyday life instead of flattening it. My goal is to make the mundane effortless, giving us more time for the things that make life beautiful.</p>
        <p>Recreationally, I've been enjoying printing riso, playing <a className="about-inline-link" href="https://www.youtube.com/watch?v=q-cJEEdw39M" target="_blank" rel="noopener noreferrer">tennis at the park</a>, and spending time playing my shadow priest or aurora mid on summoner's rift.</p>
        <p>If you're here just passing by, then thanks for checkin' out my tiny corner of the internet!</p>
        <button className="about-link" type="button" onClick={onBack}>Back to my work</button>
      </div>
    </section>
    <span ref={tint} className="about-dither-color" style={{backgroundImage:scatteredColors}} aria-hidden="true"/>
  </div>;
}
