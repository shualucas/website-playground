/** One interruptible handoff between selectable text and the rendered paper. */
export class ResumeTransition {
  private animations:Animation[]=[];
  private layers:HTMLElement[]=[];
  private forward=true;
  private completed=false;
  constructor(private from:'page'|'read',private to:'page'|'read',document:HTMLElement,frame:{canvas:HTMLCanvasElement;rect:DOMRect;shadow:{canvas:HTMLCanvasElement;rect:DOMRect}},private finish:(view:'page'|'read')=>void){
    const rect=document.getBoundingClientRect(),target=frame.rect;
    const mount=document.closest('.resume-page')??window.document.body;
    const clone=document.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    const print=window.document.createElement('div');print.append(clone);
    const style=getComputedStyle(document);
    for(const name of ['--resume-print-ink','--resume-body','--resume-accent'])print.style.setProperty(name,style.getPropertyValue(name));
    const image=frame.canvas,shadow=frame.shadow.canvas;
    shadow.className='resume-morph-layer';shadow.inert=true;shadow.setAttribute('aria-hidden','true');mount.append(shadow);this.layers.push(shadow);
    Object.assign(shadow.style,{left:`${frame.shadow.rect.left}px`,top:`${frame.shadow.rect.top}px`,width:`${frame.shadow.rect.width}px`,height:`${frame.shadow.rect.height}px`});
    for(const layer of [print,image]){layer.classList.add('resume-morph-layer');layer.inert=true;layer.setAttribute('aria-hidden','true');mount.append(layer);this.layers.push(layer)}
    Object.assign(print.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    Object.assign(image.style,{left:`${target.left}px`,top:`${target.top}px`,width:`${target.width}px`,height:`${target.height}px`});
    const toPaper=`translate(${target.left-rect.left}px,${target.top-rect.top}px) scale(${target.width/rect.width},${target.height/rect.height})`;
    const toRead=`translate(${rect.left-target.left}px,${rect.top-target.top}px) scale(${rect.width/target.width},${rect.height/target.height})`;
    const readFrames=[{transform:'none',opacity:1},{offset:.45,opacity:1},{offset:.82,opacity:0},{transform:toPaper,opacity:0}];
    const pageFrames=[{transform:toRead,opacity:0},{offset:.35,opacity:0},{offset:.82,opacity:1},{transform:'none',opacity:1}];
    const reverse=(frames:Keyframe[])=>frames.slice().reverse().map(frame=>({...frame,...(frame.offset===undefined?{}:{offset:1-Number(frame.offset)})}));
    const options:KeyframeAnimationOptions={duration:560,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'};
    this.animations=[print.animate(from==='read'?readFrames:reverse(readFrames),options),image.animate(from==='read'?pageFrames:reverse(pageFrames),options),shadow.animate(from==='read'?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],options)];
    this.watch();
  }
  select(view:'page'|'read'){
    const forward=view===this.to;
    if(forward!==this.forward){this.forward=forward;this.animations.forEach(animation=>animation.reverse())}
  }
  private watch(){this.animations[0].finished.then(()=>{if(!this.completed){this.completed=true;this.finish(this.forward?this.to:this.from)}}).catch(()=>{})}
  dispose(){this.animations.forEach(animation=>animation.cancel());this.layers.forEach(layer=>layer.remove())}
}
