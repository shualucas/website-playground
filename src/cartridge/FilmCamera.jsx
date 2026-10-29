import React, { useEffect, useRef, useState } from "react";

export function FilmCamera({ dark, hidden, controller }) {
  const host = useRef(null), scene = useRef(null), currentDark = useRef(dark);
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
          scene.current.setTheme(currentDark.current); if (controller) controller.current = scene.current; setStatus("ready");
        } catch { setStatus("unavailable"); }
      }).catch(() => { if (active) setStatus("unavailable"); });
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
  return <div className="film-camera-dock" hidden={hidden || status === "unavailable"} data-status={status} role="img" aria-label="Point-and-shoot film camera miniature" ref={host} />;
}
