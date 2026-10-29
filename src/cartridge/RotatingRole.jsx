import React, { useEffect, useState } from "react";

export const roles = [
  { label: "product designer", effect: "slide" },
  { label: "merch maker", effect: "stamp" },
  { label: "brand builder", effect: "letters" },
  { label: "prototyper", effect: "focus" },
  { label: "systems thinker", effect: "slide" },
  { label: "storyteller", effect: "focus" },
  { label: "community organizer", effect: "letters" },
];

export function RotatingRole({ active = true }) {
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false), [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setReady(true), 1000); return () => clearTimeout(timer); }, []);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setReduced(media.matches), visibility = () => setVisible(!document.hidden);
    media.addEventListener("change", preference); document.addEventListener("visibilitychange", visibility);
    return () => { media.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    setLeaving(false);
    if (!active || !ready || paused || reduced || !visible) return;
    const exit = setTimeout(() => setLeaving(true), 2000);
    const next = setTimeout(() => { setIndex((value) => (value + 1) % roles.length); setLeaving(false); }, 2280);
    return () => { clearTimeout(exit); clearTimeout(next); };
  }, [index, active, ready, paused, reduced, visible]);
  const role = roles[index];
  const [first, ...rest] = role.label.split(" ");
  return <button className="role-rotator" aria-label={`${role.label}, ${reduced ? "next role" : paused ? "resume role rotation" : "pause role rotation"}`}
    aria-pressed={reduced ? undefined : paused} title={reduced ? "Show next role" : paused ? "Resume rotation" : "Pause rotation"}
    data-ready={ready} data-role={role.label} data-effect={role.effect} data-paused={!active || !ready || paused || reduced || !visible}
    onClick={() => reduced ? setIndex((value) => (value + 1) % roles.length) : setPaused((value) => !value)}>
    {roles.map((item) => <span className="role-measure" aria-hidden="true" key={item.label}>{item.label}</span>)}
    <span className="role-label" aria-hidden="true">
      <span key={role.label} className={`role-first role-${role.effect}${leaving ? " is-leaving" : ""}`}>
        {role.effect === "letters" ? Array.from(first).map((letter, i) => <span className="role-letter" style={{ "--letter-delay": `${i * 110 + 180}ms` }} data-letter={letter} key={i}><span>{letter}</span></span>) : <span className="role-word-ink">{first}</span>}
        {role.effect === "focus" && <span className="role-particles" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${i * 100 / 18}%`, "--dx": `${(i * 17 % 41) - 20}px`, "--dy": `${(i * 13 % 29) - 14}px`, "--particle-delay": `${i * 13}ms` }} />)}</span>}
      </span>
      {rest.length > 0 && <span className="role-suffix">{rest.join(" ")}</span>}
    </span>
  </button>;
}
