const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
let masks;
export function inkStampFrames(entering=true){
 masks??=Array.from({length:9},(_,step)=>{
  let pixels='';
  for(let y=0;y<12;y++)for(let x=0;x<12;x++){
   const radius=Math.hypot(x-5.5,y-5.5),edge=5.1+Math.sin(x*2+y*1.1)*.4,density=.8-radius*.052;
   if(radius<edge&&(bayer[y%4*4+x%4]+.5)/16<density*step/8)pixels+=`<rect x="${x}" y="${y}" width="1" height="1" fill="white"/>`;
  }
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" shape-rendering="crispEdges">${pixels}</svg>`)}")`;
 });
 return (entering?masks:[...masks].reverse()).map((maskImage,i)=>({maskImage,webkitMaskImage:maskImage,transform:`rotate(-7deg) scale(${entering?1.16-.16*i/8:1})`}));
}

const impressions=new Map();
/** A worn printing plate: solid through the type, porous around its edges. */
export function inkImpressionFrames(width,height,entering=true){
 const w=Math.ceil(width/1.5),h=Math.ceil(height/1.5),key=w+':'+h;
 let frames=impressions.get(key);
 if(!frames){
  frames=Array.from({length:9},(_,step)=>{
   let pixels='';
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const edge=Math.min(x+.5,w-x-.5,y+.5,h-y-.5),seed=Math.sin(x*127.1+y*311.7)*43758.5453;
    const density=edge>2?.99:Math.min(.99,.22+edge*.28+(seed-Math.floor(seed))*.22);
    if((bayer[y%4*4+x%4]+.5)/16<density*step/8)pixels+=`<rect x="${x}" y="${y}" width="1" height="1" fill="white"/>`;
   }
   return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" shape-rendering="crispEdges">${pixels}</svg>`)}")`;
  });
  impressions.set(key,frames);
 }
 return (entering?frames:[...frames].reverse()).map(maskImage=>({maskImage,webkitMaskImage:maskImage}));
}
