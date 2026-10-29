import React, { useState } from "react";
import { funFacts, pickFunFact } from "./fun-facts";
import { RotatingRole } from "./RotatingRole";

const BODY = "based in beautiful California, building fun things at Google.";
const words = (text) => text.match(/\S+\s*/g) || [];
const bodyStart = 2;
const factStart = bodyStart + words(BODY).length;
const count = factStart + Math.max(...funFacts.map((fact) => words(fact).length));
const delay = (index) => ({ "--reveal-delay": `${250 + index * 390 / (count - 1)}ms` });

function RevealWords({ text, start }) {
  return words(text).map((word, index) => {
    const value = word.trimEnd(), space = word.slice(value.length);
    return <React.Fragment key={index}><span className="intro-word" style={delay(start + index)}>{value}</span>{space}</React.Fragment>;
  });
}

export function Intro({ active }) {
  const [fact] = useState(pickFunFact);
  const [expandedName, setExpandedName] = useState(false);
  return <div className="collection-intro">
    <h1 className="intro-title"><span className="portfolio-name intro-word" style={delay(0)}><span className="intro-muted">I'm</span>{" "}<button className="intro-name" aria-label={expandedName ? "Josh Lucas, show short name" : "Josh, show full name"} aria-expanded={expandedName} onClick={() => setExpandedName(value => !value)}><span>Josh</span><span className="name-surname" aria-hidden={!expandedName}><span> Lucas</span></span></button>,{" "}<span className="intro-muted">a</span></span>{" "}<span className="role-entrance intro-word" style={delay(1)}><RotatingRole active={active} /></span>{" "}<span className="bio-continuation"><RevealWords text={BODY} start={bodyStart} /></span></h1>
    <p className="random-fact"><RevealWords text={fact} start={factStart} /></p>
  </div>;
}
