import React from "react";
import { profileLinks } from "./profile";

export function SocialLinks({ className = "", ...props }) {
  return <nav className={`profile-links ${className}`} aria-label="Connect with Josh" {...props}>
    <a href={profileLinks.linkedin} data-dither-color="#7e99dd" target="_blank" rel="noopener noreferrer"><span className="link-copy">LinkedIn</span></a>
    <a className="social-link" href={profileLinks.x} data-dither-color="#c170c4" target="_blank" rel="noopener noreferrer" aria-label="shualucas on X"><span className="link-copy social-platform">X</span></a>
    <a href={profileLinks.resume} data-dither-color="#e97958"><span className="link-copy">Résumé</span></a>
  </nav>;
}
