import React, { useRef, useState } from "react";
import { funFacts, pickFunFact } from "./fun-facts";
import { RotatingRole } from "./RotatingRole";
import { HeroCartridge } from "./HeroCartridge";
import { entrance } from "./entrance";

const words=text=>text.match(/\S+\s*/g)||[];
const parts=[
  ...words("based in California, building stuff on ").map(text=>({text})),
  {id:"search",text:"Google Search",punctuation:","},
  ...words("previously ").map(text=>({text})),
  {id:"gmail",text:"Gmail",punctuation:","},
  {id:"stadia",text:"Stadia",punctuation:","},
  {text:"& "},
  {id:"blizzard",text:"Blizzard",punctuation:"."},
];
const factStart=2+parts.length;
const count=factStart+Math.max(...funFacts.map(fact=>words(fact).length));
const delay=index=>({"--reveal-delay":`${entrance.introStart+index*entrance.introSpread/(count-1)}ms`});

export function Intro({active,onStatusChange}) {
  const [fact]=useState(pickFunFact);
  const [hovered,setHovered]=useState(null),[focused,setFocused]=useState(null),[pinned,setPinned]=useState(null);
  const pointer=useRef("mouse");
  const selected=hovered||focused||pinned;
  const reset=event=>{if(event.key==="Escape"){setHovered(null);setFocused(null);setPinned(null);event.preventDefault()}};
  return <div className="collection-intro" onKeyDown={reset}>
    <HeroCartridge id={selected} active={active} onStatusChange={onStatusChange}/>
    <h1 className="intro-title">
      <span data-reveal-gate className="portfolio-name intro-word" style={delay(0)}><span className="intro-name">Josh Lucas</span>,</span>{" "}
      <span data-reveal-gate className="role-entrance intro-word" style={delay(1)}><RotatingRole active={active}/></span>{" "}
      <span className="bio-continuation">{parts.map((part,index)=><React.Fragment key={index}>
        <span data-reveal-gate className="intro-word" style={delay(index+2)}>{part.id?<>
          <button type="button" className="hero-company" data-company={part.id} aria-label={`Show ${part.text} cartridge`} aria-controls="hero-cartridge" aria-pressed={selected===part.id}
            onPointerEnter={event=>{if(event.pointerType!=="touch"){setPinned(null);setHovered(part.id)}}}
            onPointerLeave={()=>setHovered(null)}
            onPointerDown={event=>{pointer.current=event.pointerType}}
            onFocus={event=>{if(event.target.matches(":focus-visible"))setFocused(part.id)}} onBlur={()=>setFocused(null)}
            onClick={()=>{if(pointer.current==="touch")setPinned(current=>current===part.id?null:part.id)}}>{part.text}</button>{part.punctuation}
        </>:part.text.trimEnd()}</span>{part.id&&part.punctuation!=="."?" ":part.text.slice(part.text.trimEnd().length)}
      </React.Fragment>)}</span>
    </h1>
    <p className="random-fact">{words(fact).map((word,index)=><React.Fragment key={index}><span data-reveal-gate className="intro-word" style={delay(factStart+index)}>{word.trimEnd()}</span>{word.slice(word.trimEnd().length)}</React.Fragment>)}</p>
  </div>;
}
