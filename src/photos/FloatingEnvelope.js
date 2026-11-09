/** One clock owns the float, hover spring, and drag-to-tilt gesture. */
export class FloatingEnvelope {
  constructor(host) {
    this.host=host;this.active=true;this.visible=true;this.frame=0;this.last=0;this.time=0;this.grip=null;this.suppress=false;this.hovered=false;
    this.pitch=this.targetPitch=-20;this.yaw=this.targetYaw=-12;this.scale=1;this.vPitch=this.vYaw=this.vScale=0;
    this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.events={pointerdown:this.down,pointermove:this.move,pointerup:this.up,pointercancel:this.cancel,lostpointercapture:this.cancel,pointerenter:this.enter,pointerleave:this.leave};
    for(const [name,handler]of Object.entries(this.events))host.addEventListener(name,handler);
    host.addEventListener('click',this.click,true);window.addEventListener('blur',this.cancel);document.addEventListener('visibilitychange',this.sync);this.motion.addEventListener('change',this.sync);
    this.observer=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;this.sync()});this.observer.observe(host);this.paint();this.sync();
  }
  enter=()=>{this.hovered=true;this.schedule()};
  leave=()=>{this.hovered=false;this.schedule()};
  down=event=>{
    if(!this.active||event.button!==0||!event.isPrimary||this.grip)return;
    this.suppress=false;this.grip={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,touch:event.pointerType==='touch'};
    if(!this.grip.touch)this.host.setPointerCapture(event.pointerId);
  };
  move=event=>{
    const grip=this.grip;if(!grip||event.pointerId!==grip.id)return;
    const dx=event.clientX-grip.x,dy=event.clientY-grip.y;
    if(!grip.moved&&Math.hypot(dx,dy)<6)return;grip.moved=true;this.suppress=true;
    if(grip.touch)return;
    event.preventDefault();this.host.dataset.dragging='true';
    this.pitch=this.targetPitch=-20+Math.max(-15,Math.min(15,-dy*.11));this.yaw=this.targetYaw=-12+Math.max(-20,Math.min(20,dx*.12));this.vPitch=this.vYaw=0;this.paint();
  };
  release(){
    const grip=this.grip;this.grip=null;this.host.dataset.dragging='false';this.targetPitch=-20;this.targetYaw=-12;this.hovered=false;
    if(grip&&this.host.hasPointerCapture(grip.id))this.host.releasePointerCapture(grip.id);
    this.schedule();
  }
  up=event=>{if(this.grip?.id===event.pointerId)this.release()};
  cancel=()=>{if(this.grip){this.suppress=true;this.release()}};
  click=event=>{if(event.detail===0){this.suppress=false;return}if(this.suppress){event.preventDefault();event.stopPropagation();this.suppress=false}};
  setActive(active){this.active=active;if(this.grip)this.release();this.sync()}
  sync=()=>{if(document.hidden)this.cancel();cancelAnimationFrame(this.frame);this.frame=0;this.last=0;this.paint();this.schedule()};
  schedule(){if(!this.frame&&this.active&&this.visible&&!document.hidden&&!this.motion.matches)this.frame=requestAnimationFrame(this.tick)}
  tick=now=>{
    this.frame=0;const dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;if(!this.grip)this.time+=dt;
    let remaining=dt;
    while(remaining>0){const step=Math.min(remaining,1/120);this.vPitch+=((this.targetPitch-this.pitch)*100-this.vPitch*16)*step;this.vYaw+=((this.targetYaw-this.yaw)*100-this.vYaw*16)*step;
      this.pitch+=this.vPitch*step;this.yaw+=this.vYaw*step;this.vScale+=(((this.hovered&&!this.grip?1.045:1)-this.scale)*340-this.vScale*22)*step;this.scale+=this.vScale*step;remaining-=step;}
    this.paint();this.schedule();
  };
  paint(){
    const moving=!this.motion.matches,pitch=moving?this.pitch+Math.sin(this.time*.6)*3:0,yaw=moving?this.yaw+Math.sin(this.time*.43)*4:0,lift=moving?Math.sin(this.time*.85)*12:0,roll=moving?-3+Math.sin(this.time*.37)*1.3:0;
    for(const [name,value]of Object.entries({pitch:`${pitch}deg`,yaw:`${yaw}deg`,roll:`${roll}deg`,lift:`${lift}px`,scale:moving?this.scale:1}))this.host.style.setProperty(`--envelope-${name}`,String(value));
    this.host.parentElement?.style.setProperty('--shadow-lift',`${-lift*.25}px`);
    this.host.dataset.orientation=`${pitch.toFixed(3)},${yaw.toFixed(3)}`;this.host.dataset.motion=!this.active||!this.visible||document.hidden?'paused':this.motion.matches?'reduced':'floating';
  }
  dispose(){this.active=false;this.cancel();cancelAnimationFrame(this.frame);this.observer.disconnect();this.motion.removeEventListener('change',this.sync);window.removeEventListener('blur',this.cancel);document.removeEventListener('visibilitychange',this.sync);
    for(const [name,handler]of Object.entries(this.events))this.host.removeEventListener(name,handler);this.host.removeEventListener('click',this.click,true);}
}
