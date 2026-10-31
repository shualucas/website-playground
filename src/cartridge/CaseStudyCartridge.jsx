import React, { useEffect, useRef, useState } from "react";
import { cartridges } from "./config";

export function CaseStudyCartridge({ id }) {
  const host = useRef(null);
  const [status, setStatus] = useState("loading");
  const cartridge = cartridges.find(item => item.id === id);
  useEffect(() => {
    if (!cartridge) return;
    let active = true, scene;
    setStatus("loading");
    import("./CaseStudyCartridgeScene").then(({ CaseStudyCartridgeScene }) => {
      if (!active) return;
      try {
        scene = new CaseStudyCartridgeScene(host.current, cartridge, {
          onReady: () => active && setStatus("ready"),
          onError: () => active && setStatus("fallback"),
        });
      } catch { setStatus("fallback"); }
    }).catch(() => active && setStatus("fallback"));
    return () => { active = false; scene?.dispose(); };
  }, [id]);
  if (!cartridge) return null;
  return <div className="case-study-cartridge" data-cartridge={id} data-status={status} role="img" aria-label={`${id === "search" ? "Google Search" : cartridge.name} cartridge`} data-reveal>
    <div ref={host} className="case-cartridge-stage" aria-hidden="true" />
    {status === "fallback" && <div className="case-cartridge-fallback" style={{ "--cartridge-shell": cartridge.shell }} aria-hidden="true"><img src={cartridge.label} alt="" /></div>}
  </div>;
}
