import React from "react";
import "@fontsource/dm-sans/latin-300-italic.css";
import { CaseStudyMedia } from "./CaseStudyMedia";

function inlineCopy(copy) {
  return copy.split(/(\*[^*]+\*)/g).map((part,index)=>part.startsWith("*")&&part.endsWith("*") ? <em key={index}>{part.slice(1,-1)}</em> : part);
}

/** Full-width work leads each passage, with its explanation directly below. */
export function CaseStudyShowcase({ study }) {
  return <div className="case-showcase-story">
    {study.story.map(passage => <section className="case-showcase-passage" data-showcase-section={passage.id} aria-label={passage.label} key={passage.id}>
      <div data-reveal><CaseStudyMedia media={passage.visual} /></div>
      {Array.isArray(passage.copy) ? <div data-reveal className="case-showcase-copy">
        {passage.copy.map(copy => <p key={copy}>{inlineCopy(copy)}</p>)}
      </div> : <p data-reveal className="case-showcase-copy">{inlineCopy(passage.copy)}</p>}
    </section>)}
    <section className="case-showcase-results" data-showcase-section="result" aria-labelledby={study.results.title ? "case-result-title" : undefined} aria-label={study.results.title ? undefined : "Takeaways"} data-takeaways>
      <div data-reveal className="case-showcase-copy">
        {study.results.title && <h2 id="case-result-title">{study.results.title}</h2>}
        <p>{study.results.copy}</p>
      </div>
      <p data-reveal className="case-showcase-copy case-showcase-next">{study.next}</p>
    </section>
  </div>;
}
