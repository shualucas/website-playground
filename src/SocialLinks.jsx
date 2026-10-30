import React from "react";
import { profileLinks } from "./profile";

export function SocialLinks({ className = "", ...props }) {
  return <nav className={`profile-links ${className}`} aria-label="Connect with Josh" {...props}>
    <a href={profileLinks.linkedin} target="_blank" rel="noopener noreferrer"><span className="link-copy">LinkedIn</span></a>
    <a className="social-link" href={profileLinks.x} target="_blank" rel="noopener noreferrer" aria-label="shualucas on X"><span className="link-copy social-platform">X</span></a>
    <a href={profileLinks.resume}><span className="link-copy">Résumé</span></a>
  </nav>;
}
