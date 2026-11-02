import { useLayoutEffect, useRef } from "react";
import "./reveal.css";
import "./link-motion.css";

/** Reveal once, then enable input when that block's actual entrance finishes. */
export function useContentReveal(scope, version, enabled = true) {
  const pageStart = useRef(null);
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    const pageFlow = root.dataset.revealFlow === "page";
    if (enabled && pageFlow) {
      pageStart.current ??= performance.now();
      root.dataset.revealStart = String(pageStart.current);
    }
    const elements = [...root.querySelectorAll("[data-reveal], [data-reveal-gate]")]
      .filter(element => element.dataset.revealReady !== "true");
    if (!elements.length) return;
    let alive = true;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const interactive = 'a[href],button,input,textarea,select,canvas,[role="button"],[tabindex]:not([tabindex="-1"])';
    const unlock = element => {
      if (!alive) return;
      element.dataset.revealReady = "true";
      if (element.dataset.revealInert === "true") {
        element.inert = false;
        delete element.dataset.revealInert;
      }
    };
    const finishEntrance = element => {
      const animations = element.getAnimations().filter(animation =>
        animation.animationName === "content-reveal" || animation.animationName === "intro-reveal");
      if (!animations.length) unlock(element);
      else Promise.all(animations.map(animation => animation.finished)).then(() => unlock(element), () => {});
    };
    elements.forEach(element => {
      element.dataset.revealReady = "false";
      if (!element.inert && (element.matches(interactive) || element.querySelector(interactive))) {
        element.inert = true;
        element.dataset.revealInert = "true";
      }
      if (!element.hasAttribute("data-reveal-gate") && element.dataset.revealState !== "visible")
        element.dataset.revealState = "waiting";
    });
    if (!enabled) return () => { alive = false; };
    const showImmediately = () => elements.forEach(element => {
      if (element.hasAttribute("data-reveal")) element.dataset.revealState = "visible";
      unlock(element);
    });
    if (motion.matches || !window.IntersectionObserver) {
      showImmediately();
      return () => { alive = false; };
    }
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        const at = Number(target.dataset.revealAt);
        const remaining = pageFlow && Number.isFinite(at) ? Math.max(0, pageStart.current + at - performance.now()) : 0;
        target.style.setProperty("--content-delay", `${remaining + Math.min(order++ * 45, 180)}ms`);
        target.dataset.revealState = "visible";
        finishEntrance(target);
        observer.unobserve(target);
      }
    }, { threshold: .05 });
    elements.forEach(element => {
      if (element.hasAttribute("data-reveal-gate") || element.dataset.revealState === "visible") finishEntrance(element);
      else observer.observe(element);
    });
    const preference = () => { if (motion.matches) { observer.disconnect(); showImmediately(); } };
    motion.addEventListener("change", preference);
    return () => { alive = false; observer.disconnect(); motion.removeEventListener("change", preference); };
  }, [scope, version, enabled]);
}
