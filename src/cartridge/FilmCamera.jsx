import React, { useEffect, useRef, useState } from "react";

export function FilmCamera({ dark, hidden }) {
  const host = useRef(null), scene = useRef(null), currentDark = useRef(dark);
  const [status, setStatus] = useState("loading");
  currentDark.current = dark;
  useEffect(() => {
    let active = true;
    import("./FilmCameraScene").then(({ FilmCameraScene }) => {
      if (!active) return;
      try {
        scene.current = new FilmCameraScene(host.current);
        scene.current.setTheme(currentDark.current); setStatus("ready");
      } catch { setStatus("unavailable"); }
    }).catch(() => { if (active) setStatus("unavailable"); });
    return () => { active = false; scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => { scene.current?.setTheme(dark); }, [dark]);
  return <div className="film-camera-dock" hidden={hidden || status === "unavailable"} data-status={status} role="img" aria-label="Point-and-shoot film camera miniature" ref={host} />;
}
