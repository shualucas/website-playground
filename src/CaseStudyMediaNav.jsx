import React, { useEffect, useRef, useState } from "react";
import { useContentReveal } from "./useContentReveal";

/** A quiet index of the reader's media and closing takeaways. */
export function CaseStudyMediaNav({ scope, projectId }) {
  const navigation = useRef(null);
  const [items, setItems] = useState([]), [active, setActive] = useState(0);
  useContentReveal(navigation, items.length);
  useEffect(() => {
    const reader = scope.current;
    if (!reader) return;
    const media = [...reader.querySelectorAll("[data-media-label], [data-takeaways]")].map(element => ({ element, label:element.dataset.mediaLabel || "Takeaways" }));
    setItems(media);
    if (!media.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = reader.getBoundingClientRect(), header = reader.querySelector(".case-study-nav");
      const inset = (header?.getBoundingClientRect().height ?? 80) + 16;
      const readingLine = bounds.top + inset + Math.max(0, reader.clientHeight - inset) * .32;
      let current = 0;
      for (let index = 0; index < media.length; index++) {
        if (media[index].element.getBoundingClientRect().top > readingLine) break;
        current = index;
      }
      if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 2) current = media.length - 1;
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    resize.observe(reader);
    const header = reader.querySelector(".case-study-nav");
    if (header) resize.observe(header);
    media.forEach(({ element }) => resize.observe(element));
    reader.addEventListener("scroll", schedule, { passive:true });
    schedule();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); reader.removeEventListener("scroll", schedule); };
  }, [scope, projectId]);
  const jump = element => {
    const reader = scope.current;
    if (!reader) return;
    const inset = (reader.querySelector(".case-study-nav")?.getBoundingClientRect().height ?? 80) + 16;
    const top = reader.scrollTop + element.getBoundingClientRect().top - reader.getBoundingClientRect().top - inset;
    reader.scrollTo({ top:Math.max(0, top), behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <nav ref={navigation} className="case-media-nav" aria-label="Case study media" hidden={!items.length}>
    {items.length > 0 && <div className="case-media-nav-track" data-reveal>
      {items.map(({ element, label }, index) => <button type="button" className="case-media-nav-button" key={index}
        aria-label={`Jump to ${label}`} aria-current={active === index ? "location" : undefined} onClick={() => jump(element)}>
        <span className="case-media-nav-label" aria-hidden="true">{label}</span>
      </button>)}
    </div>}
  </nav>;
}
