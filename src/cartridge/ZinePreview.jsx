import React,{useEffect,useLayoutEffect,useRef,useState} from "react";
import { loadPaperPhysics } from "../book/paper-physics";

/** The actual extracurricular book, presented without input or page controls. */
export function ZinePreview({active,dark}) {
  const host=useRef(null),engine=useRef(null),live=useRef({active,dark});live.current={active,dark};
  const [status,setStatus]=useState("loading");
  useEffect(()=>{
    let alive=true,book,texture;
    Promise.all([import("../book/BookScene"),import("three"),import("../after-hours/flyers"),import("../after-hours/covers")]).then(async([{BookScene},THREE,flyers,covers])=>{
      const [pageArtwork,coverArtwork]=await Promise.all([flyers.prepareFlyerPages(),covers.prepareFlyerCovers()]);if(!alive)return;
      texture=new THREE.CanvasTexture(document.createElement("canvas"));
      book=new BookScene(host.current,{preview:true,physics:loadPaperPhysics(),projects:flyers.flyerSpreads,blankInterior:true,paperInserts:true,arrivalMotion:false,stageInsets:{top:0,bottom:0},pageWidth:4.7*flyers.flyerPage.width/flyers.flyerPage.height,pageArtwork,coverArtwork,
        google:{parts:[],blizzard:[],texture},onPhase:()=>{},onIndex:()=>{},onSpread:()=>{},onOpen:()=>{},onPresented:()=>{},onRequest:()=>{}});
      engine.current=book;book.setDarkMode(live.current.dark);book.appear();book.setOverlayOpen(true);setStatus("ready");
    }).catch(()=>{if(alive)setStatus("unavailable")});
    return()=>{alive=false;book?.dispose();texture?.dispose();engine.current=null};
  },[]);
  useEffect(()=>{engine.current?.setDarkMode(dark)},[dark]);
  useLayoutEffect(()=>{
    const book=engine.current;if(!book)return;
    book.setOverlayOpen(!active);
    if(active)book.playPreviewSpin();else book.stopPreviewSpin();
  },[active,status]);
  return <><div ref={host} className="zine-preview-scene" data-status={status} data-interactive="false" data-active={active} />{status==="unavailable"&&<img className="zine-preview-fallback" src="/zines/covers/extracurriculars-blue-ink.jpg" alt="" />}</>;
}
