import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import { projects } from "./book/projects";
import "./style.css";

function Star({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 1l3.4 11.6L31 16l-11.6 3.4L16 31l-3.4-11.6L1 16l11.6-3.4L16 1Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="m6 6 10 6 10-6-6 10 6 10-10-6-10 6 6-10L6 6Z"
        stroke="currentColor"
        strokeWidth=".7"
      />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}
function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 15 15 5M5 5h10v10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ReplayIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="15"
      height="15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8a6 6 0 1 1 0 4M4 3v5h5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Arrow({ direction = "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      style={direction === "left" ? { transform: "rotate(180deg)" } : undefined}
    >
      <path
        d="M4 12h15M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const pad = (n) => String(n).padStart(2, "0");

function ProjectPreview({ project, index }) {
  if (project.previewImage)
    return (
      <img
        className="project-image"
        src={project.previewImage}
        alt={project.imageAlt}
      />
    );
  return (
    <div
      className={`preview-art ${project.preview}`}
      aria-label="Illustrative project preview placeholder"
    >
      <div className="art-topline">
        <span>AN EXPLORATION IN POSSIBILITY</span>
        <Star />
      </div>
      <svg
        className="contour-art"
        viewBox="0 0 500 600"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={`ink-${index}`}
            x1="50"
            y1="0"
            x2="420"
            y2="600"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#d3d8b5" stopOpacity=".9" />
            <stop offset="1" stopColor="#d3d8b5" stopOpacity=".08" />
          </linearGradient>
        </defs>
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d={`M ${250 - i * 12} ${92 - i * 9} C ${452 + i * 5} ${120 - i * 9}, ${478 + i * 9} ${317 + i * 4}, ${321 + i * 9} ${405 + i * 7} C ${160 - i * 12} ${522 + i * 7}, ${67 - i * 9} ${330 + i * 6}, ${125 - i * 10} ${202 - i * 3} C ${162 - i * 9} ${115 - i * 10}, ${204 - i * 10} ${80 - i * 8}, ${250 - i * 12} ${92 - i * 9} Z`}
            stroke={`url(#ink-${index})`}
            strokeWidth=".8"
          />
        ))}
        <path
          d="M109 410c57-10 12-92 81-109s11-88 92-95 29-69 98-84"
          stroke="#eee4c8"
          strokeWidth="1.5"
          strokeDasharray="3 6"
        />
        <circle cx="109" cy="410" r="5" fill="#eee4c8" />
        <circle cx="380" cy="122" r="5" stroke="#eee4c8" />
        <circle cx="380" cy="122" r="11" stroke="#eee4c8" strokeOpacity=".4" />
        <path
          d="M81 130h32m-16-16v32M359 419h32m-16-16v32"
          stroke="#eee4c8"
          strokeOpacity=".6"
        />
      </svg>
      <div className="art-title">
        <span className="art-number">{pad(index + 1)}</span>
        <p>
          Here be
          <br />
          <em>possibilities.</em>
        </p>
      </div>
      <div className="art-bottomline">
        <span>YOUR PROJECT, IN FOCUS</span>
        <ExternalArrow />
      </div>
    </div>
  );
}

function Metadata({ project, index, onRead }) {
  return (
    <div className="metadata-content">
      <div className="page-running-head">
        <span>THE FIELD JOURNAL</span>
        <Star />
      </div>
      <div className="chapter-label">
        <span className="chapter-rule" />
        CHAPTER {pad(index + 1)}
        <span className="sample-label">
          {project.sample ? "SAMPLE CONTENT" : "CASE STUDY"}
        </span>
      </div>
      <h1>
        {project.title.split("\n").map((line, i) => (
          <React.Fragment key={line}>
            {i > 0 && (
              <>
                <br />{" "}
              </>
            )}
            {line}
          </React.Fragment>
        ))}
      </h1>
      <p className="project-subtitle">{project.subtitle}</p>
      <p className="project-description">{project.description}</p>
      <dl className="project-facts">
        <div>
          <dt>ROLE & TEAM</dt>
          <dd>
            {project.role} · {project.team}
          </dd>
        </div>
        <div>
          <dt>YEAR</dt>
          <dd>{project.year}</dd>
        </div>
        <div>
          <dt>FOCUS</dt>
          <dd>{project.disciplines.join(" · ")}</dd>
        </div>
      </dl>
      <button className="read-project" onClick={onRead}>
        Open the case study <Arrow />
      </button>
      <div className="page-folio">
        <span>JOSH LUCAS — SELECTED WORK</span>
        <span>{pad(index * 2 + 1)}</span>
      </div>
    </div>
  );
}
function PreviewPage({ project, index }) {
  return (
    <div className="preview-content">
      <div className="page-running-head">
        <span>A CLOSER LOOK</span>
        <span>FIG. {pad(index + 1)}</span>
      </div>
      <ProjectPreview project={project} index={index} />
      <div className="preview-caption">
        <span>
          {project.sample
            ? "Illustrative preview — your project image goes here."
            : project.note}
        </span>
        <span className="caption-line" />
      </div>
      <div className="page-folio">
        <span>{project.note}</span>
        <span>{pad(index * 2 + 2)}</span>
      </div>
    </div>
  );
}

function App() {
  const host = useRef(null),
    engine = useRef(null),
    dialog = useRef(null),
    turnTo = useRef(null),
    indexRef = useRef(0);
  const [mounts, setMounts] = useState(null),
    [phase, setPhase] = useState("entering"),
    [index, setIndex] = useState(0),
    [fallback, setFallback] = useState(false),
    [modal, setModal] = useState("project");
  const project = projects[index],
    busy = phase !== "ready";
  const commitIndex = (next) => {
    indexRef.current = next;
    setIndex(next);
    const url = new URL(location.href);
    url.searchParams.set("project", projects[next].id);
    history.replaceState(null, "", url);
  };
  useEffect(() => {
    const initial = projects.findIndex(
      (p) => p.id === new URLSearchParams(location.search).get("project"),
    );
    if (initial >= 0) {
      indexRef.current = initial;
      setIndex(initial);
    }
    let disposed = false;
    Promise.all([
      document.fonts.load('400 20px "DM Sans"'),
      document.fonts.load('500 40px "Cormorant Garamond"'),
    ])
      .catch(() => [])
      .then(async () => {
        if (disposed) return;
        try {
          const { BookScene } = await import("./book/BookScene");
          if (disposed) return;
          const book = new BookScene(host.current, {
            onPhase: setPhase,
            onReady: () => setPhase("ready"),
            onTurn: () => {
              if (turnTo.current !== null) {
                commitIndex(turnTo.current);
                turnTo.current = null;
              }
            },
          });
          engine.current = book;
          setMounts({ left: book.leftPage, right: book.rightPage });
        } catch (error) {
          console.info("Showing the journal reading view.", error.message);
          setFallback(true);
          setPhase("ready");
        }
      });
    return () => {
      disposed = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  const turn = (direction) => {
    const next = indexRef.current + direction;
    if (next < 0 || next >= projects.length || busy) return;
    if (fallback) {
      commitIndex(next);
      return;
    }
    turnTo.current = next;
    engine.current?.turnPage(direction);
  };
  useEffect(() => {
    const key = (e) => {
      if (
        dialog.current?.open ||
        e.target.closest("button,a,input,textarea,select")
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        turn(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        turn(-1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [busy, fallback]);
  const openDialog = (kind) => {
    setModal(kind);
    dialog.current?.showModal();
  };
  return (
    <div
      className={`journal ${busy ? "is-opening" : "is-ready"} ${fallback ? "is-fallback" : ""}`}
    >
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Josh Lucas, home">
          <Star />
          <span>
            Josh Lucas<span className="wordmark-period">.</span>
          </span>
        </a>
        <div className="header-center">
          <span className="status-dot" />A DESIGNER’S FIELD JOURNAL
        </div>
        <button className="about-button" onClick={() => openDialog("about")}>
          About the author <ExternalArrow />
        </button>
      </header>
      <main>
        <div className="edition-label">
          <span>SELECTED WORKS</span>
          <span className="edition-line" />
          <span>VOLUME I</span>
        </div>
        <section className="book-section" aria-label="Portfolio journal">
          <div
            ref={host}
            className="book-stage"
            data-testid="book-stage"
            aria-label="An opening three-dimensional leather journal"
          />
          {mounts && (
            <>
              {createPortal(
                <Metadata
                  project={project}
                  index={index}
                  onRead={() => openDialog("project")}
                />,
                mounts.left,
              )}
              {createPortal(
                <PreviewPage project={project} index={index} />,
                mounts.right,
              )}
            </>
          )}
          {busy && (
            <div className="intro-status">
              <span className="intro-indicator" />
              <span aria-live="polite">
                {phase === "entering"
                  ? "A story is taking shape"
                  : phase === "opening"
                    ? "Opening the journal"
                    : phase === "flipping"
                      ? "A few pages from the journey"
                      : phase === "turning"
                        ? "Turning the page"
                        : "Finding the beginning"}
              </span>
              {phase !== "turning" && (
                <button
                  disabled={!mounts}
                  onClick={() => engine.current?.skip()}
                >
                  Skip intro <ExternalArrow />
                </button>
              )}
            </div>
          )}
          <div
            className="mobile-reading"
            aria-hidden={busy}
            inert={busy || undefined}
          >
            <div className="mobile-reading-heading">ON THIS SPREAD</div>
            <Metadata
              project={project}
              index={index}
              onRead={() => openDialog("project")}
            />
            {fallback && <PreviewPage project={project} index={index} />}
          </div>
        </section>
        <nav className="book-navigation" aria-label="Project pages">
          <button
            className="page-arrow"
            onClick={() => turn(-1)}
            disabled={busy || index === 0}
            aria-label="Previous project"
          >
            <Arrow direction="left" />
          </button>
          <div className="page-position" aria-live="polite">
            <span>CHAPTER</span>
            <strong>{pad(index + 1)}</strong>
            <i>/</i>
            <span>{pad(projects.length)}</span>
          </div>
          <button
            className="page-arrow"
            onClick={() => turn(1)}
            disabled={busy || index === projects.length - 1}
            aria-label="Next project"
          >
            <Arrow />
          </button>
        </nav>
      </main>
      <footer className="site-footer">
        <span>THOUGHTFULLY MADE. ALWAYS EXPLORING.</span>
        <button
          onClick={() => engine.current?.replay()}
          disabled={busy || fallback}
          className="replay-button"
        >
          <ReplayIcon /> Replay opening
        </button>
        <span className="location">
          <span className="status-dot" />
          SAN FRANCISCO, CA
        </span>
      </footer>
      <dialog
        ref={dialog}
        className="reading-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current.close();
        }}
      >
        <div className="dialog-paper">
          <button
            className="close-dialog"
            onClick={() => dialog.current.close()}
            aria-label="Close reading view"
          >
            ×
          </button>
          <Star className="dialog-star" />
          {modal === "about" ? (
            <>
              <p className="eyebrow">ABOUT THE AUTHOR</p>
              <h2>Josh Lucas.</h2>
              <p className="dialog-intro">
                A product designer in San Francisco, collecting questions,
                making things, and following a sense of possibility.
              </p>
              <p>
                This journal is a new home for my work. The project chapters are
                placeholders while I put the real stories together.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">
                CHAPTER {pad(index + 1)}
                {project.sample ? " / CASE STUDY SCAFFOLD" : ""}
              </p>
              <h2>{project.title.replace("\n", " ")}</h2>
              <p className="dialog-intro">{project.subtitle}</p>
              <ProjectPreview project={project} index={index} />
              {project.chapters.map(([title, copy], i) => (
                <section className="case-chapter" key={title}>
                  <span>{pad(i + 1)}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </section>
              ))}
              {project.caseStudyUrl && (
                <a className="read-project" href={project.caseStudyUrl}>
                  View full project <Arrow />
                </a>
              )}
              <p className="scaffold-note">
                {project.sample
                  ? "Sample content. Replace this chapter with your project story, images, and results."
                  : project.note}
              </p>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
