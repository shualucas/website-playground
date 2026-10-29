export const entrance = {
  introStart: 250,
  introSpread: 390,
  duration: 700,
};
// Continue the same page clock through the project index, then the footer.
entrance.projectsStart = entrance.introStart + entrance.introSpread + entrance.duration + 60;
entrance.footerStart = entrance.projectsStart + 240 + entrance.duration + 60;

export function remainingEntranceDelay(element, at) {
  const page = element.closest('[data-reveal-flow="page"]');
  const start = Number(page?.dataset.revealStart);
  return Number.isFinite(start) ? Math.max(0, start + at - performance.now()) : 0;
}
