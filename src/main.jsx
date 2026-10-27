import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import { projects } from "./book/projects";
import { AsciiPortal } from "./book/ascii";
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

function Metadata({
  project,
  index,
  onRead,
  onPrevious,
  canPrevious,
  onNext,
  canNext,
}) {
  return (
    <div className="metadata-content">
      <button
        className="metadata-turn-page"
        data-turn-page="left"
        aria-label="Turn to previous spread"
        onClick={onPrevious}
        disabled={!canPrevious}
      />
      <div className="page-running-head">
        <span>FIELD NOTES / RISO EDITION</span>
        <span className="ink-swatches" aria-hidden="true">
          <i />
          <i />
        </span>
      </div>
      <div className="chapter-label">
        <span className="chapter-rule" />
        PROJECT {pad(index + 1)}
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
        Read the case study <Arrow />
      </button>
      <div className="page-folio">
        <button
          className="page-corner previous"
          onClick={onPrevious}
          disabled={!canPrevious}
          aria-label="Previous project"
        >
          <Arrow direction="left" />
        </button>
        <span className="page-instruction">
          PROJECT {pad(index + 1)} / {pad(projects.length)}
        </span>
        <button
          className="page-corner next"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next project"
        >
          <Arrow />
        </button>
      </div>
    </div>
  );
}

function PortalFallback() {
  const ref = useRef(null);
  useEffect(() => {
    const portal = new AsciiPortal(),
      canvas = ref.current,
      ctx = canvas.getContext("2d"),
      preference = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0,
      previous = 0;
    const frame = (now) => {
      if (now - previous > 80) {
        portal.draw(preference.matches ? 0 : now / 1000);
        ctx.clearRect(0, 0, 768, 1056);
        ctx.drawImage(portal.canvas, 0, 0);
        previous = now;
      }
      if (!preference.matches) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      previous = -100;
      frame(performance.now());
    };
    start();
    preference.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(raf);
      preference.removeEventListener("change", start);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      width="768"
      height="1056"
      className="ascii-portal"
      role="img"
      aria-label="Pink and blue RISO-inspired ASCII print"
    />
  );
}
function PreviewPage({ onNext, fallback }) {
  return (
    <div className="preview-content portal-only">
      <button
        className="portal-hit"
        data-turn-page="right"
        aria-label="Turn to next spread"
        onClick={onNext}
      >
        {fallback ? <PortalFallback /> : null}
      </button>
    </div>
  );
}
function App() {
  const host = useRef(null),
    engine = useRef(null),
    dialog = useRef(null),
    indexRef = useRef(0),
    printSources = useRef([]);
  const [mounts, setMounts] = useState(null),
    [phase, setPhase] = useState("arriving"),
    [index, setIndex] = useState(0),
    [fallback, setFallback] = useState(false),
    [spread, setSpread] = useState({ left: 0, right: 0 }),
    [selectedPage, setSelectedPage] = useState(0);
  const project = projects[index],
    busy = phase !== "ready";
  const select = (next) => {
    indexRef.current = next;
    setIndex(next);
    setSelectedPage(next);
    setSpread({ left: next, right: next });
    const url = new URL(location.href);
    url.searchParams.set("project", projects[next].id);
    history.replaceState(null, "", url);
  };
  const openRead = () => {
    if (!dialog.current.open) dialog.current.showModal();
  };
  const navigate = (page) => {
    if (phase === "rotating") return;
    const next = Math.max(-1, Math.min(projects.length, page));
    if (fallback) {
      if (next >= 0 && next < projects.length) select(next);
      setSelectedPage(next);
    } else engine.current?.goTo(next);
  };
  const turn = (direction) => {
    if (busy) return;
    const current =
      selectedPage === -1 || selectedPage === projects.length
        ? selectedPage
        : indexRef.current;
    navigate(current + direction);
  };
  useEffect(() => {
    let disposed = false;
    const initial = projects.findIndex(
      (p) => p.id === new URLSearchParams(location.search).get("project"),
    );
    if (initial >= 0) {
      indexRef.current = initial;
      setIndex(initial);
      setSelectedPage(initial);
      setSpread({ left: initial, right: initial });
    }
    Promise.all([
      document.fonts.load('400 20px "DM Sans"'),
      document.fonts.load('500 20px "DM Sans"'),
      document.fonts.load('500 40px "Cormorant Garamond"'),
    ])
      .catch(() => [])
      .then(async () => {
        if (disposed) return;
        try {
          const [{ BookScene }, { toCanvas, getFontEmbedCSS }] =
            await Promise.all([
              import("./book/BookScene"),
              import("html-to-image"),
            ]);
          await document.fonts.ready;
          if (disposed) return;
          let printPages;
          try {
            const fontEmbedCSS = await getFontEmbedCSS(printSources.current[0]);
            printPages = await Promise.all(
              printSources.current.map((source) =>
                toCanvas(source, {
                  width: 600,
                  height: 847,
                  pixelRatio: 1,
                  fontEmbedCSS,
                  style: { transform: "none", opacity: "1", clipPath: "none" },
                }),
              ),
            );
          } catch (error) {
            console.info(
              "Using the book’s local printed layout.",
              error.message,
            );
          }
          if (disposed) return;
          const book = new BookScene(
            host.current,
            {
              projects,
              onPhase: setPhase,
              onView: setSelectedPage,
              onIndex: select,
              onSpread: (left, right) => setSpread({ left, right }),
              onOpen: openRead,
              printPages,
            },
            indexRef.current,
          );
          engine.current = book;
          setMounts({ left: book.leftPage, right: book.rightPage });
        } catch (error) {
          console.info("Showing the book reading layout.", error.message);
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
  useEffect(() => {
    const key = (e) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.closest("input,textarea,select,[contenteditable]")
      )
        return;
      if (e.key.toLowerCase() === "r" && !e.repeat) {
        e.preventDefault();
        dialog.current?.close();
        engine.current?.replay();
        if (fallback) select(0);
        setSelectedPage(0);
        return;
      }
      if (dialog.current?.open) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        turn(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        turn(-1);
      }
      if ((e.code === "Space" || e.key === "Escape") && busy) {
        e.preventDefault();
        engine.current?.skip();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [phase, fallback]);
  const left = (
    <Metadata
      project={projects[spread.left]}
      index={spread.left}
      onRead={openRead}
      onPrevious={() => navigate(index - 1)}
      canPrevious={!busy}
      onNext={() => navigate(index + 1)}
      canNext={!busy}
    />
  );
  const right = (
    <PreviewPage
      project={projects[spread.right]}
      index={spread.right}
      onRead={openRead}
      onNext={() => navigate(index + 1)}
      canNext={!busy}
      fallback={fallback}
    />
  );
  return (
    <main className={`spellbook ${fallback ? "is-fallback" : ""}`}>
      <div className="scene-marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div className="marquee-copy" key={copy}>
              <span>Field notes</span>
              <span className="marquee-outline">Selected work</span>
              <span className="marquee-light">Product designer</span>
              <span className="marquee-outline">Ink. Paper. Play.</span>
            </div>
          ))}
        </div>
      </div>
      <button
        className="scene-brand"
        onClick={() => navigate(-1)}
        aria-label="Go to zine cover"
      >
        <span className="brand-monogram">JL.</span>
        <span className="brand-name">
          JOSH LUCAS
          <br />
          RISO EDITION
        </span>
      </button>
      <p className="sr-only" id="book-instructions">
        Drag the zine to rotate it in place. Click the right page to go forward
        or the left page to go back. Use the bottom navigation or Left and Right
        keys as alternatives. Press R to reset the rotation and replay the
        opening. Choose Read the case study on the left page to read the full
        project.
      </p>
      <div className="print-sources" aria-hidden="true" inert>
        {projects.map((item, i) => (
          <div
            className="printed-page print-source-left"
            key={item.id}
            ref={(el) => (printSources.current[i] = el)}
          >
            <Metadata
              project={item}
              index={i}
              onRead={() => {}}
              onPrevious={() => {}}
              canPrevious={i > 0}
              onNext={() => {}}
              canNext={i < projects.length - 1}
            />
          </div>
        ))}
      </div>
      <section
        ref={host}
        className="book-stage"
        aria-label="Interactive RISO zine portfolio"
        aria-describedby="book-instructions"
        tabIndex={0}
      />
      {mounts && (
        <>
          {createPortal(left, mounts.left)}
          {createPortal(right, mounts.right)}
        </>
      )}
      {fallback && selectedPage >= 0 && selectedPage < projects.length && (
        <div className="fallback-book">
          <div className="printed-page page-verso">{left}</div>
          <div className="printed-page page-recto">{right}</div>
        </div>
      )}
      {fallback &&
        (selectedPage === -1 || selectedPage === projects.length) && (
          <div
            className="fallback-cover"
            role="img"
            aria-label={
              selectedPage === -1
                ? "RISO-printed front cover"
                : "RISO-printed back cover"
            }
          />
        )}
      <nav className="book-navigation" aria-label="Zine pages">
        <div className="book-navigation-scroll">
          {[-1, ...projects.map((_, i) => i), projects.length].map((page) => (
            <button
              key={page}
              aria-current={selectedPage === page ? "page" : undefined}
              onClick={() => navigate(page)}
              disabled={(!mounts && !fallback) || phase === "rotating"}
            >
              {page === -1
                ? "Cover"
                : page === projects.length
                  ? "Back cover"
                  : `Page ${page + 1}`}
            </button>
          ))}
        </div>
      </nav>
      <span className="sr-only" aria-live="polite">
        {busy
          ? phase === "rotating"
            ? "Rotating the zine"
            : phase === "closing"
              ? "The zine is closing"
              : phase === "turning"
                ? "Turning the page"
                : "The zine is opening"
          : selectedPage === -1
            ? "Front cover"
            : selectedPage === projects.length
              ? "Back cover"
              : `Project ${index + 1} of ${projects.length}: ${project.title.replace("\n", " ")}`}
      </span>
      <dialog
        ref={dialog}
        className="reading-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current.close();
        }}
      >
        <article className="dialog-paper">
          <button
            className="close-dialog"
            aria-label="Close reading view"
            onClick={() => dialog.current.close()}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </button>
          <Star className="dialog-star" />
          <p className="eyebrow">
            PROJECT {pad(index + 1)}
            {project.sample ? " / SAMPLE CASE STUDY" : ""}
          </p>
          <h2>{project.title.replace("\n", " ")}</h2>
          <p className="dialog-intro">{project.subtitle}</p>
          {project.previewImage ? (
            <img
              className="project-image"
              src={project.previewImage}
              alt={project.imageAlt}
            />
          ) : (
            <PortalFallback />
          )}
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
              ? "Sample content — ready for your project story, images, and results."
              : project.note}
          </p>
        </article>
      </dialog>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
