import React, { useLayoutEffect, useRef } from "react";

const duration = 950, stagger = 150;

/** Count up once with the page entrance; keep the announced values stable. */
export function CaseStudyMetrics({ outcomes }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    const grid = root.current, motion = matchMedia("(prefers-reduced-motion: reduce)");
    const metrics = outcomes.map((outcome, index) => {
      const card = grid.children[index], node = card.querySelector(".case-metric-value");
      const parts = outcome.value.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
      const places = parts?.[2].split(".")[1]?.length ?? 0, scale = 10 ** places;
      const format = progress => parts
        ? `${parts[1]}${(Math.floor(Number(parts[2]) * scale * (1 - (1 - progress) ** 3)) / scale).toFixed(places)}${parts[3]}`
        : outcome.value;
      return { card, node, final:outcome.value, format, start:null };
    });
    let frame = 0, started = false;
    const complete = metric => {
      metric.node.dataset.value = metric.final;
      metric.card.dataset.metricState = "complete";
    };
    const finish = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      metrics.forEach(complete);
    };
    const start = () => {
      if (started || grid.dataset.revealState !== "visible") return;
      started = true; observer.disconnect();
      const delay = parseFloat(getComputedStyle(grid).getPropertyValue("--content-delay")) || 0;
      const beginning = performance.now() + delay;
      const tick = () => {
        const now = performance.now();
        let pending = false;
        metrics.forEach((metric, index) => {
          if (metric.start === null) {
            const previous = metrics[index - 1];
            if (now < beginning || previous && (previous.start === null || now - previous.start < stagger)) { pending = true; return; }
            metric.start = now;
            metric.card.dataset.metricState = "counting";
          }
          const elapsed = now - metric.start;
          if (elapsed >= duration) {
            if (metric.card.dataset.metricState !== "complete") complete(metric);
            return;
          }
          pending = true;
          const value = metric.format(elapsed / duration);
          if (metric.node.dataset.value !== value) metric.node.dataset.value = value;
        });
        if (pending) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new MutationObserver(start);
    const preference = () => { if (motion.matches) finish(); };
    motion.addEventListener("change", preference);
    if (motion.matches || !window.IntersectionObserver) finish();
    else {
      metrics.forEach(metric => {
        metric.node.dataset.value = metric.format(0);
        metric.card.dataset.metricState = "waiting";
      });
      observer.observe(grid, { attributes:true, attributeFilter:["data-reveal-state"] });
      start();
    }
    return () => { cancelAnimationFrame(frame); observer.disconnect(); motion.removeEventListener("change", preference); };
  }, [outcomes]);
  return <dl ref={root} data-reveal className="case-outcome-grid case-highlight-grid" aria-label="Project impact" style={{"--metric-duration":`${duration}ms`,"--metric-columns":outcomes.length}}>
    {outcomes.map(outcome => <div key={outcome.label} data-metric-state="waiting">
      <dt>{outcome.label}</dt>
      <dd><span className="sr-only">{outcome.value}</span><span className="case-metric-value" aria-hidden="true" data-value={outcome.value} data-measure={outcome.value.replace(/\d/g,"0")} /></dd>
    </div>)}
  </dl>;
}
