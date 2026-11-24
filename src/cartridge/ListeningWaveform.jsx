import React, { useEffect, useMemo, useRef, useState } from "react";

/** Decorative activity, seeded per song; this is not an audio analyser or playback timeline. */
export function ListeningWaveform({ track, playing }) {
  const host=useRef(null),[visible,setVisible]=useState(false),[awake,setAwake]=useState(()=>!document.hidden);
  const identity=track?`${track.artist}\n${track.title}`:'';
  const bars=useMemo(()=>{
    let seed=Array.from(identity).reduce((hash,char)=>Math.imul(hash^char.charCodeAt(0),16777619)>>>0,2166136261);
    return Array.from({length:44},(_,i)=>{
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const envelope=.45+.55*Math.sin(Math.PI*(i+.5)/44);
      return {level:(.16+(seed/4294967296)*.8)*envelope,opacity:i<3?.85:.16+.2*Math.sin(Math.PI*(i+.5)/44)};
    });
  },[identity]);
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));observer.observe(host.current);
    const visibility=()=>setAwake(!document.hidden);document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility)};
  },[]);
  return <span ref={host} className="listening-waveform" data-animate={Boolean(playing&&visible&&awake)} data-playing={playing} aria-hidden="true">
    <svg viewBox="0 0 176 44" preserveAspectRatio="none" focusable="false">
      {bars.map((bar,i)=><g key={i} style={{transform:`translateY(22px) scaleY(${bar.level})`,opacity:bar.opacity}}>
        <rect x={i*4+.75} y="-18" width="1.5" height="36" rx=".75" style={{animationDuration:`${1.15+(i%9)*.13}s`,animationDelay:`${-i*.137}s`}}/>
      </g>)}
    </svg>
  </span>;
}
