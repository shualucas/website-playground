/** Replaceable artwork and shell colors. Labels are original, editable SVGs. */
export const cartridges = [
  { id: "about", number: "01", name: "Josh Lucas", category: "ABOUT ME", label: "/cartridges/labels/about.svg", shell: "#a7aaa4", accent: "#555c51", caption: "A little about the person behind the pixels." },
  { id: "stadia", number: "02", name: "Stadia", category: "GOOGLE · SELECTED WORK", label: "/cartridges/labels/stadia.svg", shell: "#c7a9a8", accent: "#cf325f", caption: "Play, without the boundaries." },
  { id: "ai-mode", number: "03", name: "AI Mode", category: "GOOGLE · SELECTED WORK", label: "/cartridges/labels/ai-mode.svg", shell: "#a5b3b7", accent: "#3d6ac7", caption: "A new way to explore a question." },
  { id: "after-hours", number: "04", name: "After-hours", category: "PERSONAL COLLECTION", label: "/cartridges/labels/after-hours.svg", shell: "#b6a6bd", accent: "#79569c", caption: "Film, tennis, games. A few things beyond the screen." },
] as const;
export type CartridgeId = typeof cartridges[number]["id"];

/** Optional licensed GLB. Local procedural shell is the default, not the Sketchfab asset.
 * Add the file under public/cartridges/models, set url, and identify its label mesh.
 * Rotation puts the front toward +Z, top toward +Y; model is normalized to 2.4 units wide.
 */
export const cartridgeModel: { url: string; labelMesh: string; rotation: [number, number, number] } = {
  url: "", labelMesh: "Label", rotation: [0, 0, 0],
};
