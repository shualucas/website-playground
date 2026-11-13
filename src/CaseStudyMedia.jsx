import React, { useEffect, useRef } from "react";
import { LoopVideo } from "./LoopVideo";

/** Add a src to the story's media entry when the real asset is ready. */
export function CaseStudyMedia({ media, className = "", reveal = false }) {
  const type = media.type || "image";
  const player = useRef(null);
  useEffect(() => {
    const element = player.current;
    return () => element?.pause();
  }, [media.src, type]);
  return <figure className={`case-story-media ${className}`.trim()} data-reveal={reveal ? "" : undefined} data-media-type={type} data-media-label={media.title}>
    {media.images?.length ? <div className="case-media-image-group">
      {media.images.map(image => <img key={image.src} src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" />)}
    </div> : media.src ? type === "video" ? media.loop ? <LoopVideo src={media.src} srcSmall={media.srcSmall} poster={media.poster} label={media.title} /> :
      <video ref={player} controls playsInline preload="metadata" poster={media.poster || undefined} aria-label={media.title}>
        <source src={media.src} />
        {media.captionsSrc && <track kind="captions" src={media.captionsSrc} srcLang="en" label="English" default />}
      </video> : type === "audio" ?
      <audio ref={player} controls preload="none" src={media.src} aria-label={media.title} /> :
      <img src={media.src} alt={media.alt || media.title} width={media.width} height={media.height} loading="lazy" decoding="async" /> :
      <div className="case-story-media-placeholder"><span>{type === "video" ? "Video" : type === "audio" ? "Audio" : "Image"} to add</span><span>{media.title}</span></div>}
    {media.caption && <figcaption>{media.caption}</figcaption>}
    {media.transcript && <p className="case-media-transcript">{media.transcript}</p>}
  </figure>;
}
