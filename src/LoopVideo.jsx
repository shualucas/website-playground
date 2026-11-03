import React, { useEffect, useRef, useState } from "react";
import "./loop-video.css";

/** Load silent motion only when visible; retain a real still for slow loads and reduced motion. */
export function LoopVideo({ src, srcSmall, poster, label, active = true, className = "" }) {
  const frame = useRef(null), player = useRef(null);
  const [inView, setInView] = useState(false), [loaded, setLoaded] = useState(false), [ready, setReady] = useState(false);
  const [media, setMedia] = useState(() => ({ reduced:matchMedia("(prefers-reduced-motion: reduce)").matches, small:matchMedia("(max-width:899px)").matches }));
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)"), viewport = matchMedia("(max-width:899px)");
    const update = () => setMedia({ reduced:motion.matches, small:viewport.matches });
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= .5), { threshold:[0, .5] });
    observer.observe(frame.current);motion.addEventListener("change", update);viewport.addEventListener("change", update);
    return () => { observer.disconnect();motion.removeEventListener("change", update);viewport.removeEventListener("change", update); };
  }, []);
  const playing = active && inView && !media.reduced;
  const source = loaded && !media.reduced ? media.small && srcSmall ? srcSmall : src : undefined;
  useEffect(() => { if (playing) setLoaded(true); }, [playing]);
  useEffect(() => {
    const video = player.current;
    if (playing && source) video.play().catch(() => {});
    else { video.pause();if (!active && video.readyState) video.currentTime = 0; }
    return () => video.pause();
  }, [playing, source, active]);
  return <div ref={frame} className={`loop-video ${className}`}>
    <img className="loop-video-poster" src={poster} alt={label} aria-hidden={!media.reduced} decoding="async" />
    <video ref={player} src={source} poster={poster} muted loop playsInline preload="none" aria-label={label} aria-hidden={media.reduced}
      data-ready={ready && !media.reduced} onPlaying={() => setReady(true)} onEmptied={() => setReady(false)} onError={() => setReady(false)} />
  </div>;
}
