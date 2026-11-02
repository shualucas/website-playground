import React, { useRef, useState } from "react";
import { recentProjects } from "./projects";
import { entrance } from "./entrance";
import { ZinePreview } from "./ZinePreview";
import { CameraLink } from "./CameraLink";

const previews = {
  "ai-mode-nudges": { team: "Google", accent: "#6988d8", kind: "ai" },
  "search-labs": { team: "Google", accent: "#b759ba", kind: "search" },
  "stadia-store-redesign": { team: "Stadia", accent: "#e5633d", kind: "stadia" },
  "rave-flyer-zine": { team: "Independent", accent: "#e48dae", kind: "zine" },
  "film": { team: "Film", accent: "#b69272", kind: "film" },
};
const film = { id: "film", label: "Say cheese!", description: "Film photographs" };

export function RecentProjects({ onOpen, dark, ready, hidden }) {
  const [active, setActive] = useState(null);
  const [cameraTarget,setCameraTarget]=useState(null),[seen,setSeen]=useState({film:false,zine:false});
  const [visible, setVisible] = useState(false);
  const navigation = useRef(null), browser = useRef(null);
  const pointer = useRef(null), focus = useRef(null);
  const select = (id, index) => {
    setActive(id); setVisible(true);
    const kind=previews[id]?.kind;if((kind==="film"||kind==="zine")&&!seen[kind])setSeen(old=>({...old,[kind]:true}));
    const height = browser.current?.clientHeight ?? 0;
    navigation.current?.style.setProperty("--preview-offset", `${((index + .5) / (recentProjects.length + 1) - .5) * height * .45}px`);
  };
  const release = () => {
    const id = focus.current ?? pointer.current;
    if (id) select(id, [...recentProjects, film].findIndex(project => project.id === id));
    else setVisible(false);
  };
  const track = event => {
    if (!pointer.current || event.pointerType === "touch" || !browser.current) return;
    const bounds = browser.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    navigation.current?.style.setProperty("--preview-offset", `${(y - bounds.height / 2) * .45}px`);
  };
  const browse = (event, id, index) => {
    if (event.pointerType === "touch" || !matchMedia("(hover:hover)").matches) return;
    pointer.current = id; select(id, index); track(event);
  };
  const focused = (event, id, index) => {
    if (!event.target.matches(":focus-visible")) return;
    focus.current = id; select(id, index);
  };
  const project = [...recentProjects, film].find(project => project.id === active);
  const preview = previews[active];
  const showing = visible && !hidden;
  return <>
    <div className="project-hue-wash" aria-hidden="true" data-active={showing}>
      {Object.entries(previews).map(([id, item]) => <span key={id} data-active={showing && active === id} style={{ "--wash-color": item.accent }} />)}
    </div>
    <nav ref={navigation} className="recent-projects" aria-labelledby="recent-projects-title"
    data-preview-active={showing} data-active-project={showing ? active : ""}
    style={{ "--preview-accent": preview?.accent ?? "#6988d8" }}
    onPointerLeave={() => { pointer.current = null; release(); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { focus.current = null; release(); } }}>
    <h2 id="recent-projects-title" data-reveal data-reveal-at={entrance.projectsStart}>Recent projects</h2>
    <div ref={browser} className="recent-project-browser">
      <ul className="recent-project-list" onPointerMove={track} onPointerLeave={() => { pointer.current = null; release(); }}>
        {recentProjects.map((project, index) => <li key={project.id} data-active={showing && active === project.id}
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
        <li className="recent-camera-row" data-active={showing && active === "film"}
          onPointerEnter={event => browse(event, "film", recentProjects.length)} onFocus={event => focused(event, "film", recentProjects.length)}
          data-reveal data-reveal-at={entrance.projectsStart + (recentProjects.length + 1) * 60}>
          <CameraLink dark={dark} ready={ready} hidden={hidden} rowTitle="Say cheese!" rowIndex={recentProjects.length + 1} rowTeam="Film"
            entranceAt={0} previewTarget={cameraTarget} previewActive={showing&&active==="film"} previewSeen={seen.film} />
        </li>
      </ul>
      <div className="recent-project-preview" aria-hidden="true" data-visible={showing}>
        <div className="recent-preview-frame"><div className="recent-preview-content" data-kind={preview?.kind}>
          <div className="recent-preview-art" data-motion={showing}>
            <div ref={setCameraTarget} className="recent-special-preview" data-visible={showing&&active==="film"} />
            <div className="recent-special-preview" data-visible={showing&&preview?.kind==="zine"}>{seen.zine&&<ZinePreview active={showing&&preview?.kind==="zine"} dark={dark} />}</div>
            {project&&preview.kind!=="film"&&preview.kind!=="zine"&&<div key={`visual-${project.id}`} className="recent-motion-visual" data-visual={preview.kind}>
              <span className="motion-orb motion-orb-a" /><span className="motion-orb motion-orb-b" /><span className="motion-orb motion-orb-c" />
              <span className="motion-grid" /><span className="motion-signal" />
            </div>}
            <span key={`dither-${project?.id}`} className="recent-preview-dither" />
          </div>
          <p>{project?.description}</p>
        </div></div>
      </div>
    </div>
  </nav></>;
}
