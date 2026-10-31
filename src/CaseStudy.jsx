import React, { useEffect, useRef } from "react";
import { projectTheme } from "./book/themes";
import { useContentReveal } from "./useContentReveal";
import { CaseStudyNarrative } from "./CaseStudyNarrative";

/** Readable HTML destination; the 3D phone is an entrance, not the reading surface. */
export function CaseStudy({ project, onBack, Media, backLabel = "Back to zine", identity = "Josh Lucas" }) {
  const content = useRef(null);
  const study = project.caseStudy;
  useContentReveal(content, project.id);
  const heading = useRef(null),
    theme = projectTheme(project.theme);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const previous = document.title;
    document.title = `${project.label} | josh lucas - product designer`;
    return () => {
      document.title = previous;
    };
  }, [project.id, identity]);
  const navigation = <>
    <button data-reveal onClick={onBack} className="back-to-zine">
      <span className="link-copy"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>{backLabel}</span>
    </button>
    {identity && <span data-reveal>{identity.toUpperCase()}</span>}
  </>;
  return (
    <section
      ref={content}
      className={`case-study${study ? " case-study-editorial" : ""}`}
      data-case-theme={project.theme}
      aria-label={`${project.label} case study`}
      style={{
        "--case-accent": theme.accent,
        "--case-gradient":
          "linear-gradient(120deg," + theme.colors.join(",") + ")",
      }}
    >
      <header className="case-study-nav">
        {study ? <div className="case-study-nav-inner">{navigation}</div> : navigation}
      </header>
      <article className="case-study-content">
        <div className="case-study-measure">
        <header className="case-study-hero">
          <p data-reveal className="eyebrow">
            {study ? study.eyebrow : `SELECTED WORK / ${project.label.toUpperCase()}`}
          </p>
          <h1 data-reveal ref={heading} tabIndex={-1}>
            {project.title.replace("\n", " ")}
          </h1>
          {(study?.summary || project.subtitle) && <p data-reveal className="case-study-deck">{study?.summary || project.subtitle}</p>}
          {(project.role || project.team || project.year || project.disciplines.length > 0) && <dl data-reveal className="case-study-facts">
            {(project.role || project.team) && <div>
              <dt>{study ? "Role" : "ROLE & TEAM"}</dt>
              <dd>
                {[project.role, project.team].filter(Boolean).join(" · ")}
              </dd>
            </div>}
            {project.year && <div>
              <dt>YEAR</dt>
              <dd>{project.year}</dd>
            </div>}
            {project.disciplines.length > 0 && <div>
              <dt>{study ? "Scope" : "FOCUS"}</dt>
              <dd>{project.disciplines.join(" · ")}</dd>
            </div>}
          </dl>}
        </header>
        {study ? <CaseStudyNarrative study={study} /> : <><div data-reveal className="case-study-preview">
          <Media project={project} controls />
        </div>
        <div className="case-study-story">
          {project.chapters.map(([title, copy], i) => (
            <section data-reveal className="case-chapter" key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2>{title}</h2>
                <p>{copy}</p>
                <div
                  className="case-media-slot"
                  aria-label={`${title}: image or motion placeholder`}
                >
                  Image / motion study
                </div>
              </div>
            </section>
          ))}
        </div></>}
        {project.caseStudyUrl && (
          <a data-reveal className="case-study-link" href={project.caseStudyUrl}>
            <span className="link-copy">View full project ↗</span>
          </a>
        )}
        {project.sample && (
          <p data-reveal className="case-study-note">
            Case study in progress. Story, imagery, and verified outcomes to
            come.
          </p>
        )}
        <footer data-reveal>
          <button className="back-to-zine" onClick={onBack}>
            ← {backLabel}
          </button>
        </footer>
        </div>
      </article>
    </section>
  );
}
