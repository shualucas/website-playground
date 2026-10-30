import React from "react";
import { CameraLink } from "./CameraLink";
import { ListeningWidget } from "./ListeningWidget";
import { entrance } from "./entrance";
import { SocialLinks } from "../SocialLinks";

export function PortfolioFooter({ dark, ready, hidden }) {
  return <footer className="collection-footer" hidden={hidden}>
    <figure className="footer-camera">
      <CameraLink dark={dark} hidden={hidden} ready={ready} />
    </figure>
    <SocialLinks data-reveal data-reveal-at={entrance.footerStart + 45} className="footer-links" />
    <ListeningWidget />
  </footer>;
}
