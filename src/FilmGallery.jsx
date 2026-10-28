import React, { useEffect, useRef, useState } from "react";
import { filmPhotos } from "./content/film-photos";

export function FilmGallery({ onClose }) {
  const dialog = useRef(null),
    viewer = useRef(null),
    [selected, setSelected] = useState(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => {
    if (selected !== null) viewer.current?.focus({ preventScroll: true });
  }, [selected === null]);
  const photo = selected === null ? null : filmPhotos[selected];
  const change = (direction) =>
    setSelected((n) =>
      Math.max(0, Math.min(filmPhotos.length - 1, n + direction)),
    );
  return (
    <dialog
      ref={dialog}
      className="film-gallery"
      aria-label="Film photographs"
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (
          selected !== null &&
          ["ArrowLeft", "ArrowRight"].includes(event.key)
        ) {
          event.preventDefault();
          event.stopPropagation();
          change(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div className="film-gallery-paper">
        <header className="film-gallery-header">
          <div>
            <p className="eyebrow">AFTER-HOURS</p>
            <h2>Film photographs</h2>
          </div>
          <button
            className="gallery-close"
            aria-label="Close film photographs"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {!filmPhotos.length ? (
          <div className="film-gallery-empty">
            <span aria-hidden="true">▧</span>
            <p>A collection in the making.</p>
          </div>
        ) : photo ? (
          <div
            className="film-viewer"
            ref={viewer}
            tabIndex={-1}
            role="group"
            aria-label="Photograph viewer"
          >
            <button
              className="gallery-text-button"
              onClick={() => setSelected(null)}
            >
              ← All photographs
            </button>
            <figure>
              <img src={photo.src} alt={photo.alt} />
              {(photo.caption || photo.film) && (
                <figcaption>
                  {photo.caption}
                  {photo.film && <span>{photo.film}</span>}
                </figcaption>
              )}
            </figure>
            <nav aria-label="Photograph navigation">
              <button
                disabled={selected === 0}
                onClick={() => change(-1)}
                aria-label="Previous photograph"
              >
                ←
              </button>
              <span>
                {selected + 1} / {filmPhotos.length}
              </span>
              <button
                disabled={selected === filmPhotos.length - 1}
                onClick={() => change(1)}
                aria-label="Next photograph"
              >
                →
              </button>
            </nav>
          </div>
        ) : (
          <div className="film-photo-grid">
            {filmPhotos.map((item, i) => (
              <button
                key={item.src}
                onClick={() => setSelected(i)}
                aria-label={`View ${item.alt}`}
              >
                <img src={item.src} alt={item.alt} loading="lazy" />
                {item.caption && <span>{item.caption}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
