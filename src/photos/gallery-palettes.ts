// Five families already used across the portfolio. The canvas background stays neutral.
export const galleryPalettes=[
 ['#0b0c0b','#30332f','#777b73','#bdc2b5','#f0f0eb'],
 ['#121b3e','#29468e','#577bd3','#93b5ed','#d9e7ff'],
 ['#32133e','#72276f','#bd52a7','#df9cce','#ffe0ef'],
 ['#301b13','#85452c','#d37c48','#eeb483','#ffe6c6'],
 ['#102d27','#2d6951','#69a174','#b1d3a1','#e8f1cd'],
 ['#302613','#806727','#c8a34d','#e6d194','#fff0c8'],
];
const channels=(hex:string)=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255);
const luma=(c:number[])=>c[0]*.299+c[1]*.587+c[2]*.114;
/** Keep the image's light-to-dark order while tinting with an extracted palette. */
export function photoRamp(colors:string[],accent:string){
 const tint=channels(accent),sorted=colors.map(channels).sort((a,b)=>luma(a)-luma(b));
 return sorted.map((rgb,i)=>{
  const mixed=rgb.map((v,c)=>v*.8+tint[c]*.2),value=luma(mixed),target=[.06,.24,.46,.7,.94][i];
  const toned=value>target?mixed.map(v=>v*target/Math.max(.001,value)):mixed.map(v=>v+(1-v)*(target-value)/Math.max(.001,1-value));
  return '#'+toned.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
 });
}
