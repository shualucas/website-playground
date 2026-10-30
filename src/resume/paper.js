import { resume } from "./profile.js";

export const paper = { width: 595, height: 842 };
// Original A4 page coordinates, measured from the top-left, including each icon.
export const paperContacts = [
  { label: "joshglucas.com", href: resume.links.portfolio, x: 65, y: 782, width: 108, height: 32 },
  { label: resume.email, href: `mailto:${resume.email}`, x: 239, y: 782, width: 143, height: 32 },
  { label: "LinkedIn", href: resume.links.linkedin, x: 449, y: 782, width: 90, height: 32 },
];
