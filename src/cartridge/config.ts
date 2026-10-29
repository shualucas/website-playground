/** Career chronology and team-colored, unprinted placeholder panels. */
export const cartridges = [
  { id: "blizzard", number: "01", name: "Blizzard Entertainment", years: "2017", label: "/cartridges/labels/blizzard-tonal.svg", shell: "#1769ad", accent: "#1769ad" },
  { id: "gmail", number: "02", name: "Gmail", years: "2019", label: "/cartridges/labels/gmail-tonal.svg", shell: "#be4943", accent: "#be4943" },
  { id: "stadia", number: "03", name: "Stadia", years: "2020 – 2022", label: "/cartridges/labels/stadia-tonal.svg", shell: "#da4c73", accent: "#da4c73" },
  { id: "search", number: "04", name: "Search", years: "2022 – now", label: "/cartridges/labels/search-tonal.svg", shell: "#477bcc", accent: "#477bcc" },
  { id: "early-work", number: "05", name: "Early work", years: "", label: "/cartridges/labels/early-work-tonal.svg", shell: "#8b6caa", accent: "#8b6caa" },
] as const;
export type CartridgeId = typeof cartridges[number]["id"];

/** Mamuso's Famicom GLB; source and undeclared license status are in models/SOURCE.md. */
export const cartridgeModel: { url: string; labelMesh: string; rotation: [number, number, number] } = {
  url: "/cartridges/models/mamuso-famicom.glb", labelMesh: "Label", rotation: [0, 0, 0],
};
