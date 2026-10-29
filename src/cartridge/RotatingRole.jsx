import React, { useEffect, useState } from "react";

export const roles = [
  { label: "Brand developer", effect: "letters" },
  { label: "Merch maker", effect: "stamp" },
  { label: "Product designer", effect: "slide" },
  { label: "Visionary", effect: "focus" },
];

export function RotatingRole({ active = true }) {
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false), [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setReduced(media.matches), visibility = () => setVisible(!document.hidden);
    media.addEventListener("change", preference); document.addEventListener("visibilitychange", visibility);
    return () => { media.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    setLeaving(false);
    if (!active || paused || reduced || !visible) return;
    const exit = setTimeout(() => setLeaving(true), 3200);
    const next = setTimeout(() => { setIndex((value) => (value + 1) % roles.length); setLeaving(false); }, 3480);
    return () => { clearTimeout(exit); clearTimeout(next); };
  }, [index, active, paused, reduced, visible]);
  const role = roles[index];
  const [first, ...rest] = role.label.split(" ");
  return <button className="role-rotator" aria-label={`${role.label}, ${reduced ? "next role" : paused ? "resume role rotation" : "pause role rotation"}`}
    aria-pressed={reduced ? undefined : paused} title={reduced ? "Show next role" : paused ? "Resume rotation" : "Pause rotation"}
    data-role={role.label} data-effect={role.effect} data-paused={!active || paused || reduced || !visible}
    onClick={() => reduced ? setIndex((value) => (value + 1) % roles.length) : setPaused((value) => !value)}>
    {roles.map((item) => <span className="role-measure" aria-hidden="true" key={item.label}>{item.label}</span>)}
    <span className="role-label" aria-hidden="true">
      <span key={role.label} className={`role-first role-${role.effect}${leaving ? " is-leaving" : ""}`}>
        {role.effect === "letters" ? Array.from(first).map((letter, i) => <span className="role-letter" style={{ "--letter-delay": `${i * 22}ms` }} key={i}>{letter}</span>) : first}
      </span>
      {rest.length > 0 && <span className="role-suffix">{rest.join(" ")}</span>}
    </span>
  </button>;
}
