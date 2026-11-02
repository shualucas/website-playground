import React, { useState } from "react";
import { funFacts, pickFunFact } from "./fun-facts";
import { RotatingRole } from "./RotatingRole";
import { entrance } from "./entrance";

const BODY = "based in California, building stuff at Google.";
const words = (text) => text.match(/\S+\s*/g) || [];
const bodyStart = 2;
const factStart = bodyStart + words(BODY).length;
const count = factStart + Math.max(...funFacts.map((fact) => words(fact).length));
const delay = (index) => ({ "--reveal-delay": `${entrance.introStart + index * entrance.introSpread / (count - 1)}ms` });

function RevealWords({ text, start, linkGoogle = false }) {
  return words(text).map((word, index) => {
    const value = word.trimEnd(), space = word.slice(value.length);
    return <React.Fragment key={index}><span data-reveal-gate className="intro-word" style={delay(start + index)}>{linkGoogle && value === "Google." ? <><a className="hero-google-link" href="https://google.ai" target="_blank" rel="noopener noreferrer" aria-label="Google (opens in a new tab)">{[..."Google"].map((letter, i) => <span key={i} style={{ "--letter": i }}>{letter}</span>)}</a>.</> : value}</span>{space}</React.Fragment>;
  });
}

export function Intro({ active }) {
  const [fact] = useState(pickFunFact);
  return <div className="collection-intro">
    <h1 className="intro-title"><span data-reveal-gate className="portfolio-name intro-word" style={delay(0)}><span className="intro-muted">I'm</span>{" "}<span className="intro-name">Josh</span>,{" "}<span className="intro-muted">a</span></span>{" "}<span data-reveal-gate className="role-entrance intro-word" style={delay(1)}><RotatingRole active={active} /></span>{" "}<span className="bio-continuation"><RevealWords text={BODY} start={bodyStart} linkGoogle /></span></h1>
    <p className="random-fact"><RevealWords text={fact} start={factStart} /></p>
  </div>;
}
