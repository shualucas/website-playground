import React, { useEffect, useRef, useState } from "react";
import { cartridges, personalCartridge } from "./config";

/** One persistent renderer and motion clock; company changes add a turn from the current pose. */
export function HeroCartridge({ id, active, previewColor, onStatusChange }) {
  const host=useRef(null),engine=useRef(null),current=useRef(null),enabled=useRef(active);
  const [status,setStatus]=useState("loading");
  const [requested,setRequested]=useState(active);
  const preview=useRef(previewColor);preview.current=previewColor;
  const cartridge=(!previewColor&&cartridges.find(item=>item.id===id))||personalCartridge;
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
        },{transparentBackground:true,entranceScale:.75,hoverToFront:true});
        engine.current=scene;scene.setPreviewColor(preview.current);scene.setPaused(!enabled.current);
      }catch{update("fallback")}
    }).catch(()=>update("fallback"));
    return()=>{alive=false;scene?.dispose();engine.current=null};
  },[onStatusChange,requested]);
  useEffect(()=>{void engine.current?.setCartridge(cartridge)},[cartridge]);
  useEffect(()=>{engine.current?.setPreviewColor(previewColor)},[previewColor]);
  useEffect(()=>{engine.current?.setPaused(!active)},[active]);
  return <div id="hero-cartridge" className="hero-cartridge" data-status={status} data-cartridge={cartridge.id} style={{"--hero-dither-color":previewColor||undefined}} role="img" aria-label={cartridge.id==="personal"?"Dithered cartridge":`${cartridge.name} cartridge`} tabIndex={status==="ready"?0:undefined} aria-description={status==="ready"?"Drag or use the arrow keys to rotate. Press R to reset.":undefined} data-reveal>
    <div ref={host} className="hero-cartridge-stage" aria-hidden="true" />
    {status==="fallback"&&(cartridge.id==="personal"?<span className="hero-dither-fallback" aria-hidden="true"><img src="/cartridges/dither-cartridge.svg" alt="" /></span>:<div className="hero-cartridge-fallback" style={{"--cartridge-shell":cartridge.shell}} aria-hidden="true"><img src={cartridge.label} alt="" /></div>)}
  </div>;
}
