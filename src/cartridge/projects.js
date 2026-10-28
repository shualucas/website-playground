import { projects as zineProjects } from "../book/projects";
import { cartridges } from "./config";

/** Career pages stay separate from the preserved zine's four spreads. */
export const careerProjects = cartridges.map((cartridge) => {
  const existing = zineProjects.find((p) => p.id === (cartridge.id === "search" ? "ai-mode" : cartridge.id));
  const early = cartridge.id === "early-work";
  return {
    ...existing,
    id: cartridge.id,
    kind: "project",
    label: cartridge.name,
    title: cartridge.name,
    subtitle: "",
    theme: cartridge.id === "stadia" ? "stadia" : cartridge.id === "early-work" ? "after-hours" : cartridge.id === "gmail" ? "stadia" : "ai",
    team: cartridge.name,
    year: cartridge.years || "High school & college",
    role: cartridge.id === "blizzard" ? "Internship" : early ? "Student & personal projects" : "Product design",
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
