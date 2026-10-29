import React, { useEffect, useRef, useState } from "react";
import { funFacts, pickFunFact } from "./fun-facts";

const DETAILS = ", currently making things for fun at Google.";
const BODY = "I'm a systems thinker with a knack for micro interactions and finer details. I like figuring out what should exist, what it should feel like, and how to make it happen.";
const words = (text) => text.match(/\S+\s*/g) || [];
const bodyStart = 2 + words(DETAILS).length;
const factStart = bodyStart + words(BODY).length;
const count = factStart + Math.max(...funFacts.map((fact) => words(fact).length));
const delay = (index) => ({ "--reveal-delay": `${250 + index * 390 / (count - 1)}ms` });

function RevealWords({ text, start }) {
  return words(text).map((word, index) => {
    const value = word.trimEnd(), space = word.slice(value.length);
    return <React.Fragment key={index}><span className="intro-word" style={delay(start + index)}>{value}</span>{space}</React.Fragment>;
  });
}

function AnimatedName() {
  const [expanded, setExpanded] = useState(false);
  const button = useRef(null);
  useEffect(() => {
    let alive = true;
    const measure = () => {
      if (!alive || !button.current) return;
      button.current.querySelectorAll(".name-extension").forEach((el) => {
        el.style.setProperty("--extension-width", `${el.firstElementChild.getBoundingClientRect().width}px`);
      });
    };
    measure(); document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { alive = false; window.removeEventListener("resize", measure); };
  }, []);
  return <button ref={button} className="name-toggle" data-expanded={expanded} aria-expanded={expanded}
    aria-label={expanded ? "Joshua Lucas, show short name" : "Josh, show full name"}
    onClick={() => setExpanded((value) => !value)}>
    <span aria-hidden="true">Josh</span><span aria-hidden="true" className="name-extension name-given"><span>ua</span></span><span aria-hidden="true" className="name-extension name-surname"><span> Lucas</span></span>
  </button>;
}

export function Intro() {
  const [fact] = useState(pickFunFact);
  return <div className="collection-intro">
    <h1><span className="intro-word" style={delay(0)}>I'm</span>{" "}<span className="intro-word" style={delay(1)}><AnimatedName /></span><RevealWords text={DETAILS} start={2} /></h1>
    <p className="bio-details"><RevealWords text={BODY} start={bodyStart} /></p>
    <p className="random-fact"><RevealWords text={fact} start={factStart} /></p>
  </div>;
}
