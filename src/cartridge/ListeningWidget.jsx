import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useListening } from "./useListening";
import { entrance } from "./entrance";
import "./listening.css";

export const listeningCaptions = ["now-ish listening", "currently spinning", "in the rotation"];

function TrackArtwork({ track, className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [track?.artwork]);
  return <span className={`listening-artwork ${className}`}>
    {track?.artwork && !failed ? <img src={track.artwork} alt="" width="44" height="44" loading="lazy" onError={() => setFailed(true)} /> : <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" fill="currentColor" opacity=".08" /><circle cx="20" cy="20" r="13" stroke="currentColor" opacity=".4" /><circle cx="20" cy="20" r="10" stroke="currentColor" opacity=".16" /><circle cx="20" cy="20" r="3" fill="currentColor" opacity=".5" /></svg>}
  </span>;
}

const ranks=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const albumMasks=Object.fromEntries(Array.from({length:9},(_,step)=>{
  const mask=inverse=>{
    const cells=ranks.map((rank,i)=>(inverse?rank>=step*2:rank<step*2)?`<rect x="${i%4*2}" y="${Math.floor(i/4)*2}" width="2" height="2" fill="white"/>`:'').join('');
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">${cells}</svg>`)}")`;
  };
  return [[`--album-mask-${step}`,mask(false)],[`--album-out-mask-${step}`,mask(true)]];
}).flat());

function TrackView({track,label,emptyTitle,announcement,entering=false}){
 return <span className={`now-playing-track${entering?' is-entering':''}`}>
  <span className="now-playing-copy"><span className="listening-status sr-only">{label}</span>
   <span className="now-playing-title">{announcement||track?.title||emptyTitle}</span>
   {track&&!announcement&&<span className="now-playing-artist">{track.artist}</span>}
  </span>
 </span>;
}
function TrackCopy(view){
 const identity=JSON.stringify([view.track?.title,view.track?.artist,view.announcement]);
 const previous=useRef(null),[outgoing,setOutgoing]=useState(null);
 useLayoutEffect(()=>{
  const old=previous.current;
  if(!old?.track||!view.track||old.identity===identity||matchMedia('(prefers-reduced-motion: reduce)').matches){setOutgoing(null);return}
  setOutgoing(old);const timer=setTimeout(()=>setOutgoing(null),400);return()=>clearTimeout(timer);
 },[identity]);
 useLayoutEffect(()=>{previous.current={...view,identity}});
 return <span className="listening-text-stack"><TrackView key={identity} {...view} entering={Boolean(outgoing)}/>
  {outgoing&&<span className="now-playing-outgoing" aria-hidden="true"><TrackView {...outgoing}/></span>}
 </span>;
}
function TrackTransition(view){
 const identity=view.track?JSON.stringify([view.track.title,view.track.artist,view.track.url]):'';
 const previous=useRef(null),[announcement,setAnnouncement]=useState(null),[oldArt,setOldArt]=useState(null),[displayedArt,setDisplayedArt]=useState(view.track);
 const phrase=useMemo(()=>['Now playing','Now scrobbling','Now jammin'][Math.floor(Math.random()*3)],[identity]);
 const changing=Boolean(previous.current?.track&&previous.current.identity!==identity&&view.track);
 useLayoutEffect(()=>{
  const old=previous.current;
  if(!old?.track||old.identity===identity||!view.track){setAnnouncement(null);return}
  setAnnouncement(phrase);
  const timer=setTimeout(()=>setAnnouncement(null),1600);return()=>clearTimeout(timer);
 },[identity]);
 useLayoutEffect(()=>{
  const old=previous.current;
  if(!old?.track||old.identity===identity||!view.track||matchMedia('(prefers-reduced-motion: reduce)').matches){setOldArt(null);setDisplayedArt(view.track);return}
  let alive=true,started=false,timer;const image=new Image();
  const start=()=>{if(!alive||started)return;started=true;setOldArt(displayedArt);setDisplayedArt(view.track);timer=setTimeout(()=>setOldArt(null),720)};
  if(view.track.artwork){image.onload=image.onerror=start;image.src=view.track.artwork}else start();
  return()=>{alive=false;image.onload=image.onerror=null;clearTimeout(timer)};
 },[identity,view.track?.artwork]);
 useLayoutEffect(()=>{previous.current={...view,identity}});
 return <span className="now-playing-transition" data-changing={Boolean(oldArt)}>
  <TrackCopy {...view} announcement={changing?phrase:announcement}/>
  <span className="listening-album-stack" style={albumMasks} data-dissolving={Boolean(oldArt)}>
   <span key={identity} className={oldArt?'album-incoming':''}><TrackArtwork track={displayedArt}/></span>
   {oldArt&&<span className="album-outgoing" aria-hidden="true"><TrackArtwork track={oldArt}/></span>}
  </span>
 </span>;
}

export function ListeningWidget({ dismissHistory = false }) {
  const { track, recent, status, stale } = useListening();
  const widget = useRef(null);
  const historyId=useId();
  const [open, setOpen] = useState(false);
  const [historyPresent, setHistoryPresent] = useState(false);
  // Keep the absolute panel mounted for its exit; a new click cancels dismissal.
  useEffect(() => {
    if (open) { setHistoryPresent(true); return; }
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const dismiss = () => setHistoryPresent(false);
    if (motion.matches) { dismiss(); return; }
    const timer = setTimeout(dismiss, 320);
    const onMotionChange = () => { if (motion.matches) dismiss(); };
    motion.addEventListener("change", onMotionChange);
    return () => { clearTimeout(timer); motion.removeEventListener("change", onMotionChange); };
  }, [open]);
  const [caption] = useState(() => listeningCaptions[Math.floor(Math.random() * listeningCaptions.length)]);
  const toggle = useRef(null);
  useEffect(()=>{
    if(!dismissHistory)return;
    if(widget.current?.querySelector(".listening-history")?.contains(document.activeElement))toggle.current?.focus({preventScroll:true});
    setOpen(false);
  },[dismissHistory]);
  const playing = Boolean(track?.playing && !stale);
  const profile = "https://www.last.fm/user/shualucas";
  const emptyTitle = status === "loading" ? "Loading listening history…" : status === "unavailable" ? "Listening unavailable" : status === "ready" ? "Nothing scrobbled yet" : "my listening history";
  const label = playing ? caption : track ? "last listened" : "Last.fm";
  return <div ref={widget} className="listening-widget" data-listening-status={status} data-playing={playing} onKeyDown={event => {
    if (open && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.current?.focus({ preventScroll: true }); }
  }}>
    {(open || historyPresent) && <section className="listening-history" id={historyId} role="region" aria-label="Recently listened" data-state={open ? "open" : "closing"} aria-hidden={!open} inert={!open}>
      {recent.length ? <><ol>{recent.map((song, i) => <li key={`${song.playedAt ?? i}-${song.title}`} style={{ "--history-delay": `${(recent.length - 1 - i) * 65}ms` }}><a href={song.url || profile} target="_blank" rel="noopener noreferrer"><TrackArtwork track={song} /><span className="listening-song"><span>{song.title}</span><span>{song.artist}</span></span></a></li>)}</ol>{stale && <p className="listening-history-note">Showing your last available history.</p>}</> : <p className="listening-empty">{status === "loading" ? "Loading your recent songs…" : status === "unavailable" ? "Listening history is temporarily unavailable. Try again shortly." : status === "unconfigured" ? "Listening history will appear here once connected." : "Your first scrobbles will appear here."}</p>}
    </section>}
    <div className="listening-current" data-reveal data-reveal-at={entrance.footerStart + 90}>
      <button ref={toggle} type="button" className="listening-history-toggle" aria-label="Show last five songs" title="Recently played" aria-expanded={open} aria-controls={historyId} onClick={() => setOpen(value => !value)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 11h11M4 16h7m5-1 4 3-4 3z" /></svg>
      </button>
      <a className="now-playing" href={track?.url || profile} target="_blank" rel="noopener noreferrer"
        aria-label={track ? `${playing ? "Currently listening" : "Last listened"}: ${track.title} by ${track.artist} on Last.fm` : "Open my listening history on Last.fm"}
        title={stale && track ? "Last.fm is temporarily unavailable. Showing the last known track." : undefined} data-track={track?.title || ""}>
        <TrackTransition track={track} playing={playing} label={label} emptyTitle={emptyTitle} />
      </a>
    </div>
  </div>;
}
