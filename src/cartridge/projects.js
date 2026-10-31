import { projects as zineProjects } from "../book/projects";
import { cartridges } from "./config";
import { aiModeCaseStudy } from "../content/ai-mode-case-study";
import { searchLabsCaseStudy } from "../content/search-labs-case-study";
import { stadiaCaseStudy } from "../content/stadia-case-study";

const careerDetails = {
  blizzard: { role: "UX Designer · Internship", team: "Team 1 · Heroes of the Storm & Starcraft II", period: "Summer 2017", location: "Irvine, CA" },
  gmail: { role: "Product Designer · Internship", team: "Gmail & Chat", period: "Summer 2019", location: "San Francisco, CA" },
  stadia: { role: "Product Designer", team: "Stadia", period: "2020–2022", location: "San Francisco, CA" },
  search: { role: "Senior Product Designer", team: "Google Search", period: "2022–Now", location: "San Francisco, CA" },
  "early-work": { role: "Student projects & experiments", team: "Design & games", period: "Before 2017", location: "" },
};

/** Career pages stay separate from the preserved zine's four spreads. */
export const careerProjects = cartridges.map((cartridge) => {
  const existing = zineProjects.find((p) => p.id === (cartridge.id === "search" ? "ai-mode" : cartridge.id));
  const details = careerDetails[cartridge.id];
  const early = cartridge.id === "early-work";
  return {
    ...existing,
    id: cartridge.id,
    kind: "project",
    label: cartridge.name,
    title: cartridge.name,
    subtitle: details.location,
    theme: cartridge.id === "stadia" ? "stadia" : cartridge.id === "early-work" ? "after-hours" : cartridge.id === "gmail" ? "stadia" : "ai",
    team: details.team,
    year: details.period,
    role: details.role,
    disciplines: early ? ["Design", "Games"] : ["Product design"],
    description: early ? "Personal design and game-related projects from high school and college." : "",
    previewVideo: existing?.previewVideo || "",
    previewGif: existing?.previewGif || "",
    previewPoster: existing?.previewPoster || "",
    previewImage: existing?.previewImage || "",
    imageAlt: `${cartridge.name} project preview`,
    caseStudyUrl: "",
    sample: true,
    chapters: early ? [["High school & college", "A place for my early personal projects and game-related design work."]] : existing?.chapters || [["The work", "Project details, imagery, and outcomes to come."]],
  };
});

const caseStudies = {
  "ai-mode-nudges": aiModeCaseStudy,
  "search-labs": searchLabsCaseStudy,
  "stadia-store-redesign": stadiaCaseStudy,
};

/** Project-specific destinations; case-study stories remain separate from career pages. */
export const recentProjects = [
  { id: "ai-mode-nudges", label: "AI Mode Nudges", description: "Guided follow-ups for clearer questions", cartridgeId: "search", theme: "ai" },
  { id: "search-labs", label: "Search Labs", description: "Launching AI experiments to 48M+ users", cartridgeId: "search", theme: "ai" },
  { id: "stadia-store-redesign", label: "Stadia Store Redesign", description: "Helping players explore and buy games", cartridgeId: "stadia", theme: "stadia" },
  { id: "rave-flyer-zine", label: "Zine of Extracurriculars", description: "Flyers for music, coffee, and community", href: "/after-hours/", cartridgeId: null, theme: "after-hours" },
].map(project => {
  const study = caseStudies[project.id];
  return {
  ...project, kind: "project", title: project.label, subtitle: project.description,
  role: "", team: "", year: "", disciplines: [], chapters: [], sample: true,
  previewImage: "", imageAlt: `${project.label} preview`, caseStudyUrl: "",
  ...(study ? {
    subtitle: study.subtitle, role: study.role,
    disciplines: [study.scope], sample: false, caseStudy: study,
  } : {}),
  };
});

export const portfolioProjects = [...careerProjects, ...recentProjects];
export const cartridgeForProject = id => cartridges.some(cartridge => cartridge.id === id)
  ? id : recentProjects.find(project => project.id === id)?.cartridgeId ?? null;
