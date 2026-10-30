import { profileLinks } from "../profile.js";

// Shared source for the web résumé and its selectable-text PDF. Only supplied facts.
export const resume = {
  name: "Josh Lucas",
  title: "Senior Product Designer at Google",
  location: "San Francisco, California",
  summary: "I'm a systems thinker with a knack for micro interactions and finer details. I like figuring out what should exist, what it should feel like, and how to make it happen.",
  focus: ["Product design", "Systems thinking", "Prototyping", "Micro interactions"],
  links: profileLinks,
  experience: [
    { company: "Google Search", role: "Senior Product Designer", period: "2022 — present", location: "San Francisco, CA", work: ["AI Mode Nudges — helping users continue their journeys and clarify intent.", "Search Labs — a creative playground for features on Search."] },
    { company: "Google Stadia", role: "Product Designer", period: "2020 — 2022", location: "San Francisco, CA", work: ["Stadia Store Redesign — guiding users towards making the right purchase."] },
    { company: "Google · Gmail & Chat", role: "Product Design Intern", period: "Summer 2019", location: "San Francisco, CA", work: ["Product design on Gmail and Chat."] },
    { company: "Blizzard Entertainment", role: "UX Design Intern", period: "Summer 2017", location: "Irvine, CA", work: ["Team 1 — Heroes of the Storm and StarCraft II."] },
  ],
};
