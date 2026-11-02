import React,{useState} from "react";
import {defaultPaperPhysics,loadPaperPhysics,normalizePaperPhysics,physicsControls,physicsStorageKey} from "../book/paper-physics";

/** Opt-in author controls, available only at /after-hours/?tune=1. */
export function PhysicsPanel({engine,ready}) {
  const [settings,setSettings]=useState(loadPaperPhysics),[message,setMessage]=useState("");
  const apply=next=>{const value=normalizePaperPhysics(next);setSettings(value);engine.current?.setPhysics(value);setMessage("Unsaved adjustments")};
  const save=()=>{try{localStorage.setItem(physicsStorageKey,JSON.stringify(settings));setMessage("Saved in this browser")}catch{setMessage("Storage unavailable. You can still export these settings.")}};
  const reset=()=>{try{localStorage.removeItem(physicsStorageKey)}catch{}apply(defaultPaperPhysics);setMessage("Defaults restored")};
  const exportSettings=()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,physics:settings},null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="zine-physics.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),0);setMessage("Settings exported");
  };
  return <aside className="physics-panel" aria-label="Zine motion tuning"><details open><summary>Paper tuning</summary>
    <p>Adjust live, then save for this browser or export your settings.</p>
    <fieldset disabled={!ready}><legend className="sr-only">Paper motion</legend>
      {Object.entries(physicsControls).map(([key,control])=><label key={key} htmlFor={`physics-${key}`}><span>{control.label}<output htmlFor={`physics-${key}`}>{settings[key].toFixed(2)}</output></span><input id={`physics-${key}`} type="range" min={control.min} max={control.max} step={control.step} value={settings[key]} onChange={event=>apply({...settings,[key]:Number(event.target.value)})}/></label>)}
      <div className="physics-turns"><button type="button" onClick={()=>engine.current?.stepPage(-1)}>Previous page</button><button type="button" onClick={()=>engine.current?.stepPage(1)}>Next page</button></div>
      <div className="physics-actions"><button type="button" onClick={save}>Save</button><button type="button" onClick={reset}>Reset</button><button type="button" onClick={exportSettings}>Export JSON</button></div>
    </fieldset><p className="physics-status" role="status">{message}</p>
  </details></aside>;
}
