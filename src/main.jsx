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
          CHAPTER {pad(index + 1)} / {pad(projects.length)}
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
      aria-label="Swirling green ASCII portal"
    />
  );
}
function PreviewPage({ onRead, fallback }) {
  return (
    <div className="preview-content portal-only">
      <button
        className="portal-hit"
        data-portal
        aria-label="Enter the project portal"
        onClick={onRead}
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
    [phase, setPhase] = useState("dropping"),
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
  const turn = (direction) => {
    if (busy) return;
    if (fallback) {
      const next = indexRef.current + direction;
      if (next >= 0 && next < projects.length) select(next);
    } else engine.current?.turnPage(direction);
  };
  const navigate = (page) => {
    if (phase === "carrying" || phase === "falling") return;
    if (fallback) {
      if (page >= 0 && page < projects.length) select(page);
      setSelectedPage(page);
    } else engine.current?.goTo(page);
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
      onPrevious={() => turn(-1)}
      canPrevious={!busy && index > 0}
      onNext={() => turn(1)}
      canNext={!busy && index < projects.length - 1}
    />
  );
  const right = (
    <PreviewPage
      project={projects[spread.right]}
      index={spread.right}
      onRead={openRead}
      onNext={() => turn(1)}
      canNext={!busy && index < projects.length - 1}
      fallback={fallback}
    />
  );
  return (
    <main className={`spellbook ${fallback ? "is-fallback" : ""}`}>
      <div className="scene-marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div className="marquee-copy" key={copy}>
              <span>Josh Lucas</span>
              <span className="marquee-outline">Selected work</span>
              <span className="marquee-light">Product designer</span>
              <span className="marquee-outline">Play. Create.</span>
            </div>
          ))}
        </div>
      </div>
      <button
        className="scene-brand"
        onClick={() => navigate(-1)}
        aria-label="Go to book cover"
      >
        <span className="brand-monogram">JL.</span>
        <span className="brand-name">
          JOSH LUCAS
          <br />
          SELECTED WORK
        </span>
      </button>
      <p className="sr-only" id="book-instructions">
        Drag anywhere on the book to lift it, move it, and drop it on the table.
        Use the page navigation below, the page arrows, or Left and Right to
        turn pages. Press R to restart the opening. Select the portal to read
        the case study.
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
        aria-label="Interactive spellbook portfolio"
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
                ? "Charcoal cloth front cover"
                : "Charcoal cloth back cover"
            }
          />
        )}
      <nav className="book-navigation" aria-label="Book pages">
        <div className="book-navigation-scroll">
          {[-1, ...projects.map((_, i) => i), projects.length].map((page) => (
            <button
              key={page}
              aria-current={selectedPage === page ? "page" : undefined}
              onClick={() => navigate(page)}
              disabled={
                (!mounts && !fallback) ||
                phase === "carrying" ||
                phase === "falling"
              }
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
          ? phase === "carrying"
            ? "Book picked up"
            : phase === "falling"
              ? "Book landing"
              : phase === "closing"
                ? "The book is closing"
                : phase === "turning"
                  ? "Turning the page"
                  : "The book is opening"
          : selectedPage === -1
            ? "Front cover"
            : selectedPage === projects.length
              ? "Back cover"
              : `Chapter ${index + 1} of ${projects.length}: ${project.title.replace("\n", " ")}`}
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
            CHAPTER {pad(index + 1)}
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
