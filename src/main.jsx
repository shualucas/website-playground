import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import { projects } from "./book/projects";
import { AsciiPortal } from "./book/ascii";
import { projectTheme } from "./book/themes";
import "./style.css";
import { CardLoader } from "./CardLoader";
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
        <span>JOSH LUCAS</span>
        <span>EDITION 01 / {pad(index + 1)}</span>
      </div>
      <div className="chapter-label">
        <span className="chapter-rule" />
        {project.kind === "about"
          ? "ABOUT"
          : project.kind === "after-hours"
            ? "AFTER-HOURS"
            : `PROJECT ${pad(index)}`}
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
      {project.kind !== "project" ? (
        <div className="about-note">
          <span>{project.kind === "about" ? "BASED IN" : "OFF THE CLOCK"}</span>
          <strong>
            {project.kind === "about"
              ? "San Francisco, California"
              : "Film · Tennis · Games"}
          </strong>
          <p>
            {project.kind === "about"
              ? "Professional background — coming soon."
              : "A space for play and experiments."}
          </p>
        </div>
      ) : (
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
      )}
      <button className="read-project" onClick={onRead}>
        {project.kind === "about"
          ? "Professional background"
          : project.kind === "after-hours"
            ? "Explore after-hours"
            : "Read the case study"}{" "}
        <Arrow />
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
          {project.label.toUpperCase()} / {pad(projects.length)}
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

function PortalFallback({ project = projects[0] }) {
  const ref = useRef(null);
  useEffect(() => {
    const portal = new AsciiPortal(projectTheme(project.theme).colors),
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
  }, [project.theme]);
  return (
    <canvas
      ref={ref}
      width="768"
      height="1056"
      className="ascii-portal"
      role="img"
      aria-label={`${project.label} RISO-inspired ASCII portal`}
    />
  );
}
function PhoneFallback({ project, controls = false }) {
  return (
    <div
      className="phone-placeholder"
      style={{ "--project-color": projectTheme(project.theme).accent }}
    >
      {project.previewVideo ? (
        <video
          src={project.previewVideo}
          poster={project.previewPoster || undefined}
          controls={controls}
          muted
          playsInline
          loop
          preload="metadata"
        />
      ) : project.previewGif || project.previewPoster ? (
        <img
          src={project.previewGif || project.previewPoster}
          alt={project.imageAlt}
        />
      ) : (
        <div>
          <strong>{project.label}</strong>
          <span>Preview coming soon</span>
          <small>MP4 / GIF</small>
        </div>
      )}
    </div>
  );
}
function PreviewPage({ project, onNext, onRead, fallback }) {
  return (
    <div className="preview-content portal-only">
      <button
        className="portal-hit"
        data-turn-page="right"
        aria-label="Turn to next spread"
        onClick={onNext}
      >
        {fallback ? <PortalFallback project={project} /> : null}
      </button>
      {project.kind === "project" && (
        <button
          className="phone-hit"
          aria-label={`Open ${project.label} preview`}
          onClick={onRead}
        >
          {fallback ? <PhoneFallback project={project} /> : null}
        </button>
      )}
    </div>
  );
}
function App() {
  const host = useRef(null),
    engine = useRef(null),
    dialog = useRef(null),
    indexRef = useRef(0),
    printSources = useRef([]),
    loaderGate = useRef({ done: false, resolve: null });
  const [mounts, setMounts] = useState(null),
    [phase, setPhase] = useState("arriving"),
    [index, setIndex] = useState(0),
    [fallback, setFallback] = useState(false),
    [spread, setSpread] = useState({ left: 0, right: 0 }),
    [selectedPage, setSelectedPage] = useState(-1),
    [requestedPage, setRequestedPage] = useState(-1),
    [colorMode, setColorMode] = useState(() => {
      try {
        return localStorage.getItem("zine-color-mode") === "dark"
          ? "dark"
          : "light";
      } catch {
        return "light";
      }
    }),
    [presentation, setPresentation] = useState("loading"),
    [loadProgress, setLoadProgress] = useState(0.1);
  const finishLoader = () => {
    loaderGate.current.done = true;
    loaderGate.current.resolve?.();
  };
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
  const showView = (page) => {
    setSelectedPage(page);
    if (page === -1 || page === projects.length) {
      const url = new URL(location.href);
      url.searchParams.delete("project");
      history.replaceState(null, "", url);
    }
  };
  const openRead = () => {
    if (!dialog.current.open) dialog.current.showModal();
  };
  const navigate = (page) => {
    if (phase === "rotating") return;
    const next = Math.max(-1, Math.min(projects.length, page));
    setRequestedPage(next);
    if (fallback) {
      if (next >= 0 && next < projects.length) select(next);
      showView(next);
    } else engine.current?.goTo(next);
  };
  const turn = (direction) => {
    if (phase === "rotating") return;
    if (!fallback) {
      engine.current?.stepPage(direction);
      return;
    }
    navigate(requestedPage + direction);
  };
  const restart = () => {
    if (presentation === "loading") return;
    dialog.current?.close();
    setRequestedPage(-1);
    engine.current?.replay();
    if (fallback) showView(-1);
  };
  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", colorMode === "dark" ? "#141414" : "#ffffff");
    try {
      localStorage.setItem("zine-color-mode", colorMode);
    } catch {
      /* Private browsing can disable persistence. */
    }
    engine.current?.setDarkMode(colorMode === "dark");
  }, [colorMode, mounts]);
  useEffect(() => {
    let disposed = false;
    const revealAt = 1500; // performance.now() is relative to the navigation time origin.
    const initial = projects.findIndex(
      (p) => p.id === new URLSearchParams(location.search).get("project"),
    );
    if (initial >= 0) {
      indexRef.current = initial;
      setIndex(initial);
      setSelectedPage(initial);
      setRequestedPage(initial);
      setSpread({ left: initial, right: initial });
    }
    Promise.all([
      document.fonts.load('400 20px "DM Sans"'),
      document.fonts.load('500 20px "DM Sans"'),
      document.fonts.load('700 69px "DM Sans"'),
    ])
      .catch(() => [])
      .then(async () => {
        if (disposed) return;
        try {
          setLoadProgress(0.2);
          const [
            { BookScene },
            { toCanvas, getFontEmbedCSS },
            { loadGoogleAsset },
          ] = await Promise.all([
            import("./book/BookScene"),
            import("html-to-image"),
            import("./book/career"),
          ]);
          await document.fonts.ready;
          if (disposed) return;
          setLoadProgress(0.35);
          await new Promise(requestAnimationFrame);
          const google = await loadGoogleAsset();
          let completed = 0;
          let printPages;
          try {
            const fontEmbedCSS = await getFontEmbedCSS(printSources.current[0]);
            printPages = await Promise.all(
              printSources.current.map(async (source) => {
                const captured = await toCanvas(source, {
                  width: 600,
                  height: 847,
                  pixelRatio: 2,
                  fontEmbedCSS,
                  style: { transform: "none", opacity: "1", clipPath: "none" },
                });
                completed += 1;
                if (!disposed)
                  setLoadProgress(0.35 + (0.4 * completed) / projects.length);
                return captured;
              }),
            );
          } catch (error) {
            console.info(
              "Using the book’s local printed layout.",
              error.message,
            );
          }
          if (disposed) return;
          setLoadProgress(0.85);
          await new Promise(requestAnimationFrame);
          const book = new BookScene(
            host.current,
            {
              projects,
              onPhase: setPhase,
              onView: showView,
              onRequest: setRequestedPage,
              onPresented: () => setPresentation("ready"),
              onIndex: select,
              onSpread: (left, right) => setSpread({ left, right }),
              onOpen: openRead,
              printPages,
              google,
            },
            initial >= 0 ? initial : -1,
          );
          engine.current = book;
          setMounts({ left: book.leftPage, right: book.rightPage });
          setLoadProgress(1);
          await new Promise((resolve) => {
            if (loaderGate.current.done) resolve();
            else loaderGate.current.resolve = resolve;
          });
          await new Promise((resolve) =>
            setTimeout(resolve, Math.max(0, revealAt - performance.now())),
          );
          if (disposed) return;
          setPresentation("revealing");
          requestAnimationFrame(() => {
            if (!disposed) book.appear();
          });
        } catch (error) {
          console.info("Showing the book reading layout.", error.message);
          engine.current?.dispose();
          engine.current = null;
          setLoadProgress(1);
          await new Promise((resolve) => {
            if (loaderGate.current.done) resolve();
            else loaderGate.current.resolve = resolve;
          });
          await new Promise((resolve) =>
            setTimeout(resolve, Math.max(0, revealAt - performance.now())),
          );
          if (disposed) return;
          setFallback(true);
          setPresentation("ready");
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
      if (presentation === "loading") return;
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.closest("input,textarea,select,[contenteditable]")
      )
        return;
      if (e.key.toLowerCase() === "r" && !e.repeat) {
        e.preventDefault();
        restart();
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
  }, [phase, fallback, selectedPage, requestedPage, index, presentation]);
  const left = (
    <Metadata
      project={projects[spread.left]}
      index={spread.left}
      onRead={openRead}
      onPrevious={() => turn(-1)}
      canPrevious={phase !== "rotating"}
      onNext={() => turn(1)}
      canNext={phase !== "rotating"}
    />
  );
  const right = (
    <PreviewPage
      project={projects[spread.right]}
      index={spread.right}
      onRead={openRead}
      onNext={() => turn(1)}
      canNext={phase !== "rotating"}
      fallback={fallback}
    />
  );
  return (
    <main
      className={`spellbook ${fallback ? "is-fallback" : ""}`}
      data-presentation={presentation}
      data-color-mode={colorMode}
      aria-busy={presentation === "loading"}
    >
      <div
        className="scene-loader"
        role="status"
        aria-label="Preparing your zine"
        aria-hidden={presentation !== "loading"}
      >
        <CardLoader
          progress={loadProgress}
          dark={colorMode === "dark"}
          onComplete={finishLoader}
          active={presentation === "loading"}
        />
      </div>
      <div className="scene-tools" role="group" aria-label="Scene controls">
        <button
          type="button"
          className="icon-button"
          onClick={() => setColorMode(colorMode === "light" ? "dark" : "light")}
          aria-label={
            colorMode === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          }
          aria-pressed={colorMode === "dark"}
          title={colorMode === "light" ? "Dark mode" : "Light mode"}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {colorMode === "light" ? (
              <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
            ) : (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
              </>
            )}
          </svg>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={restart}
          aria-label="Restart zine"
          title="Restart (R)"
          disabled={presentation === "loading"}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 10a8 8 0 1 1 1.8 7.2M4 4v6h6" />
          </svg>
        </button>
      </div>
      <p className="sr-only" id="book-instructions">
        Drag the zine to rotate it through 360 degrees in place. Click the right
        page to go forward or the left page to go back. Use the bottom
        navigation or Left and Right keys as alternatives. Press R to reset the
        rotation and return to the closed cover. Choose Read the case study on
        the left page to read the full project.
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
              canPrevious={true}
              onNext={() => {}}
              canNext={true}
            />
          </div>
        ))}
      </div>
      <section
        ref={host}
        className="book-stage"
        aria-label="Interactive portfolio zine"
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
          <button
            className="fallback-cover"
            onClick={() =>
              navigate(selectedPage === -1 ? 0 : projects.length - 1)
            }
            aria-label={
              selectedPage === -1 ? "Printed front cover" : "Printed back cover"
            }
          />
        )}
      <nav className="book-navigation" aria-label="Zine pages">
        <div className="book-navigation-scroll">
          {[-1, ...projects.map((_, i) => i), projects.length].map((page) => (
            <button
              key={page}
              aria-current={requestedPage === page ? "page" : undefined}
              onClick={() => navigate(page)}
              disabled={
                presentation !== "ready" ||
                (!mounts && !fallback) ||
                phase === "rotating"
              }
            >
              {page === -1
                ? "Cover"
                : page === projects.length
                  ? "Back cover"
                  : projects[page].label}
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
                : phase === "arriving"
                  ? "The zine is arriving"
                  : "The zine is opening"
          : selectedPage === -1
            ? "Front cover"
            : selectedPage === projects.length
              ? "Back cover"
              : project.label}
      </span>
      <dialog
        ref={dialog}
        className="reading-dialog"
        aria-label={
          project.kind === "about"
            ? "About Josh Lucas"
            : project.kind === "after-hours"
              ? "After-hours"
              : `${project.label} case study`
        }
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
          <p className="eyebrow">
            {project.kind === "about"
              ? "ABOUT"
              : project.kind === "after-hours"
                ? "AFTER-HOURS"
                : `PROJECT ${pad(index)}`}
            {project.sample ? " / PLACEHOLDER" : ""}
          </p>
          <h2>{project.title.replace("\n", " ")}</h2>
          <p className="dialog-intro">{project.subtitle}</p>
          {project.kind === "project" ? (
            <PhoneFallback project={project} controls />
          ) : project.previewImage ? (
            <img
              className="project-image"
              src={project.previewImage}
              alt={project.imageAlt}
            />
          ) : (
            <PortalFallback project={project} />
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
              ? project.kind === "about"
                ? "Professional biography — ready for your story."
                : project.kind === "after-hours"
                  ? "Personal projects and experiments — coming soon."
                  : "Placeholder case study — ready for your story, images, and verified results."
              : project.note}
          </p>
        </article>
      </dialog>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
