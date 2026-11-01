import React, { useRef, useState } from "react";
import { recentProjects } from "./projects";
import { entrance } from "./entrance";
import { CameraLink } from "./CameraLink";

const previews = {
  "ai-mode-nudges": { image: "/cartridges/labels/ai-mode.svg", team: "Google", accent: "#6988d8", kind: "ai" },
  "search-labs": { image: "/cartridges/labels/search-label.jpg", team: "Google", accent: "#6988d8", kind: "search" },
  "stadia-store-redesign": { image: "/cartridges/labels/stadia-label.jpg", team: "Stadia", accent: "#e5633d", kind: "stadia" },
  "rave-flyer-zine": { image: "/zines/rave-flyers/wavform.jpg", team: "Independent", accent: "#6c91d1", kind: "zine" },
  "film": { team: "Film", accent: "#b69272", kind: "film" },
};
const film = { id: "film", label: "Say cheese!", description: "Film photographs" };

export function RecentProjects({ onOpen, dark, ready, hidden }) {
  const [active, setActive] = useState(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(0);
  const pointer = useRef(null), focus = useRef(null);
  const select = (id, index) => {
    setActive(id); setVisible(true); setPosition(index / recentProjects.length);
  };
  const release = () => {
    const id = focus.current ?? pointer.current;
    if (id) select(id, [...recentProjects, film].findIndex(project => project.id === id));
    else setVisible(false);
  };
  const browse = (event, id, index) => {
    if (event.pointerType === "touch" || !matchMedia("(hover:hover)").matches) return;
    pointer.current = id; select(id, index);
  };
  const focused = (event, id, index) => {
    if (!event.target.matches(":focus-visible")) return;
    focus.current = id; select(id, index);
  };
  const project = [...recentProjects, film].find(project => project.id === active);
  const preview = previews[active];
  return <nav className="recent-projects" aria-labelledby="recent-projects-title"
    data-preview-active={visible} data-active-project={visible ? active : ""}
    style={{ "--preview-accent": preview?.accent ?? "#6988d8", "--preview-offset": `${(position - .5) * 32}px` }}
    onPointerLeave={() => { pointer.current = null; release(); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { focus.current = null; release(); } }}>
    <h2 id="recent-projects-title" data-reveal data-reveal-at={entrance.projectsStart}>Recent projects</h2>
    <div className="recent-project-browser">
      <ul className="recent-project-list" onPointerLeave={() => { pointer.current = null; release(); }}>
        {recentProjects.map((project, index) => <li key={project.id} data-active={visible && active === project.id}
          onPointerEnter={event => browse(event, project.id, index)} onFocus={event => focused(event, project.id, index)}
          data-reveal data-reveal-at={entrance.projectsStart + (index + 1) * 60}>
          <a className="recent-project-link" href={project.href || `/?project=${project.id}&view=case-study`}
            aria-describedby={`recent-summary-${project.id}`} onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault(); onOpen(project.id);
            }}>
            <span className="recent-project-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="recent-project-copy"><span className="recent-project-name">{project.label}</span>
              <span id={`recent-summary-${project.id}`} className="recent-project-summary sr-only" aria-hidden="true">{project.description}</span></span>
            <span className="recent-project-team">{previews[project.id].team}</span>
            <svg className="recent-project-arrow" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </li>)}
        <li className="recent-camera-row" data-active={visible && active === "film"}
          onPointerEnter={event => browse(event, "film", recentProjects.length)} onFocus={event => focused(event, "film", recentProjects.length)}
          data-reveal data-reveal-at={entrance.projectsStart + (recentProjects.length + 1) * 60}>
          <CameraLink dark={dark} ready={ready} hidden={hidden} rowTitle="Say cheese!" rowIndex={recentProjects.length + 1} rowTeam="Film"
            entranceAt={entrance.projectsStart + (recentProjects.length + 1) * 60} />
        </li>
      </ul>
      <div className="recent-project-preview" aria-hidden="true" data-visible={visible}>
        {project && <div className="recent-preview-content" key={project.id} data-kind={preview.kind}>
          <div className="recent-preview-art">
            {preview.kind === "film" ? <div className="recent-preview-polaroids"><i /><i /><i /></div>
              : <img src={preview.image} alt="" decoding="async" />}
            <span className="recent-preview-dither" />
          </div>
          <p>{project.description}</p>
        </div>}
      </div>
    </div>
  </nav>;
}
