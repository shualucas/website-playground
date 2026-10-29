import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FilmCamera } from "./FilmCamera";

export function CameraLink({ dark, hidden, ready }) {
  const controller = useRef(null), gesture = useRef(null), suppress = useRef(false), timer = useRef(null);
  const [flashing, setFlashing] = useState(false), [arming, setArming] = useState(false);
  const origin = useRef({ x: 0, y: 0 });
  const busy = useRef(false), flashTimer = useRef(null);
  useEffect(() => {
    const restore = () => { setFlashing(false); setArming(false); busy.current = false; suppress.current = false; gesture.current = null; };
    window.addEventListener("pageshow", restore);
    return () => { clearTimeout(timer.current); clearTimeout(flashTimer.current); window.removeEventListener("pageshow", restore); };
  }, []);
  const end = (event, momentum = true) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null; controller.current?.endDrag(momentum); event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <>
    <a id="film-camera-link" className="camera-link" href="/after-hours/" aria-label="Explore zine and film photographs" aria-describedby="camera-help"
      data-flashing={flashing} data-arming={arming} onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        suppress.current = false; controller.current?.beginDrag();
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
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "r", "R"].includes(event.key)) {
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
        const destination = event.currentTarget.href, rect = event.currentTarget.getBoundingClientRect();
        origin.current = controller.current?.prepareFlash() ?? { x: rect.left + rect.width * .3, y: rect.top + rect.height * .4 };
        busy.current = true; setArming(true);
        flashTimer.current = setTimeout(() => {
          controller.current?.flash(); setArming(false); setFlashing(true);
          try { sessionStorage.setItem("camera-entry", String(Date.now())); } catch {}
          timer.current = setTimeout(() => location.assign(destination), 500);
        }, 180);
      }}>
      {ready ? <FilmCamera dark={dark} hidden={hidden} controller={controller} /> : null}
      <span className="camera-ready-light" aria-hidden="true" />
      <span className="camera-lens-flash" aria-hidden="true" />
    </a>
    <span id="camera-help" className="sr-only">Drag to rotate the camera. Use arrow keys to rotate, R to reset, or Enter to explore.</span>
    {flashing && createPortal(<div className="camera-page-flash" style={{ "--origin-x": `${origin.current.x}px`, "--origin-y": `${origin.current.y}px` }} aria-hidden="true" />, document.body)}
  </>;
}
