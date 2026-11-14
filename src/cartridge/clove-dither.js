/*! Adapted from Clove's StorageBarRenderer.swift and StorageBarView.swift.
 * Copyright (c) 2026 Keshav Bagaade. MIT; see /licenses/clove-MIT.txt.
 * Source revision: 61de2b1fbf5c7bcc4c07f8d728c90eccb509a84d.
 */

export const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(value=>(value+.5)/16);
export const clamp = value => Math.max(0,Math.min(1,value));
export const smooth = value => {const t=clamp(value);return t*t*(3-2*t)};

// Clove's integer hash and bilinearly interpolated value noise, ported to JS's 32-bit arithmetic.
export function hash(x,y) {
  let h=(Math.imul(x,374761393)+Math.imul(y,668265263))>>>0;
  h=Math.imul(h^(h>>>13),1274126177)>>>0;
  h^=h>>>16;
  return (h&0xffffff)/16777216;
}
function noise(x,y) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
  const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
  return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;
}
export function cloud(column,row,time) {
  const drift=time*.32;
  return noise(column*.045-drift,row*.11+drift*.3)*.65+noise(column*.13+drift*.6,row*.3)*.35;
}
export function lightLevel(column,row,time,edgeLight,heat,focus,front) {
  return -.04+.66*edgeLight+.44*smooth((cloud(column,row,time)-.42)/.38)+.6*heat+.22*focus+.55*front;
}
export function hotPalette(color,dark=true) {
  const hex=color.replace('#',''),full=hex.length===3?hex.split('').map(value=>value+value).join(''):hex;
  const channels=full.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16)*(dark?1:.78));
  // White highlights stay restrained on paper so the moving cells retain their contrast.
  return Array.from({length:64},(_,index)=>`rgb(${channels.map(value=>Math.round(value+(255-value)*index/63*(dark?.95:.35))).join(',')})`);
}

/** Canvas port of Clove's fixed cells, per-cell heat, bright scan front and layered glow. */
export class CloveDither {
  constructor(surface,color,dark) {
    this.surface=surface;this.context=surface.getContext('2d');this.dark=dark;
    this.palette=hotPalette(color,dark);this.color=this.palette[0];this.pitch=5;this.extent=0;this.velocity=0;
    this.cells=document.createElement('canvas');this.ink=this.cells.getContext('2d');
    this.glow=document.createElement('canvas');this.light=this.glow.getContext('2d');
  }
  resize(width,height) {
    this.width=width;this.height=height;this.reach=Math.min(width,300);
    this.ratio=Math.min(devicePixelRatio,2);
    this.surface.width=Math.round(width*this.ratio);this.surface.height=Math.round(height*this.ratio);
    this.surface.style.height=height+'px';this.context.setTransform(this.ratio,0,0,this.ratio,0,0);
    this.cells.width=Math.round(this.reach*this.ratio);this.cells.height=this.surface.height;
    this.ink.setTransform(this.ratio,0,0,this.ratio,0,0);
    this.cols=Math.ceil(this.reach/this.pitch);this.rows=Math.ceil(height/this.pitch);
    this.glow.width=this.cols;this.glow.height=this.rows;
    this.heat=new Float32Array(this.cols*this.rows);this.present=new Uint8Array(this.heat.length);
    this.mask=this.context.createLinearGradient(0,0,this.reach,0);
    this.mask.addColorStop(0,'#fff');this.mask.addColorStop(.58,'#fff');this.mask.addColorStop(1,'#fff0');
  }
  clear() {
    this.extent=this.velocity=0;this.heat.fill(0);this.present.fill(0);
    this.context.clearRect(0,0,this.width,this.height);
  }
  draw(dt,time,active) {
    // Same 240Hz spring integration and scan settling as the native view.
    const target=active?1:0,steps=Math.max(1,Math.ceil(dt*240)),h=dt/steps;
    for(let i=0;i<steps;i++){
      this.velocity+=(150*(target-this.extent)-24.5*this.velocity)*h;
      this.extent+=this.velocity*h;
    }
    if(Math.abs(this.velocity)<.015&&Math.abs(target-this.extent)<.002){this.extent=target;this.velocity=0;}
    const {context:ctx,ink,light,pitch,reach,height}=this,end=clamp(this.extent)*reach;
    ctx.clearRect(0,0,this.width,height);ink.clearRect(0,0,reach,height);light.clearRect(0,0,this.cols,this.rows);
    if(end===0)return false;
    const cool=Math.exp(-dt/.42),scan=active?clamp(Math.abs(this.velocity)*.45):0;
    ink.fillStyle=this.color;ink.globalAlpha=this.dark?.10:.12;ink.fillRect(0,0,end,height);
    for(let col=0;col<this.cols;col++){
      const cx=(col+.5)*pitch,want=cx<end,front=scan*Math.exp(-(end-cx)/22);
      const tail=smooth((reach-cx)/Math.min(110,reach*.45));
      const leftDensity=.42*(1-smooth(cx/(reach*.7)));
      for(let row=0;row<this.rows;row++){
        const n=row*this.cols+col,was=this.present[n];
        if(want!==Boolean(was)){this.present[n]=Number(want);this.heat[n]=want?1:0;}
        else this.heat[n]*=cool;
        if(!want)continue;
        const heat=this.heat[n],rank=bayer[(row&3)*4+(col&3)];
        // Density comes from the left, with no extra lighting along the horizontal edges.
        const level=(lightLevel(col,row,time,0,heat,1,front)+leftDensity)*tail;
        const glint=hash(n,Math.floor(time*1.6+hash(col,row)*7))>.994?1:0;
        const lit=level+glint*tail>rank;
        const wt=clamp(heat*.95+.1+front*.85+glint*.6);
        const color=this.palette[Math.round(wt*63)],size=lit?3.75:1.75,offset=(pitch-size)/2;
        ink.fillStyle=lit?color:this.color;
        ink.globalAlpha=(lit?242/255:70/255)*(this.dark?.52:.68)*tail;
        ink.fillRect(col*pitch+offset,row*pitch+offset,size,size);
        if(lit){light.fillStyle=color;light.globalAlpha=tail*(.55+.45*wt);light.fillRect(col,row,1,1);}
      }
    }
    // The reference uses a coarse glow beneath crisp cells. Keep every layer inside the control.
    ctx.save();ctx.globalAlpha=this.dark?.24:.10;ctx.filter='blur(8px)';
    ctx.drawImage(this.glow,0,0,reach,height);ctx.restore();
    ctx.drawImage(this.cells,0,0,reach,height);
    ctx.globalCompositeOperation='destination-in';ctx.fillStyle=this.mask;ctx.fillRect(0,0,reach,height);
    ctx.globalCompositeOperation='source-over';
    return true;
  }
}
