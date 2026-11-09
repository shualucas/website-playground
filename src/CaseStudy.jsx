import React, { useEffect, useRef } from "react";
import { projectTheme } from "./book/themes";
import { usePageExit } from "./usePageExit";
import { useContentReveal } from "./useContentReveal";
import { CaseStudyNarrative } from "./CaseStudyNarrative";
import { CaseStudyShowcase } from "./CaseStudyShowcase";
import { CaseStudyMetrics } from "./CaseStudyMetrics";
import { ThemeToggle } from "./ThemeToggle";
import { LoopVideo } from "./LoopVideo";
import { CaseStudyCartridge } from "./cartridge/CaseStudyCartridge";

/** Readable HTML destination; the 3D phone is an entrance, not the reading surface. */
export function CaseStudy({ project, onBack, Media, backLabel = "Back to zine", identity = "Josh Lucas", dark, onToggleTheme, footer }) {
  const content = useRef(null);
  const pageExit=usePageExit(content);
  const study = project.caseStudy;
  const editorial = Boolean(study || project.minimal);
  const showcase = study?.layout === "showcase";
  const deck = study ? study.overview : project.subtitle;
  useContentReveal(content, project.id);
  const heading = useRef(null),
    theme = projectTheme(project.theme);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const previous = document.title;
    document.title = `${project.label} | Josh Lucas — Product Designer`;
    return () => {
      document.title = previous;
    };
  }, [project.id, identity]);
  const navigation = <>
    <button data-reveal onClick={()=>pageExit.run(onBack,{navigation:true})} className="back-to-zine">
      <span className="link-copy"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>{backLabel}</span>
    </button>
    {identity && <span data-reveal>{identity.toUpperCase()}</span>}
    <span data-reveal><ThemeToggle dark={dark} onToggle={onToggleTheme} /></span>
  </>;
  return (
    <section
      ref={content}
      onClick={pageExit.onLinkClick}
      data-exiting={pageExit.exiting}
      inert={pageExit.exiting}
      className={`case-study${editorial ? " case-study-editorial" : ""}${showcase ? " case-study-showcase" : ""}`}
      data-case-theme={project.theme}
      aria-label={`${project.label} case study`}
      style={{
        "--case-accent": theme.accent,
        "--case-gradient":
          "linear-gradient(120deg," + theme.colors.join(",") + ")",
      }}
    >
      <header className="case-study-nav">
        {editorial ? <div className="case-study-nav-inner">{navigation}</div> : navigation}
      </header>
      <article className="case-study-content">
        <div className="case-study-measure">
        <div className={showcase ? "case-showcase-cover" : undefined}>
        {study?.heroCartridge && <CaseStudyCartridge id={study.heroCartridge} />}
        <header className="case-study-hero">
          <div className="case-study-intro">
          {!showcase && <p data-reveal className="eyebrow">
            {study ? study.eyebrow : `SELECTED WORK / ${project.label.toUpperCase()}`}
          </p>}
          <h1 data-reveal ref={heading} tabIndex={-1}>
            {(study?.title || project.title).replace("\n", " ")}
          </h1>
          {deck && <p data-reveal className="case-study-deck">{deck}</p>}
          </div>
          {study && !showcase && <div className="case-outcomes" aria-label="Project impact">
            <dl data-reveal className="case-outcome-grid">
              {study.outcomes.map(outcome => <div key={outcome.label}><dt>{outcome.label}</dt><dd>{outcome.value}</dd></div>)}
            </dl>
            <p data-reveal className="case-impact">{study.impact}</p>
          </div>}
          {!showcase && (project.role || project.team || project.year || project.disciplines.length > 0) && <dl data-reveal className={`case-study-facts${study?.year ? " case-study-facts-dated" : ""}`}>
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
            {!showcase && (study || project.disciplines.length > 0) && <div>
              <dt>{study ? "My work" : "FOCUS"}</dt>
              <dd>{study ? study.summary : project.disciplines.join(" · ")}</dd>
            </div>}
          </dl>}
          {study?.highlights && <div className="case-showcase-highlights">
            <CaseStudyMetrics key={project.id} outcomes={study.highlights} />
          </div>}
        </header>
        </div>
        {study?.hero && <figure data-reveal className="case-study-hero-figure">
          <div className="case-study-hero-media"><LoopVideo {...study.hero} /></div>
          {study.hero.caption && <figcaption>{study.hero.caption}</figcaption>}
        </figure>}
        {showcase && <p data-reveal className="case-showcase-introduction">{study.summary}</p>}
        {study ? showcase ? <CaseStudyShowcase study={study} /> : <CaseStudyNarrative study={study} /> : <><div data-reveal className="case-study-preview">
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
        {footer || <footer data-reveal>
          <button className="back-to-zine" onClick={()=>pageExit.run(onBack,{navigation:true})}>
            ← {backLabel}
          </button>
        </footer>}
        </div>
      </article>
    </section>
  );
}
