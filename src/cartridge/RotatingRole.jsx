import React, { useEffect, useState } from "react";
import { RoleWord } from "./RoleWord";
import "./role-effects.css";

export const roles = [
  { label: "product designer", effect: "click" },
  { label: "merch maker", effect: "roller" },
  { label: "brand developer", effect: "fonts" },
  { label: "prototyper", effect: "prototype" },
  { label: "systems thinker", effect: "ascii" },
  { label: "storyteller", effect: "illustrate" },
  { label: "community builder", effect: "gather" },
  { label: "riso artist", effect: "riso" },
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
    data-ready={ready} data-phase={leaving ? "leaving" : "visible"} data-role={role.label} data-effect={role.effect} data-paused={!active || !ready || paused || reduced || !visible}
    onClick={() => reduced ? setIndex((value) => (value + 1) % roles.length) : setPaused((value) => !value)}>
    {roles.map((item) => <span className="role-measure" aria-hidden="true" key={item.label}>{item.label}</span>)}
    <span key={role.label} className={`role-label${leaving ? " is-leaving" : ""}`} aria-hidden="true">
      <span className={`role-first role-${role.effect}`}><RoleWord word={first} effect={role.effect} /></span>
      {rest.length > 0 && <span className="role-suffix">{rest.join(" ")}</span>}
    </span>
  </button>;
}
