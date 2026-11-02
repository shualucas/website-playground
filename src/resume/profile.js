import { profileLinks } from "../profile.js";

// Shared source for the web résumé and PDF. Experience, tools, skills, and email
// come from jlucas_resume_2026.pdf; the summary/location were supplied previously.
export const resume = {
  name: "Joshua Lucas",
  title: "Senior Product Designer at Google",
  location: "San Francisco, California",
  summary: "I'm a systems thinker with a knack for micro interactions and finer details. I like figuring out what should exist, what it should feel like, and how to make it happen.",
  email: "joshglucas@gmail.com",
  skills: ["AI prototyping", "Interaction design", "Visual & motion craft", "Product strategy", "Brand development", "Design systems"],
  tools: ["Antigravity", "Codex", "Github", "Figma", "Adobe Suite", "GIFSKI"],
  links: profileLinks,
  experience: [
    { company: "Google", role: "Product Designer", period: "May 2019 - Present", location: "San Francisco, CA", work: [
      "Leading the follow-up and interactive questionnaire framework across Google Search & AI Mode so people can narrow down broad questions without guessing what to type next. Replaced one-off vertical builds across 10+ product teams, driving +1.84% daily active users and +3.87% follow-up engagement.",
      "Designed AI Mode’s core conversation framework for multi-turn chat, file sharing, and highlight-to-ask follow-ups. Standardized shared patterns so Search and Ads teams ship faster without cluttering the page, driving +7.73% follow-up questions, +4.07% targeted follow-ups, and a pending US utility patent (co-inventor).",
      "Built live browser prototypes using internal coding tools to validate complex interactions before engineering buildout, speeding up launch decisions over static mocks. Published reusable templates featured across Google UX and coached fellow Search designers.",
      "Overhauled Google Search Labs with a cross-functional team, turning a bare-bones US waitlist (~1M users, 3 tests) into a safe global AI testing platform without risking core Search revenue. Enabled 20+ teams to ship faster, scaling to 48M+ opted-in users and 5M daily active users across 120+ countries to incubate AI Overviews and AI Mode.",
      "Created the new official Google Search Console icon (first refresh in a decade, live across Search Console, Analytics, and Site Kit) and brought Search’s unified AI transition framework to AI Mode (co-inventor, pending US design patent).",
      "Led UX strategy for a revamped Google Stadia storefront, overhauling product detail pages around controller D-pad navigation so players could buy confidently without leaving the store. Drove +12% game sales and set new design standards across the platform.",
    ] },
  ],
};
