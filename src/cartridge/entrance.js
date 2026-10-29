export const entrance = {
  introStart: 250,
  introSpread: 390,
  duration: 700,
};
// The footer follows the final hero word, using the same page clock.
entrance.footerStart = entrance.introStart + entrance.introSpread + entrance.duration + 60;

export function remainingEntranceDelay(element, at) {
  const page = element.closest('[data-reveal-flow="page"]');
  const start = Number(page?.dataset.revealStart);
  return Number.isFinite(start) ? Math.max(0, start + at - performance.now()) : 0;
}
