/** Stable imperfections: each note keeps its own hand across redraws and visits. */
function noise(id:string,index:number,salt:string) {
  let hash=2166136261;
  for(const char of `${id}:${index}:${salt}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return (hash>>>0)/4294967295;
}

export function handwrittenWord(id:string,index:number) {
  return {
    baseline:(noise(id,index,"baseline")-.5)*.12,
    angle:(noise(id,index,"angle")-.5)*2.2,
    stretch:.98+noise(id,index,"stretch")*.045,
    gap:(noise(id,index,"gap")-.4)*.075,
    ink:.9+noise(id,index,"ink")*.09,
  };
}

export function handwrittenLine(id:string,firstWord:number) {
  return {
    slope:(noise(id,firstWord,"slope")-.5)*.025,
    offset:(noise(id,firstWord,"offset")-.5)*.16,
    indent:(noise(id,firstWord,"indent")-.5)*.12,
    leading:1.22+(noise(id,firstWord,"leading")-.5)*.09,
  };
}

/** The small 3D texture uses the same word/line character as the readable note. */
export function drawHandwrittenNote(ctx:CanvasRenderingContext2D,text:string,id:string) {
  const words=text.trim().split(/\s+/).filter(Boolean);
  type Word={text:string;index:number;width:number;mark:ReturnType<typeof handwrittenWord>};
  let lines:Word[][]=[],size=22;
  for(;size>=16;size--){
    ctx.font=`400 ${size}px "Caveat",cursive`;
    lines=[];let line:Word[]=[],width=0;
    words.forEach((text,index)=>{
      const mark=handwrittenWord(id,index),wordWidth=ctx.measureText(text).width;
      const advance=wordWidth*mark.stretch+ctx.measureText(" ").width+mark.gap*size;
      if(line.length&&width+advance>202){lines.push(line);line=[];width=0}
      line.push({text,index,width:advance,mark});width+=advance;
    });
    if(line.length)lines.push(line);
    if((lines.length-1)*size*1.27+size*.3<=204||size===16)break;
  }
  ctx.save();ctx.fillStyle="#39312b";
  let y=36;
  for(const words of lines){
    const line=handwrittenLine(id,words[0].index);let x=25+line.indent*size;
    for(const word of words){
      ctx.save();ctx.globalAlpha=word.mark.ink;
      ctx.translate(x,y+(word.mark.baseline+line.offset)*size+line.slope*(x-128));
      ctx.rotate(word.mark.angle*Math.PI/180+Math.atan(line.slope));ctx.scale(word.mark.stretch,1);
      ctx.fillText(word.text,0,0);ctx.restore();x+=word.width;
    }
    y+=size*line.leading;
  }
  ctx.restore();
}
