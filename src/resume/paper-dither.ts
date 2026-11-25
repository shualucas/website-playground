const order=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export const paperDitherRank=`
 float paperRank(vec2 pixel,float size){
  vec2 cell=mod(floor(pixel/size),4.);
  vec4 row=cell.y<1.?vec4(0.,8.,2.,10.):cell.y<2.?vec4(12.,4.,14.,6.):cell.y<3.?vec4(3.,11.,1.,9.):vec4(15.,7.,13.,5.);
  return ((cell.x<1.?row.x:cell.x<2.?row.y:cell.x<3.?row.z:row.w)+.5)/16.;
 }
 float paperHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
`;
// Match the photos' nine tonal steps and gentle grain, retaining opaque paper.
export const paperDitherFragment=`
 vec2 paperCell=floor(gl_FragCoord.xy/paperPixel);
 float paperLuma=clamp(dot(gl_FragColor.rgb,vec3(.299,.587,.114)),0.,1.);
 float paperGrain=(paperHash(paperCell+floor(paperTime*24.))-.5)*.035*(.6+paperLuma);
 float paperThreshold=mix(.5,paperRank(gl_FragCoord.xy,paperPixel),.9);
 gl_FragColor.rgb=clamp(floor((gl_FragColor.rgb+paperGrain)*9.+paperThreshold)/9.,0.,1.);
`;

/** Static ordered pixels for browsers without WebGL. The existing sheet owns motion. */
export function createPaperDitherFallback(host:HTMLElement){
 const image=host.querySelector<HTMLImageElement>('.resume-artwork img')!;
 const canvas=document.createElement('canvas');canvas.className='resume-dither-fallback';canvas.setAttribute('aria-hidden','true');
 canvas.width=Math.min(1200,image.naturalWidth);canvas.height=Math.round(canvas.width*image.naturalHeight/image.naturalWidth);
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return()=>{};
 const paint=()=>{
  context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),cell=Math.max(1,Math.round(canvas.width/host.clientWidth*Math.max(1,innerHeight/360)));
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const i=(y*canvas.width+x)*4,luma=(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114)/255;
   const px=Math.floor(x/cell),py=Math.floor(y/cell),seed=Math.sin(px*127.1+py*311.7)*43758.5453,grain=(seed-Math.floor(seed)-.5)*.035*(.6+luma),threshold=.5*.1+(order[py%4*4+px%4]+.5)/16*.9;
   for(let channel=0;channel<3;channel++)pixels.data[i+channel]=Math.max(0,Math.min(255,Math.floor((pixels.data[i+channel]/255+grain)*9+threshold)/9*255));
  }
  context.putImageData(pixels,0,0);
 };
 paint();host.querySelector('.resume-artwork')!.append(canvas);host.dataset.renderStyle='dither';
 const size=new ResizeObserver(paint);size.observe(host);
 return()=>{size.disconnect();canvas.remove();delete host.dataset.renderStyle};
}
