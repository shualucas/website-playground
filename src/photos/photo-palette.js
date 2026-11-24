/** Weighted median cut on a small image sample. All five colors come from the photo. */
export function extractPalette(pixels,count=5){
 const histogram=new Map();
 for(let i=0;i<pixels.length;i+=4){
  if(pixels[i+3]<128)continue;
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2],key=(r>>4)*256+(g>>4)*16+(b>>4);
  const bin=histogram.get(key)||{r:0,g:0,b:0,n:0};bin.r+=r;bin.g+=g;bin.b+=b;bin.n++;histogram.set(key,bin);
 }
 const colors=[...histogram.values()].map(c=>({r:c.r/c.n,g:c.g/c.n,b:c.b/c.n,n:c.n}));if(!colors.length)return [];
 const describe=items=>{
  const ranges=['r','g','b'].map(channel=>({channel,range:Math.max(...items.map(c=>c[channel]))-Math.min(...items.map(c=>c[channel]))})).sort((a,b)=>b.range-a.range);
  return {items,channel:ranges[0].channel,score:ranges[0].range*Math.sqrt(items.reduce((n,c)=>n+c.n,0))};
 };
 const boxes=[describe(colors)];
 while(boxes.length<count){
  const split=boxes.filter(box=>box.items.length>1).sort((a,b)=>b.score-a.score)[0];if(!split)break;
  const sorted=[...split.items].sort((a,b)=>a[split.channel]-b[split.channel]),half=sorted.reduce((n,c)=>n+c.n,0)/2;
  let sum=0,cut=1;for(let i=0;i<sorted.length-1;i++){sum+=sorted[i].n;cut=i+1;if(sum>=half)break}
  boxes.splice(boxes.indexOf(split),1,describe(sorted.slice(0,cut)),describe(sorted.slice(cut)));
 }
 return boxes.map(({items})=>{
  const n=items.reduce((sum,c)=>sum+c.n,0);return ['r','g','b'].map(channel=>Math.round(items.reduce((sum,c)=>sum+c[channel]*c.n,0)/n));
 }).sort((a,b)=>(a[0]*.299+a[1]*.587+a[2]*.114)-(b[0]*.299+b[1]*.587+b[2]*.114)).map(rgb=>'#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join(''));
}
const cache=new Map();
export function photoPalette(image){
 const key=image.currentSrc||image.src;if(cache.has(key))return cache.get(key);
 const pending=(async()=>{
  await image.decode();if((image.currentSrc||image.src)!==key)throw new Error('Photograph changed during decode');const canvas=document.createElement('canvas');canvas.width=96;canvas.height=Math.max(1,Math.round(96*image.naturalHeight/image.naturalWidth));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return [];
  ctx.drawImage(image,0,0,canvas.width,canvas.height);return extractPalette(ctx.getImageData(0,0,canvas.width,canvas.height).data);
 })().catch(()=>{cache.delete(key);return []});cache.set(key,pending);return pending;
}
