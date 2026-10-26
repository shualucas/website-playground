import React, { useEffect, useRef } from 'react';
const TAU = Math.PI * 2;
const fract = x => x - Math.floor(x);
const noise = (x,y) => fract(Math.sin(x*127.1+y*311.7)*43758.5453);
const dragonFrames = [
 String.raw`          /\                    /\
     ____/  \                  /  \____
 ___/   /    \    /\  /\     /    \   \___
/      /      \__/  \/  \___/      \      \
\_____/    /\   . .  __   /\    \_____/
     /____/  \__\_>-/  \_/  \____\
                  /  /  \___
              ___/  /       \___
          ___/_____/            \__~`,
 String.raw`       ___                          ___
   ___/   \__                  __/   \___
 _/    /\    \___   /\ /\   ___/    /\    \_
/_____/  \       \_/  V  \_/       /  \_____\
         /\_____   . .   _____/\
        /       \__\_>_/       \
                   / /  \___
               ___/ /       \___
           ___/____/            \__~`,
 String.raw`      ______________________________
  ___/      /\             /\       \___
 /      ___/  \___ /\ /\ __/  \___      \
/______/         \_  V _/         \______\
       \____       . .      ____/
            \______\_>_____/
                    / / \___
                ___/ /      \___
            ___/____/           \__~`
];
export default function Realm({ paused, reducedMotion, onRipple }) {
  const ref=useRef(null), controls=useRef({paused,reducedMotion});
  controls.current={paused,reducedMotion};
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas.getContext('2d');
    let w=1,h=1,frame,last=0,t=0,pointer=null,pulses=[];
    const resize=()=>{const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw();};
    function sprite(lines,x,y,size,color,opacity=1){ctx.globalAlpha=opacity;ctx.fillStyle=color;ctx.font=`${size}px "Courier New", monospace`;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((l,i)=>ctx.fillText(l,x,y+i*size*1.08));ctx.globalAlpha=1;}
    function draw(){
      ctx.clearRect(0,0,w,h);
      const mobile=w<700, horizon=h*.77;
      // The whole realm is typeset one character at a time.
      ctx.font='9px "Courier New", monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      for(let x=0;x<w;x+=7){
        const nx=x/w;
        const mountain=horizon-(Math.sin(nx*13+1)*.5+.5)*h*.12-Math.max(0,Math.sin(nx*7-2))*h*.19;
        const foreground=horizon+25-Math.sin(nx*11)*25-Math.sin(nx*23)*12;
        for(let y=mountain;y<h-16;y+=10){
          const n=noise(Math.floor(x/7),Math.floor(y/10));
          let char=' ',alpha=.22,color='#8d927c';
          if(y<foreground){
            if(y<mountain+10){char=n>.6?'^':'/';alpha=.38;}
            else if(n>.78)char=':';else if(n>.61)char='.';else if(n<.04)char='/';
          } else {
            const river=Math.abs(nx-(.61+Math.sin((y/h)*8)*.055));
            if(river<.045+(y/h-.75)*.16){char=Math.sin(x*.07+y*.08-t*.8)>.65?'~':n>.82?'·':' ';alpha=.32;color='#8d9b94';}
            else{char=n>.87?'\u0027':n>.64?'·':n<.08?'_':' ';alpha=.3;}
          }
          // Keep the main headline free of background clutter.
          if(x<w*.57&&y<h*.67)alpha*=.15;
          ctx.fillStyle=color;ctx.globalAlpha=alpha;if(char!==' ')ctx.fillText(char,x,y);
        }
      }
      ctx.globalAlpha=1;
      // A little distant citadel, built entirely from punctuation.
      sprite([
        '                |>>>              ',
        '                |                 ',
        '       |>>>    /^\\     |>>>        ',
        '       |      /:::\\    |           ',
        '      /^\\    |[ ]|   /^\\          ',
        '      |:|____|:::|___|:|           ',
        '   ___|:|[] []|:::|[] |:|___       ',
        '  /:::|:|:::::|:::|:::|:|:::\\      ',
        ' /____|_|_____|___|___|_|____\\     ',
        '    /::::/         \\::::\\         ',
      ],w*.815,h*(mobile?.73:.54),mobile?5:8,'#777c63',.55);
      const trees=[[.68,.8,1],[.9,.85,1.2],[.94,.8,.85],[.73,.88,.7],[.14,.9,.6],[.08,.84,.8],[.98,.88,1.1]];
      trees.forEach(([x,y,s])=>sprite(['   ^   ','  /|\\  ',' /:|:\\ ','/:.|.:\\','   |   '],x*w,y*h,7*s,'#7d856c',.46));
      const sunX=w*(mobile?.79:.81),sunY=h*(mobile?.48:.21);
      // A letterpress sun with a ring of quiet punctuation.
      ctx.beginPath();ctx.arc(sunX,sunY,mobile?24:40,0,TAU);ctx.fillStyle='#bf704c';ctx.globalAlpha=.12;ctx.fill();ctx.globalAlpha=1;
      for(let i=0;i<48;i++){const a=i/48*TAU;sprite(['·'],sunX+Math.cos(a)*48,sunY+Math.sin(a)*48,8,'#b67456',.3);}
      // Dragons flap slowly and drift across the sky. Their routes loop offscreen.
      const dragons=[{x:.76,y:.29,s:mobile?5.2:9.3,speed:.012,offset:0},{x:.49,y:.14,s:mobile?2.7:4,speed:.007,offset:4},{x:.93,y:.4,s:mobile?2:3,speed:.009,offset:9}];
      dragons.forEach((d,i)=>{
        const baseX=((d.x+.2+t*d.speed)%1.4-.2)*w;
        const y=h*(mobile?d.y+.25:d.y)+Math.sin(t*.7+i*2)*10;
        const phase=Math.floor((Math.sin(t*2+i)+1)*1.49);
        const lines=dragonFrames[phase].split('\n');
        sprite(lines,baseX,y,d.s,i===0?'#6e755c':'#969780',i===0?.95:.6);
      });
      // Drifting embers and cursor stars, with no external assets.
      for(let i=0;i<19;i++){
        const x=(noise(i,3)*w+t*(i%2?2:-1)+w)%w,y=(noise(i,7)*h-t*2+h)%h;
        if(x<w*.55&&y<h*.65)continue;
        sprite([i%4===0?'+':'·'],x,y,8,'#b77750',.2+Math.sin(t+i)*.1);
      }
      if(pointer){sprite(['+'],pointer.x,pointer.y,15,'#a76242',.65);}
      pulses=pulses.filter(p=>t-p.time<2.2);
      pulses.forEach(p=>{const age=t-p.time;for(let i=0;i<12;i++){const a=i/12*TAU;sprite([i%2?'·':'+'],p.x+Math.cos(a)*age*32,p.y+Math.sin(a)*age*22,9,'#b77750',(1-age/2.2)*.65);}});
    }
    const tick=now=>{const dt=Math.min((now-last)/1000,.045);last=now;if(!controls.current.paused){t+=dt;draw();}frame=requestAnimationFrame(tick);};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();frame=requestAnimationFrame(tick);
    const move=e=>{const r=canvas.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};if(controls.current.paused||controls.current.reducedMotion)draw();};
    const leave=()=>{pointer=null;draw();};
    const tap=e=>{move(e);pulses.push({...pointer,time:t});onRipple?.();draw();};
    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointerdown',tap);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointerdown',tap);};
  },[onRipple]);
  return <canvas className="realm-canvas" ref={ref} aria-label="An animated ASCII fantasy landscape with three flying dragons, mountains, a river, and a distant castle" role="img"/>;
}
