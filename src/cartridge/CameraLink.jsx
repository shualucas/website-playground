import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FilmCamera } from "./FilmCamera";

let photosPrefetched=false;
function preloadPhotos() {
  if(photosPrefetched)return;photosPrefetched=true;
  const link=document.createElement('link');link.rel='prefetch';link.href='/photos/';link.as='document';document.head.appendChild(link);
}

export function CameraLink({ dark, hidden, ready, rowTitle, rowIndex, rowTeam, entranceAt, previewTarget, previewActive = false, previewSeen = false }) {
  const controller = useRef(null), gesture = useRef(null), suppress = useRef(false), timer = useRef(null);
  const model = useRef(null);
  const [flashing, setFlashing] = useState(false), [arming, setArming] = useState(false);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const origin = useRef({ x: 0, y: 0 });
  const busy = useRef(false), flashTimer = useRef(null);
  useEffect(() => {
    const restore = () => { setFlashing(false); setArming(false); setHovered(false); setFocused(false); setDragging(false); controller.current?.setHovered(false); controller.current?.endDrag(false); busy.current = false; suppress.current = false; gesture.current = null; };
    window.addEventListener("pageshow", restore);
    return () => { clearTimeout(timer.current); clearTimeout(flashTimer.current); window.removeEventListener("pageshow", restore); };
  }, []);
  const end = (event, momentum = true) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null; setDragging(false); controller.current?.endDrag(momentum);
    if (suppress.current || !momentum) { setHovered(false); setFocused(false); controller.current?.setHovered(false); }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cameraModel = <>
      <span className="camera-model" ref={model}>
      {ready && (!previewTarget || previewSeen) ? <FilmCamera dark={dark} hidden={hidden || Boolean(previewTarget && !previewActive)} preview={Boolean(previewTarget)} previewActive={previewActive} controller={controller} highlighted={!dragging && (hovered || focused)} entranceAt={entranceAt} /> : null}
      <span className="camera-ready-light" aria-hidden="true" />
      <span className="camera-lens-flash" aria-hidden="true" />
      {flashing&&<span className="camera-say-cheese" aria-hidden="true">say cheese</span>}
      </span>
  </>;
  return <>
    <a id="film-camera-link" className={`camera-link${rowTitle ? " recent-project-link recent-camera-link" : ""}`} href="/photos/" aria-label={rowTitle ? `${rowTitle} Explore film photographs` : "Explore film photographs"} aria-describedby="camera-help"
      data-flashing={flashing} data-arming={arming} data-dragging={dragging} data-hovered={!dragging && (hovered || focused)} onDragStart={(event) => event.preventDefault()}
      onPointerEnter={event => { preloadPhotos();if (event.pointerType !== "touch" && !gesture.current && !busy.current) setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocus={event => {preloadPhotos();setFocused(!gesture.current && event.currentTarget.matches(":focus-visible"))}} onBlur={() => setFocused(false)}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || busy.current) return;
        preloadPhotos();
        suppress.current = false;
        if(rowTitle && !model.current?.contains(event.target))return;
        setDragging(true); setFocused(false); setHovered(false); controller.current?.setHovered(false); controller.current?.beginDrag();
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const g = gesture.current; if (!g || g.id !== event.pointerId) return;
        if (Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > 6) suppress.current = true;
        if (suppress.current) { controller.current?.rotateBy(event.clientX - g.x, event.clientY - g.y); event.currentTarget.dataset.dragging = "true"; }
        g.x = event.clientX; g.y = event.clientY;
      }} onPointerUp={(event) => end(event)} onLostPointerCapture={(event) => end(event, false)}
      onPointerCancel={(event) => { suppress.current = true; end(event, false); }}
      onKeyDown={(event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        setFocused(true);
        if (!previewTarget && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "r", "R"].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          if (event.key.toLowerCase() === "r") controller.current?.resetRotation();
          else controller.current?.rotateBy(event.key === "ArrowLeft" ? -20 : event.key === "ArrowRight" ? 20 : 0, event.key === "ArrowUp" ? -20 : event.key === "ArrowDown" ? 20 : 0);
        }
      }}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        if ((event.detail > 0 && suppress.current) || busy.current) return;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) { location.assign(event.currentTarget.href); return; }
        const usePreview=previewTarget?previewActive:true;
        const destination = event.currentTarget.href, rect = (usePreview&&model.current ? model.current : event.currentTarget).getBoundingClientRect();
        origin.current = (usePreview?controller.current?.prepareFlash():null) ?? { x: rect.left + rect.width * .3, y: rect.top + rect.height * .4 };
        busy.current = true; setArming(true);
        flashTimer.current = setTimeout(() => {
          // Re-sample at the flash, after the camera has finished any coasting.
          origin.current=(usePreview?controller.current?.prepareFlash():null)??origin.current;
          controller.current?.flash(); setArming(false); setFlashing(true);
          const cameraRect=usePreview?model.current?.getBoundingClientRect()??rect:rect;
          try { sessionStorage.setItem("camera-entry", JSON.stringify({at:Date.now(),origin:{x:origin.current.x/innerWidth,y:origin.current.y/innerHeight},camera:{x:(cameraRect.left+cameraRect.width/2)/innerWidth,y:(cameraRect.top+cameraRect.height/2)/innerHeight}})); } catch {}
          timer.current = setTimeout(() => location.assign(destination), 500);
        }, 180);
      }}>
      {rowTitle && <span className="recent-project-index" aria-hidden="true">{String(rowIndex ?? 5).padStart(2, "0")}</span>}
      <span className={rowTitle ? "recent-project-copy recent-camera-copy" : undefined}>
      {rowTitle && <span className="recent-project-name">{rowTitle}</span>}
      {!previewTarget && cameraModel}</span>
      {rowTitle && <><span className="recent-project-team">{rowTeam ?? "Film"}</span><svg className="recent-project-arrow" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></>}
    </a>
    {previewTarget && previewSeen && createPortal(cameraModel,previewTarget)}
    <span id="camera-help" className="sr-only">{previewTarget ? "Open film photographs." : "Drag to rotate the camera. Use arrow keys to rotate, R to reset, or Enter to explore."}</span>
    {flashing && createPortal(<div className="camera-page-flash" style={{ "--origin-x": `${origin.current.x}px`, "--origin-y": `${origin.current.y}px` }} aria-hidden="true" />, document.body)}
  </>;
}
