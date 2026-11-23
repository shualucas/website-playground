import React, { useEffect, useRef, useState } from "react";
import { cartridges, personalCartridge } from "./config";

/** One persistent renderer; company hovers replay the project-page spin and GPU dissolve. */
export function HeroCartridge({ id, active, onStatusChange }) {
  const host=useRef(null),engine=useRef(null),current=useRef(null),enabled=useRef(active);
  const [status,setStatus]=useState("loading");
  const [requested,setRequested]=useState(active);
  const cartridge=cartridges.find(item=>item.id===id)||personalCartridge;
  current.current=cartridge;enabled.current=active;
  useEffect(()=>{if(active)setRequested(true)},[active]);
  useEffect(()=>{
    if(!requested)return;
    let alive=true,scene;
    const update=status=>{if(alive){setStatus(status);onStatusChange(status)}};
    import("./CaseStudyCartridgeScene").then(({CaseStudyCartridgeScene})=>{
      if(!alive)return;
      try {
        scene=new CaseStudyCartridgeScene(host.current,current.current,{
          onReady:()=>{update("ready");void scene?.preload(cartridges)},
          onError:()=>update("fallback"),
        },true);
        engine.current=scene;scene.setPaused(!enabled.current);
      }catch{update("fallback")}
    }).catch(()=>update("fallback"));
    return()=>{alive=false;scene?.dispose();engine.current=null};
  },[onStatusChange,requested]);
  useEffect(()=>{void engine.current?.setCartridge(cartridge)},[cartridge]);
  useEffect(()=>{engine.current?.setPaused(!active)},[active]);
  return <div id="hero-cartridge" className="hero-cartridge" data-status={status} data-cartridge={cartridge.id} role="img" aria-label={`${cartridge.id==="personal"?"Josh Lucas J":cartridge.name} cartridge`} tabIndex={status==="ready"?0:undefined} aria-description={status==="ready"?"Drag or use the arrow keys to rotate. Press R to reset.":undefined} data-reveal>
    <div ref={host} className="hero-cartridge-stage" aria-hidden="true" />
    {status==="fallback"&&<div className="hero-cartridge-fallback" style={{"--cartridge-shell":cartridge.shell}} aria-hidden="true"><img src={cartridge.label} alt="" /></div>}
  </div>;
}
