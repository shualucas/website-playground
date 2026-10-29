import React, { useEffect, useRef, useState } from "react";
import { useListening } from "./useListening";
import "./listening.css";

export const listeningCaptions = ["now-ish listening", "currently spinning", "in the rotation"];

function TrackArtwork({ track, className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [track?.artwork]);
  return <span className={`listening-artwork ${className}`}>
    {track?.artwork && !failed ? <img src={track.artwork} alt="" width="52" height="52" loading="lazy" onError={() => setFailed(true)} /> : <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="7" fill="currentColor" opacity=".08" /><circle cx="20" cy="20" r="13" stroke="currentColor" opacity=".4" /><circle cx="20" cy="20" r="10" stroke="currentColor" opacity=".16" /><circle cx="20" cy="20" r="3" fill="currentColor" opacity=".5" /></svg>}
  </span>;
}

export function ListeningWidget() {
  const { track, recent, status, stale } = useListening();
  const [open, setOpen] = useState(false);
  const [caption] = useState(() => listeningCaptions[Math.floor(Math.random() * listeningCaptions.length)]);
  const toggle = useRef(null);
  const playing = Boolean(track?.playing && !stale);
  const profile = "https://www.last.fm/user/shualucas";
  const emptyTitle = status === "loading" ? "Loading listening history…" : status === "unavailable" ? "Listening unavailable" : status === "ready" ? "Nothing scrobbled yet" : "my listening history";
  const label = playing ? caption : track ? "last listened" : "Last.fm";
  return <div className="listening-widget" data-listening-status={status} onKeyDown={event => {
    if (open && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.current?.focus({ preventScroll: true }); }
  }}>
    {open && <section className="listening-history" id="recent-listening" role="region" aria-label="Recently listened">
      {recent.length ? <><ol>{recent.map((song, i) => <li key={`${song.playedAt ?? i}-${song.title}`} style={{ "--history-delay": `${(recent.length - 1 - i) * 65}ms` }}><a href={song.url || profile} target="_blank" rel="noopener noreferrer"><TrackArtwork track={song} /><span className="listening-song"><span>{song.title}</span><span>{song.artist}</span></span></a></li>)}</ol>{stale && <p className="listening-history-note">Showing your last available history.</p>}</> : <p className="listening-empty">{status === "loading" ? "Loading your recent songs…" : status === "unavailable" ? "Listening history is temporarily unavailable. Try again shortly." : status === "unconfigured" ? "Listening history will appear here once connected." : "Your first scrobbles will appear here."}</p>}
    </section>}
    <div className="listening-current" data-reveal>
      <a className="now-playing" href={track?.url || profile} target="_blank" rel="noopener noreferrer"
        aria-label={track ? `${playing ? "Currently listening" : "Last listened"}: ${track.title} by ${track.artist} on Last.fm` : "Open my listening history on Last.fm"}
        title={stale && track ? "Last.fm is temporarily unavailable. Showing the last known track." : undefined} data-track={track?.title || ""}>
        <TrackArtwork track={track} />
        <span className="now-playing-copy">
          <span className="listening-status">{playing && <span className="listening-indicator" aria-hidden="true" />}{label}</span>
          <span className="now-playing-title">{track?.title || emptyTitle}</span>
          {track && <span className="now-playing-artist">{track.artist}</span>}
        </span>
      </a>
      <button ref={toggle} className="listening-history-toggle" aria-label="Show last five songs" aria-expanded={open} aria-controls="recent-listening" onClick={() => setOpen(value => !value)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
      </button>
    </div>
  </div>;
}
