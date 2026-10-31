import React from "react";
import { CaseStudyMedia } from "./CaseStudyMedia";

/** A concise reading layout; visual slots remain explicit until real work is added. */
export function CaseStudyNarrative({ study }) {
  return <div className="case-star-story">
    <section data-reveal className="case-editorial-section" data-story-stage="situation" aria-labelledby="case-situation-title">
      <h2 id="case-situation-title">Situation</h2><p>{study.challenge}</p>
    </section>
    <section data-reveal className="case-editorial-section" data-story-stage="task" aria-labelledby="case-task-title">
      <h2 id="case-task-title">Task</h2><p>{study.task}</p>
    </section>
    <section className="case-editorial-section" data-story-stage="action" aria-labelledby="case-action-title">
      <h2 data-reveal id="case-action-title">Action</h2>
      <ol className="case-decisions">{study.decisions.map((decision, index) => <li data-reveal key={decision.title}>
        <h3>{decision.title}</h3><p>{decision.copy}</p>
        {study.visuals.filter(media => media.afterDecision === index).map(media => <CaseStudyMedia key={media.title} media={media} />)}
      </li>)}</ol>
    </section>
    <section className="case-editorial-section" data-story-stage="result" aria-labelledby="case-result-title">
      <h2 data-reveal id="case-result-title">Result</h2>
      <div className="case-outcomes" aria-label="Project outcomes">
      <dl data-reveal className="case-outcome-grid">
        {study.outcomes.map(outcome => <div key={outcome.label}><dt>{outcome.label}</dt><dd>{outcome.value}</dd></div>)}
      </dl>
      <p data-reveal className="case-impact">{study.impact}</p>
      </div>
    </section>
  </div>;
}
