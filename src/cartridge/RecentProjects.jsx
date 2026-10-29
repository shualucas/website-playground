import React from "react";
import { recentProjects } from "./projects";
import { entrance } from "./entrance";

export function RecentProjects({ onOpen }) {
  return <nav className="recent-projects" aria-labelledby="recent-projects-title">
    <h2 id="recent-projects-title" data-reveal data-reveal-at={entrance.projectsStart}>Recent projects</h2>
    <ul className="recent-project-list">
      {recentProjects.map((project, index) => <li key={project.id} data-reveal data-reveal-at={entrance.projectsStart + (index + 1) * 60}>
        <a className="recent-project-link" href={`/?project=${project.id}&view=case-study`} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault(); onOpen(project.id);
        }}>
          <span className="recent-project-title"><span className="recent-project-name">{project.label}</span><span className="recent-project-echo" aria-hidden="true">{project.label}</span></span>
          <span className="recent-project-summary">{project.description}</span>
          <svg className="recent-project-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
        </a>
      </li>)}
    </ul>
  </nav>;
}
