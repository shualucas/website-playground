import React from "react";

/** A concise reading layout; visual slots remain explicit until real work is added. */
export function CaseStudyNarrative({ study }) {
  return <>
    <section className="case-outcomes" aria-label="Project outcomes">
      <dl data-reveal className="case-outcome-grid">
        {study.outcomes.map(outcome => <div key={outcome.label}><dt>{outcome.label}</dt><dd>{outcome.value}</dd></div>)}
      </dl>
      <p data-reveal className="case-impact">{study.impact}</p>
    </section>
    <section data-reveal className="case-editorial-section">
      <h2>The challenge</h2><p>{study.challenge}</p>
    </section>
    <section className="case-editorial-section">
      <h2 data-reveal>Design decisions</h2>
      <ol className="case-decisions">{study.decisions.map((decision, index) => <li data-reveal key={decision.title}>
        <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div><h3>{decision.title}</h3><p>{decision.copy}</p></div>
      </li>)}</ol>
    </section>
    <section className="case-visuals" aria-labelledby="case-visuals-title">
      <div data-reveal className="case-visuals-heading"><h2 id="case-visuals-title">The work, in context</h2><p>Visuals to come</p></div>
      <div className="case-visual-grid">{study.visuals.map((visual, index) => <figure data-reveal key={visual.title}>
        <div className="case-visual-placeholder" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span></div>
        <figcaption><strong>{visual.title}</strong><span>{visual.caption}</span></figcaption>
      </figure>)}</div>
    </section>
  </>;
}
