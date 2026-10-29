export type ShellFinish = { transmission: number; roughness: number; thickness: number; attenuationDistance: number };
const matte: ShellFinish = { transmission: 0, roughness: .68, thickness: 0, attenuationDistance: Infinity };

/** Display order is top to bottom, most recent work first. */
export const cartridges = [
  { id: "search", number: "01", name: "Search", years: "2022 – now", label: "/cartridges/labels/search-tonal.svg", shell: "#1d4cac", accent: "#1d4cac", finish: { transmission: .62, roughness: .26, thickness: .10, attenuationDistance: 1.6 } },
  { id: "stadia", number: "02", name: "Stadia", years: "2020 – 2022", label: "/cartridges/labels/stadia-tonal.svg", shell: "#34383a", accent: "#34383a", finish: matte },
  { id: "gmail", number: "03", name: "Gmail", years: "2019", label: "/cartridges/labels/gmail-tonal.svg", shell: "#b8af98", accent: "#b8af98", finish: { ...matte, roughness: .72 } },
  { id: "blizzard", number: "04", name: "Blizzard Entertainment", years: "2017", label: "/cartridges/labels/blizzard-tonal.svg", shell: "#263c54", accent: "#263c54", finish: { transmission: .20, roughness: .48, thickness: .18, attenuationDistance: .9 } },
  { id: "early-work", number: "05", name: "Early work", years: "", label: "/cartridges/labels/early-work-tonal.svg", shell: "#8b6caa", accent: "#8b6caa", finish: matte },
] as const;
export type CartridgeId = typeof cartridges[number]["id"];

/** Mamuso's Famicom GLB; source and undeclared license status are in models/SOURCE.md. */
export const cartridgeModel: { url: string; labelMesh: string; rotation: [number, number, number] } = {
  url: "/cartridges/models/mamuso-famicom.glb", labelMesh: "Label", rotation: [0, 0, 0],
};
