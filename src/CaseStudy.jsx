import React, { useEffect, useRef } from "react";
import { projectTheme } from "./book/themes";

/** Readable HTML destination; the 3D phone is an entrance, not the reading surface. */
export function CaseStudy({ project, onBack, Media }) {
  const heading = useRef(null),
    theme = projectTheme(project.theme);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const previous = document.title;
    document.title = `${project.label} — Josh Lucas`;
    return () => {
      document.title = previous;
    };
  }, [project.id]);
  return (
    <section
      className="case-study"
      aria-label={`${project.label} case study`}
      style={{
        "--case-accent": theme.accent,
        "--case-gradient":
          "linear-gradient(120deg," + theme.colors.join(",") + ")",
      }}
    >
      <header className="case-study-nav">
        <button onClick={onBack} className="back-to-zine">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M20 12H4m6-6-6 6 6 6" />
          </svg>
          Back to zine
        </button>
        <span>JOSH LUCAS</span>
      </header>
      <article className="case-study-content">
        <header className="case-study-hero">
          <p className="eyebrow">
            SELECTED WORK / {project.label.toUpperCase()}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {project.title.replace("\n", " ")}
          </h1>
          <p className="case-study-deck">{project.subtitle}</p>
          <dl className="case-study-facts">
            <div>
              <dt>ROLE & TEAM</dt>
              <dd>
                {project.role} · {project.team}
              </dd>
            </div>
            <div>
              <dt>YEAR</dt>
              <dd>{project.year}</dd>
            </div>
            <div>
              <dt>FOCUS</dt>
              <dd>{project.disciplines.join(" · ")}</dd>
            </div>
          </dl>
        </header>
        <div className="case-study-preview">
          <Media project={project} controls />
        </div>
        <div className="case-study-story">
          {project.chapters.map(([title, copy], i) => (
            <section className="case-chapter" key={title}>
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
        </div>
        {project.caseStudyUrl && (
          <a className="case-study-link" href={project.caseStudyUrl}>
            View full project ↗
          </a>
        )}
        {project.sample && (
          <p className="case-study-note">
            Case study in progress. Story, imagery, and verified outcomes to
            come.
          </p>
        )}
        <footer>
          <button className="back-to-zine" onClick={onBack}>
            ← Back to zine
          </button>
        </footer>
      </article>
    </section>
  );
}
