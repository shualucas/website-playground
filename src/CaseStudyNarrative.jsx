import React from "react";
import { CaseStudyMedia } from "./CaseStudyMedia";

/** Results lead the page; the narrative explains the problem, goal, and specific work. */
export function CaseStudyNarrative({ study }) {
  return <div className="case-star-story">
    <section data-reveal className="case-editorial-section" data-story-stage="situation" aria-labelledby="case-situation-title">
      <h2 id="case-situation-title">Problem</h2><p>{study.challenge}</p>
    </section>
    <section data-reveal className="case-editorial-section" data-story-stage="task" aria-labelledby="case-task-title">
      <h2 id="case-task-title">Goal</h2><p>{study.task}</p>
    </section>
    <section className="case-editorial-section" data-story-stage="action" aria-labelledby="case-action-title">
      <h2 data-reveal id="case-action-title">What I did</h2>
      <ol className="case-decisions">{study.decisions.map((decision, index) => <li data-reveal key={decision.title}>
        <h3>{decision.title}</h3><p>{decision.copy}</p>
        {study.visuals.filter(media => media.src && media.afterDecision === index).map(media => <CaseStudyMedia key={media.title} media={media} />)}
      </li>)}</ol>
    </section>
  </div>;
}
