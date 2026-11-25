const order=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export const paperDitherRank=`
 float paperRank(vec2 pixel,float size){
  vec2 point=floor(pixel/size),tile=floor(point/4.);
  float phase=fract(sin(dot(tile,vec2(127.1,311.7)))*43758.5453);
  vec2 cell=mod(point+vec2(floor(phase*4.),floor(fract(phase*7.13)*4.)),4.);
  vec4 row=cell.y<1.?vec4(0.,8.,2.,10.):cell.y<2.?vec4(12.,4.,14.,6.):cell.y<3.?vec4(3.,11.,1.,9.):vec4(15.,7.,13.,5.);
  return ((cell.x<1.?row.x:cell.x<2.?row.y:cell.x<3.?row.z:row.w)+.5)/16.;
 }
`;
export const paperDitherFragment=`
 float paperLuma=clamp(dot(gl_FragColor.rgb,vec3(.299,.587,.114)),0.,1.);
 float paperCoverage=mix(.10,.90,mix(1.-paperLuma,paperLuma,paperDark));
 if(paperRank(gl_FragCoord.xy,paperPixel)>paperCoverage)discard;
 gl_FragColor.rgb=paperInk;
`;

/** Static ordered pixels for browsers without WebGL. The existing sheet owns motion. */
export function createPaperDitherFallback(host:HTMLElement){
 const image=host.querySelector<HTMLImageElement>('.resume-artwork img')!;
 const canvas=document.createElement('canvas');canvas.className='resume-dither-fallback';canvas.setAttribute('aria-hidden','true');
 canvas.width=Math.min(1200,image.naturalWidth);canvas.height=Math.round(canvas.width*image.naturalHeight/image.naturalWidth);
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return()=>{};
 const paint=()=>{
  const dark=document.documentElement.dataset.colorMode==='dark';
  context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),cell=Math.max(1,Math.round(canvas.width/host.clientWidth)),ink=dark?[238,238,238]:[24,24,27];
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const i=(y*canvas.width+x)*4,luma=(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114)/255;
   const coverage=.10+.80*(dark?luma:1-luma),px=Math.floor(x/cell),py=Math.floor(y/cell),seed=Math.sin(Math.floor(px/4)*127.1+Math.floor(py/4)*311.7)*43758.5453,phase=seed-Math.floor(seed),rank=(order[((py+Math.floor((phase*7.13%1)*4))%4)*4+(px+Math.floor(phase*4))%4]+.5)/16;
   pixels.data[i]=ink[0];pixels.data[i+1]=ink[1];pixels.data[i+2]=ink[2];pixels.data[i+3]=rank<=coverage?255:0;
  }
  context.putImageData(pixels,0,0);
 };
 paint();host.querySelector('.resume-artwork')!.append(canvas);host.dataset.renderStyle='dither';
 const theme=new MutationObserver(paint);theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
 const size=new ResizeObserver(paint);size.observe(host);
 return()=>{theme.disconnect();size.disconnect();canvas.remove();delete host.dataset.renderStyle};
}
