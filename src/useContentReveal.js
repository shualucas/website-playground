import { useLayoutEffect, useRef } from "react";
import "./reveal.css";

/** Reveal each content block once, including content below the initial fold. */
export function useContentReveal(scope, version, enabled = true) {
  const pageStart = useRef(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const pageFlow = scope.current?.dataset.revealFlow === "page";
    if (pageFlow) {
      pageStart.current ??= performance.now();
      scope.current.dataset.revealStart = String(pageStart.current);
    }
    const elements = [...(scope.current?.querySelectorAll("[data-reveal]") || [])]
      .filter(element => element.dataset.revealState !== "visible");
    if (!elements.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !window.IntersectionObserver) {
      elements.forEach(element => { element.dataset.revealState = "visible"; });
      return;
    }
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        const at = Number(target.dataset.revealAt);
        const remaining = pageFlow && Number.isFinite(at) ? Math.max(0, pageStart.current + at - performance.now()) : 0;
        target.style.setProperty("--content-delay", `${remaining + Math.min(order++ * 45, 180)}ms`);
        target.dataset.revealState = "visible";
        observer.unobserve(target);
      }
    }, { threshold: .05 });
    elements.forEach(element => { element.dataset.revealState = "waiting"; observer.observe(element); });
    return () => observer.disconnect();
  }, [scope, version, enabled]);
}
