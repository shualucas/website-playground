import React from "react";
import { ListeningWidget } from "./ListeningWidget";
import { entrance } from "./entrance";
import { SocialLinks } from "../SocialLinks";

export function PortfolioFooter({ hidden, dismissHistory }) {
  return <footer className="collection-footer" hidden={hidden}>
    <SocialLinks data-reveal data-reveal-at={entrance.footerStart + 45} className="footer-links" />
    <ListeningWidget dismissHistory={dismissHistory} />
  </footer>;
}
