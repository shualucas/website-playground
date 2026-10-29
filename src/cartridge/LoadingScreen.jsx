import React, { useEffect, useRef, useState } from "react";

const ids = ["camera", "cdj", "zine", "bulb"];
function FlatMiniature({ index }) {
  return <svg viewBox="0 0 160 160" aria-hidden="true" className="loader-flat">
    {index === 0 ? <><rect x="22" y="50" width="105" height="68" rx="12" fill="#20252b" /><circle cx="78" cy="86" r="24" fill="#445861" /><circle cx="78" cy="86" r="17" fill="#101e25" /><rect x="30" y="58" width="25" height="12" rx="2" fill="#eee" /><path d="M127 66c32-8 32 56 5 48" fill="none" stroke="#20252b" strokeWidth="5" /></> :
      index === 1 ? <><rect x="33" y="18" width="94" height="128" rx="10" fill="#20252b" /><rect x="46" y="30" width="61" height="26" rx="3" fill="#244b60" /><path d="m50 45 7-8 8 14 7-17 10 13 9-8 10 6" fill="none" stroke="#91bfc4" strokeWidth="3" /><circle cx="80" cy="95" r="28" fill="#737e86" /><circle cx="80" cy="95" r="23" fill="#18232c" /><circle cx="45" cy="132" r="6" fill="#afca6a" /></> :
      index === 2 ? <><rect x="37" y="24" width="91" height="122" rx="4" fill="#cac5b8" /><rect x="31" y="18" width="91" height="122" rx="4" fill="#f0e4cb" /><rect x="47" y="39" width="48" height="67" fill="#d84964" transform="rotate(-7 70 70)" /><circle cx="86" cy="97" r="23" fill="#ed8b43" /><path d="M40 29v100" stroke="#a6a194" strokeWidth="2" /></> :
      <><path d="M61 113c0-22-26-29-26-58a45 45 0 0 1 90 0c0 29-26 36-26 58Z" fill="#f7cf68" /><rect x="61" y="109" width="38" height="31" rx="5" fill="#9ca5aa" /><path d="m61 117 38-5m-38 15 38-5m-38 15 38-5" stroke="#d3d7d8" strokeWidth="4" /><path d="M71 142h18" stroke="#394148" strokeWidth="6" strokeLinecap="round" /></>}
  </svg>;
}

export function LoadingScreen({ ready, onComplete }) {
  const host = useRef(null), finish = useRef(onComplete);
  const [index, setIndex] = useState(0), [backend, setBackend] = useState("loading");
  const [minimum, setMinimum] = useState(false), [exiting, setExiting] = useState(false);
  finish.current = onComplete;
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = previous; };
  }, []);
  useEffect(() => {
    let active = true, scene, interval, timer;
    const fallback = () => {
      if (!active) return; setBackend("fallback");
      interval = setInterval(() => setIndex((value) => (value + 1) % 4), 750);
      timer = setTimeout(() => setMinimum(true), 3000);
    };
    import("./LoadingScene").then(({ LoadingScene }) => {
      if (!active) return;
      try { scene = new LoadingScene(host.current, { onIndex: setIndex, onReady: () => setBackend("3d"), onMinimum: () => setMinimum(true) }); }
      catch { fallback(); }
    }).catch(fallback);
    return () => { active = false; clearInterval(interval); clearTimeout(timer); scene?.dispose(); };
  }, []);
  useEffect(() => {
    if (!minimum || !ready) return;
    setExiting(true); const timer = setTimeout(() => finish.current(), 240);
    return () => clearTimeout(timer);
  }, [minimum, ready]);
  return <div className={`miniature-loader${exiting ? " is-exiting" : ""}`} role="status" data-active={ids[index]} data-backend={backend} data-minimum={minimum}>
    <span className="sr-only">Loading portfolio</span>
    <div className="loader-center" aria-hidden="true">
      <div className="loader-model-stage" ref={host} />
      {backend !== "3d" && <div className="loader-fallback"><FlatMiniature index={index} /></div>}
      <span className="loader-label">Loading</span>
    </div>
  </div>;
}
