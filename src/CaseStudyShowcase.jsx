import React from "react";
import { CaseStudyMedia } from "./CaseStudyMedia";

/** Short passages introduce the work; media keeps the full project measure. */
export function CaseStudyShowcase({ study }) {
  return <div className="case-showcase-story">
    {study.story.map(passage => <section className="case-showcase-passage" data-showcase-section={passage.id} aria-label={passage.label} key={passage.id}>
      <p data-reveal className="case-showcase-copy">{passage.copy}</p>
      <div data-reveal><CaseStudyMedia media={passage.visual} /></div>
    </section>)}
    <section className="case-showcase-results" data-showcase-section="result" aria-labelledby="case-result-title">
      <div data-reveal className="case-showcase-copy">
        <h2 id="case-result-title">{study.results.title}</h2>
        <p>{study.results.copy}</p>
      </div>
      {study.results.outcomes && <dl data-reveal className="case-outcome-grid" aria-label="Project impact">
        {study.results.outcomes.map(outcome => <div key={outcome.label}><dt>{outcome.label}</dt><dd>{outcome.value}</dd></div>)}
      </dl>}
      <div data-reveal className="case-showcase-copy">
        <p>{study.results.guardrail}</p>
        <p>{study.results.testing}</p>
        <p className="case-measurement-note">{study.results.note}</p>
      </div>
    </section>
    <p data-reveal className="case-showcase-copy case-showcase-next">{study.next}</p>
  </div>;
}
