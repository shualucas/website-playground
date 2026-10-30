import React, { useLayoutEffect, useRef } from "react";
import { handwrittenLine, handwrittenWord } from "../content/handwriting";

/** Real text stays selectable and readable by assistive technology. */
export function HandwrittenText({ text, noteId, expressive = false }) {
  const body=useRef(null);
  useLayoutEffect(()=>{
    const element=body.current;let alive=true;
    const arrange=()=>{
      if(!alive||!element.clientWidth)return;
      const words=[...element.querySelectorAll(".handwritten-word")];
      const positions=words.map(word=>({top:word.offsetTop,left:word.offsetLeft,index:Number(word.dataset.word)}));
      const size=parseFloat(getComputedStyle(element).fontSize),width=element.clientWidth;
      let top=-Infinity,line=null;
      words.forEach((word,index)=>{
        const position=positions[index];
        if(Math.abs(position.top-top)>4){top=position.top;line=handwrittenLine(noteId,position.index,expressive)}
        word.style.setProperty("--line-drift",`${line.offset*size+line.slope*(position.left-width/2)}px`);
        word.style.setProperty("--line-angle",`${Math.atan(line.slope)*180/Math.PI}deg`);
        word.style.setProperty("--line-indent",`${line.indent*size}px`);
      });
    };
    const observer=new ResizeObserver(arrange);observer.observe(element);
    arrange();document.fonts.ready.then(arrange).catch(()=>{});
    return ()=>{alive=false;observer.disconnect()};
  },[text,noteId,expressive]);
  let index=0;
  return <p id="zine-note-body" ref={body} className="handwritten-body">{text.split(/(\s+)/).map((token,key)=>{
    if(!token.trim())return token;
    const word=index++,mark=handwrittenWord(noteId,word,expressive);
    return <span className="handwritten-word" data-word={word} key={key} style={{
      "--word-drift":`${mark.baseline}em`,"--word-angle":`${mark.angle}deg`,"--word-stretch":mark.stretch,
      marginInlineEnd:`${mark.gap}em`,opacity:mark.ink,
    }}>{token}</span>;
  })}</p>;
}
