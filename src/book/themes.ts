/** Print palettes shared by HTML, captured pages, portals and pop-up objects. */
export const THEMES = {
  about: {
    ink: "#161616",
    accent: "#5b5b5b",
    colors: ["#171717", "#606060"],
    gradient: "linear-gradient(110deg, #161616, #606060)",
  },
  "after-hours": {
    ink: "#393139",
    accent: "#9c74d1",
    colors: ["#7957a2", "#ed785b"],
  },
  stadia: {
    ink: "#a93021",
    accent: "#bc2378",
    colors: ["#f76529", "#e83195"],
    gradient: "linear-gradient(115deg, #dd4922, #be237c)",
  },
  ai: {
    ink: "#2358b7",
    accent: "#a5388b",
    colors: ["#4285f4", "#ea4335", "#fbbc05", "#34a853"],
    gradient:
      "linear-gradient(105deg, #245fc7 8%, #b43577 43%, #bc342c 64%, #277342 94%)",
  },
} as const;
export type ThemeName = keyof typeof THEMES;
export function projectTheme(name: string = "about") {
  return THEMES[name as ThemeName] ?? THEMES.about;
}
