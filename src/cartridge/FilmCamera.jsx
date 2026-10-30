import React, { useEffect, useRef, useState } from "react";
import { entrance, remainingEntranceDelay } from "./entrance";

export function FilmCamera({ dark, hidden, controller, highlighted = false, onReady, initialPose, entranceMotion = true }) {
  const host = useRef(null), scene = useRef(null), currentDark = useRef(dark);
  const currentHighlight = useRef(highlighted); currentHighlight.current = highlighted;
  const [status, setStatus] = useState("loading");
  currentDark.current = dark;
  useEffect(() => {
    let active = true, requested = false;
    const load = () => {
      if (requested) return; requested = true;
      import("./FilmCameraScene").then(({ FilmCameraScene }) => {
        if (!active) return;
        try {
          scene.current = new FilmCameraScene(host.current);
          if(initialPose)scene.current.setPose(initialPose);
          scene.current.setTheme(currentDark.current); scene.current.setHovered(currentHighlight.current);
          host.current.style.setProperty("--camera-reveal-delay", `${remainingEntranceDelay(host.current, entrance.footerStart)}ms`);
          if (controller) controller.current = scene.current; setStatus("ready");onReady?.(true);
        } catch { setStatus("unavailable");onReady?.(false); }
      }).catch(() => { if (active) {setStatus("unavailable");onReady?.(false);} });
    };
    const check = () => {
      if (!active || requested) return;
      const rect = host.current.getBoundingClientRect();
      if (rect.width && rect.height && rect.bottom > -80 && rect.top < innerHeight + 80) load();
    };
    window.addEventListener("scroll", check, { passive: true }); window.addEventListener("resize", check); check();
    return () => { active = false; window.removeEventListener("scroll", check); window.removeEventListener("resize", check); scene.current?.dispose(); scene.current = null; if (controller) controller.current = null; };
  }, []);
  useEffect(() => { scene.current?.setTheme(dark); }, [dark]);
  useEffect(() => { scene.current?.setHovered(highlighted); }, [highlighted]);
  return <div className="film-camera-dock" hidden={hidden || status === "unavailable"} data-status={status} data-entrance={entranceMotion} role="img" aria-label="Point-and-shoot film camera miniature" ref={host} />;
}
