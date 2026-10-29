import React from "react";

/** Decorative effects are isolated from the row's enter/exit motion. */
export function RoleWord({ word, effect }) {
  if (["ascii", "gather", "fonts"].includes(effect)) {
    const middle = Math.floor(word.length / 2);
    return Array.from(word).map((letter, index) => {
      const order = index === middle ? 0 : index < middle ? (middle - index) * 2 - 1 : (index - middle) * 2;
      return <span className={`role-char role-char-${effect}`} key={index} style={{
        "--char-delay": `${index * 45}ms`, "--gather-delay": `${order * 65}ms`,
        "--gather-x": `${index < middle ? -18 : index > middle ? 18 : 0}px`,
      }}>
        <span className="role-char-measure">{letter}</span>
        <span className="role-char-ink">{letter}</span>
        {effect === "ascii" && <span className="role-ascii-noise role-decoration" />}
      </span>;
    });
  }
  return <>
    <span className="role-word-ink">{word}</span>
    {effect === "click" && <>
      <span className="role-click-ripple role-decoration" />
      <svg className="role-click-pointer role-decoration" viewBox="0 0 18 22" fill="var(--ui-text)" stroke="var(--scene-bg)" strokeWidth="1.2"><path d="m2 1 13 11-6 .7-3.3 5.5Z" /></svg>
    </>}
    {effect === "roller" && <span className="role-roller-travel role-decoration"><svg viewBox="0 0 20 34" fill="none" stroke="var(--ui-text)" strokeWidth="1.5"><rect x="5" y="1" width="10" height="18" rx="3" fill="var(--ui-text)" /><path d="M16 5h2v17l-8 2v7" /><path d="M10 27v6" strokeWidth="4" /></svg></span>}
    {effect === "prototype" && <span className="role-prototype-frame role-decoration">{Array.from({ length: 4 }, (_, i) => <i key={i} />)}</span>}
    {effect === "illustrate" && <svg className="role-story-drawing role-decoration" viewBox="0 0 128 32" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth=".65">
      <text x="0" y="23" textLength="128" lengthAdjust="spacingAndGlyphs" fontSize="23" fontFamily="DM Sans, sans-serif">{word}</text>
      <path d="M2 29Q24 24 43 28T86 28Q110 25 126 28" pathLength="1" />
    </svg>}
  </>;
}
