import React from "react";
import { recentProjects } from "./projects";
import { entrance } from "./entrance";
import { CameraLink } from "./CameraLink";

export function RecentProjects({ onOpen, dark, ready, hidden }) {
  return <nav className="recent-projects" aria-labelledby="recent-projects-title">
    <h2 id="recent-projects-title" data-reveal data-reveal-at={entrance.projectsStart}>Recent projects</h2>
    <ul className="recent-project-list">
      {recentProjects.map((project, index) => <li key={project.id} data-reveal data-reveal-at={entrance.projectsStart + (index + 1) * 60}>
        <a className="recent-project-link" href={project.href || `/?project=${project.id}&view=case-study`} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault(); onOpen(project.id);
        }}>
          <span className="recent-project-marker" aria-hidden="true" />
          <span className="recent-project-copy"><span className="recent-project-name">{project.label}</span>{" "}<span className="recent-project-summary">{project.description}</span></span>
        </a>
      </li>)}
      <li className="recent-camera-row" data-reveal data-reveal-at={entrance.projectsStart + (recentProjects.length + 1) * 60}>
        <CameraLink dark={dark} ready={ready} hidden={hidden} rowTitle="Say cheese!" entranceAt={entrance.projectsStart + (recentProjects.length + 1) * 60} />
      </li>
    </ul>
  </nav>;
}
