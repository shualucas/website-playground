import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { chapters, studySections } from "./chapters.js";
import "./journey.css";
const MapScene = lazy(() => import("./MapScene.jsx"));

function Arrow() {
  return (
    <svg
      className="arrow-icon"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M3 13 13 3M3 3h10v10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function useJourney() {
  const [metrics, setMetrics] = useState(() => ({
    progress: Math.min(chapters.length - 1, scrollY / innerHeight),
    height: innerHeight,
  }));
  useEffect(() => {
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setMetrics({
          progress: Math.max(
            0,
            Math.min(chapters.length - 1, scrollY / innerHeight),
          ),
          height: innerHeight,
        }),
      );
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);
  return metrics;
}
function Cursor() {
  const ref = useRef(null);
  useEffect(() => {
    const move = (e) => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${e.clientX - 8}px,${e.clientY - 8}px,0)`;
        ref.current.style.opacity = "1";
      }
    };
    const leave = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);
  return <div className="cursor-ring" ref={ref} aria-hidden="true" />;
}
function RichText({ text, accent, progress }) {
  const start = text.indexOf(accent);
  const before = text.slice(0, start),
    after = text.slice(start + accent.length);
  return (
    <p className="chapter-description" style={{ "--read-progress": progress }}>
      {start >= 0 ? (
        <>
          {before}
          <span className="word-accent">{accent}</span>
          {after}
        </>
      ) : (
        text
      )}
    </p>
  );
}
function Study({ chapter, onClose }) {
  const dialog = useRef(null),
    [section, setSection] = useState(0);
  useEffect(() => {
    dialog.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  const part = studySections[section];
  return (
    <dialog
      ref={dialog}
      className="study-dialog"
      aria-labelledby="study-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="study-inner">
        <div className="study-top">
          <span>josh lucas / {chapter.label}</span>
          <button aria-label="Close case study" onClick={onClose}>
            close <span>×</span>
          </button>
        </div>
        <span className="placeholder-label">
          case study scaffold · content to come
        </span>
        <h2 id="study-title">{chapter.title}</h2>
        <p className="study-intro">
          A place for a real story, told clearly. The content below is a
          structure to fill with your actual work.
        </p>
        <nav aria-label="Case study chapters">
          {studySections.map(([name], i) => (
            <button
              key={name}
              onClick={() => setSection(i)}
              aria-current={i === section ? "step" : undefined}
            >
              <span>0{i + 1}</span>
              {name}
            </button>
          ))}
        </nav>
        <article key={section}>
          <span className="study-chapter-label">
            chapter 0{section + 1} / 05
          </span>
          <h3>{part[1]}</h3>
          <p>{part[2]}</p>
          <div className="study-evidence">
            <span>+</span>
            <div>
              the evidence belongs here
              <small>
                interfaces, sketches, research, and the thinking in between.
              </small>
            </div>
          </div>
          <div className="study-pagination">
            <span>one clear story, five chapters.</span>
            <button onClick={() => setSection((section + 1) % 5)}>
              {section === 4 ? "back to the context" : "next chapter"}{" "}
              <span>→</span>
            </button>
          </div>
        </article>
      </div>
    </dialog>
  );
}
function Index({ onClose, onNavigate }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      className="index-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="index-title"
    >
      <div className="study-top">
        <span id="index-title">a small index</span>
        <button onClick={onClose} aria-label="Close index">
          close ×
        </button>
      </div>
      <nav aria-label="All chapters">
        {chapters.map((c, i) => (
          <button
            key={c.id}
            onClick={() => {
              onNavigate(i);
              onClose();
            }}
          >
            <span>0{i + 1}</span>
            <span>{c.title}</span>
            <span>
              <Arrow />
            </span>
          </button>
        ))}
      </nav>
      <p>an evolving portfolio. the project stories are placeholders.</p>
    </dialog>
  );
}
function App() {
  const { progress, height } = useJourney(),
    active = Math.min(chapters.length - 1, Math.round(progress)),
    chapter = chapters[active];
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [sceneReady, setSceneReady] = useState(false),
    [sceneMode, setSceneMode] = useState("loading"),
    [study, setStudy] = useState(null),
    [index, setIndex] = useState(false);
  const timeline = useRef(null),
    [fullText, setFullText] = useState(false);
  const ready = useCallback((mode) => {
    setSceneReady(true);
    setSceneMode(mode);
  }, []);
  const navigate = useCallback(
    (i) => {
      window.scrollTo({
        top: i * innerHeight,
        behavior: reducedMotion ? "instant" : "smooth",
      });
    },
    [reducedMotion],
  );
  useEffect(() => {
    const onKey = (e) => {
      if (
        study ||
        index ||
        ["BUTTON", "A", "INPUT", "TEXTAREA"].includes(e.target.tagName)
      )
        return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        navigate(Math.min(chapters.length - 1, active + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigate(Math.max(0, active - 1));
      }
      if (e.key === "Home") {
        e.preventDefault();
        navigate(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        navigate(chapters.length - 1);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [active, navigate, study, index]);
  useEffect(() => {
    setFullText(false);
    const button = timeline.current?.children[active];
    if (button && timeline.current.scrollWidth > timeline.current.clientWidth) {
      timeline.current.scrollTo({
        left:
          button.offsetLeft -
          timeline.current.clientWidth / 2 +
          button.offsetWidth / 2,
        behavior: reducedMotion ? "instant" : "smooth",
      });
    }
  }, [active, reducedMotion]);
  const transition = 1 - Math.min(0.75, Math.abs(progress - active) * 1.6);
  return (
    <>
      <a className="skip-link" href="#narrative">
        skip to the story
      </a>
      <div
        className={`journey-view ${sceneReady ? "scene-ready" : ""}`}
        data-scene={sceneMode}
      >
        <Suspense fallback={<div className="map-loading" />}>
          <MapScene
            progress={progress}
            reducedMotion={reducedMotion}
            onReady={ready}
          />
        </Suspense>
        <div className="map-wash" aria-hidden="true" />
        <div className="map-grain" aria-hidden="true" />
        <header className="journey-header">
          <span className="header-whisper">an evolving story</span>
          <button className="name-link" onClick={() => navigate(0)}>
            josh lucas
          </button>
          <button className="index-toggle" onClick={() => setIndex(true)}>
            index <Arrow />
          </button>
        </header>
        <main id="narrative" className="narrative-position" tabIndex={-1}>
          <article
            className="narrative"
            key={chapter.id}
            aria-labelledby="chapter-title"
            style={{
              opacity: transition,
              transform: `translateY(${(progress - active) * -12}px)`,
            }}
            data-chapter={chapter.id}
          >
            <h1 id="chapter-title">{chapter.title}</h1>
            <div className={`description-wrap ${fullText ? "full-text" : ""}`}>
              <RichText
                text={chapter.body}
                accent={chapter.accent}
                progress={progress - active}
              />
            </div>
            <p className="chapter-note">{chapter.note}</p>
            <div className="chapter-actions">
              {chapter.kind === "project" && (
                <button
                  className="quiet-link"
                  onClick={() => setStudy(chapter)}
                >
                  open case study <Arrow />
                </button>
              )}
              {chapter.kind === "experiment" && (
                <a className="quiet-link" href="/pond.html">
                  visit the frog pond <Arrow />
                </a>
              )}
              {chapter.kind === "contact" && (
                <a
                  className="quiet-link"
                  href="https://joshglucas.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  visit my current portfolio <Arrow />
                </a>
              )}
              {chapter.kind === "intro" && (
                <button className="quiet-link" onClick={() => navigate(1)}>
                  explore the work <span aria-hidden="true">↓</span>
                </button>
              )}
              <button
                className="read-toggle"
                onClick={() => setFullText(!fullText)}
                aria-pressed={fullText}
              >
                {fullText ? "soften text" : "reveal text"}
              </button>
            </div>
          </article>
        </main>
        <div className="journey-bottom">
          <button
            className="motion-button"
            onClick={() => setReducedMotion(!reducedMotion)}
            aria-pressed={reducedMotion}
            aria-label="Reduce camera motion"
          >
            motion {reducedMotion ? "reduced" : "on"}
          </button>
          <nav
            className="chapter-timeline"
            aria-label="Journey timeline"
            ref={timeline}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const next = Math.max(
                  0,
                  Math.min(
                    chapters.length - 1,
                    active + (e.key === "ArrowRight" ? 1 : -1),
                  ),
                );
                navigate(next);
                timeline.current?.children[next]?.focus();
              }
            }}
          >
            {chapters.map((c, i) => (
              <button
                key={c.id}
                onClick={() => navigate(i)}
                aria-current={active === i ? "step" : undefined}
                aria-label={`Chapter ${i + 1}: ${c.label}`}
              >
                <span className="timeline-dot" />
                {c.label}
              </button>
            ))}
          </nav>
          <button
            className="scroll-prompt"
            onClick={() =>
              navigate(active === chapters.length - 1 ? 0 : active + 1)
            }
          >
            {active === 0
              ? "scroll to start"
              : active === chapters.length - 1
                ? "back to start"
                : "keep exploring"}{" "}
            <span aria-hidden="true">
              {active === chapters.length - 1 ? "↑" : "↓"}
            </span>
          </button>
        </div>
        <div className="journey-progress" aria-hidden="true">
          <span
            style={{ transform: `scaleX(${progress / (chapters.length - 1)})` }}
          />
        </div>
        <span className="sr-only" aria-live="polite">
          Chapter {active + 1} of {chapters.length}: {chapter.title}
        </span>
      </div>
      <div
        className="scroll-space"
        aria-hidden="true"
        style={{ height: `${chapters.length * height}px` }}
      />
      <Cursor />
      {study && <Study chapter={study} onClose={() => setStudy(null)} />}{" "}
      {index && <Index onClose={() => setIndex(false)} onNavigate={navigate} />}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
