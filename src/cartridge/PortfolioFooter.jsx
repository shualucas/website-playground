import React, { useState } from "react";
import { pickMusic } from "../content/music";
import { FilmCamera } from "./FilmCamera";

function RecordArtwork() {
  return <svg className="record-artwork" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect width="40" height="40" rx="7" fill="currentColor" opacity=".08" />
    <circle cx="20" cy="20" r="13" stroke="currentColor" opacity=".4" />
    <circle cx="20" cy="20" r="10" stroke="currentColor" opacity=".16" />
    <circle cx="20" cy="20" r="3" fill="currentColor" opacity=".5" />
  </svg>;
}

function FlatCamera() {
  return <svg className="footer-camera-flat" viewBox="0 0 164 116" role="img" aria-label="Point-and-shoot film camera">
    <g transform="translate(25 32) rotate(-9 55 27)">
      <path d="M107 13c35-2 32 52 8 50-15-1-11-19-3-25" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect width="111" height="57" rx="9" fill="currentColor" />
      <rect x="8" y="7" width="27" height="11" rx="2" fill="var(--scene-bg)" opacity=".8" />
      <rect x="82" y="8" width="15" height="9" rx="2" fill="var(--scene-bg)" opacity=".4" />
      <circle cx="64" cy="33" r="21" fill="var(--scene-bg)" opacity=".5" />
      <circle cx="64" cy="33" r="16" fill="currentColor" />
      <circle cx="64" cy="33" r="11" fill="var(--scene-bg)" opacity=".4" />
    </g>
  </svg>;
}

export function PortfolioFooter({ dark, ready, hidden }) {
  const [{ track, playlist }] = useState(pickMusic);
  const [artworkFailed, setArtworkFailed] = useState(false);
  return <footer className="collection-footer" hidden={hidden}>
    <a className="social-link" href="https://x.com/shualucas" target="_blank" rel="noopener noreferrer">
      <span>shualucas on</span>{" "}<span className="social-platform">X</span>
    </a>
    <figure className="footer-camera">
      {ready ? <FilmCamera dark={dark} hidden={hidden} /> : <FlatCamera />}
      <figcaption>say cheese</figcaption>
    </figure>
    <a className="now-playing" href={track?.url ?? playlist.url} target="_blank" rel="noopener noreferrer"
      aria-label={track ? `Listen to ${track.title} by ${track.artist} on Spotify` : "Open one of my playlists on Spotify"}
      title={track ? `${track.title} — ${track.artist}` : "My rotation on Spotify"} data-track={track?.title ?? ""}>
      <span className="now-playing-copy"><span>Now-ish playing</span><span className="now-playing-title">{track?.title ?? "my rotation"}</span></span>
      <span className="now-playing-artwork">
        {track && !artworkFailed ? <img src={track.artwork} alt={`${track.title} album artwork`} width="36" height="36" loading="lazy" onError={() => setArtworkFailed(true)} /> : <RecordArtwork />}
      </span>
    </a>
  </footer>;
}
