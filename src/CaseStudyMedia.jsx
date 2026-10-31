import React, { useEffect, useRef } from "react";

/** Add a src to the story's media entry when the real asset is ready. */
export function CaseStudyMedia({ media }) {
  const type = media.type || "image";
  const player = useRef(null);
  useEffect(() => {
    const element = player.current;
    return () => element?.pause();
  }, [media.src, type]);
  return <figure className="case-story-media" data-media-type={type}>
    {media.src ? type === "video" ?
      <video ref={player} controls playsInline preload="metadata" poster={media.poster || undefined} aria-label={media.title}>
        <source src={media.src} />
        {media.captionsSrc && <track kind="captions" src={media.captionsSrc} srcLang="en" label="English" default />}
      </video> : type === "audio" ?
      <audio ref={player} controls preload="none" src={media.src} aria-label={media.title} /> :
      <img src={media.src} alt={media.alt || media.title} loading="lazy" decoding="async" /> :
      <div className="case-story-media-placeholder"><span>{type === "video" ? "Video" : type === "audio" ? "Audio" : "Image"} to add</span><span>{media.title}</span></div>}
    <figcaption>{media.caption}</figcaption>
    {media.transcript && <p className="case-media-transcript">{media.transcript}</p>}
  </figure>;
}
