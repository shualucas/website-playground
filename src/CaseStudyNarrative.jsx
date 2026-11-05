import React from "react";
import { CaseStudyMedia } from "./CaseStudyMedia";

/** Results lead the page; the narrative explains the problem, goal, and specific work. */
export function CaseStudyNarrative({ study }) {
  const visuals = study.visuals.filter(media => media.src || media.placeholder);
  const challenge = Array.isArray(study.challenge) ? study.challenge : [study.challenge];
  return <div className="case-star-story">
    <section data-reveal className="case-editorial-section" data-story-stage="situation" aria-labelledby="case-situation-title">
      <h2 id="case-situation-title">Problem</h2>
      <div className="case-section-content">
        {challenge.map(copy => <p key={copy}>{copy}</p>)}
        {visuals.filter(media => media.stage === "situation").map(media => <CaseStudyMedia key={media.title} media={media} />)}
      </div>
    </section>
    <section data-reveal className="case-editorial-section" data-story-stage="task" aria-labelledby="case-task-title">
      <h2 id="case-task-title">Goal</h2><p>{study.task}</p>
    </section>
    {study.system && <section data-reveal className="case-editorial-section" data-story-stage="system" aria-labelledby="case-system-title">
      <h2 id="case-system-title">The system</h2>
      <div className="case-section-content">
        <h3>{study.system.title}</h3>
        <p>{study.system.copy}</p>
        <dl className="case-patterns">{study.system.patterns.map(pattern => <div key={pattern.title}>
          <dt>{pattern.title}{pattern.status && <span className="case-pattern-status">{pattern.status}</span>}</dt>
          <dd>{pattern.copy}</dd>
        </div>)}</dl>
        {visuals.filter(media => media.stage === "system").map(media => <CaseStudyMedia key={media.title} media={media} />)}
      </div>
    </section>}
    <section className="case-editorial-section" data-story-stage="action" aria-labelledby="case-action-title">
      <h2 data-reveal id="case-action-title">{study.decisionsTitle || "What I did"}</h2>
      <ol className="case-decisions">{study.decisions.map((decision, index) => <li data-reveal key={decision.title}>
        <h3>{decision.title}</h3><p>{decision.copy}</p>
        {visuals.filter(media => media.afterDecision === index).map(media => <CaseStudyMedia key={media.title} media={media} />)}
      </li>)}</ol>
    </section>
    {study.results && <section data-reveal className="case-editorial-section" data-story-stage="result" aria-labelledby="case-result-title">
      <h2 id="case-result-title">{study.results.title}</h2>
      <div className="case-section-content">
        <p>{study.results.copy}</p>
        <ul className="case-result-list">{study.results.outcomes.map(outcome => <li key={outcome.label}><strong>{outcome.value}</strong> {outcome.label}</li>)}</ul>
        <p>{study.results.guardrail}</p>
        <p>{study.results.testing}</p>
        {study.results.note && <p className="case-measurement-note">{study.results.note}</p>}
      </div>
    </section>}
    {study.next && <section data-reveal className="case-editorial-section" data-story-stage="next" aria-labelledby="case-next-title">
      <h2 id="case-next-title">What’s next</h2><p>{study.next}</p>
    </section>}
  </div>;
}
