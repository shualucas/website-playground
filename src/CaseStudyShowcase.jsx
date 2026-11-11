import React from "react";
import { CaseStudyMedia } from "./CaseStudyMedia";

/** Full-width work leads each passage, with its explanation directly below. */
export function CaseStudyShowcase({ study }) {
  return <div className="case-showcase-story">
    {study.story.map(passage => <section className="case-showcase-passage" data-showcase-section={passage.id} aria-label={passage.heading || passage.label} key={passage.id}>
      {passage.heading && <h2 data-reveal className="case-showcase-passage-heading">{passage.heading}</h2>}
      <div data-reveal><CaseStudyMedia media={passage.visual} /></div>
      <p data-reveal className="case-showcase-copy">{passage.copy}</p>
    </section>)}
    <section className="case-showcase-results" data-showcase-section="result" aria-labelledby="case-result-title" data-takeaways>
      <div data-reveal className="case-showcase-copy">
        <h2 id="case-result-title">{study.results.title}</h2>
        <p>{study.results.copy}</p>
      </div>
      <p data-reveal className="case-showcase-copy case-showcase-next">{study.next}</p>
    </section>
  </div>;
}
