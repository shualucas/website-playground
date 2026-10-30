export type ShellFinish = { transmission: number; roughness: number; thickness: number; attenuationDistance: number };
const matte: ShellFinish = { transmission: 0, roughness: .68, thickness: 0, attenuationDistance: Infinity };

/** Display order is top to bottom, most recent work first. */
export const cartridges = [
  { id: "search", number: "01", name: "Search", years: "2022 – now", label: "/cartridges/labels/search-label.jpg", shell: "#d8d2c3", accent: "#d8d2c3", finish: { transmission: .40, roughness: .16, thickness: .055, attenuationDistance: 4 } },
  { id: "stadia", number: "02", name: "Stadia", years: "2020 – 2022", label: "/cartridges/labels/stadia-label.jpg", shell: "#d8541c", accent: "#d8541c", finish: { transmission: .94, roughness: .08, thickness: .035, attenuationDistance: 4 } },
  { id: "gmail", number: "03", name: "Gmail", years: "2019", label: "/cartridges/labels/gmail-label.jpg", shell: "#9d1938", accent: "#9d1938", finish: { transmission: .94, roughness: .08, thickness: .035, attenuationDistance: 4 } },
  { id: "blizzard", number: "04", name: "Blizzard Entertainment", years: "2017", label: "/cartridges/labels/blizzard-label.svg", shell: "#1d4cac", accent: "#1d4cac", finish: { transmission: .94, roughness: .08, thickness: .035, attenuationDistance: 4 } },
  { id: "early-work", number: "05", name: "Early work", years: "Before 2017", label: "/cartridges/labels/early-work-label.svg", shell: "#34383a", accent: "#34383a", finish: matte },
] as const;
export type CartridgeId = typeof cartridges[number]["id"];

/** Mamuso's Famicom GLB; source and undeclared license status are in models/SOURCE.md. */
export const cartridgeModel: { url: string; labelMesh: string; rotation: [number, number, number] } = {
  url: "/cartridges/models/mamuso-famicom.glb", labelMesh: "Label", rotation: [0, 0, 0],
};
