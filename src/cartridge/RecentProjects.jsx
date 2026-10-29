import React from "react";
import { careerProjects } from "./projects";
import { entrance } from "./entrance";

const summaries = {
  search: "Senior Product Designer at Google",
  stadia: "Cloud gaming at Google",
  gmail: "Gmail & Chat internship",
};
const recentProjects = careerProjects.filter(project => Object.hasOwn(summaries, project.id));

export function RecentProjects({ onOpen }) {
  return <nav className="recent-projects" aria-labelledby="recent-projects-title">
    <h2 id="recent-projects-title" data-reveal data-reveal-at={entrance.projectsStart}>Recent projects</h2>
    <ul className="recent-project-list">
      {recentProjects.map((project, index) => <li key={project.id} data-reveal data-reveal-at={entrance.projectsStart + (index + 1) * 60}>
        <a className="recent-project-link" href={`/?project=${project.id}&view=case-study`} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault(); onOpen(project.id);
        }}>
          <span className="recent-project-copy"><span className="recent-project-name">{project.label}</span><span className="recent-project-summary">{summaries[project.id]}</span></span>
          <span className="recent-project-year">{project.year}</span>
        </a>
      </li>)}
    </ul>
  </nav>;
}
