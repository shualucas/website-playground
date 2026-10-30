import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/** Finish the outgoing content before committing a reader or document navigation. */
export function usePageExit(content) {
  const animation=useRef(null),pending=useRef(null),focus=useRef(null),mounted=useRef(true);
  const [exiting,setExiting]=useState(false);
  const cancel=useCallback(()=>{
    pending.current=null;animation.current?.cancel();animation.current=null;
    if(!mounted.current)return;
    flushSync(()=>setExiting(false));
    if(focus.current?.isConnected)focus.current.focus({preventScroll:true});
  },[]);
  const run=useCallback((action,{navigation=false}={})=>{
    if(pending.current)return;
    focus.current=document.activeElement;
    if(!content.current||matchMedia('(prefers-reduced-motion: reduce)').matches){action();return;}
    const request={action,navigation};pending.current=request;
    flushSync(()=>setExiting(true));
    const exit=content.current.animate([
      {opacity:1,filter:'blur(0px)',transform:'translateX(0)'},
      {opacity:0,filter:'blur(5px)',transform:`translateX(${innerWidth<760?-24:-40}px)`},
    ],{duration:300,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    animation.current=exit;
    exit.finished.then(()=>{
      if(!mounted.current||pending.current!==request)return;
      if(request.navigation){request.action();return;}
      pending.current=null;
      // The opaque reader is mounted before the outgoing layer is restored.
      flushSync(()=>{setExiting(false);request.action()});
      exit.cancel();animation.current=null;
    }).catch(()=>{});
  },[content]);
  useEffect(()=>{
    mounted.current=true;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const reduce=()=>{if(motion.matches)animation.current?.finish()};
    window.addEventListener('pageshow',cancel);motion.addEventListener('change',reduce);
    return ()=>{mounted.current=false;pending.current=null;animation.current?.cancel();window.removeEventListener('pageshow',cancel);motion.removeEventListener('change',reduce)};
  },[cancel]);
  return {exiting,run,cancel};
}
