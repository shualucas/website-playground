import { flyerPage } from "./flyers";

export const coverDesigns = [
  { id:"blue-ink", src:"/zines/covers/extracurriculars-blue-ink.jpg", stock:"#709de0" },
  { id:"blue-pink", src:"/zines/covers/extracurriculars-blue-pink.jpg", stock:"#709de0" },
  { id:"red-pink", src:"/zines/covers/extracurriculars-red-pink.jpg", stock:"#f03838" },
];
const HOLD=8, FADE=.4, LAST_KEY="extracurricular-cover";
function canvas(){const c=document.createElement("canvas");c.width=flyerPage.width;c.height=flyerPage.height;c.dataset.sourceCover="true";return c}

/** Shuffled original artwork, sharing the book clock; reading and turning pause changes. */
export async function prepareFlyerCovers(random=Math.random) {
  const images=await Promise.all(coverDesigns.map(async design=>{const image=new Image();image.src=design.src;await image.decode();return image}));
  const front=canvas(),back=canvas(),ctx=front.getContext("2d"),reverse=back.getContext("2d");
  let previous;try{previous=sessionStorage.getItem(LAST_KEY)}catch{}
  const shuffle=()=>{
    const deck=coverDesigns.map((_,i)=>i);
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
    if(coverDesigns[deck[0]].id===previous)[deck[0],deck[1]]=[deck[1],deck[0]];
    return deck;
  };
  let deck=shuffle(),selected=deck.shift(),from=selected,elapsed=0,blend=1,lastTime=null,lastBucket=-1,dirtyFront=false,dirtyBack=false;
  const remember=()=>{previous=coverDesigns[selected].id;try{sessionStorage.setItem(LAST_KEY,previous)}catch{}};
  function draw(amount=1){
    ctx.globalAlpha=1;ctx.drawImage(images[from],0,0,front.width,front.height);
    if(amount>0){ctx.globalAlpha=amount;ctx.drawImage(images[selected],0,0,front.width,front.height);ctx.globalAlpha=1}
    reverse.globalAlpha=1;reverse.fillStyle=coverDesigns[from].stock;reverse.fillRect(0,0,back.width,back.height);
    reverse.globalAlpha=amount;reverse.fillStyle=coverDesigns[selected].stock;reverse.fillRect(0,0,back.width,back.height);reverse.globalAlpha=1;
    front.dataset.coverId=back.dataset.coverId=coverDesigns[selected].id;
    front.dataset.frame=String(Math.round(amount*12));dirtyFront=dirtyBack=true;
  }
  remember();draw();dirtyFront=dirtyBack=false;
  return {front,back,update(time,isBack,reduced,closed=true){
    const delta=lastTime===null||time<lastTime?0:Math.min(.25,time-lastTime);lastTime=time;
    if(reduced||!closed){
      elapsed=0;
      // Finish an interrupted crossfade before the printed cover begins turning.
      if(blend<1){blend=1;draw()}
    }else{
      elapsed+=delta;
      if(blend<1){
        blend=Math.min(1,blend+delta/FADE);const bucket=Math.round(blend*12);
        if(bucket!==lastBucket){lastBucket=bucket;draw(bucket/12)}
      }else if(elapsed>=HOLD){
        elapsed=0;from=selected;if(!deck.length)deck=shuffle();selected=deck.shift();remember();blend=0;lastBucket=0;draw(0);
      }
    }
    const changed=isBack?dirtyBack:dirtyFront;
    if(isBack)dirtyBack=false;else dirtyFront=false;
    return changed;
  }};
}
