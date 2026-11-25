import React, { useRef, useState } from "react";
import { funFacts, pickFunFact } from "./fun-facts";
import { RotatingRole } from "./RotatingRole";
import { HeroCartridge } from "./HeroCartridge";
import { entrance } from "./entrance";

const words=text=>text.match(/\S+\s*/g)||[];
const lines=[[
  ...words("AI Mode at ").map(text=>({text})),
  {id:"search",text:"Google"},
],[
  {text:"Previously "},
  {id:"stadia",text:"Stadia",punctuation:","},
  {id:"gmail",text:"Gmail",punctuation:","},
  {text:"& "},
  {id:"blizzard",text:"Blizzard",punctuation:"."},
]];
const factStart=2+lines.flat().length;
const count=factStart+Math.max(...funFacts.map(fact=>words(fact).length));
const delay=index=>({"--reveal-delay":`${entrance.introStart+index*entrance.introSpread/(count-1)}ms`});

export function Intro({active,previewColor,onStatusChange,onAbout,aboutExiting=false}) {
  const [fact]=useState(pickFunFact);
  const [aboutHovered,setAboutHovered]=useState(false),[aboutFocused,setAboutFocused]=useState(false);
  const aboutSpotlight=aboutHovered||aboutFocused||aboutExiting;
  const [hovered,setHovered]=useState(null),[focused,setFocused]=useState(null),[pinned,setPinned]=useState(null);
  const pointer=useRef("mouse");
  const selected=hovered||focused||pinned;
  const reset=event=>{if(event.key==="Escape"){setHovered(null);setFocused(null);setPinned(null);event.preventDefault()}};
  return <div className="collection-intro" data-about-spotlight={aboutSpotlight} onKeyDown={reset}>
    <HeroCartridge aboutMotion={aboutExiting?'exit':aboutSpotlight?'hover':'idle'} id={selected} active={active} previewColor={previewColor} onStatusChange={onStatusChange}/>
    <h1 className="intro-title">
      <span className="intro-line intro-identity">
        <span data-reveal-gate className="portfolio-name intro-word" style={delay(0)}><span className="intro-name">Josh Lucas</span>,</span>{" "}
        <span data-reveal-gate className="role-entrance intro-word" style={delay(1)}><RotatingRole active={active}/></span>
      </span>
      <span className="bio-continuation">{lines.map((parts,line)=><React.Fragment key={line}>
        {line>0&&" "}<span className="intro-line">{parts.map((part,index)=><React.Fragment key={index}>
        <span data-reveal-gate className="intro-word" style={delay(index+2+(line?lines[0].length:0))}>{part.id?<>
          <button type="button" className="hero-company" data-company={part.id} aria-label={`Show ${part.text} cartridge`} aria-controls="hero-cartridge" aria-pressed={selected===part.id}
            onPointerEnter={event=>{if(event.pointerType!=="touch"){setPinned(null);setHovered(part.id)}}}
            onPointerLeave={()=>setHovered(null)}
            onPointerDown={event=>{pointer.current=event.pointerType}}
            onFocus={event=>{if(event.target.matches(":focus-visible"))setFocused(part.id)}} onBlur={()=>setFocused(null)}
            onClick={()=>{if(pointer.current==="touch")setPinned(current=>current===part.id?null:part.id)}}>{part.text}</button>{part.punctuation}
        </>:part.text.trimEnd()}</span>{part.id&&part.punctuation!=="."?" ":part.text.slice(part.text.trimEnd().length)}
      </React.Fragment>)}</span></React.Fragment>)}</span>
    </h1>
    <p className="random-fact">
      {words("A fun fact ").map((word,index)=><React.Fragment key={index}><span data-reveal-gate className="intro-word" style={delay(factStart+index)}>{word.trimEnd()}</span>{" "}</React.Fragment>)}
      <span data-reveal-gate className="intro-word about-link-word" style={delay(factStart+3)}><button type="button" className="about-link about-inline about-return-anchor" onPointerEnter={event=>{if(event.pointerType!=='touch')setAboutHovered(true)}} onPointerLeave={()=>setAboutHovered(false)} onFocus={event=>{if(event.target.matches(':focus-visible'))setAboutFocused(true)}} onBlur={()=>setAboutFocused(false)} onClick={onAbout}>about me</button><span className="about-fact-colon">:</span></span>{" "}
      {words(fact.split("about me: ")[1]).map((word,index)=><React.Fragment key={index}><span data-reveal-gate className="intro-word" style={delay(factStart+5+index)}>{word.trimEnd()}</span>{word.slice(word.trimEnd().length)}</React.Fragment>)}
    </p>
  </div>;
}
