import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import { prepareTitleFont } from "./content/typography";
import { miniatureDetails } from "./content/miniatures";
import { FilmGallery } from "./FilmGallery";
import { MiniatureTooltip } from "./MiniatureTooltip";
import { projects } from "./book/projects";
import { AsciiPortal } from "./book/ascii";
import { projectTheme } from "./book/themes";
import "./style.css";
import { CaseStudy } from "./CaseStudy";
import { CardLoader } from "./CardLoader";
import { PageTurnSound } from "./book/page-sound";
const pad = (n) => String(n).padStart(2, "0");

function Metadata({ project, index, onPrevious, canPrevious }) {
  return (
    <div className="metadata-content">
      <button
        className="metadata-turn-page"
        data-turn-page="left"
        aria-label="Turn to previous spread"
        onClick={onPrevious}
        disabled={!canPrevious}
      />
      <div className="chapter-label">
        <span className="chapter-rule" />
        {project.kind === "about"
          ? "ABOUT"
          : project.kind === "after-hours"
            ? "AFTER-HOURS"
            : `PROJECT ${pad(index)}`}
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
      {project.kind === "about" && (
        <p className="project-subtitle">{project.subtitle}</p>
      )}
      <p className="project-description">{project.description}</p>
      {project.kind === "after-hours" && (
        <div className="about-note">
          <span>OFF THE CLOCK</span>
          <strong>Film · Tennis · Games</strong>
        </div>
      )}
      {project.kind === "project" && (
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
        <div aria-label={`${project.label} empty phone preview`}>
          <span className="sr-only">Project preview coming soon</span>
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
    sound = useRef(null),
    viewRef = useRef("book"),
    routeToken = useRef(0),
    galleryOpenRef = useRef(false),
    indexRef = useRef(0),
    printSources = useRef([]),
    navigation = useRef(null),
    loaderGate = useRef({ done: false, resolve: null });
  if (!sound.current) sound.current = new PageTurnSound();
  const [soundMuted, setSoundMuted] = useState(() => {
    try {
      return localStorage.getItem("zine-sound-muted") === "true";
    } catch {
      return false;
    }
  });
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
    [loadProgress, setLoadProgress] = useState(0.1),
    [view, setView] = useState("book"),
    [reading, setReading] = useState(null),
    [galleryOpen, setGalleryOpen] = useState(false),
    [tooltip, setTooltip] = useState(null),
    [route, setRoute] = useState(() => {
      const url = new URL(location.href);
      const index = projects.findIndex(
        (p) => p.id === url.searchParams.get("project") && p.kind === "project",
      );
      return url.searchParams.get("view") === "case-study" && index >= 0
        ? index
        : null;
    });
  const changeView = (value) => {
    viewRef.current = value;
    setView(value);
  };
  const hoverMiniature = (item) =>
    setTooltip((previous) => (previous?.pinned ? previous : item));
  const openMiniature = (id, x = innerWidth / 2, y = innerHeight - 100) => {
    if (id === "camera") {
      setTooltip(null);
      galleryOpenRef.current = true;
      setGalleryOpen(true);
      engine.current?.setOverlayOpen(true);
    } else setTooltip({ id, x, y, pinned: true });
  };
  const closeGallery = () => {
    galleryOpenRef.current = false;
    setGalleryOpen(false);
    engine.current?.setOverlayOpen(false);
    requestAnimationFrame(() =>
      document
        .querySelector('[data-miniature-control="camera"]')
        ?.focus({ preventScroll: true }),
    );
  };
  useEffect(() => {
    const dismiss = (event) => {
      if (!event.target.closest(".miniature-tooltip")) setTooltip(null);
    };
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, []);
  useEffect(() => {
    setTooltip(null);
  }, [requestedPage, view]);
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
    const next = indexRef.current;
    if (projects[next].kind !== "project" || viewRef.current !== "book") return;
    viewRef.current = "entering";
    const url = new URL(location.href);
    url.searchParams.set("project", projects[next].id);
    url.searchParams.set("view", "case-study");
    history.pushState({ zineCaseStudy: true }, "", url);
    setRoute(next);
  };
  const closeRead = () => {
    if (history.state?.zineCaseStudy) history.back();
    else {
      const url = new URL(location.href);
      url.searchParams.delete("view");
      history.replaceState(null, "", url);
      setRoute(null);
    }
  };
  useEffect(() => {
    const pop = () => {
      const url = new URL(location.href),
        next = projects.findIndex(
          (p) =>
            p.id === url.searchParams.get("project") && p.kind === "project",
        );
      setRoute(
        url.searchParams.get("view") === "case-study" && next >= 0
          ? next
          : null,
      );
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (presentation !== "ready" || (route !== null && phase !== "ready"))
      return;
    const token = ++routeToken.current;
    if (route !== null) {
      changeView("entering");
      (async () => {
        await engine.current?.enterProject(route);
        if (token !== routeToken.current) return;
        setReading(route);
        changeView("reading");
      })();
    } else if (viewRef.current !== "book") {
      changeView("leaving");
      setReading(null);
      (async () => {
        await engine.current?.returnToBook();
        if (token !== routeToken.current) return;
        changeView("book");
        requestAnimationFrame(() => {
          const target =
            host.current?.querySelector(".phone-hit") ||
            document.querySelector(".fallback-book .phone-hit");
          (
            target || navigation.current?.querySelector('[aria-current="page"]')
          )?.focus({ preventScroll: true });
        });
      })();
    }
    return () => {
      routeToken.current++;
    };
  }, [route, presentation, phase]);
  const navigate = (page) => {
    const next = Math.max(-1, Math.min(projects.length, page));
    setRequestedPage(next);
    if (fallback) {
      if (next !== requestedPage)
        void sound.current.turn(
          next > requestedPage,
          next === -1 || next === projects.length,
        );
      if (next >= 0 && next < projects.length) select(next);
      showView(next);
    } else engine.current?.goTo(next);
  };
  const turn = (direction) => {
    if (!fallback) {
      engine.current?.stepPage(direction);
      return;
    }
    navigate(requestedPage + direction);
  };
  const restart = () => {
    if (presentation === "loading") return;
    if (viewRef.current !== "book") return;
    setRequestedPage(-1);
    engine.current?.replay();
    if (fallback) showView(-1);
  };
  useEffect(() => {
    const scroller = navigation.current,
      button = scroller?.querySelector('[aria-current="page"]');
    if (button)
      scroller.scrollTo({
        left:
          button.offsetLeft -
          scroller.offsetLeft -
          (scroller.clientWidth - button.offsetWidth) / 2,
        behavior: "auto",
      });
  }, [requestedPage]);
  useEffect(() => {
    sound.current.setMuted(soundMuted);
    try {
      localStorage.setItem("zine-sound-muted", String(soundMuted));
    } catch {}
  }, [soundMuted]);
  useEffect(() => {
    const audio = sound.current;
    audio.preload();
    const unlock = (event) => {
      if (event.isTrusted) void audio.unlock();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.dispose();
    };
  }, []);
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
    const revealAt = 2000; // performance.now() is relative to the navigation time origin.
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
      prepareTitleFont(),
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
              onTurn: (forward, cover) => {
                void sound.current.turn(forward, cover);
              },
              onPresented: () => setPresentation("ready"),
              onIndex: select,
              onSpread: (left, right) => setSpread({ left, right }),
              onOpen: openRead,
              onMiniatureHover: hoverMiniature,
              onMiniatureOpen: openMiniature,
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
      if (presentation === "loading" || galleryOpenRef.current) return;
      if (e.key === "Escape" && tooltip) {
        setTooltip(null);
        return;
      }
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.closest("input,textarea,select,[contenteditable]")
      )
        return;
      if (route !== null) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeRead();
        }
        return;
      }
      if (e.key.toLowerCase() === "r" && !e.repeat) {
        e.preventDefault();
        restart();
        return;
      }

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
  }, [
    phase,
    fallback,
    selectedPage,
    requestedPage,
    index,
    presentation,
    route,
    tooltip,
  ]);
  const left = (
    <Metadata
      project={projects[spread.left]}
      index={spread.left}
      onRead={openRead}
      onPrevious={() => turn(-1)}
      canPrevious={true}
      onNext={() => turn(1)}
      canNext={true}
    />
  );
  const right = (
    <PreviewPage
      project={projects[spread.right]}
      index={spread.right}
      onRead={openRead}
      onNext={() => turn(1)}
      canNext={true}
      fallback={fallback}
    />
  );
  return (
    <main
      className={`spellbook ${fallback ? "is-fallback" : ""}`}
      data-presentation={presentation}
      data-view={view}
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
      <div
        className="scene-tools"
        role="group"
        aria-label="Scene controls"
        inert={view !== "book" ? true : undefined}
      >
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
          onClick={() => setSoundMuted(!soundMuted)}
          aria-label={soundMuted ? "Unmute page sounds" : "Mute page sounds"}
          aria-pressed={soundMuted}
          title={soundMuted ? "Unmute page sounds" : "Mute page sounds"}
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
            <path d="M11 4 6 8H3v8h3l5 4Z" />
            {soundMuted ? (
              <path d="m16 9 5 6m0-6-5 6" />
            ) : (
              <>
                <path d="M15 8a6 6 0 0 1 0 8" />
                <path d="M18 5a10 10 0 0 1 0 14" />
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
        rotation and return to the closed cover. Select a phone preview to enter
        its full case study.
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
        tabIndex={view === "book" ? 0 : -1}
        inert={view !== "book" ? true : undefined}
        aria-hidden={view !== "book" ? true : undefined}
      />
      {mounts && (
        <>
          {createPortal(left, mounts.left)}
          {createPortal(right, mounts.right)}
        </>
      )}
      {fallback && selectedPage >= 0 && selectedPage < projects.length && (
        <div
          className="fallback-book"
          inert={view !== "book" ? true : undefined}
          aria-hidden={view !== "book" ? true : undefined}
        >
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
      <nav
        className="book-navigation"
        aria-label="Zine pages"
        inert={view !== "book" ? true : undefined}
      >
        <div className="book-navigation-scroll" ref={navigation}>
          {[-1, ...projects.map((_, i) => i), projects.length].map((page) => (
            <button
              key={page}
              aria-current={requestedPage === page ? "page" : undefined}
              onClick={() => navigate(page)}
              disabled={presentation !== "ready" || (!mounts && !fallback)}
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
      {view === "book" && !galleryOpen && (
        <div
          className="miniature-access"
          role="group"
          aria-label="Miniature descriptions"
        >
          {Object.entries(miniatureDetails)
            .filter(
              ([, detail]) => detail.spread === projects[selectedPage]?.kind,
            )
            .map(([id, detail]) => (
              <button
                key={id}
                data-miniature-control={id}
                aria-describedby={
                  tooltip?.id === id ? "miniature-tooltip" : undefined
                }
                onFocus={() =>
                  setTooltip({ id, x: innerWidth / 2, y: innerHeight - 100 })
                }
                onBlur={() => setTooltip(null)}
                onClick={() => openMiniature(id)}
              >
                {detail.title}
              </button>
            ))}
        </div>
      )}
      {view === "book" && !galleryOpen && (
        <MiniatureTooltip item={tooltip} onClose={() => setTooltip(null)} />
      )}
      {galleryOpen && <FilmGallery onClose={closeGallery} />}
      {reading !== null && (
        <CaseStudy
          project={projects[reading]}
          onBack={closeRead}
          Media={PhoneFallback}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
