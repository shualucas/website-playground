// Small repeating alpha masks shared by the scene fallback and the viewer.
const order=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const masks=Array.from({length:17},(_,level)=>{
 const pixels=order.map((rank,i)=>rank<level?`<rect x="${i%4}" y="${Math.floor(i/4)}" width="1" height="1" fill="white"/>`:'').join('');
 return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4">${pixels}</svg>`)}")`;
});
export const ditherMask=(amount:number)=>masks[Math.max(0,Math.min(16,Math.round(amount*16)))];
export function ditherAnimation(node:HTMLElement,show:boolean,{duration=400}={}){
 const frames=Array.from({length:17},(_,i)=>({maskImage:masks[show?i:16-i],webkitMaskImage:masks[show?i:16-i]}));
 return node.animate(frames,{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:duration,easing:'linear',fill:'both'});
}
