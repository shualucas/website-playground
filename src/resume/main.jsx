import React, { useRef } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "../cartridge/style.css";
import "./style.css";
import { useContentReveal } from "../useContentReveal";
import { SocialLinks } from "../SocialLinks";
import { ThemeToggle } from "../ThemeToggle";
import { resume } from "./profile";

function Resume() {
  const content = useRef(null); useContentReveal(content, "resume");
  return <main className="collection resume-page" ref={content} data-reveal-flow="page">
    <header className="collection-header resume-nav" data-reveal data-reveal-at="0">
      <a href="/" aria-label="Back to Josh Lucas"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg> Josh Lucas</a><ThemeToggle />
    </header>
    <article className="resume-document" aria-labelledby="resume-name">
      <div className="resume-masthead" data-reveal data-reveal-at="80"><span className="resume-eyebrow">Résumé</span><a className="resume-download" href={resume.links.pdf} download="Josh-Lucas-Resume.pdf">Download PDF <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3" /></svg></a></div>
      <div className="resume-intro" data-reveal data-reveal-at="150"><h1 id="resume-name">{resume.name}</h1><p className="resume-title">{resume.title}</p><p className="resume-location">{resume.location}</p></div>
      <div className="resume-summary" data-reveal data-reveal-at="230"><p>{resume.summary}</p><div><h2>Focus</h2><ul>{resume.focus.map(item => <li key={item}>{item}</li>)}</ul></div></div>
      <section className="resume-experience" aria-labelledby="experience-title"><h2 id="experience-title" data-reveal data-reveal-at="310">Experience</h2>
        {resume.experience.map((job, index) => <section className="resume-job" key={job.company} aria-labelledby={`job-${index}`} data-reveal data-reveal-at={370 + index * 70}><div className="resume-job-meta"><span>{job.period}</span><span>{job.location}</span></div><div><h3 id={`job-${index}`}>{job.role}</h3><p className="resume-company">{job.company}</p><ul>{job.work.map(line => <li key={line}>{line}</li>)}</ul></div></section>)}
      </section>
      <footer className="resume-footer" data-reveal data-reveal-at="700"><SocialLinks /><a href="/">Back to portfolio <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 18 12-12M6 6h12v12" /></svg></a></footer>
    </article>
  </main>;
}
createRoot(document.getElementById("root")).render(<Resume />);
