import React from "react";
import { CameraLink } from "./CameraLink";
import { ListeningWidget } from "./ListeningWidget";
import { entrance } from "./entrance";

export function PortfolioFooter({ dark, ready, hidden }) {
  return <footer className="collection-footer" hidden={hidden}>
    <a data-reveal data-reveal-at={entrance.footerStart} className="social-link" href="https://x.com/shualucas" target="_blank" rel="noopener noreferrer">
      <span>shualucas on</span>{" "}<span className="social-platform">X</span>
    </a>
    <figure className="footer-camera">
      <CameraLink dark={dark} hidden={hidden} ready={ready} />
      <figcaption data-reveal data-reveal-at={entrance.footerStart + 45}>say cheese</figcaption>
    </figure>
    <ListeningWidget />
  </footer>;
}
