/** Print palettes shared by HTML, captured pages, portals and pop-up objects. */
export const THEMES = {
  about: {
    ink: "#2357a5",
    accent: "#d82f79",
    colors: ["#2357a5", "#f0518c"],
    gradient: "linear-gradient(110deg, #2357a5, #d82f79)",
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
export function themeStyle(name: string) {
  const theme = projectTheme(name);
  return {
    "--project-ink": theme.ink,
    "--project-accent": theme.accent,
    "--project-gradient": theme.gradient,
  };
}
