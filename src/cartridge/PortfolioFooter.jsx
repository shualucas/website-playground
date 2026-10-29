import React from "react";
import { CameraLink } from "./CameraLink";
import { ListeningWidget } from "./ListeningWidget";

export function PortfolioFooter({ dark, ready, hidden }) {
  return <footer className="collection-footer" hidden={hidden}>
    <a className="social-link" href="https://x.com/shualucas" target="_blank" rel="noopener noreferrer">
      <span>shualucas on</span>{" "}<span className="social-platform">X</span>
    </a>
    <figure className="footer-camera">
      <CameraLink dark={dark} hidden={hidden} ready={ready} />
      <figcaption>say cheese</figcaption>
    </figure>
    <ListeningWidget />
  </footer>;
}
