import React, { useEffect, useRef } from "react";

export function NoteDialog({ flyer, note, onClose }) {
  const dialog = useRef(null), exit = useRef(null), mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const element=dialog.current;
    element.showModal();
    return () => { mounted.current = false; exit.current?.cancel(); element.close(); };
  }, []);
  const close = () => {
    if (exit.current) return;
    const finish=()=>{ dialog.current?.close(); onClose(); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    exit.current = dialog.current.animate([
      { opacity:1, transform:"translateY(0) scale(1)", filter:"blur(0)" },
      { opacity:0, transform:"translateY(8px) scale(.98)", filter:"blur(2px)" },
    ], { duration:140, easing:"ease-in", fill:"forwards" });
    exit.current.finished.then(() => { if (mounted.current) finish(); }).catch(() => {});
  };
  return <dialog id="zine-note-dialog" ref={dialog} className="zine-note-dialog" style={{ "--note-stock":note.color }} aria-labelledby="zine-note-title" aria-describedby="zine-note-body"
    onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="zine-note-paper">
      <button type="button" className="zine-note-close" aria-label="Close note" onClick={close} autoFocus><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
      <h2 id="zine-note-title" className="sr-only">{flyer.title}</h2><p id="zine-note-body">{note.text}</p>
    </div>
  </dialog>;
}
