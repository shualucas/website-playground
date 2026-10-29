import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import { filmPhotos } from "../content/film-photos";
import "../cartridge/style.css";
import "./style.css";

function AfterHours() {
  useEffect(() => { document.documentElement.dataset.pageReady = "true"; }, []);
  return <main className="after-hours">
    <header className="after-hours-nav"><a href="/#film-camera-link">← Back to work</a><span>After-hours</span></header>
    <h1>Zines &amp; film photographs.</h1>
    <section aria-labelledby="zine-title" className="after-hours-zine">
      <a className="zine-preview" href="/zine/" aria-label="Open the interactive zine"><div className="zine-preview-paper" aria-hidden="true"><div /></div></a>
      <div><h2 id="zine-title">The zine</h2><a className="after-hours-text-link" href="/zine/">Open &amp; explore <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 18 12-12M6 6h12v12" /></svg></a></div>
    </section>
    <section aria-labelledby="film-title" className="after-hours-film">
      <h2 id="film-title">Film photographs</h2>
      {filmPhotos.length ? <div className="after-hours-photo-grid">{filmPhotos.map(photo => <figure key={photo.src}><a href={photo.src}><img src={photo.src} alt={photo.alt} loading="lazy" /></a>{(photo.caption || photo.film) && <figcaption>{photo.caption}{photo.film && <span>{photo.film}</span>}</figcaption>}</figure>)}</div> : <div className="after-hours-empty"><span aria-hidden="true">▧</span><p>A collection in the making.</p></div>}
    </section>
  </main>;
}
createRoot(document.getElementById("root")).render(<AfterHours />);
