import React, { useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.colorMode === "dark");
  const toggle = () => {
    const next = !dark; setDark(next);
    document.documentElement.dataset.colorMode = next ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#1b1c1b" : "#f0f0f0");
    try { localStorage.setItem("cartridge-color-mode", next ? "dark" : "light"); } catch {}
  };
  return <button className="tool-button" type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a.5.5 0 0 0-.6-.6A9.5 9.5 0 1 0 21.5 13.7a.5.5 0 0 0-.6-.6Z" />}</svg></button>;
}
