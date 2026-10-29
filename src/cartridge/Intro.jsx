import React, { useState } from "react";
import { funFacts, pickFunFact } from "./fun-facts";
import { RotatingRole } from "./RotatingRole";

const BODY = "I'm a systems thinker with a knack for micro interactions and finer details. I like figuring out what should exist, what it should feel like, and how to make it happen.";
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
  return <div className="collection-intro">
    <h1 className="intro-title"><span className="portfolio-name intro-word" style={delay(0)}>I'm Josh, a</span>{" "}<RotatingRole active={active} /></h1>
    <p className="bio-details"><RevealWords text={BODY} start={bodyStart} /></p>
    <p className="random-fact"><RevealWords text={fact} start={factStart} /></p>
  </div>;
}
