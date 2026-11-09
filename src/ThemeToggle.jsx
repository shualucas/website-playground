import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export function ThemeToggle({ dark:controlledDark, onToggle, ...props }) {
  const [localDark, setLocalDark] = useState(() => document.documentElement.dataset.colorMode === "dark");
  const transition = useRef(null);
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',document.documentElement.dataset.colorMode==='dark'?'#101110':'#f0f0f0');
    return () => transition.current?.skipTransition();
  }, []);
  const dark = controlledDark ?? localDark;
  const toggle = event => {
    if (transition.current) return;
    const next = !dark, root = document.documentElement;
    const update = () => {
      root.dataset.colorMode = next ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#101110" : "#f0f0f0");
      try { localStorage.setItem("cartridge-color-mode", next ? "dark" : "light"); } catch {}
      if (onToggle) onToggle(next); else setLocalDark(next);
    };
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!document.startViewTransition || motion.matches) { update(); return; }
    // Capture both themes once, then reveal the new page from the dot's center.
    const box = event.currentTarget.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2;
    root.style.setProperty('--theme-origin-x', `${x}px`); root.style.setProperty('--theme-origin-y', `${y}px`);
    root.style.setProperty('--theme-radius', `${Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y)) + 32}px`);
    root.classList.add('theme-transition');
    const wipe = document.startViewTransition(() => flushSync(update));
    transition.current = wipe;
    const settle = () => wipe.skipTransition(), reduce = () => { if (motion.matches) settle(); };
    motion.addEventListener('change', reduce); window.addEventListener('resize', settle);
    const cleanup = () => {
      transition.current = null; root.classList.remove('theme-transition');
      for (const property of ['--theme-origin-x','--theme-origin-y','--theme-radius']) root.style.removeProperty(property);
      motion.removeEventListener('change', reduce); window.removeEventListener('resize', settle);
    };
    wipe.ready.catch(() => {}); wipe.finished.then(cleanup, cleanup);
  };
  return <button {...props} className="tool-button theme-toggle" type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}><span className="theme-dot" aria-hidden="true" /></button>;
}
